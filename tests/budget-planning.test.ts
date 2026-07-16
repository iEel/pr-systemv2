import { describe, expect, test } from "vitest";
import {
  buildBudgetPlanningDateRange,
  buildBudgetPlanningExportHref,
  buildBudgetPlanningHref,
  buildBudgetPlanningYearOptions,
  buildBudgetPlanningViewModel,
  normalizeBudgetPlanningFilters,
  type BudgetPlanningActualRecord,
  type BudgetPlanningItemRecord,
  type BudgetPlanningRecurringRecord,
} from "../lib/budget-planning";

describe("budget planning year options", () => {
  test("deduplicates qualifying years, includes the current year, and sorts newest first", () => {
    expect(buildBudgetPlanningYearOptions({
      availableYears: [2024, "2025", 2024, "invalid"],
      currentYear: 2026,
      selectedYear: 2026,
    })).toEqual([
      { label: "2026 — ปีปัจจุบัน", value: "2026" },
      { label: "2025", value: "2025" },
      { label: "2024", value: "2024" },
    ]);
  });

  test("retains a valid selected fallback and rejects invalid year records", () => {
    expect(buildBudgetPlanningYearOptions({
      availableYears: [1999, 2025.5, 2101, Number.NaN],
      currentYear: 2026,
      selectedYear: 2023,
    })).toEqual([
      { label: "2026 — ปีปัจจุบัน", value: "2026" },
      { label: "2023", value: "2023" },
    ]);
  });
});

describe("budget planning filters", () => {
  test("defaults invalid and empty inputs and derives forecast year", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");

    expect(normalizeBudgetPlanningFilters({ year: "broken", companyId: "", categoryId: "  " }, now)).toEqual({
      baseYear: 2026,
      forecastYear: 2027,
      companyId: "All",
      categoryId: "All",
    });
    expect(normalizeBudgetPlanningFilters({ year: 1999 }, now).baseYear).toBe(2026);
    expect(normalizeBudgetPlanningFilters({ year: 2101 }, now).baseYear).toBe(2026);
    expect(normalizeBudgetPlanningFilters({ year: 2025.5 }, now).baseYear).toBe(2026);
    expect(normalizeBudgetPlanningFilters({ year: "" }, now).baseYear).toBe(2026);
  });

  test("accepts boundary years and builds the UTC base-year range", () => {
    expect(normalizeBudgetPlanningFilters({ year: "2000" }, new Date("2026-07-16T00:00:00.000Z"))).toMatchObject({
      baseYear: 2000,
      forecastYear: 2001,
    });
    expect(normalizeBudgetPlanningFilters({ year: 2100 }, new Date("2026-07-16T00:00:00.000Z"))).toMatchObject({
      baseYear: 2100,
      forecastYear: 2101,
    });
    expect(buildBudgetPlanningDateRange(2026)).toEqual({
      gte: new Date("2026-01-01T00:00:00.000Z"),
      lt: new Date("2027-01-01T00:00:00.000Z"),
    });
  });

  test("builds planning and export URLs and omits All filters", () => {
    const filters = { baseYear: 2026, forecastYear: 2027, companyId: "co_1", categoryId: "cat_1" };

    expect(buildBudgetPlanningHref(filters)).toBe("/dashboard?view=planning&year=2026&companyId=co_1&categoryId=cat_1");
    expect(buildBudgetPlanningExportHref(filters)).toBe(
      "/dashboard/budget-planning/export?year=2026&companyId=co_1&categoryId=cat_1",
    );
    expect(buildBudgetPlanningHref({ ...filters, companyId: "All", categoryId: "All" })).toBe(
      "/dashboard?view=planning&year=2026",
    );
    expect(buildBudgetPlanningExportHref({ ...filters, companyId: "All", categoryId: "All" })).toBe(
      "/dashboard/budget-planning/export?year=2026",
    );
  });
});

const activeCategory = { id: "cat_sub", code: "SUBSCRIPTION", name: "Subscription", isActive: true };

function item(overrides: Partial<BudgetPlanningItemRecord> = {}): BudgetPlanningItemRecord {
  return {
    lineNo: 1,
    rowType: "ITEM",
    accountCode: "6100",
    description: "Annual service",
    quantity: "1",
    unitCost: "100",
    totalAmount: "100",
    ...overrides,
  };
}

function actual(overrides: Partial<BudgetPlanningActualRecord> = {}): BudgetPlanningActualRecord {
  return {
    id: "pr_1",
    prNo: "PR-2026-001",
    companyId: "co_1",
    documentDate: new Date("2026-03-01T00:00:00.000Z"),
    purpose: "Software renewal",
    status: "GENERATED",
    totalAmount: "100",
    categoryId: activeCategory.id,
    category: activeCategory,
    company: { displayName: "Sonic" },
    branch: { name: "Bangkok" },
    department: { name: "IT" },
    division: { name: "Infrastructure" },
    recurringRun: null,
    items: [item()],
    ...overrides,
  };
}

function schedule(overrides: Partial<BudgetPlanningRecurringRecord> = {}): BudgetPlanningRecurringRecord {
  return {
    id: "sch_1",
    name: "Annual license",
    companyId: "co_1",
    purpose: "Software renewal",
    status: "ACTIVE",
    renewalMonth: 4,
    renewalDay: 15,
    categoryId: activeCategory.id,
    category: activeCategory,
    company: { displayName: "Sonic" },
    branch: { name: "Bangkok" },
    department: { name: "IT" },
    division: { name: "Infrastructure" },
    responsibleUser: { displayName: "Ada Lovelace" },
    items: [item({ totalAmount: "60" })],
    ...overrides,
  };
}

function filters(overrides: { companyId?: string; categoryId?: string } = {}) {
  return normalizeBudgetPlanningFilters({ year: 2026, ...overrides }, new Date("2026-07-16T00:00:00.000Z"));
}

describe("budget planning calculations", () => {
  test("excludes invalid statuses and avoids double-counting recurring-origin actuals", () => {
    const view = buildBudgetPlanningViewModel({
      filters: filters(),
      actualRecords: [
        actual({ id: "pr_once", prNo: "PR-ONCE", status: "GENERATED", totalAmount: "100", recurringRun: null }),
        actual({
          id: "pr_recurring",
          prNo: "PR-RECURRING",
          status: "SIGNED",
          totalAmount: "40",
          recurringRun: { schedule: { id: "sch_1", name: "Annual license" } },
        }),
        actual({ id: "pr_draft", status: "DRAFT", totalAmount: "900", recurringRun: null }),
        actual({ id: "pr_cancelled", status: "CANCELLED", totalAmount: "800", recurringRun: null }),
        actual({ id: "pr_reissued", status: "REISSUED", totalAmount: "700", recurringRun: null }),
        actual({ id: "pr_old", documentDate: new Date("2025-12-31T23:59:59.999Z"), totalAmount: "600" }),
        actual({ id: "pr_next", documentDate: new Date("2027-01-01T00:00:00.000Z"), totalAmount: "500" }),
      ],
      recurringRecords: [
        schedule({ id: "sch_1", status: "ACTIVE", items: [item({ totalAmount: "60" })] }),
        schedule({ id: "sch_paused", status: "PAUSED", items: [item({ totalAmount: "700" })] }),
        schedule({ id: "sch_attention", status: "NEEDS_ATTENTION", items: [item({ totalAmount: "800" })] }),
      ],
    });

    expect(view.summary).toEqual({
      actualSpend: 140,
      recurringIncludedInActual: 40,
      nonRecurringActual: 100,
      activeRecurringForecast: 60,
      planningBaseline: 160,
      actualPrCount: 2,
      activeScheduleCount: 1,
    });
    expect(view.categoryRows[0]).toMatchObject({ planningBaseline: 160, actualPrCount: 2, activeScheduleCount: 1 });
    expect(view.actualPrRows).toHaveLength(2);
    expect(view.recurringScheduleRows).toHaveLength(1);
  });

  test("enforces Company filtering for actual and recurring records", () => {
    const view = buildBudgetPlanningViewModel({
      filters: filters({ companyId: "co_2" }),
      actualRecords: [actual(), actual({ id: "pr_2", companyId: "co_2", totalAmount: "25" })],
      recurringRecords: [schedule(), schedule({ id: "sch_2", companyId: "co_2", items: [item({ totalAmount: "10" })] })],
    });

    expect(view.summary).toMatchObject({ actualSpend: 25, activeRecurringForecast: 10, planningBaseline: 35 });
    expect(view.actualPrRows.map((row) => row.purchaseRequestId)).toEqual(["pr_2"]);
    expect(view.recurringScheduleRows.map((row) => row.scheduleId)).toEqual(["sch_2"]);
  });

  test("enforces Category filtering for actual and recurring records", () => {
    const hardware = { id: "cat_hw", code: "HARDWARE", name: "Hardware", isActive: true };
    const view = buildBudgetPlanningViewModel({
      filters: filters({ categoryId: hardware.id }),
      actualRecords: [actual(), actual({ id: "pr_hw", categoryId: hardware.id, category: hardware, totalAmount: "30" })],
      recurringRecords: [schedule(), schedule({ id: "sch_hw", categoryId: hardware.id, category: hardware, items: [item({ totalAmount: "20" })] })],
    });

    expect(view.summary).toMatchObject({ actualSpend: 30, activeRecurringForecast: 20, planningBaseline: 50 });
    expect(view.categoryRows).toHaveLength(1);
    expect(view.categoryRows[0]).toMatchObject({ categoryId: "cat_hw", categoryCode: "HARDWARE" });
  });

  test("retains inactive Categories and groups missing Categories as Not categorized", () => {
    const inactive = { id: "cat_old", code: "LEGACY", name: "Legacy", isActive: false };
    const view = buildBudgetPlanningViewModel({
      filters: filters(),
      actualRecords: [
        actual({ id: "pr_inactive", categoryId: inactive.id, category: inactive, totalAmount: "20" }),
        actual({ id: "pr_uncategorized", categoryId: null, category: null, totalAmount: "10" }),
      ],
      recurringRecords: [],
    });

    expect(view.categoryRows).toEqual([
      expect.objectContaining({ categoryId: "cat_old", categoryCode: "LEGACY", categoryName: "Legacy", categoryIsActive: false }),
      expect.objectContaining({
        categoryId: null,
        categoryCode: "Not categorized",
        categoryName: "Not categorized",
        categoryIsActive: false,
      }),
    ]);
  });

  test("normalizes non-finite money to zero, retains zero details, and rounds accumulated money", () => {
    const view = buildBudgetPlanningViewModel({
      filters: filters(),
      actualRecords: [
        actual({ id: "pr_nan", totalAmount: Number.NaN, items: [item({ totalAmount: Number.POSITIVE_INFINITY })] }),
        actual({ id: "pr_zero", totalAmount: 0, items: [item({ totalAmount: 0 })] }),
        actual({ id: "pr_round_1", totalAmount: "0.105", items: [] }),
        actual({ id: "pr_round_2", totalAmount: "0.105", items: [] }),
      ],
      recurringRecords: [schedule({ items: [item({ totalAmount: "not-a-number" }), item({ lineNo: 2, totalAmount: "0.105" })] })],
    });

    expect(view.summary).toMatchObject({ actualSpend: 0.22, activeRecurringForecast: 0.11, planningBaseline: 0.33 });
    expect(view.actualPrRows).toHaveLength(4);
    expect(view.actualItemRows).toHaveLength(2);
    expect(view.recurringItemRows).toHaveLength(2);
    expect(view.actualItemRows.map((row) => row.totalAmount)).toEqual([0, 0]);
    expect(view.recurringItemRows.map((row) => row.forecastAmount)).toEqual([0, 0.11]);
  });

  test("returns valid forecast renewal dates and explicit issues for invalid dates", () => {
    const view = buildBudgetPlanningViewModel({
      filters: filters(),
      actualRecords: [],
      recurringRecords: [
        schedule({ id: "sch_valid", name: "Valid", renewalMonth: 2, renewalDay: 28 }),
        schedule({ id: "sch_invalid", name: "Invalid", renewalMonth: 2, renewalDay: 29 }),
        schedule({ id: "sch_bad_month", name: "Bad month", renewalMonth: 13, renewalDay: 1 }),
      ],
    });

    expect(view.recurringScheduleRows.find((row) => row.scheduleId === "sch_valid")).toMatchObject({
      renewalDate: "2027-02-28",
      renewalIssue: null,
    });
    for (const scheduleId of ["sch_invalid", "sch_bad_month"]) {
      const row = view.recurringScheduleRows.find((candidate) => candidate.scheduleId === scheduleId);
      expect(row?.renewalDate).toBeNull();
      expect(row?.renewalIssue).toEqual(expect.any(String));
      expect(row?.renewalIssue).not.toBe("");
    }
  });

  test("reconciles Summary exactly with Category totals and sorts by baseline then name", () => {
    const alpha = { id: "cat_a", code: "A", name: "Alpha", isActive: true };
    const beta = { id: "cat_b", code: "B", name: "Beta", isActive: true };
    const view = buildBudgetPlanningViewModel({
      filters: filters(),
      actualRecords: [
        actual({ id: "pr_b", categoryId: beta.id, category: beta, totalAmount: "10" }),
        actual({ id: "pr_a", categoryId: alpha.id, category: alpha, totalAmount: "10" }),
      ],
      recurringRecords: [schedule({ id: "sch_sub", items: [item({ totalAmount: "15" })] })],
    });

    expect(view.categoryRows.map((row) => row.categoryName)).toEqual(["Subscription", "Alpha", "Beta"]);
    for (const key of [
      "actualSpend",
      "recurringIncludedInActual",
      "nonRecurringActual",
      "activeRecurringForecast",
      "planningBaseline",
      "actualPrCount",
      "activeScheduleCount",
    ] as const) {
      expect(view.summary[key]).toBe(view.categoryRows.reduce((total, row) => total + row[key], 0));
    }
  });

  test("joins complete detail fields and preserves Category-first stable line ordering", () => {
    const alpha = { id: "cat_a", code: "A", name: "Alpha", isActive: true };
    const view = buildBudgetPlanningViewModel({
      filters: filters(),
      actualRecords: [
        actual({ id: "pr_z", prNo: null, items: [item({ lineNo: 2 }), item({ lineNo: 1 })] }),
        actual({
          id: "pr_a",
          prNo: "PR-A",
          categoryId: alpha.id,
          category: alpha,
          documentDate: "2026-01-02T00:00:00.000Z",
          recurringRun: { schedule: { id: "sch_origin", name: "Origin" } },
          items: [item({ lineNo: 2, rowType: "DETAIL" }), item({ lineNo: 1, description: "First" })],
        }),
      ],
      recurringRecords: [
        schedule({ id: "sch_z", name: "Zulu" }),
        schedule({
          id: "sch_a",
          name: "Alpha schedule",
          categoryId: alpha.id,
          category: alpha,
          responsibleUser: { displayName: "Grace Hopper" },
          items: [item({ lineNo: 2 }), item({ lineNo: 1 })],
        }),
      ],
    });

    expect(view.actualPrRows.map((row) => row.purchaseRequestId)).toEqual(["pr_a", "pr_z"]);
    expect(view.actualItemRows.map((row) => `${row.purchaseRequestId}:${row.lineNo}`)).toEqual([
      "pr_a:1",
      "pr_a:2",
      "pr_z:1",
      "pr_z:2",
    ]);
    expect(view.actualPrRows[0]).toMatchObject({
      purchaseRequestId: "pr_a",
      prNo: "PR-A",
      baseYear: 2026,
      documentDate: "2026-01-02",
      categoryCode: "A",
      companyName: "Sonic",
      branchName: "Bangkok",
      departmentName: "IT",
      divisionName: "Infrastructure",
      purpose: "Software renewal",
      status: "GENERATED",
      isRecurringOrigin: true,
    });
    expect(view.actualItemRows[0]).toMatchObject({
      purchaseRequestId: "pr_a",
      prNo: "PR-A",
      lineNo: 1,
      rowType: "ITEM",
      accountCode: "6100",
      description: "First",
      quantity: 1,
      unitCost: 100,
      totalAmount: 100,
    });
    expect(view.recurringScheduleRows.map((row) => row.scheduleId)).toEqual(["sch_a", "sch_z"]);
    expect(view.recurringItemRows.map((row) => `${row.scheduleId}:${row.lineNo}`)).toEqual([
      "sch_a:1",
      "sch_a:2",
      "sch_z:1",
    ]);
    expect(view.recurringScheduleRows[0]).toMatchObject({
      scheduleId: "sch_a",
      scheduleName: "Alpha schedule",
      forecastYear: 2027,
      categoryCode: "A",
      companyName: "Sonic",
      branchName: "Bangkok",
      departmentName: "IT",
      divisionName: "Infrastructure",
      responsibleUserName: "Grace Hopper",
      status: "ACTIVE",
    });
  });
});
