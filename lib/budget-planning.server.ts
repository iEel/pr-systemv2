import type { Prisma } from "@prisma/client";

import {
  buildBudgetPlanningDateRange,
  buildBudgetPlanningViewModel,
  normalizeBudgetPlanningFilters,
  type BudgetPlanningFiltersInput,
  type BudgetPlanningViewModel,
} from "./budget-planning";
import { prisma } from "@/lib/prisma";

export type BudgetPlanningFilterOption = { label: string; value: string };

export type BudgetPlanningPageData = BudgetPlanningViewModel & {
  companies: BudgetPlanningFilterOption[];
  categories: BudgetPlanningFilterOption[];
};

export async function getBudgetPlanningPageData(
  input: BudgetPlanningFiltersInput = {},
): Promise<BudgetPlanningPageData> {
  const filters = normalizeBudgetPlanningFilters(input);
  const dateRange = buildBudgetPlanningDateRange(filters.baseYear);
  const actualQuery = {
    include: {
      branch: { select: { name: true } },
      category: { select: { code: true, id: true, isActive: true, name: true } },
      company: { select: { displayName: true } },
      department: { select: { name: true } },
      division: { select: { name: true } },
      items: { orderBy: { lineNo: "asc" as const } },
      recurringRun: { select: { schedule: { select: { id: true, name: true } } } },
    },
    orderBy: [{ category: { name: "asc" as const } }, { documentDate: "asc" as const }, { createdAt: "asc" as const }],
    where: {
      documentDate: dateRange,
      status: { in: ["GENERATED", "PRINTED", "SIGNED"] },
      ...(filters.companyId !== "All" ? { companyId: filters.companyId } : {}),
      ...(filters.categoryId !== "All" ? { categoryId: filters.categoryId } : {}),
    },
  } satisfies Prisma.PurchaseRequestFindManyArgs;
  const recurringQuery = {
    include: {
      branch: { select: { name: true } },
      category: { select: { code: true, id: true, isActive: true, name: true } },
      company: { select: { displayName: true } },
      department: { select: { name: true } },
      division: { select: { name: true } },
      items: { orderBy: { lineNo: "asc" as const } },
      responsibleUser: { select: { displayName: true } },
    },
    orderBy: [
      { category: { name: "asc" as const } },
      { renewalMonth: "asc" as const },
      { renewalDay: "asc" as const },
      { name: "asc" as const },
    ],
    where: {
      status: "ACTIVE",
      ...(filters.companyId !== "All" ? { companyId: filters.companyId } : {}),
      ...(filters.categoryId !== "All" ? { categoryId: filters.categoryId } : {}),
    },
  } satisfies Prisma.RecurringPurchaseRequestScheduleFindManyArgs;

  const [actualRecords, recurringRecords, companyRecords, categoryRecords] = await Promise.all([
    prisma.purchaseRequest.findMany(actualQuery),
    prisma.recurringPurchaseRequestSchedule.findMany(recurringQuery),
    prisma.company.findMany({
      orderBy: { displayName: "asc" },
      select: { displayName: true, id: true },
      where: { isActive: true },
    }),
    prisma.purchaseRequestCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { code: true, id: true, isActive: true, name: true },
    }),
  ]);

  return {
    ...buildBudgetPlanningViewModel({ actualRecords, filters, recurringRecords }),
    companies: [
      { label: "ทุกบริษัท", value: "All" },
      ...companyRecords.map((company) => ({ label: company.displayName, value: company.id })),
    ],
    categories: [
      { label: "ทุกหมวดหมู่", value: "All" },
      ...categoryRecords.map((category) => ({
        label: `${category.code} - ${category.name}${category.isActive ? "" : " (Inactive)"}`,
        value: category.id,
      })),
    ],
  };
}
