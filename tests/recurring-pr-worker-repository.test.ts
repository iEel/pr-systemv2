import { Prisma } from "@prisma/client";
import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {} as Record<string, any>,
  requirePermission: vi.fn(),
  reserveDraftBudget: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../lib/auth/current-user", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("../lib/budget-tracking", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/budget-tracking")>()),
  reserveDraftBudget: mocks.reserveDraftBudget,
}));

import { processRecurringPrSchedules, processRecurringScheduleOccurrence, retryRecurringPurchaseRequestRun } from "../lib/recurring-pr-worker";

function schedule(overrides: Record<string, unknown> = {}) {
  return {
    branch: { company: { isActive: true }, documentRefNo: "REF-1", isActive: true },
    branchId: "branch_1",
    category: { isActive: true },
    categoryId: "category_1",
    companyId: "company_1",
    department: { id: "department_1", isActive: true },
    departmentId: "department_1",
    division: null,
    divisionId: null,
    id: "schedule_1",
    items: [{ accountCode: "6100", description: "License", lineNo: 1, quantity: 1, rowType: "ITEM", totalAmount: 100, unitCost: 100 }],
    leadDays: 30,
    nextRunDate: new Date("2026-08-02T00:00:00.000Z"),
    purchaseMethod: "PROCUREMENT",
    purpose: "Renew license",
    remark: null,
    renewalDay: 1,
    renewalMonth: 9,
    responsibleUser: { isActive: true },
    responsibleUserId: "user_owner",
    status: "ACTIVE",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ id: "admin_1" });
  mocks.reserveDraftBudget.mockResolvedValue({ budgetStatus: "MATCHED" });
});

test("queries due schedules in stable nextRunDate and id order", async () => {
  mocks.prisma.recurringPurchaseRequestSchedule = {
    findMany: vi.fn().mockResolvedValue([{ id: "schedule_a" }, { id: "schedule_b" }]),
  };

  await processRecurringPrSchedules({ now: new Date("2026-07-14T17:30:00.000Z") });

  expect(mocks.prisma.recurringPurchaseRequestSchedule.findMany).toHaveBeenCalledWith({
    orderBy: [{ nextRunDate: "asc" }, { id: "asc" }],
    select: { id: true },
    where: { nextRunDate: { lte: new Date("2026-07-15T00:00:00.000Z") }, status: "ACTIVE" },
  });
});

test("creates PROCESSING then a responsible-user DRAFT, reserves budget, succeeds the run, and writes System audits", async () => {
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn().mockResolvedValue({ id: "pr_draft" }) },
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_2026" }), update: vi.fn() },
    recurringPurchaseRequestSchedule: { update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  const result = await processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"));

  expect(result).toEqual({ draftId: "pr_draft", outcome: "CREATED", runId: "run_2026", scheduleId: "schedule_1" });
  expect(tx.recurringPurchaseRequestRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PROCESSING" }) }));
  expect(tx.purchaseRequest.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ createdById: "user_owner", documentDate: new Date("2026-08-02T00:00:00.000Z"), requiredDate: new Date("2026-09-01T00:00:00.000Z"), status: "DRAFT" }),
  }));
  expect(mocks.reserveDraftBudget).toHaveBeenCalledWith(tx, expect.objectContaining({ totalAmount: 107 }));
  expect(tx.recurringPurchaseRequestRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ purchaseRequestId: "pr_draft", status: "SUCCEEDED" }) }));
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "Automated recurring Draft created", actorId: null }) }));
});

test("skips the annual occurrence when a run already exists", async () => {
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue({ id: "run_existing" }) };

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ outcome: "SKIPPED", runId: "run_existing", scheduleId: "schedule_1" });
});

test("persists a sanitized FAILED validation run without creating a Draft", async () => {
  const tx = {
    auditLog: { create: vi.fn() },
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_failed" }) },
    recurringPurchaseRequestSchedule: { update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule({ category: { isActive: false } })) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({
    error: "หมวดหมู่ PR ไม่พร้อมใช้งาน",
    outcome: "FAILED",
    runId: "run_failed",
    scheduleId: "schedule_1",
  });
  expect(tx.recurringPurchaseRequestRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ errorMessage: "หมวดหมู่ PR ไม่พร้อมใช้งาน", status: "FAILED" }) }));
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: null, action: "Recurring run failed" }) }));
});

test("treats a competing unique annual-run claim as a skip", async () => {
  const uniqueError = new Prisma.PrismaClientKnownRequestError("duplicate", { clientVersion: "test", code: "P2002" });
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn().mockRejectedValue(uniqueError);

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ outcome: "SKIPPED", scheduleId: "schedule_1" });
});

test("leaves unexpected transaction failures available for a later cron retry", async () => {
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn().mockRejectedValue(new Error("connection dropped"));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).rejects.toThrow("connection dropped");
});

test("retries the same FAILED run only after permission and transitions it through PROCESSING", async () => {
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn().mockResolvedValue({ id: "pr_retried" }) },
    recurringPurchaseRequestRun: { update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    recurringPurchaseRequestSchedule: { update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestRun = {
    findUnique: vi.fn().mockResolvedValue({
      id: "run_failed",
      occurrenceYear: 2026,
      purchaseRequestId: null,
      renewalDate: new Date("2026-09-01T00:00:00.000Z"),
      schedule: {},
      scheduleId: "schedule_1",
      scheduledDraftDate: new Date("2026-08-02T00:00:00.000Z"),
      status: "FAILED",
    }),
  };
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(retryRecurringPurchaseRequestRun("run_failed")).resolves.toEqual({ id: "pr_retried", runId: "run_failed", scheduleId: "schedule_1" });
  expect(mocks.requirePermission).toHaveBeenCalledWith("PR_RECURRING_MANAGE");
  expect(tx.recurringPurchaseRequestRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PROCESSING" }), where: { id: "run_failed", purchaseRequestId: null, status: "FAILED" } }));
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "Recurring run retried", actorId: "admin_1" }) }));
});

function installTransactionalState({ failAutomatedAudit = false, initialRun }: { failAutomatedAudit?: boolean; initialRun?: Record<string, any> } = {}) {
  let state = {
    audits: [] as any[],
    drafts: [] as any[],
    reserved: 0,
    runs: initialRun ? [structuredClone(initialRun)] : [] as any[],
  };
  const clone = () => structuredClone(state);
  const runForOccurrence = () => state.runs.find((run) => run.scheduleId === "schedule_1" && run.occurrenceYear === 2026) || null;

  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.recurringPurchaseRequestRun = {
    findUnique: vi.fn(async (args: any) => {
      if (args.where.id) return state.runs.find((run) => run.id === args.where.id) || null;
      return runForOccurrence();
    }),
  };
  mocks.prisma.$transaction = vi.fn(async (work: (tx: any) => Promise<unknown>) => {
    const pending = clone();
    const tx = {
      auditLog: {
        create: async ({ data }: any) => {
          if (failAutomatedAudit && data.action === "Automated recurring Draft created") throw new Error("audit write failed");
          pending.audits.push(data);
        },
      },
      budget: { reserve: (amount: number) => { pending.reserved += amount; } },
      purchaseRequest: {
        create: async ({ data }: any) => {
          const created = { id: `pr_${pending.drafts.length + 1}`, ...data };
          pending.drafts.push(created);
          return { id: created.id };
        },
      },
      recurringPurchaseRequestRun: {
        create: async ({ data }: any) => {
          if (pending.runs.some((run) => run.scheduleId === data.scheduleId && run.occurrenceYear === data.occurrenceYear)) {
            throw new Prisma.PrismaClientKnownRequestError("duplicate", { clientVersion: "test", code: "P2002" });
          }
          const created = { id: `run_${pending.runs.length + 1}`, ...data };
          pending.runs.push(created);
          return { id: created.id };
        },
        update: async ({ data, where }: any) => {
          const run = pending.runs.find((candidate) => candidate.id === where.id)!;
          Object.assign(run, data);
        },
        updateMany: async ({ data, where }: any) => {
          const run = pending.runs.find((candidate) => candidate.id === where.id && candidate.status === where.status && candidate.purchaseRequestId === where.purchaseRequestId);
          if (!run) return { count: 0 };
          Object.assign(run, data);
          return { count: 1 };
        },
      },
      recurringPurchaseRequestSchedule: { update: async () => undefined },
    };
    const result = await work(tx);
    state = pending;
    return result;
  });
  mocks.reserveDraftBudget.mockImplementation(async (tx: any, reference: { totalAmount: number }) => {
    tx.budget.reserve(reference.totalAmount);
    return { budgetStatus: "MATCHED" };
  });
  return { state: () => state };
}

test("rolls back run, Draft, budget reservation, and audit writes when a late worker audit fails", async () => {
  const database = installTransactionalState({ failAutomatedAudit: true });

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).rejects.toThrow("audit write failed");
  expect(database.state()).toEqual({ audits: [], drafts: [], reserved: 0, runs: [] });
});

test("allows one retry claim while concurrent cron skips the same FAILED annual run without partial writes", async () => {
  const database = installTransactionalState({
    initialRun: {
      id: "run_failed",
      occurrenceYear: 2026,
      purchaseRequestId: null,
      renewalDate: new Date("2026-09-01T00:00:00.000Z"),
      scheduleId: "schedule_1",
      scheduledDraftDate: new Date("2026-08-02T00:00:00.000Z"),
      status: "FAILED",
    },
  });

  const [cron, retry] = await Promise.all([
    processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z")),
    retryRecurringPurchaseRequestRun("run_failed"),
  ]);

  expect(cron).toEqual({ outcome: "SKIPPED", runId: "run_failed", scheduleId: "schedule_1" });
  expect(retry).toMatchObject({ id: "pr_1", runId: "run_failed", scheduleId: "schedule_1" });
  expect(database.state()).toMatchObject({ drafts: [{ id: "pr_1" }], reserved: 107, runs: [{ id: "run_failed", purchaseRequestId: "pr_1", status: "SUCCEEDED" }] });
  expect(database.state().audits).toHaveLength(2);
});
