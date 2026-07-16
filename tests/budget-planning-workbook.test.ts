import JSZip from "jszip";
import { describe, expect, test } from "vitest";

import type { BudgetPlanningPageData } from "../lib/budget-planning.server";
import {
  activeRecurringHeaders,
  actualItemHeaders,
  actualPrHeaders,
  buildBudgetPlanningWorkbookSheets,
  categoryHeaders,
  recurringItemHeaders,
} from "../lib/budget-planning-workbook";
import { buildXlsxWorkbook } from "../lib/xlsx";

const data: BudgetPlanningPageData = {
  filters: { baseYear: 2025, forecastYear: 2026, companyId: "company-1", categoryId: "category-1" },
  companies: [
    { label: "All companies", value: "All" },
    { label: "Acme Thailand (Inactive)", value: "company-1" },
  ],
  categories: [
    { label: "All categories", value: "All" },
    { label: "IT - Technology (Inactive)", value: "category-1" },
  ],
  summary: {
    actualSpend: 1500,
    recurringIncludedInActual: 500,
    nonRecurringActual: 1000,
    activeRecurringForecast: 720,
    planningBaseline: 1720,
    actualPrCount: 2,
    activeScheduleCount: 1,
  },
  categoryRows: [{
    categoryId: "category-1",
    categoryCode: "IT",
    categoryName: "Technology",
    categoryIsActive: false,
    actualPrCount: 2,
    actualSpend: 1500,
    recurringIncludedInActual: 500,
    nonRecurringActual: 1000,
    activeScheduleCount: 1,
    activeRecurringForecast: 720,
    planningBaseline: 1720,
  }],
  actualPrRows: [
    {
      categoryId: "category-1", categoryCode: "IT", categoryName: "Technology", categoryIsActive: false,
      purchaseRequestId: "pr-recurring", prNo: "PR-2025-001", baseYear: 2025, documentDate: "2025-02-03",
      companyName: "Acme Thailand", branchName: "Bangkok", departmentName: "IT", divisionName: null,
      purpose: "Cloud renewal", status: "SIGNED", isRecurringOrigin: true,
      recurringScheduleId: "schedule-1", recurringScheduleName: "Cloud subscription", totalAmount: 500,
    },
    {
      categoryId: "category-1", categoryCode: "IT", categoryName: "Technology", categoryIsActive: false,
      purchaseRequestId: "pr-once", prNo: "PR-2025-002", baseYear: 2025, documentDate: "2025-03-04",
      companyName: "Acme Thailand", branchName: "Bangkok", departmentName: "IT", divisionName: "Operations",
      purpose: "Laptops", status: "GENERATED", isRecurringOrigin: false,
      recurringScheduleId: null, recurringScheduleName: null, totalAmount: 1000,
    },
  ],
  actualItemRows: [{
    categoryId: "category-1", categoryCode: "IT", categoryName: "Technology", categoryIsActive: false,
    purchaseRequestId: "pr-recurring", prNo: "PR-2025-001", lineNo: 1, rowType: "ITEM",
    accountCode: "6100", description: "Cloud seats", quantity: 10, unitCost: 50, totalAmount: 500,
  }],
  recurringScheduleRows: [{
    categoryId: "category-1", categoryCode: "IT", categoryName: "Technology", categoryIsActive: false,
    scheduleId: "schedule-1", scheduleName: "Cloud subscription", forecastYear: 2026,
    companyName: "Acme Thailand", branchName: "Bangkok", departmentName: "IT", divisionName: null,
    purpose: "Cloud renewal", renewalDate: "2026-02-03", renewalIssue: null,
    responsibleUserName: "Ada Admin", status: "ACTIVE", totalAmount: 720,
  }],
  recurringItemRows: [{
    categoryId: "category-1", categoryCode: "IT", categoryName: "Technology", categoryIsActive: false,
    scheduleId: "schedule-1", scheduleName: "Cloud subscription", lineNo: 1, rowType: "ITEM",
    accountCode: "6100", description: "Cloud seats", quantity: 12, unitCost: 60, forecastAmount: 720,
  }],
};

describe("budget planning workbook mapping", () => {
  test("returns all six sheets in the exact stable order", () => {
    expect(buildBudgetPlanningWorkbookSheets(data).map((sheet) => sheet.name)).toEqual([
      "Budget Plan Summary", "By Category", "Actual PR", "Actual PR Items", "Active Recurring", "Recurring Items",
    ]);
  });

  test("maps deterministic summary metadata and selected labels", () => {
    const [summary] = buildBudgetPlanningWorkbookSheets(data, new Date("2026-01-02T03:04:05.000Z"));
    expect(summary.rows).toEqual([
      ["Base Year", 2025],
      ["Forecast Year", 2026],
      ["Company Filter", "Acme Thailand (Inactive)"],
      ["Category Filter", "IT - Technology (Inactive)"],
      ["Exported At", "2026-01-02T03:04:05.000Z"],
      ["Actual Spend", 1500],
      ["Recurring Included in Actual", 500],
      ["Non-recurring Actual", 1000],
      ["Active Recurring Forecast", 720],
      ["Planning Baseline", 1720],
      ["Actual Statuses", "GENERATED, PRINTED, SIGNED"],
      ["Recurring Status", "ACTIVE"],
      ["Planning Baseline Formula", "Non-recurring Actual + Active Recurring Forecast"],
    ]);

    const allData = { ...data, filters: { ...data.filters, companyId: "All", categoryId: "All" } };
    const [allSummary] = buildBudgetPlanningWorkbookSheets(allData, new Date("2026-01-02T03:04:05.000Z"));
    expect(allSummary.rows.slice(2, 4)).toEqual([
      ["Company Filter", "All companies"],
      ["Category Filter", "All categories"],
    ]);
  });

  test("maps category counts, precomputed money, and inactive text", () => {
    const category = buildBudgetPlanningWorkbookSheets(data)[1];
    expect(category.rows).toEqual([
      categoryHeaders,
      ["IT", "Technology", "Inactive", 2, 1500, 500, 1000, 1, 720, 1720],
    ]);
  });

  test("keeps stable PR identity across PR and item rows and renders recurring origin as text", () => {
    const sheets = buildBudgetPlanningWorkbookSheets(data);
    expect(sheets[2].rows[0]).toEqual(actualPrHeaders);
    expect(sheets[2].rows[1].slice(3, 5)).toEqual(["pr-recurring", "PR-2025-001"]);
    expect(sheets[3].rows[0]).toEqual(actualItemHeaders);
    expect(sheets[3].rows[1].slice(2, 4)).toEqual(["pr-recurring", "PR-2025-001"]);
    expect(sheets[2].rows.map((row) => row[12])).toEqual(["Recurring Origin", "Yes", "No"]);
  });

  test("keeps stable schedule identity across schedule and item rows", () => {
    const sheets = buildBudgetPlanningWorkbookSheets(data);
    expect(sheets[4].rows[0]).toEqual(activeRecurringHeaders);
    expect(sheets[4].rows[1].slice(4, 6)).toEqual(["schedule-1", "Cloud subscription"]);
    expect(sheets[5].rows[0]).toEqual(recurringItemHeaders);
    expect(sheets[5].rows[1].slice(2, 4)).toEqual(["schedule-1", "Cloud subscription"]);
  });

  test("retains every data header and exact no-data row", () => {
    const empty = buildBudgetPlanningWorkbookSheets({
      ...data,
      categoryRows: [], actualPrRows: [], actualItemRows: [], recurringScheduleRows: [], recurringItemRows: [],
    });
    expect(empty.slice(1).map((sheet) => sheet.rows)).toEqual([
      [categoryHeaders, ["No Category totals for the selected filters"]],
      [actualPrHeaders, ["No qualifying Actual PRs for the selected filters"]],
      [actualItemHeaders, ["No qualifying Actual PR Items for the selected filters"]],
      [activeRecurringHeaders, ["No Active Recurring schedules for the selected filters"]],
      [recurringItemHeaders, ["No Active Recurring Items for the selected filters"]],
    ]);
  });

  test("builds six valid worksheets and preserves numeric money cells", async () => {
    const file = await buildXlsxWorkbook({ sheets: buildBudgetPlanningWorkbookSheets(data) });
    const zip = await JSZip.loadAsync(file);
    const workbook = await zip.file("xl/workbook.xml")?.async("string");
    const categorySheet = await zip.file("xl/worksheets/sheet2.xml")?.async("string");
    for (const name of ["Budget Plan Summary", "By Category", "Actual PR", "Actual PR Items", "Active Recurring", "Recurring Items"]) {
      expect(workbook).toContain(`name="${name}"`);
    }
    expect(zip.file(/^xl\/worksheets\/sheet\d+\.xml$/)).toHaveLength(6);
    expect(categorySheet).toContain('<c r="E2"><v>1500</v></c>');
    expect(categorySheet).toContain('<c r="J2"><v>1720</v></c>');
  });
});
