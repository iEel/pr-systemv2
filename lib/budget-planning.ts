export type BudgetPlanningFiltersInput = {
  year?: string | number | null;
  companyId?: string | null;
  categoryId?: string | null;
};

export type NormalizedBudgetPlanningFilters = {
  baseYear: number;
  forecastYear: number;
  companyId: string;
  categoryId: string;
};

export const INCLUDED_ACTUAL_STATUSES = ["GENERATED", "PRINTED", "SIGNED"] as const;
const INCLUDED_ACTUAL_STATUS_SET = new Set<string>(INCLUDED_ACTUAL_STATUSES);

export type BudgetPlanningYearOption = { label: string; value: string };

export function buildBudgetPlanningYearOptions({
  availableYears,
  currentYear,
  selectedYear,
}: {
  availableYears: Array<number | string>;
  currentYear: number;
  selectedYear: number;
}): BudgetPlanningYearOption[] {
  const years = new Set<number>([currentYear, selectedYear]);
  for (const value of availableYears) {
    const year = Number(value);
    if (Number.isInteger(year) && year >= 2000 && year <= 2100) years.add(year);
  }

  return [...years]
    .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100)
    .sort((left, right) => right - left)
    .map((year) => ({
      label: year === currentYear ? `${year} — ปีปัจจุบัน` : String(year),
      value: String(year),
    }));
}

export function normalizeBudgetPlanningFilters(
  input: BudgetPlanningFiltersInput = {},
  now = new Date(),
): NormalizedBudgetPlanningFilters {
  const candidate = Number(input.year);
  const baseYear = Number.isInteger(candidate) && candidate >= 2000 && candidate <= 2100 ? candidate : now.getFullYear();

  return {
    baseYear,
    forecastYear: baseYear + 1,
    companyId: input.companyId?.trim() || "All",
    categoryId: input.categoryId?.trim() || "All",
  };
}

export function buildBudgetPlanningDateRange(baseYear: number) {
  return {
    gte: new Date(Date.UTC(baseYear, 0, 1)),
    lt: new Date(Date.UTC(baseYear + 1, 0, 1)),
  };
}

function planningParams(filters: NormalizedBudgetPlanningFilters) {
  const params = new URLSearchParams({ view: "planning", year: String(filters.baseYear) });
  if (filters.companyId !== "All") params.set("companyId", filters.companyId);
  if (filters.categoryId !== "All") params.set("categoryId", filters.categoryId);
  return params;
}

export function buildBudgetPlanningHref(filters: NormalizedBudgetPlanningFilters) {
  return `/dashboard?${planningParams(filters).toString()}`;
}

export function buildBudgetPlanningExportHref(filters: NormalizedBudgetPlanningFilters) {
  const params = planningParams(filters);
  params.delete("view");
  return `/dashboard/budget-planning/export?${params.toString()}`;
}

export type BudgetPlanningNumericValue = string | number | { toString(): string };

export type BudgetPlanningCategoryRecord = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type BudgetPlanningCompanyRecord = {
  displayName: string;
};

export type BudgetPlanningBranchRecord = {
  name: string;
};

export type BudgetPlanningDepartmentRecord = {
  name: string;
};

export type BudgetPlanningDivisionRecord = {
  name: string;
};

export type BudgetPlanningResponsibleUserRecord = {
  displayName: string;
};

export type BudgetPlanningOrganizationRecord = {
  companyId: string;
  company: BudgetPlanningCompanyRecord;
  branch: BudgetPlanningBranchRecord;
  department: BudgetPlanningDepartmentRecord;
  division: BudgetPlanningDivisionRecord | null;
};

export type BudgetPlanningItemRecord = {
  lineNo: number;
  rowType: string;
  accountCode: string;
  description: string;
  quantity: BudgetPlanningNumericValue;
  unitCost: BudgetPlanningNumericValue;
  totalAmount: BudgetPlanningNumericValue;
};

export type BudgetPlanningActualRecord = BudgetPlanningOrganizationRecord & {
  id: string;
  prNo: string | null;
  documentDate: Date | string;
  purpose: string;
  status: string;
  totalAmount: BudgetPlanningNumericValue;
  categoryId: string | null;
  category: BudgetPlanningCategoryRecord | null;
  recurringRun: { schedule: { id: string; name: string } } | null;
  items: BudgetPlanningItemRecord[];
};

export type BudgetPlanningRecurringRecord = BudgetPlanningOrganizationRecord & {
  id: string;
  name: string;
  purpose: string;
  status: string;
  renewalMonth: number;
  renewalDay: number;
  categoryId: string | null;
  category: BudgetPlanningCategoryRecord | null;
  responsibleUser: BudgetPlanningResponsibleUserRecord;
  items: BudgetPlanningItemRecord[];
};

export type BudgetPlanningSummary = {
  actualSpend: number;
  recurringIncludedInActual: number;
  nonRecurringActual: number;
  activeRecurringForecast: number;
  planningBaseline: number;
  actualPrCount: number;
  activeScheduleCount: number;
};

export type BudgetPlanningCategoryRow = BudgetPlanningSummary & {
  categoryId: string | null;
  categoryCode: string;
  categoryName: string;
  categoryIsActive: boolean;
};

type BudgetPlanningCategoryIdentity = Pick<
  BudgetPlanningCategoryRow,
  "categoryId" | "categoryCode" | "categoryName" | "categoryIsActive"
>;

export type BudgetPlanningActualPrRow = BudgetPlanningCategoryIdentity & {
  purchaseRequestId: string;
  prNo: string | null;
  baseYear: number;
  documentDate: string;
  companyName: string;
  branchName: string;
  departmentName: string;
  divisionName: string | null;
  purpose: string;
  status: string;
  isRecurringOrigin: boolean;
  recurringScheduleId: string | null;
  recurringScheduleName: string | null;
  totalAmount: number;
};

export type BudgetPlanningActualItemRow = BudgetPlanningCategoryIdentity & {
  purchaseRequestId: string;
  prNo: string | null;
  lineNo: number;
  rowType: string;
  accountCode: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
};

export type BudgetPlanningRecurringScheduleRow = BudgetPlanningCategoryIdentity & {
  scheduleId: string;
  scheduleName: string;
  forecastYear: number;
  companyName: string;
  branchName: string;
  departmentName: string;
  divisionName: string | null;
  purpose: string;
  renewalDate: string | null;
  renewalIssue: string | null;
  responsibleUserName: string;
  status: string;
  totalAmount: number;
};

export type BudgetPlanningRecurringItemRow = BudgetPlanningCategoryIdentity & {
  scheduleId: string;
  scheduleName: string;
  lineNo: number;
  rowType: string;
  accountCode: string;
  description: string;
  quantity: number;
  unitCost: number;
  forecastAmount: number;
};

export type BudgetPlanningViewModel = {
  filters: NormalizedBudgetPlanningFilters;
  summary: BudgetPlanningSummary;
  categoryRows: BudgetPlanningCategoryRow[];
  actualPrRows: BudgetPlanningActualPrRow[];
  actualItemRows: BudgetPlanningActualItemRow[];
  recurringScheduleRows: BudgetPlanningRecurringScheduleRow[];
  recurringItemRows: BudgetPlanningRecurringItemRow[];
};

const UNCATEGORIZED_KEY = "__not_categorized__";

function finiteNumber(value: BudgetPlanningNumericValue) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addMoney(left: number, right: number) {
  return roundMoney(left + finiteNumber(right));
}

function money(value: BudgetPlanningNumericValue) {
  return roundMoney(finiteNumber(value));
}

function emptySummary(): BudgetPlanningSummary {
  return {
    actualSpend: 0,
    recurringIncludedInActual: 0,
    nonRecurringActual: 0,
    activeRecurringForecast: 0,
    planningBaseline: 0,
    actualPrCount: 0,
    activeScheduleCount: 0,
  };
}

function categoryIdentity(record: { categoryId: string | null; category: BudgetPlanningCategoryRecord | null }): BudgetPlanningCategoryIdentity {
  if (!record.categoryId || !record.category) {
    return {
      categoryId: null,
      categoryCode: "Not categorized",
      categoryName: "Not categorized",
      categoryIsActive: false,
    };
  }

  return {
    categoryId: record.category.id,
    categoryCode: record.category.code,
    categoryName: record.category.name,
    categoryIsActive: record.category.isActive,
  };
}

function categoryKey(identity: BudgetPlanningCategoryIdentity) {
  return identity.categoryId || UNCATEGORIZED_KEY;
}

function categoryFirst(
  left: { categoryId: string | null; category: BudgetPlanningCategoryRecord | null },
  right: { categoryId: string | null; category: BudgetPlanningCategoryRecord | null },
) {
  const leftCategory = categoryIdentity(left);
  const rightCategory = categoryIdentity(right);
  return (
    leftCategory.categoryName.localeCompare(rightCategory.categoryName) ||
    leftCategory.categoryCode.localeCompare(rightCategory.categoryCode) ||
    categoryKey(leftCategory).localeCompare(categoryKey(rightCategory))
  );
}

function isoDateOnly(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function renewalDate(forecastYear: number, renewalMonth: number, renewalDay: number) {
  const value = new Date(Date.UTC(forecastYear, renewalMonth - 1, renewalDay));
  if (
    !Number.isInteger(renewalMonth) ||
    !Number.isInteger(renewalDay) ||
    value.getUTCFullYear() !== forecastYear ||
    value.getUTCMonth() !== renewalMonth - 1 ||
    value.getUTCDate() !== renewalDay
  ) {
    return {
      renewalDate: null,
      renewalIssue: `Invalid renewal month/day: ${renewalMonth}/${renewalDay}`,
    };
  }

  return { renewalDate: value.toISOString().slice(0, 10), renewalIssue: null };
}

function sumItems(items: BudgetPlanningItemRecord[]) {
  return items.reduce((total, item) => addMoney(total, money(item.totalAmount)), 0);
}

function matchesFilters(
  record: { companyId: string; categoryId: string | null },
  filters: NormalizedBudgetPlanningFilters,
) {
  return (
    (filters.companyId === "All" || record.companyId === filters.companyId) &&
    (filters.categoryId === "All" || record.categoryId === filters.categoryId)
  );
}

export function buildBudgetPlanningViewModel({
  actualRecords,
  filters,
  recurringRecords,
}: {
  actualRecords: BudgetPlanningActualRecord[];
  filters: NormalizedBudgetPlanningFilters;
  recurringRecords: BudgetPlanningRecurringRecord[];
}): BudgetPlanningViewModel {
  const categoryRows = new Map<string, BudgetPlanningCategoryRow>();
  const actualPrRows: BudgetPlanningActualPrRow[] = [];
  const actualItemRows: BudgetPlanningActualItemRow[] = [];
  const recurringScheduleRows: BudgetPlanningRecurringScheduleRow[] = [];
  const recurringItemRows: BudgetPlanningRecurringItemRow[] = [];
  const range = buildBudgetPlanningDateRange(filters.baseYear);

  const ensureCategory = (identity: BudgetPlanningCategoryIdentity) => {
    const key = categoryKey(identity);
    let row = categoryRows.get(key);
    if (!row) {
      row = { ...identity, ...emptySummary() };
      categoryRows.set(key, row);
    }
    return row;
  };

  const includedActuals = actualRecords
    .filter((record) => {
      const documentDate = new Date(record.documentDate);
      return (
        INCLUDED_ACTUAL_STATUS_SET.has(record.status) &&
        Number.isFinite(documentDate.getTime()) &&
        documentDate >= range.gte &&
        documentDate < range.lt &&
        matchesFilters(record, filters)
      );
    })
    .sort(
      (left, right) =>
        categoryFirst(left, right) ||
        new Date(left.documentDate).getTime() - new Date(right.documentDate).getTime() ||
        (left.prNo || "").localeCompare(right.prNo || "") ||
        left.id.localeCompare(right.id),
    );

  for (const record of includedActuals) {
    const identity = categoryIdentity(record);
    const category = ensureCategory(identity);
    const totalAmount = money(record.totalAmount);
    const isRecurringOrigin = record.recurringRun !== null;
    category.actualSpend = addMoney(category.actualSpend, totalAmount);
    category.actualPrCount += 1;
    if (isRecurringOrigin) category.recurringIncludedInActual = addMoney(category.recurringIncludedInActual, totalAmount);

    actualPrRows.push({
      ...identity,
      purchaseRequestId: record.id,
      prNo: record.prNo,
      baseYear: filters.baseYear,
      documentDate: isoDateOnly(record.documentDate),
      companyName: record.company.displayName,
      branchName: record.branch.name,
      departmentName: record.department.name,
      divisionName: record.division?.name || null,
      purpose: record.purpose,
      status: record.status,
      isRecurringOrigin,
      recurringScheduleId: record.recurringRun?.schedule.id || null,
      recurringScheduleName: record.recurringRun?.schedule.name || null,
      totalAmount,
    });

    for (const item of [...record.items].sort((left, right) => left.lineNo - right.lineNo)) {
      actualItemRows.push({
        ...identity,
        purchaseRequestId: record.id,
        prNo: record.prNo,
        lineNo: item.lineNo,
        rowType: item.rowType,
        accountCode: item.accountCode,
        description: item.description,
        quantity: finiteNumber(item.quantity),
        unitCost: money(item.unitCost),
        totalAmount: money(item.totalAmount),
      });
    }
  }

  const includedSchedules = recurringRecords
    .filter((record) => record.status === "ACTIVE" && matchesFilters(record, filters))
    .sort(
      (left, right) =>
        categoryFirst(left, right) ||
        left.renewalMonth - right.renewalMonth ||
        left.renewalDay - right.renewalDay ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    );

  for (const record of includedSchedules) {
    const identity = categoryIdentity(record);
    const category = ensureCategory(identity);
    const totalAmount = sumItems(record.items);
    const renewal = renewalDate(filters.forecastYear, record.renewalMonth, record.renewalDay);
    category.activeRecurringForecast = addMoney(category.activeRecurringForecast, totalAmount);
    category.activeScheduleCount += 1;

    recurringScheduleRows.push({
      ...identity,
      scheduleId: record.id,
      scheduleName: record.name,
      forecastYear: filters.forecastYear,
      companyName: record.company.displayName,
      branchName: record.branch.name,
      departmentName: record.department.name,
      divisionName: record.division?.name || null,
      purpose: record.purpose,
      ...renewal,
      responsibleUserName: record.responsibleUser.displayName,
      status: record.status,
      totalAmount,
    });

    for (const item of [...record.items].sort((left, right) => left.lineNo - right.lineNo)) {
      recurringItemRows.push({
        ...identity,
        scheduleId: record.id,
        scheduleName: record.name,
        lineNo: item.lineNo,
        rowType: item.rowType,
        accountCode: item.accountCode,
        description: item.description,
        quantity: finiteNumber(item.quantity),
        unitCost: money(item.unitCost),
        forecastAmount: money(item.totalAmount),
      });
    }
  }

  const finalizedCategoryRows = [...categoryRows.values()]
    .map((row) => ({
      ...row,
      nonRecurringActual: roundMoney(row.actualSpend - row.recurringIncludedInActual),
      planningBaseline: roundMoney(row.actualSpend - row.recurringIncludedInActual + row.activeRecurringForecast),
    }))
    .sort(
      (left, right) =>
        right.planningBaseline - left.planningBaseline ||
        left.categoryName.localeCompare(right.categoryName) ||
        left.categoryCode.localeCompare(right.categoryCode),
    );

  const summary = finalizedCategoryRows.reduce<BudgetPlanningSummary>((total, row) => {
    total.actualSpend = addMoney(total.actualSpend, row.actualSpend);
    total.recurringIncludedInActual = addMoney(total.recurringIncludedInActual, row.recurringIncludedInActual);
    total.nonRecurringActual = addMoney(total.nonRecurringActual, row.nonRecurringActual);
    total.activeRecurringForecast = addMoney(total.activeRecurringForecast, row.activeRecurringForecast);
    total.planningBaseline = addMoney(total.planningBaseline, row.planningBaseline);
    total.actualPrCount += row.actualPrCount;
    total.activeScheduleCount += row.activeScheduleCount;
    return total;
  }, emptySummary());

  return {
    filters,
    summary,
    categoryRows: finalizedCategoryRows,
    actualPrRows,
    actualItemRows,
    recurringScheduleRows,
    recurringItemRows,
  };
}
