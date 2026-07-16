import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  requirePermission: vi.fn(),
}));

vi.mock("../lib/auth/current-user", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("../lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import { DraftValidationError } from "../lib/pr-draft";
import {
  createRecurringScheduleFromFormData,
  deriveRecurringScheduleUiStatus,
  mapSourcePrToScheduleForm,
  normalizeRecurringScheduleFilters,
  parseRecurringScheduleForm,
  setRecurringScheduleStatus,
  type RecurringScheduleReferenceLookup,
  validateRecurringScheduleReferences,
} from "../lib/recurring-pr";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ id: "user_admin" });
});

function recurringForm(values: Record<string, string | string[]> = {}) {
  const form = new FormData();
  const defaults: Record<string, string | string[]> = {
    name: " Microsoft 365 Renewal ",
    sourcePurchaseRequestId: " pr_source ",
    branchId: " br_hq ",
    categoryId: " cat_subscription_renewal ",
    departmentId: " dep_it ",
    divisionId: " div_it ",
    purpose: " ต่ออายุ ",
    purchaseMethod: " ฝ่ายจัดซื้อจัดหา ",
    remark: " annual agreement ",
    renewalMonth: "9",
    renewalDay: "1",
    leadDays: "30",
    responsibleUserId: " user_it ",
    rowType: ["HEADING", "ITEM", "DETAIL"],
    accountCode: ["should-clear", "", "also-clear"],
    description: ["License", "Microsoft 365", "100 seats"],
    quantity: ["99", "100", "12"],
    unitCost: ["999", "3500", "88"],
  };

  for (const [key, value] of Object.entries({ ...defaults, ...values })) {
    for (const entry of Array.isArray(value) ? value : [value]) form.append(key, entry);
  }

  return form;
}

function activeReferenceLookup(overrides: Partial<RecurringScheduleReferenceLookup> = {}): RecurringScheduleReferenceLookup {
  return {
    branch: { isActive: true, company: { isActive: true } },
    category: { isActive: true },
    department: { id: "dep_it", isActive: true },
    division: null,
    responsibleUser: { isActive: true },
    ...overrides,
  };
}

describe("recurring schedule form parsing", () => {
  test("parses annual settings and preserves heading/item/detail order", () => {
    const input = parseRecurringScheduleForm(recurringForm());

    expect(input).toMatchObject({
      branchId: "br_hq",
      categoryId: "cat_subscription_renewal",
      leadDays: 30,
      name: "Microsoft 365 Renewal",
      renewalDay: 1,
      renewalMonth: 9,
      responsibleUserId: "user_it",
      remark: "annual agreement",
    });
    expect(input.items).toEqual([
      { rowType: "HEADING", accountCode: "", description: "License", quantity: 0, unitCost: 0, totalAmount: 0 },
      { rowType: "ITEM", accountCode: "", description: "Microsoft 365", quantity: 100, unitCost: 3500, totalAmount: 350000 },
      { rowType: "DETAIL", accountCode: "", description: "100 seats", quantity: 0, unitCost: 0, totalAmount: 0 },
    ]);
  });

  test.each([
    ["0", "leadDays"],
    ["366", "leadDays"],
  ])("rejects lead days %s", (leadDays, field) => {
    expect(() => parseRecurringScheduleForm(recurringForm({ leadDays }))).toThrow(DraftValidationError);

    try {
      parseRecurringScheduleForm(recurringForm({ leadDays }));
    } catch (error) {
      expect(error).toMatchObject({ fieldErrors: { [field]: expect.any(String) } });
    }
  });

  test("rejects an impossible renewal day for its month", () => {
    expect(() => parseRecurringScheduleForm(recurringForm({ renewalMonth: "4", renewalDay: "31" }))).toThrow(DraftValidationError);
  });

  test("allows February 29 as an annual renewal day", () => {
    expect(parseRecurringScheduleForm(recurringForm({ renewalMonth: "2", renewalDay: "29" }))).toMatchObject({ renewalMonth: 2, renewalDay: 29 });
  });

  test("requires the category and one priced item", () => {
    expect(() => parseRecurringScheduleForm(recurringForm({ categoryId: "" }))).toThrow(DraftValidationError);
    expect(() => parseRecurringScheduleForm(recurringForm({ rowType: ["HEADING", "DETAIL"], accountCode: ["", ""], description: ["Licenses", "Renew annually"], quantity: ["", ""], unitCost: ["", ""] }))).toThrow(DraftValidationError);
  });

  test("rejects an inactive responsible user", () => {
    expect(() => validateRecurringScheduleReferences(activeReferenceLookup({ responsibleUser: { isActive: false } }))).toThrow(DraftValidationError);
  });

  test("rejects a branch without loaded company proof", () => {
    const lookup = activeReferenceLookup({
      branch: { isActive: true } as unknown as RecurringScheduleReferenceLookup["branch"],
    });

    expect(() => validateRecurringScheduleReferences(lookup)).toThrow(DraftValidationError);
  });

  test("rejects a missing department", () => {
    expect(() => validateRecurringScheduleReferences(activeReferenceLookup({ department: null }))).toThrow(DraftValidationError);
  });

  test("rejects a division without loaded owner proof", () => {
    const lookup = activeReferenceLookup({
      division: { isActive: true } as unknown as RecurringScheduleReferenceLookup["division"],
    });

    expect(() => validateRecurringScheduleReferences(lookup)).toThrow(DraftValidationError);
  });

  test("rejects a branch whose loaded company is inactive", () => {
    expect(() => validateRecurringScheduleReferences(activeReferenceLookup({ branch: { isActive: true, company: { isActive: false } } }))).toThrow(DraftValidationError);
  });

  test("rejects a division owned by another department", () => {
    expect(() => validateRecurringScheduleReferences(activeReferenceLookup({ division: { isActive: true, departmentId: "dep_other" } }))).toThrow(DraftValidationError);
  });
});

describe("recurring schedule list helpers", () => {
  test("normalizes optional filters into stable schedule list values", () => {
    expect(normalizeRecurringScheduleFilters({ categoryId: "cat_hardware", q: " renewal ", status: "paused" })).toEqual({
      categoryId: "cat_hardware",
      q: "renewal",
      responsibleUserId: "ALL",
      status: "PAUSED",
      upcoming: "ALL",
    });
  });

  test("marks active schedules that failed or reference inactive records as needing attention", () => {
    expect(deriveRecurringScheduleUiStatus({ persistedStatus: "ACTIVE", latestRunStatus: "FAILED", referencesActive: true })).toBe(
      "NEEDS_ATTENTION",
    );
    expect(deriveRecurringScheduleUiStatus({ persistedStatus: "ACTIVE", latestRunStatus: null, referencesActive: false })).toBe(
      "NEEDS_ATTENTION",
    );
    expect(deriveRecurringScheduleUiStatus({ persistedStatus: "PAUSED", latestRunStatus: null, referencesActive: true })).toBe("PAUSED");
  });
});

describe("recurring schedule mutations", () => {
  test("creates a schedule snapshot, ordered items, and audit event in one transaction", async () => {
    const tx = {
      auditLog: { create: vi.fn().mockResolvedValue({ id: "audit_1" }) },
      branch: { findFirst: vi.fn().mockResolvedValue({ companyId: "company_hq", id: "br_hq" }) },
      department: { findFirst: vi.fn().mockResolvedValue({ id: "dep_it" }) },
      division: { findFirst: vi.fn().mockResolvedValue({ id: "div_it" }) },
      purchaseRequest: {
        findUnique: vi.fn().mockResolvedValue({ id: "pr_source", items: [{ id: "item_source" }], vatRate: 7 }),
      },
      purchaseRequestCategory: { findFirst: vi.fn().mockResolvedValue({ id: "cat_subscription_renewal" }) },
      recurringPurchaseRequestSchedule: { create: vi.fn().mockResolvedValue({ id: "schedule_1" }) },
      user: { findFirst: vi.fn().mockResolvedValue({ id: "user_it" }) },
    };
    mocks.prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) => callback(tx));

    const created = await createRecurringScheduleFromFormData("pr_source", recurringForm());

    expect(created).toEqual({ id: "schedule_1" });
    expect(mocks.requirePermission).toHaveBeenCalledWith("PR_RECURRING_MANAGE");
    expect(tx.purchaseRequest.findUnique).toHaveBeenCalledWith({
      include: { items: { orderBy: { lineNo: "asc" } } },
      where: { id: "pr_source" },
    });
    expect(tx.recurringPurchaseRequestSchedule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        branchId: "br_hq",
        companyId: "company_hq",
        createdById: "user_admin",
        sourcePurchaseRequestId: "pr_source",
        status: "ACTIVE",
        vatRate: 7,
        items: {
          create: expect.arrayContaining([
            expect.objectContaining({ lineNo: 1, rowType: "HEADING" }),
            expect.objectContaining({ lineNo: 2, rowType: "ITEM", totalAmount: 350000 }),
          ]),
        },
      }),
      select: { id: true },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "Recurring schedule created", actorId: "user_admin", entityId: "schedule_1" }),
    });
    const metadata = JSON.parse(tx.auditLog.create.mock.calls[0][0].data.metadataJson);
    expect(metadata).toMatchObject({
      responsibleUserId: "user_it",
      renewalDate: expect.any(String),
      scheduledDraftDate: expect.any(String),
    });
  });

  test("rejects unsupported persisted schedule statuses before opening a transaction", async () => {
    await expect(setRecurringScheduleStatus("schedule_1", "FAILED" as "ACTIVE")).rejects.toThrow("Schedule status must be ACTIVE or PAUSED");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});

test("maps only editable source PR snapshot data in item order", () => {
  const value = mapSourcePrToScheduleForm(
    {
      id: "pr_source",
      prNo: "PR-2026-0001",
      refNo: "REF-1",
      status: "ISSUED",
      templateVersionId: "template_1",
      generatedSnapshotJson: "{generated}",
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      printedAt: new Date("2026-01-02T00:00:00.000Z"),
      signedAt: new Date("2026-01-03T00:00:00.000Z"),
      cancelledAt: null,
      clonedFromId: "clone_1",
      reissuedFromId: "reissue_1",
      attachments: [{ id: "file_1" }],
      auditLogs: [{ id: "audit_1" }],
      branchId: "br_hq",
      categoryId: "cat_renewal",
      departmentId: "dep_it",
      divisionId: "div_it",
      purpose: "ต่ออายุ",
      purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
      remark: "Renew services",
      items: [
        { lineNo: 2, rowType: "ITEM", accountCode: "", description: "Support", quantity: "1.0000", unitCost: "25000.00" },
        { lineNo: 1, rowType: "HEADING", accountCode: "ignore", description: "Software", quantity: "9.0000", unitCost: "9.00" },
      ],
    },
    { leadDays: 30, renewalDay: 15, renewalMonth: 1, responsibleUserId: "user_it" },
  );

  expect(value).toEqual({
    name: "",
    sourcePurchaseRequestId: "pr_source",
    sourcePurchaseRequestLabel: "PR-2026-0001",
    branchId: "br_hq",
    categoryId: "cat_renewal",
    departmentId: "dep_it",
    divisionId: "div_it",
    purpose: "ต่ออายุ",
    purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
    remark: "Renew services",
    renewalMonth: 1,
    renewalDay: 15,
    leadDays: 30,
    responsibleUserId: "user_it",
    items: [
      { rowType: "HEADING", accountCode: "", description: "Software", quantity: 0, unitCost: 0 },
      { rowType: "ITEM", accountCode: "", description: "Support", quantity: 1, unitCost: 25000 },
    ],
  });
});

test("uses Draft pending when a source PR has no number", () => {
  const value = mapSourcePrToScheduleForm(
    {
      id: "pr_draft",
      prNo: null,
      branchId: "br_hq",
      categoryId: "cat_renewal",
      departmentId: "dep_it",
      divisionId: null,
      purpose: "Renew",
      purchaseMethod: "Procurement",
      remark: null,
      items: [],
    },
    { leadDays: 30, renewalDay: 15, renewalMonth: 1 },
  );

  expect(value.sourcePurchaseRequestLabel).toBe("Draft pending");
});
