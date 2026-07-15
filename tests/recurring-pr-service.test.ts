import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {} as Record<string, any>,
  requirePermission: vi.fn(),
}));

vi.mock("../lib/auth/current-user", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("../lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import {
  getRecurringScheduleDetail,
  getRecurringScheduleOptions,
  getRecurringSchedulePageData,
  updateRecurringScheduleFromFormData,
} from "../lib/recurring-pr";

function scheduleRecord({
  id,
  nextRunDate = new Date("2026-08-14T00:00:00.000Z"),
  status = "ACTIVE",
  runs = [],
}: {
  id: string;
  nextRunDate?: Date;
  status?: "ACTIVE" | "PAUSED";
  runs?: any[];
}) {
  return {
    branch: { company: { isActive: true }, isActive: true },
    category: { code: "SOFTWARE_LICENSE", id: "cat_software", isActive: true, name: "Software" },
    department: { isActive: true },
    division: null,
    id,
    leadDays: 30,
    name: `Schedule ${id}`,
    nextRunDate,
    renewalDay: 13,
    renewalMonth: 9,
    responsibleUser: { displayName: "Ari", id: "user_ari", isActive: true },
    runs,
    sourcePurchaseRequest: { id: "pr_source", prNo: "PR-2026-0001" },
    status,
  };
}

function recurringForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    branchId: "br_hq",
    categoryId: "cat_software",
    departmentId: "dep_it",
    divisionId: "div_it",
    leadDays: "30",
    name: "Annual software renewal",
    purchaseMethod: "PROCUREMENT",
    purpose: "Renew licenses",
    renewalDay: "1",
    renewalMonth: "9",
    responsibleUserId: "user_ari",
    sourcePurchaseRequestId: "pr_source",
  })) {
    form.set(key, value);
  }
  form.append("rowType", "ITEM");
  form.append("accountCode", "6100");
  form.append("description", "License");
  form.append("quantity", "1");
  form.append("unitCost", "1000");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-14T17:30:00.000Z"));
  mocks.requirePermission.mockResolvedValue({ id: "user_admin" });
  mocks.prisma.recurringPurchaseRequestRun = { findMany: vi.fn().mockResolvedValue([]) };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recurring schedule read models", () => {
  test.each([
    ["ACTIVE", ["active"]],
    ["PAUSED", ["paused"]],
    ["NEEDS_ATTENTION", ["failed"]],
  ] as const)("filters mapped %s status rows", async (status, expectedIds) => {
    mocks.prisma.recurringPurchaseRequestSchedule = {
      findMany: vi.fn().mockResolvedValue([
        scheduleRecord({ id: "active" }),
        scheduleRecord({ id: "failed", runs: [{ startedAt: new Date("2026-07-10T00:00:00.000Z"), status: "FAILED" }] }),
        scheduleRecord({ id: "paused", status: "PAUSED" }),
      ]),
    };

    const page = await getRecurringSchedulePageData({ status }, "user_viewer", { now: new Date("2026-07-14T17:30:00.000Z") });

    expect(page.rows.map((row) => row.id)).toEqual(expectedIds);
  });

  test("uses inclusive Bangkok date-only boundaries for upcoming filters", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    mocks.prisma.recurringPurchaseRequestSchedule = { findMany };

    await getRecurringSchedulePageData({ upcoming: "30" }, "user_viewer", { now: new Date("2026-07-14T17:30:00.000Z") });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ nextRunDate: { gte: new Date("2026-07-15T00:00:00.000Z"), lte: new Date("2026-08-14T00:00:00.000Z") }, status: "ACTIVE" }),
      }),
    );
  });

  test("excludes overdue, paused, and needs-attention schedules from the server-derived upcoming view", async () => {
    mocks.prisma.recurringPurchaseRequestSchedule = {
      findMany: vi.fn().mockResolvedValue([
        scheduleRecord({ id: "overdue", nextRunDate: new Date("2026-07-14T00:00:00.000Z") }),
        scheduleRecord({ id: "today", nextRunDate: new Date("2026-07-15T00:00:00.000Z") }),
        scheduleRecord({ id: "edge", nextRunDate: new Date("2026-08-14T00:00:00.000Z") }),
        scheduleRecord({ id: "after", nextRunDate: new Date("2026-08-15T00:00:00.000Z") }),
        scheduleRecord({ id: "paused", nextRunDate: new Date("2026-07-16T00:00:00.000Z"), status: "PAUSED" }),
        scheduleRecord({ id: "attention", nextRunDate: new Date("2026-07-16T00:00:00.000Z"), runs: [{ startedAt: new Date("2026-07-15T00:00:00.000Z"), status: "FAILED" }] }),
      ]),
    };

    const page = await getRecurringSchedulePageData({ upcoming: "30" }, "user_viewer", { now: new Date("2026-07-14T17:30:00.000Z") });

    expect(page.rows.map((row) => row.id)).toEqual(["today", "edge"]);
    expect(page.summary).toEqual({ active: 2, needsAttention: 0, paused: 0, upcoming: 2 });
  });

  test("marks only active schedules in the current 30-day Bangkok window as upcoming", async () => {
    mocks.prisma.recurringPurchaseRequestSchedule = {
      findMany: vi.fn().mockResolvedValue([
        scheduleRecord({ id: "today", nextRunDate: new Date("2026-07-15T00:00:00.000Z") }),
        scheduleRecord({ id: "overdue", nextRunDate: new Date("2026-07-14T00:00:00.000Z") }),
        scheduleRecord({ id: "paused", nextRunDate: new Date("2026-07-16T00:00:00.000Z"), status: "PAUSED" }),
      ]),
    };

    const page = await getRecurringSchedulePageData({}, "user_viewer", { now: new Date("2026-07-14T17:30:00.000Z") });

    expect(page.rows.map((row) => ({ id: row.id, isUpcoming: row.isUpcoming }))).toEqual([
      { id: "today", isUpcoming: true },
      { id: "overdue", isUpcoming: false },
      { id: "paused", isUpcoming: false },
    ]);
    expect(page.summary.upcoming).toBe(1);
  });

  test("keeps the latest run result and independently links the latest generated Draft", async () => {
    mocks.prisma.recurringPurchaseRequestSchedule = {
      findMany: vi.fn().mockResolvedValue([
        scheduleRecord({ id: "schedule_1", runs: [{ startedAt: new Date("2026-09-02T00:00:00.000Z"), status: "FAILED" }] }),
      ]),
    };
    mocks.prisma.recurringPurchaseRequestRun.findMany.mockResolvedValue([
      { purchaseRequest: { id: "pr_generated", prNo: "PR-2026-0999" }, scheduleId: "schedule_1" },
    ]);

    const page = await getRecurringSchedulePageData({}, "user_viewer");

    expect(page.rows[0]).toMatchObject({
      lastRun: { status: "FAILED" },
      latestGeneratedDraft: { id: "pr_generated", label: "PR-2026-0999" },
      status: "NEEDS_ATTENTION",
    });
    expect(mocks.prisma.recurringPurchaseRequestRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ purchaseRequestId: { not: null }, status: "SUCCEEDED" }),
      }),
    );
  });

  test("projects a prior generated Draft on detail after a later failed run", async () => {
    mocks.prisma.recurringPurchaseRequestSchedule = {
      findUnique: vi.fn().mockResolvedValue({
        ...scheduleRecord({
          id: "schedule_1",
          runs: [
            {
              errorMessage: "Inactive category",
              id: "run_failed",
              occurrenceYear: 2027,
              purchaseRequest: null,
              renewalDate: new Date("2027-09-01T00:00:00.000Z"),
              scheduledDraftDate: new Date("2027-08-02T00:00:00.000Z"),
              startedAt: new Date("2027-08-02T00:00:00.000Z"),
              status: "FAILED",
            },
            {
              errorMessage: null,
              id: "run_success",
              occurrenceYear: 2026,
              purchaseRequest: { id: "pr_generated", prNo: "PR-2026-0999" },
              renewalDate: new Date("2026-09-01T00:00:00.000Z"),
              scheduledDraftDate: new Date("2026-08-02T00:00:00.000Z"),
              startedAt: new Date("2026-08-02T00:00:00.000Z"),
              status: "SUCCEEDED",
            },
          ],
        }),
        items: [],
        responsibleUserId: "user_ari",
        sourcePurchaseRequestId: "pr_source",
      }),
    };

    const detail = await getRecurringScheduleDetail("schedule_1");

    expect(detail).toMatchObject({
      lastRun: { status: "FAILED" },
      latestGeneratedDraft: { id: "pr_generated", label: "PR-2026-0999" },
    });
  });

  test("retains a selected inactive responsible user as a disabled option", async () => {
    mocks.prisma.branch = { findMany: vi.fn().mockResolvedValue([]) };
    mocks.prisma.purchaseRequestCategory = { findMany: vi.fn().mockResolvedValue([]) };
    mocks.prisma.department = { findMany: vi.fn().mockResolvedValue([]) };
    mocks.prisma.user = {
      findMany: vi.fn().mockResolvedValue([{ displayName: "Ari", id: "user_ari", isActive: true }]),
      findUnique: vi.fn().mockResolvedValue({ displayName: "Former owner", id: "user_former", isActive: false }),
    };

    const options = await getRecurringScheduleOptions("user_former");

    expect(options.responsibleUsers).toEqual([
      { disabled: false, id: "user_ari", label: "Ari" },
      { disabled: true, id: "user_former", label: "Former owner (inactive)" },
    ]);
  });
});

test("updates future configuration without changing historical runs and audits occurrence metadata", async () => {
  const tx = {
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit_1" }) },
    branch: { findFirst: vi.fn().mockResolvedValue({ companyId: "company_hq", id: "br_hq" }) },
    department: { findFirst: vi.fn().mockResolvedValue({ id: "dep_it" }) },
    division: { findFirst: vi.fn().mockResolvedValue({ id: "div_it" }) },
    purchaseRequestCategory: { findFirst: vi.fn().mockResolvedValue({ id: "cat_software" }) },
    recurringPurchaseRequestSchedule: {
      findUnique: vi.fn().mockResolvedValue({
        id: "schedule_1",
        runs: [
          { occurrenceYear: 2027, status: "FAILED" },
          { occurrenceYear: 2026, status: "SUCCEEDED" },
        ],
        sourcePurchaseRequestId: "pr_source",
      }),
      update: vi.fn().mockResolvedValue({ id: "schedule_1" }),
    },
    recurringPurchaseRequestScheduleItem: { createMany: vi.fn().mockResolvedValue({ count: 1 }), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    user: { findFirst: vi.fn().mockResolvedValue({ id: "user_ari" }) },
  };
  mocks.prisma.$transaction = vi.fn(async (callback: (txArg: typeof tx) => unknown) => callback(tx));

  await updateRecurringScheduleFromFormData("schedule_1", recurringForm());

  expect(tx.recurringPurchaseRequestSchedule.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ nextRunDate: new Date("2027-08-02T00:00:00.000Z") }),
    }),
  );
  expect(tx.recurringPurchaseRequestScheduleItem.deleteMany).toHaveBeenCalledWith({ where: { scheduleId: "schedule_1" } });
  expect(tx.recurringPurchaseRequestSchedule.findUnique.mock.calls[0][0].select.runs).toEqual({
    orderBy: { occurrenceYear: "desc" },
    select: { occurrenceYear: true, status: true },
  });
  const metadata = JSON.parse(tx.auditLog.create.mock.calls[0][0].data.metadataJson);
  expect(metadata).toMatchObject({
    responsibleUserId: "user_ari",
    renewalDate: "2027-09-01T00:00:00.000Z",
    scheduledDraftDate: "2027-08-02T00:00:00.000Z",
  });
});
