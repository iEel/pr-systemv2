import type { Prisma } from "@prisma/client";
import type { XlsxSheet } from "./xlsx";

export type ReportFiltersInput = {
  categoryId?: string | null;
  companyId?: string | null;
  month?: string | null;
  status?: string | null;
  year?: string | number | null;
};

export type NormalizedReportFilters = {
  categoryId: string;
  companyId: string;
  month: string;
  status: string;
  year: number;
};

export type ReportingPrRecord = {
  id: string;
  prNo: string | null;
  documentDate: Date;
  status: string;
  totalAmount: string | number | { toString(): string };
  category: { id: string; name: string } | null;
  company: { id: string; displayName: string };
  branch: { id: string; name: string };
  department: { name: string };
  division: { name: string } | null;
  createdBy: { displayName: string };
};

export type ReportingBudgetRecord = {
  budgetAmount: string | number | { toString(): string };
};

export type ReportSummary = {
  cancelledAmount: number;
  pendingAmount: number;
  remainingBudget: number;
  totalAmount: number;
  totalBudget: number;
  totalPr: number;
  usedAmount: number;
};

export type ReportBudgetWarning = {
  message: string;
  title: string;
  xlsxMessage: string;
};

export type MonthlySummaryRow = {
  count: number;
  label: string;
  month: number;
  pendingAmount: number;
  totalAmount: number;
  usedAmount: number;
};

export type CompanySummaryRow = {
  branch: string;
  company: string;
  count: number;
  latestDate: string;
  totalAmount: number;
  usedAmount: number;
};

export type StatusSummaryRow = {
  count: number;
  status: string;
  totalAmount: number;
};

export type CategorySummaryRow = {
  category: string;
  categoryId: string | null;
  count: number;
  totalAmount: number;
};

export type ReportDetailRow = {
  branch: string;
  category: string;
  company: string;
  createdBy: string;
  date: string;
  department: string;
  division: string;
  id: string;
  prNo: string;
  status: string;
  totalAmount: number;
};

export type ReportViewModel = {
  budgetWarning: ReportBudgetWarning | null;
  categorySummary: CategorySummaryRow[];
  companySummary: CompanySummaryRow[];
  detailRows: ReportDetailRow[];
  filters: NormalizedReportFilters;
  monthlySummary: MonthlySummaryRow[];
  statusSummary: StatusSummaryRow[];
  summary: ReportSummary;
};

export type ReportFilterOption = {
  label: string;
  value: string;
};

export type ReportPageData = ReportViewModel & {
  categories: ReportFilterOption[];
  companies: ReportFilterOption[];
  statusOptions: ReportFilterOption[];
};

export const reportMissingBudgetWarning: ReportBudgetWarning = {
  message: "ยังไม่มี Budget สำหรับมุมมองนี้ กรุณาตรวจสอบ Budget Master ก่อนใช้ Remaining Budget",
  title: "ยังไม่มี Budget สำหรับมุมมองนี้",
  xlsxMessage: "WARNING: No active Budget Master row matched this report filter. Remaining Budget is not reliable for this export.",
};

export const reportStatusOptions: ReportFilterOption[] = [
  { label: "ทุกสถานะ", value: "All" },
  { label: "Draft", value: "DRAFT" },
  { label: "Generated", value: "GENERATED" },
  { label: "Printed", value: "PRINTED" },
  { label: "Signed", value: "SIGNED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Reissued", value: "REISSUED" },
];

const usedStatuses = new Set(["GENERATED", "PRINTED", "SIGNED"]);
const reportStatuses = new Set(reportStatusOptions.map((option) => option.value));
const monthLabels = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function toNumber(value: string | number | { toString(): string }) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toUiStatus(status: string) {
  const normalized = status.toUpperCase();
  const labels: Record<string, string> = {
    CANCELLED: "Cancelled",
    DRAFT: "Draft",
    GENERATED: "Generated",
    PRINTED: "Printed",
    REISSUED: "Reissued",
    SIGNED: "Signed",
  };

  return labels[normalized] || "Draft";
}

export function normalizeReportFilters(input: ReportFiltersInput = {}, now = new Date()): NormalizedReportFilters {
  const parsedYear = Number(input.year);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : now.getFullYear();
  const parsedMonth = Number(input.month);
  const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? String(parsedMonth) : "All";
  const rawStatus = String(input.status || "All").toUpperCase();
  const status = reportStatuses.has(rawStatus) ? rawStatus : "All";
  const categoryId = input.categoryId?.trim() || "All";
  const companyId = input.companyId?.trim() || "All";

  return { categoryId, companyId, month, status, year };
}

export function buildReportDateRange(filters: Pick<NormalizedReportFilters, "month" | "year">) {
  const month = filters.month === "All" ? 1 : Number(filters.month);
  const start = new Date(Date.UTC(filters.year, month - 1, 1));
  const end = filters.month === "All" ? new Date(Date.UTC(filters.year + 1, 0, 1)) : new Date(Date.UTC(filters.year, month, 1));

  return { gte: start, lt: end };
}

export function buildReportExportHref(filters: NormalizedReportFilters) {
  const params = new URLSearchParams();
  params.set("year", String(filters.year));
  if (filters.month !== "All") params.set("month", filters.month);
  if (filters.companyId !== "All") params.set("companyId", filters.companyId);
  if (filters.status !== "All") params.set("status", filters.status);
  if (filters.categoryId !== "All") params.set("categoryId", filters.categoryId);
  return `/reports/export?${params.toString()}`;
}

function readFilterOptionLabel(options: ReportFilterOption[], value: string, fallback: string) {
  return options.find((option) => option.value === value)?.label || fallback;
}

export function buildReportFilterChips(
  filters: NormalizedReportFilters,
  options: { categories: ReportFilterOption[]; companies: ReportFilterOption[]; statusOptions: ReportFilterOption[] },
) {
  const month = filters.month === "All" ? "ทุกเดือน" : monthLabels[Number(filters.month) - 1] || `เดือน ${filters.month}`;
  const company = readFilterOptionLabel(options.companies, filters.companyId, filters.companyId === "All" ? "ทุกบริษัท" : filters.companyId);
  const status = readFilterOptionLabel(options.statusOptions, filters.status, filters.status === "All" ? "ทุกสถานะ" : filters.status);
  const category = readFilterOptionLabel(options.categories, filters.categoryId, filters.categoryId === "All" ? "ทุกหมวดหมู่" : filters.categoryId);

  return [`ปี ${filters.year}`, month, company, status, category];
}

export function calculateReportBarPercent(value: number, maxValue: number) {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || value <= 0 || maxValue <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / maxValue) * 100)));
}

export function buildReportBudgetWarning(summary: Pick<ReportSummary, "pendingAmount" | "totalBudget" | "usedAmount">) {
  const committedAmount = summary.usedAmount + summary.pendingAmount;
  return summary.totalBudget <= 0 && committedAmount > 0 ? reportMissingBudgetWarning : null;
}

function matchesFilters(record: ReportingPrRecord, filters: NormalizedReportFilters) {
  const range = buildReportDateRange(filters);
  const status = record.status.toUpperCase();

  return (
    record.documentDate >= range.gte &&
    record.documentDate < range.lt &&
    (filters.categoryId === "All" || record.category?.id === filters.categoryId) &&
    (filters.companyId === "All" || record.company.id === filters.companyId) &&
    (filters.status === "All" || status === filters.status)
  );
}

function emptyMonthlyRows(filters: NormalizedReportFilters): MonthlySummaryRow[] {
  const months = filters.month === "All" ? Array.from({ length: 12 }, (_, index) => index + 1) : [Number(filters.month)];

  return months.map((month) => ({
    count: 0,
    label: monthLabels[month - 1],
    month,
    pendingAmount: 0,
    totalAmount: 0,
    usedAmount: 0,
  }));
}

export function buildReportViewModel({
  budgets,
  filters,
  records,
}: {
  budgets: ReportingBudgetRecord[];
  filters: NormalizedReportFilters;
  records: ReportingPrRecord[];
}): ReportViewModel {
  const filteredRecords = records.filter((record) => matchesFilters(record, filters));
  const totalBudget = roundMoney(budgets.reduce((sum, budget) => sum + toNumber(budget.budgetAmount), 0));
  const monthlySummary = emptyMonthlyRows(filters);
  const companyGroups = new Map<string, CompanySummaryRow>();
  const categoryGroups = new Map<string, CategorySummaryRow>();
  const statusGroups = new Map<string, StatusSummaryRow>();
  let totalAmount = 0;
  let usedAmount = 0;
  let pendingAmount = 0;
  let cancelledAmount = 0;

  for (const record of filteredRecords) {
    const amount = toNumber(record.totalAmount);
    const status = record.status.toUpperCase();
    const month = record.documentDate.getUTCMonth() + 1;
    const monthly = monthlySummary.find((row) => row.month === month);
    const companyKey = `${record.company.id}:${record.branch.id}`;
    const categoryId = record.category?.id || null;
    const category = record.category?.name || "Not categorized";
    const categoryKey = categoryId || "__not_categorized__";
    const companyGroup = companyGroups.get(companyKey) || {
      branch: record.branch.name,
      company: record.company.displayName,
      count: 0,
      latestDate: toDateOnly(record.documentDate),
      totalAmount: 0,
      usedAmount: 0,
    };
    const uiStatus = toUiStatus(status);
    const statusGroup = statusGroups.get(uiStatus) || { count: 0, status: uiStatus, totalAmount: 0 };
    const categoryGroup = categoryGroups.get(categoryKey) || { category, categoryId, count: 0, totalAmount: 0 };

    totalAmount += amount;
    if (usedStatuses.has(status)) usedAmount += amount;
    if (status === "DRAFT") pendingAmount += amount;
    if (status === "CANCELLED") cancelledAmount += amount;

    if (monthly) {
      monthly.count += 1;
      monthly.totalAmount = roundMoney(monthly.totalAmount + amount);
      if (usedStatuses.has(status)) monthly.usedAmount = roundMoney(monthly.usedAmount + amount);
      if (status === "DRAFT") monthly.pendingAmount = roundMoney(monthly.pendingAmount + amount);
    }

    companyGroup.count += 1;
    companyGroup.totalAmount = roundMoney(companyGroup.totalAmount + amount);
    if (usedStatuses.has(status)) companyGroup.usedAmount = roundMoney(companyGroup.usedAmount + amount);
    if (toDateOnly(record.documentDate) > companyGroup.latestDate) companyGroup.latestDate = toDateOnly(record.documentDate);
    companyGroups.set(companyKey, companyGroup);

    categoryGroup.count += 1;
    categoryGroup.totalAmount = roundMoney(categoryGroup.totalAmount + amount);
    categoryGroups.set(categoryKey, categoryGroup);

    statusGroup.count += 1;
    statusGroup.totalAmount = roundMoney(statusGroup.totalAmount + amount);
    statusGroups.set(uiStatus, statusGroup);
  }

  const summary = {
    cancelledAmount: roundMoney(cancelledAmount),
    pendingAmount: roundMoney(pendingAmount),
    remainingBudget: roundMoney(totalBudget - usedAmount - pendingAmount),
    totalAmount: roundMoney(totalAmount),
    totalBudget,
    totalPr: filteredRecords.length,
    usedAmount: roundMoney(usedAmount),
  };

  return {
    budgetWarning: buildReportBudgetWarning(summary),
    categorySummary: Array.from(categoryGroups.values()).sort((left, right) => right.totalAmount - left.totalAmount || left.category.localeCompare(right.category)),
    companySummary: Array.from(companyGroups.values()).sort((left, right) => right.totalAmount - left.totalAmount || left.company.localeCompare(right.company)),
    detailRows: filteredRecords
      .slice()
      .sort((left, right) => right.documentDate.getTime() - left.documentDate.getTime())
      .map((record) => ({
        branch: record.branch.name,
        category: record.category?.name || "Not categorized",
        company: record.company.displayName,
        createdBy: record.createdBy.displayName,
        date: toDateOnly(record.documentDate),
        department: record.department.name,
        division: record.division?.name || "-",
        id: record.id,
        prNo: record.prNo || "Draft pending",
        status: toUiStatus(record.status),
        totalAmount: roundMoney(toNumber(record.totalAmount)),
      })),
    filters,
    monthlySummary,
    statusSummary: Array.from(statusGroups.values()).sort((left, right) => right.totalAmount - left.totalAmount || left.status.localeCompare(right.status)),
    summary,
  };
}

function buildPrismaWhere(filters: NormalizedReportFilters): Prisma.PurchaseRequestWhereInput {
  const range = buildReportDateRange(filters);

  return {
    documentDate: { gte: range.gte, lt: range.lt },
    ...(filters.categoryId !== "All" ? { categoryId: filters.categoryId } : {}),
    ...(filters.companyId !== "All" ? { companyId: filters.companyId } : {}),
    ...(filters.status !== "All" ? { status: filters.status } : {}),
  };
}

async function loadReportingRecords(filters: NormalizedReportFilters) {
  const { prisma } = await import("./prisma");

  return prisma.purchaseRequest.findMany({
    include: {
      branch: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      company: { select: { displayName: true, id: true } },
      createdBy: { select: { displayName: true } },
      department: { select: { name: true } },
      division: { select: { name: true } },
    },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    take: 1000,
    where: buildPrismaWhere(filters),
  });
}

async function loadReportingBudgets(filters: NormalizedReportFilters) {
  const { prisma } = await import("./prisma");

  return prisma.budget.findMany({
    select: { budgetAmount: true },
    where: {
      isActive: true,
      year: filters.year,
      ...(filters.companyId !== "All" ? { companyId: filters.companyId } : {}),
    },
  });
}

async function loadCompanyOptions() {
  const { prisma } = await import("./prisma");

  const companies = await prisma.company.findMany({
    orderBy: { displayName: "asc" },
    select: { displayName: true, id: true },
    where: { isActive: true },
  });

  return [
    { label: "ทุกบริษัท", value: "All" },
    ...companies.map((company) => ({ label: company.displayName, value: company.id })),
  ];
}

async function loadCategoryOptions() {
  const { prisma } = await import("./prisma");

  const categories = await prisma.purchaseRequestCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, isActive: true, name: true },
  });

  return [
    { label: "ทุกหมวดหมู่", value: "All" },
    ...categories.map((category) => ({ label: category.isActive ? category.name : `${category.name} (Inactive)`, value: category.id })),
  ];
}

export async function getReportPageData(input: ReportFiltersInput = {}): Promise<ReportPageData> {
  const filters = normalizeReportFilters(input);
  const [records, budgets, categories, companies] = await Promise.all([
    loadReportingRecords(filters),
    loadReportingBudgets(filters),
    loadCategoryOptions(),
    loadCompanyOptions(),
  ]);

  return {
    ...buildReportViewModel({ budgets, filters, records }),
    categories,
    companies,
    statusOptions: reportStatusOptions,
  };
}

export async function getDashboardReportData() {
  return getReportPageData({ year: new Date().getFullYear() });
}

export function buildReportWorkbookSheets(view: ReportViewModel): XlsxSheet[] {
  return [
    {
      name: "Summary",
      rows: [
        ...(view.budgetWarning ? ([["Budget Warning", view.budgetWarning.xlsxMessage]] as XlsxSheet["rows"]) : []),
        ["Metric", "Value"],
        ["Year", view.filters.year],
        ["Month", view.filters.month],
        ["Company", view.filters.companyId],
        ["Status", view.filters.status],
        ["Category", view.filters.categoryId],
        ["Total PR", view.summary.totalPr],
        ["Total Amount", view.summary.totalAmount],
        ["Used Amount", view.summary.usedAmount],
        ["Pending Amount", view.summary.pendingAmount],
        ["Cancelled Amount", view.summary.cancelledAmount],
        ["Total Budget", view.summary.totalBudget],
        ["Remaining Budget", view.summary.remainingBudget],
      ],
    },
    {
      name: "By Month",
      rows: [
        ["Month", "PR Count", "Total Amount", "Used Amount", "Pending Amount"],
        ...view.monthlySummary.map((row) => [row.label, row.count, row.totalAmount, row.usedAmount, row.pendingAmount]),
      ],
    },
    {
      name: "By Company",
      rows: [
        ["Company", "Branch", "PR Count", "Total Amount", "Used Amount", "Latest Date"],
        ...view.companySummary.map((row) => [row.company, row.branch, row.count, row.totalAmount, row.usedAmount, row.latestDate]),
      ],
    },
    {
      name: "By Status",
      rows: [
        ["Status", "PR Count", "Total Amount"],
        ...view.statusSummary.map((row) => [row.status, row.count, row.totalAmount]),
      ],
    },
    {
      name: "By Category",
      rows: [
        ["Category", "PR Count", "Total Amount"],
        ...view.categorySummary.map((row) => [row.category, row.count, row.totalAmount]),
      ],
    },
    {
      name: "PR Detail",
      rows: [
        ["Date", "PR No", "Company", "Branch", "Department", "Division", "Category", "Status", "Created By", "Total Amount"],
        ...view.detailRows.map((row) => [row.date, row.prNo, row.company, row.branch, row.department, row.division, row.category, row.status, row.createdBy, row.totalAmount]),
      ],
    },
  ];
}
