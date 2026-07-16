import type { BudgetPlanningPageData } from "./budget-planning.server";
import type { XlsxCell, XlsxSheet } from "./xlsx";

export const categoryHeaders: XlsxCell[] = [
  "Category Code", "Category Name", "Category Status", "Actual PR Count", "Actual Spend",
  "Recurring Included in Actual", "Non-recurring Actual", "Active Schedule Count",
  "Next-year Recurring", "Planning Baseline",
];

export const actualPrHeaders: XlsxCell[] = [
  "Base Year", "Category Code", "Category Name", "PR ID", "PR No.", "Document Date", "Company",
  "Branch", "Department", "Division", "Purpose", "Status", "Recurring Origin", "Total Amount",
];

export const actualItemHeaders: XlsxCell[] = [
  "Category Code", "Category Name", "PR ID", "PR No.", "Line No.", "Row Type", "Account Code",
  "Description", "Quantity", "Unit Cost", "Total Amount",
];

export const activeRecurringHeaders: XlsxCell[] = [
  "Forecast Year", "Category Code", "Category Name", "Category Status", "Schedule ID", "Schedule Name",
  "Company", "Branch", "Department", "Division", "Forecast Renewal Date", "Renewal Issue",
  "Responsible User", "Status", "Schedule Total",
];

export const recurringItemHeaders: XlsxCell[] = [
  "Category Code", "Category Name", "Schedule ID", "Schedule Name", "Line No.", "Row Type",
  "Account Code", "Description", "Quantity", "Unit Cost", "Forecast Amount",
];

function optionLabel(options: BudgetPlanningPageData["companies"], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function rowsOrExplanation(headers: XlsxCell[], rows: XlsxCell[][], explanation: string) {
  return [headers, ...(rows.length ? rows : [[explanation]])];
}

function activeText(isActive: boolean) {
  return isActive ? "Active" : "Inactive";
}

export function buildBudgetPlanningWorkbookSheets(
  data: BudgetPlanningPageData,
  exportedAt = new Date(),
): XlsxSheet[] {
  const summaryRows: XlsxCell[][] = [
    ["Base Year", data.filters.baseYear],
    ["Forecast Year", data.filters.forecastYear],
    ["Company Filter", optionLabel(data.companies, data.filters.companyId)],
    ["Category Filter", optionLabel(data.categories, data.filters.categoryId)],
    ["Exported At", exportedAt.toISOString()],
    ["Actual Spend", data.summary.actualSpend],
    ["Recurring Included in Actual", data.summary.recurringIncludedInActual],
    ["Non-recurring Actual", data.summary.nonRecurringActual],
    ["Active Recurring Forecast", data.summary.activeRecurringForecast],
    ["Planning Baseline", data.summary.planningBaseline],
    ["Actual Statuses", "GENERATED, PRINTED, SIGNED"],
    ["Recurring Status", "ACTIVE"],
    ["Planning Baseline Formula", "Non-recurring Actual + Active Recurring Forecast"],
  ];

  const categoryRows = data.categoryRows.map<XlsxCell[]>((row) => [
    row.categoryCode, row.categoryName, activeText(row.categoryIsActive), row.actualPrCount, row.actualSpend,
    row.recurringIncludedInActual, row.nonRecurringActual, row.activeScheduleCount,
    row.activeRecurringForecast, row.planningBaseline,
  ]);
  const actualPrRows = data.actualPrRows.map<XlsxCell[]>((row) => [
    row.baseYear, row.categoryCode, row.categoryName, row.purchaseRequestId, row.prNo, row.documentDate,
    row.companyName, row.branchName, row.departmentName, row.divisionName, row.purpose, row.status,
    row.isRecurringOrigin ? "Yes" : "No", row.totalAmount,
  ]);
  const actualItemRows = data.actualItemRows.map<XlsxCell[]>((row) => [
    row.categoryCode, row.categoryName, row.purchaseRequestId, row.prNo, row.lineNo, row.rowType,
    row.accountCode, row.description, row.quantity, row.unitCost, row.totalAmount,
  ]);
  const recurringScheduleRows = data.recurringScheduleRows.map<XlsxCell[]>((row) => [
    row.forecastYear, row.categoryCode, row.categoryName, activeText(row.categoryIsActive), row.scheduleId,
    row.scheduleName, row.companyName, row.branchName, row.departmentName, row.divisionName, row.renewalDate,
    row.renewalIssue, row.responsibleUserName, activeText(row.status === "ACTIVE"), row.totalAmount,
  ]);
  const recurringItemRows = data.recurringItemRows.map<XlsxCell[]>((row) => [
    row.categoryCode, row.categoryName, row.scheduleId, row.scheduleName, row.lineNo, row.rowType,
    row.accountCode, row.description, row.quantity, row.unitCost, row.forecastAmount,
  ]);

  return [
    { name: "Budget Plan Summary", rows: summaryRows },
    { name: "By Category", rows: rowsOrExplanation(categoryHeaders, categoryRows, "No Category totals for the selected filters") },
    { name: "Actual PR", rows: rowsOrExplanation(actualPrHeaders, actualPrRows, "No qualifying Actual PRs for the selected filters") },
    { name: "Actual PR Items", rows: rowsOrExplanation(actualItemHeaders, actualItemRows, "No qualifying Actual PR Items for the selected filters") },
    { name: "Active Recurring", rows: rowsOrExplanation(activeRecurringHeaders, recurringScheduleRows, "No Active Recurring schedules for the selected filters") },
    { name: "Recurring Items", rows: rowsOrExplanation(recurringItemHeaders, recurringItemRows, "No Active Recurring Items for the selected filters") },
  ];
}
