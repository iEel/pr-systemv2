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
    vatRate: 7,
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
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_2026" }), findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockResolvedValue(schedule()), update: vi.fn() },
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
  expect(mocks.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
});

test("uses the schedule VAT snapshot for persisted recurring Draft totals and budget reservation", async () => {
  const currentSchedule = schedule({ vatRate: 10 });
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn().mockResolvedValue({ id: "pr_draft" }) },
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_2026" }), findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockResolvedValue(currentSchedule), update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(currentSchedule) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"));

  expect(tx.purchaseRequest.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ subtotal: 100, totalAmount: 110, vatAmount: 10, vatRate: 10 }),
  }));
  expect(mocks.reserveDraftBudget).toHaveBeenCalledWith(tx, expect.objectContaining({ totalAmount: 110 }));
});

test("skips the annual occurrence when a run already exists", async () => {
  const tx = {
    auditLog: { create: vi.fn() },
    recurringPurchaseRequestRun: { findUnique: vi.fn().mockResolvedValue({ id: "run_existing" }) },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockResolvedValue(schedule()) },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue({ id: "run_existing" }) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ outcome: "SKIPPED", runId: "run_existing", scheduleId: "schedule_1" });
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "Duplicate annual run skipped", actorId: null }) }));
});

test("persists a sanitized FAILED validation run without creating a Draft", async () => {
  const tx = {
    auditLog: { create: vi.fn() },
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_failed" }) },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockResolvedValue(schedule({ category: { isActive: false } })), update: vi.fn() },
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
  const auditTx = { auditLog: { create: vi.fn() } };
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn().mockRejectedValueOnce(uniqueError).mockImplementationOnce(async (work: (client: typeof auditTx) => unknown) => work(auditTx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ outcome: "SKIPPED", scheduleId: "schedule_1" });
  expect(auditTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "Duplicate annual run skipped", actorId: null }) }));
});

test("skips without a run or Draft when a schedule is paused after the outer read", async () => {
  const state = { currentSchedule: schedule() };
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn() },
    recurringPurchaseRequestRun: { create: vi.fn(), update: vi.fn() },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockImplementation(() => state.currentSchedule), update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = {
    findUnique: vi.fn(async () => {
      const outerSnapshot = structuredClone(state.currentSchedule);
      state.currentSchedule = schedule({ status: "PAUSED" });
      return outerSnapshot;
    }),
  };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ outcome: "SKIPPED", scheduleId: "schedule_1" });
  expect(tx.recurringPurchaseRequestRun.create).not.toHaveBeenCalled();
  expect(tx.purchaseRequest.create).not.toHaveBeenCalled();
});

test("persists one failed run without a Draft when category deactivation commits after the outer read", async () => {
  const state = { currentSchedule: schedule() };
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn() },
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_failed" }), update: vi.fn() },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockImplementation(() => state.currentSchedule), update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = {
    findUnique: vi.fn(async () => {
      const outerSnapshot = structuredClone(state.currentSchedule);
      state.currentSchedule = schedule({ category: { isActive: false } });
      return outerSnapshot;
    }),
  };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({
    error: "หมวดหมู่ PR ไม่พร้อมใช้งาน",
    outcome: "FAILED",
    runId: "run_failed",
    scheduleId: "schedule_1",
  });
  expect(tx.purchaseRequest.create).not.toHaveBeenCalled();
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "Recurring run failed", actorId: null }) }));
});

test("skips without a run or Draft when an annual-rule edit moves nextRunDate into the future after the outer read", async () => {
  const state = { currentSchedule: schedule() };
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn() },
    recurringPurchaseRequestRun: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockImplementation(() => state.currentSchedule), update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = {
    findUnique: vi.fn(async () => {
      const outerSnapshot = structuredClone(state.currentSchedule);
      state.currentSchedule = schedule({ nextRunDate: new Date("2026-09-01T00:00:00.000Z"), renewalDay: 1, renewalMonth: 10 });
      return outerSnapshot;
    }),
  };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ outcome: "SKIPPED", scheduleId: "schedule_1" });
  expect(tx.recurringPurchaseRequestRun.create).not.toHaveBeenCalled();
  expect(tx.purchaseRequest.create).not.toHaveBeenCalled();
});

test("skips before validation side effects when a moved-future annual-rule edit also deactivates a reference", async () => {
  const state = { currentSchedule: schedule() };
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn() },
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_should_not_exist" }), findUnique: vi.fn(), update: vi.fn() },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockImplementation(() => state.currentSchedule), update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = {
    findUnique: vi.fn(async () => {
      const outerSnapshot = structuredClone(state.currentSchedule);
      state.currentSchedule = schedule({
        category: { isActive: false },
        nextRunDate: new Date("2026-09-01T00:00:00.000Z"),
        renewalDay: 1,
        renewalMonth: 10,
      });
      return outerSnapshot;
    }),
  };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ outcome: "SKIPPED", scheduleId: "schedule_1" });
  expect(tx.recurringPurchaseRequestRun.create).not.toHaveBeenCalled();
  expect(tx.recurringPurchaseRequestSchedule.update).not.toHaveBeenCalled();
  expect(tx.purchaseRequest.create).not.toHaveBeenCalled();
  expect(tx.auditLog.create).not.toHaveBeenCalled();
});

test("uses an edited but still-due annual rule for run, Draft, and next-run dates", async () => {
  const state = { currentSchedule: schedule() };
  const editedSchedule = schedule({
    leadDays: 30,
    nextRunDate: new Date("2026-07-16T00:00:00.000Z"),
    renewalDay: 15,
    renewalMonth: 8,
  });
  const tx = {
    auditLog: { create: vi.fn() },
    purchaseRequest: { create: vi.fn().mockResolvedValue({ id: "pr_edited" }) },
    recurringPurchaseRequestRun: { create: vi.fn().mockResolvedValue({ id: "run_edited" }), findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockImplementation(() => state.currentSchedule), update: vi.fn() },
  };
  mocks.prisma.recurringPurchaseRequestSchedule = {
    findUnique: vi.fn(async () => {
      const outerSnapshot = structuredClone(state.currentSchedule);
      state.currentSchedule = editedSchedule;
      return outerSnapshot;
    }),
  };
  mocks.prisma.recurringPurchaseRequestRun = { findUnique: vi.fn().mockResolvedValue(null) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(processRecurringScheduleOccurrence("schedule_1", new Date("2026-08-02T00:00:00.000Z"))).resolves.toEqual({ draftId: "pr_edited", outcome: "CREATED", runId: "run_edited", scheduleId: "schedule_1" });
  expect(tx.recurringPurchaseRequestRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    occurrenceYear: 2026,
    renewalDate: new Date("2026-08-15T00:00:00.000Z"),
    scheduledDraftDate: new Date("2026-07-16T00:00:00.000Z"),
  }) }));
  expect(tx.purchaseRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requiredDate: new Date("2026-08-15T00:00:00.000Z") }) }));
  expect(tx.recurringPurchaseRequestSchedule.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ nextRunDate: new Date("2027-07-16T00:00:00.000Z") }) }));
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
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockResolvedValue(schedule()), update: vi.fn() },
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

test("keeps a failed retry safely failed when a required reference becomes inactive", async () => {
  const tx = {
    recurringPurchaseRequestSchedule: { findUnique: vi.fn().mockResolvedValue(schedule({ category: { isActive: false } })) },
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
    update: vi.fn(),
  };
  mocks.prisma.recurringPurchaseRequestSchedule = { findUnique: vi.fn().mockResolvedValue(schedule()) };
  mocks.prisma.$transaction = vi.fn(async (work: (client: typeof tx) => unknown) => work(tx));

  await expect(retryRecurringPurchaseRequestRun("run_failed")).rejects.toThrow("หมวดหมู่ PR ไม่พร้อมใช้งาน");
  expect(mocks.prisma.recurringPurchaseRequestRun.update).toHaveBeenCalledWith({
    data: expect.objectContaining({ errorMessage: "หมวดหมู่ PR ไม่พร้อมใช้งาน", finishedAt: expect.any(Date) }),
    where: { id: "run_failed" },
  });
});

function installTransactionalState({ failAutomatedAudit = false, initialRun, retryClaimBarrier: useRetryClaimBarrier = false }: { failAutomatedAudit?: boolean; initialRun?: Record<string, any>; retryClaimBarrier?: boolean } = {}) {
  let state = {
    audits: [] as any[],
    drafts: [] as any[],
    reserved: 0,
    runs: initialRun ? [structuredClone(initialRun)] : [] as any[],
  };
  const clone = () => structuredClone(state);
  const runForOccurrence = () => state.runs.find((run) => run.scheduleId === "schedule_1" && run.occurrenceYear === 2026) || null;
  let retryClaimArrivals = 0;
  let releaseRetryClaimBarrier: () => void = () => undefined;
  const retryClaimBarrier = new Promise<void>((resolve) => {
    releaseRetryClaimBarrier = resolve;
  });

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
        findUnique: async () => pending.runs.find((run) => run.scheduleId === "schedule_1" && run.occurrenceYear === 2026) || null,
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
          if (useRetryClaimBarrier) {
            retryClaimArrivals += 1;
            if (retryClaimArrivals === 2) releaseRetryClaimBarrier();
            await retryClaimBarrier;
            const sharedRun = state.runs.find((candidate) => candidate.id === where.id && candidate.status === where.status && candidate.purchaseRequestId === where.purchaseRequestId);
            if (!sharedRun) return { count: 0 };
            Object.assign(sharedRun, data);
          }
          const run = pending.runs.find((candidate) => candidate.id === where.id && candidate.status === where.status && candidate.purchaseRequestId === where.purchaseRequestId);
          if (!run) return { count: 0 };
          Object.assign(run, data);
          return { count: 1 };
        },
      },
      recurringPurchaseRequestSchedule: { findUnique: async () => schedule(), update: async () => undefined },
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

test("allows exactly one concurrent retry to claim FAILED -> PROCESSING and commits one Draft", async () => {
  const database = installTransactionalState({
    retryClaimBarrier: true,
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

  const retries = await Promise.allSettled([
    retryRecurringPurchaseRequestRun("run_failed"),
    retryRecurringPurchaseRequestRun("run_failed"),
  ]);

  expect(retries.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(retries.filter((result) => result.status === "rejected")).toHaveLength(1);
  expect(retries.find((result) => result.status === "rejected")).toMatchObject({ reason: expect.objectContaining({ message: "Recurring run is not eligible for retry" }) });
  expect(mocks.prisma.recurringPurchaseRequestRun.findUnique).toHaveBeenCalledTimes(2);
  expect(database.state()).toMatchObject({ drafts: [{ id: "pr_1" }], reserved: 107, runs: [{ id: "run_failed", purchaseRequestId: "pr_1", status: "SUCCEEDED" }] });
  expect(database.state().audits.filter((audit) => audit.action === "Automated recurring Draft created")).toHaveLength(1);
  expect(database.state().audits.filter((audit) => audit.action === "Recurring run retried")).toHaveLength(1);
});
