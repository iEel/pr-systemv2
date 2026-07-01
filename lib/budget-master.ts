import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";

type SearchParams = Record<string, string | string[] | undefined>;

type BudgetReference = {
  branchId: string | null;
  companyId: string;
  departmentId: string;
};

type BudgetRecord = {
  branch: { id: string; name: string } | null;
  branchId: string | null;
  budgetAmount: unknown;
  company: { displayName: string; id: string };
  companyId: string;
  department: { id: string; name: string };
  departmentId: string;
  id: string;
  isActive: boolean;
  reservedAmount: unknown;
  updatedAt: Date | string;
  usedAmount: unknown;
  year: number;
};

type ReferenceLookup = {
  branch?: { companyId: string; id: string; isActive: boolean } | null;
  company?: { id: string; isActive: boolean } | null;
  department?: { id: string; isActive: boolean } | null;
};

export type BudgetMasterFilters = {
  companyId: string;
  includeInactive: boolean;
  year: number;
};

export type BudgetMasterOption = {
  companyId?: string;
  id: string;
  label: string;
};

function searchValue(params: SearchParams | undefined, key: string) {
  const value = params?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function formTextValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredIdValue(value: unknown, label: string) {
  const text = formTextValue(value);

  if (!text || text.toUpperCase() === "ALL") {
    throw new Error(`${label} is required`);
  }

  return text;
}

function nullableIdValue(value: unknown) {
  const text = formTextValue(value);

  if (!text || text.toUpperCase() === "ALL") {
    return null;
  }

  return text;
}

function parseYearValue(value: unknown, fallbackYear?: number) {
  const text = formTextValue(value);
  const year = Number.parseInt(text, 10);

  if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
    return year;
  }

  if (fallbackYear) {
    return fallbackYear;
  }

  throw new Error("Year must be between 2000 and 2100");
}

function numericValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(/,/g, ""));
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function budgetScopeLabel({
  branchName,
  companyName,
  departmentName,
  year,
}: {
  branchName?: string | null;
  companyName: string;
  departmentName: string;
  year: number;
}) {
  return `${year} / ${companyName} / ${branchName || "All branches"} / ${departmentName}`;
}

async function createBudgetAudit(
  tx: Prisma.TransactionClient,
  {
    action,
    actorId,
    budgetId,
    detail,
    metadata,
  }: {
    action: string;
    actorId: string;
    budgetId: string;
    detail: string;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.auditLog.create({
    data: {
      action,
      actorId,
      entityId: budgetId,
      entityType: "Budget",
      metadataJson: JSON.stringify({ detail, ...metadata }),
    },
  });
}

export function normalizeBudgetFilters(params: SearchParams | undefined, { currentYear = new Date().getFullYear() } = {}): BudgetMasterFilters {
  const companyId = formTextValue(searchValue(params, "companyId"));

  return {
    companyId: !companyId || companyId.toUpperCase() === "ALL" ? "ALL" : companyId,
    includeInactive: searchValue(params, "includeInactive") === "1",
    year: parseYearValue(searchValue(params, "year"), currentYear),
  };
}

export function parseBudgetMoneyInput(value: unknown, label: string) {
  const text = formTextValue(value).replace(/,/g, "");

  if (!text) {
    return "0.00";
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`${label} must be a valid number`);
  }

  const amount = Number(text);

  if (!Number.isFinite(amount)) {
    throw new Error(`${label} must be a valid number`);
  }

  if (amount < 0) {
    throw new Error(`${label} must be non-negative`);
  }

  return amount.toFixed(2);
}

export function formatBudgetMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(numericValue(value));
}

export function calculateRemainingBudget({
  budgetAmount,
  reservedAmount,
  usedAmount,
}: {
  budgetAmount: unknown;
  reservedAmount: unknown;
  usedAmount: unknown;
}) {
  return roundMoney(numericValue(budgetAmount) - numericValue(usedAmount) - numericValue(reservedAmount));
}

export function buildBudgetScopeKey({ branchId, companyId, departmentId, year }: BudgetReference & { year: number }) {
  return [year, companyId, branchId || "ALL_BRANCHES", departmentId].join("|");
}

export function buildBudgetCreateData(values: Partial<Record<string, unknown>>) {
  return {
    branchId: nullableIdValue(values.branchId),
    budgetAmount: parseBudgetMoneyInput(values.budgetAmount, "Budget amount"),
    companyId: requiredIdValue(values.companyId, "Company"),
    departmentId: requiredIdValue(values.departmentId, "Department"),
    isActive: true,
    reservedAmount: parseBudgetMoneyInput(values.reservedAmount, "Reserved amount"),
    usedAmount: parseBudgetMoneyInput(values.usedAmount, "Used amount"),
    year: parseYearValue(values.year),
  };
}

export function buildBudgetUpdateData(values: Partial<Record<string, unknown>>) {
  return {
    budgetAmount: parseBudgetMoneyInput(values.budgetAmount, "Budget amount"),
    reservedAmount: parseBudgetMoneyInput(values.reservedAmount, "Reserved amount"),
    usedAmount: parseBudgetMoneyInput(values.usedAmount, "Used amount"),
  };
}

export function validateBudgetReferences(reference: BudgetReference, lookup: ReferenceLookup) {
  if (!lookup.company) {
    throw new Error("Company not found");
  }

  if (!lookup.company.isActive) {
    throw new Error("Company is inactive");
  }

  if (!lookup.department) {
    throw new Error("Department not found");
  }

  if (!lookup.department.isActive) {
    throw new Error("Department is inactive");
  }

  if (reference.branchId) {
    if (!lookup.branch) {
      throw new Error("Branch not found");
    }

    if (lookup.branch.companyId !== reference.companyId) {
      throw new Error("Selected branch does not belong to the selected company");
    }

    if (!lookup.branch.isActive) {
      throw new Error("Branch is inactive");
    }
  }
}

export function validateBudgetDuplicate({
  existingBudgetId,
  scopeLabel,
}: {
  existingBudgetId: string | null | undefined;
  scopeLabel: string;
}) {
  if (existingBudgetId) {
    throw new Error(`Budget already exists for ${scopeLabel}`);
  }
}

export function mapBudgetRecordToRow(record: BudgetRecord) {
  const budgetAmount = numericValue(record.budgetAmount);
  const usedAmount = numericValue(record.usedAmount);
  const reservedAmount = numericValue(record.reservedAmount);
  const remainingAmount = calculateRemainingBudget({ budgetAmount, reservedAmount, usedAmount });

  return {
    branchId: record.branchId,
    branchName: record.branch?.name || "All branches",
    budgetAmount,
    budgetAmountText: formatBudgetMoney(budgetAmount),
    companyId: record.companyId,
    companyName: record.company.displayName,
    departmentId: record.departmentId,
    departmentName: record.department.name,
    id: record.id,
    isActive: record.isActive,
    remainingAmount,
    remainingAmountText: formatBudgetMoney(remainingAmount),
    reservedAmount,
    reservedAmountText: formatBudgetMoney(reservedAmount),
    scopeKey: buildBudgetScopeKey({
      branchId: record.branchId,
      companyId: record.companyId,
      departmentId: record.departmentId,
      year: record.year,
    }),
    status: record.isActive ? "Active" : "Inactive",
    updatedAt: new Date(record.updatedAt).toISOString(),
    usedAmount,
    usedAmountText: formatBudgetMoney(usedAmount),
    year: record.year,
  };
}

export type BudgetMasterRow = ReturnType<typeof mapBudgetRecordToRow>;

export function buildBudgetMasterHref(filters: Partial<BudgetMasterFilters>) {
  const params = new URLSearchParams();

  if (filters.year) {
    params.set("year", String(filters.year));
  }

  if (filters.companyId && filters.companyId !== "ALL") {
    params.set("companyId", filters.companyId);
  }

  if (filters.includeInactive) {
    params.set("includeInactive", "1");
  }

  const query = params.toString();

  return `/masters/budgets${query ? `?${query}` : ""}`;
}

export function readBudgetRedirectFilters(formData: FormData) {
  return normalizeBudgetFilters({
    companyId: String(formData.get("redirectCompanyId") || formData.get("companyId") || "ALL"),
    includeInactive: formData.get("includeInactive") === "1" ? "1" : undefined,
    year: String(formData.get("redirectYear") || formData.get("year") || ""),
  });
}

export async function getBudgetMasterPageData(params: SearchParams | undefined = {}) {
  await requirePermission("BUDGET_MANAGE");

  const filters = normalizeBudgetFilters(params);
  const budgetWhere: Prisma.BudgetWhereInput = {
    year: filters.year,
    ...(filters.companyId !== "ALL" ? { companyId: filters.companyId } : {}),
    ...(filters.includeInactive ? {} : { isActive: true }),
  };

  const [budgets, companies, branches, departments] = await Promise.all([
    prisma.budget.findMany({
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { displayName: true, id: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ company: { displayName: "asc" } }, { department: { name: "asc" } }, { year: "desc" }],
      where: budgetWhere,
    }),
    prisma.company.findMany({
      orderBy: [{ displayName: "asc" }, { code: "asc" }],
      select: { displayName: true, id: true },
      where: { isActive: true },
    }),
    prisma.branch.findMany({
      include: { company: { select: { displayName: true } } },
      orderBy: [{ company: { displayName: "asc" } }, { name: "asc" }],
      where: { company: { isActive: true }, isActive: true },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      where: { isActive: true },
    }),
  ]);

  const rows = budgets.map(mapBudgetRecordToRow);
  const activeRows = rows.filter((row) => row.isActive);

  return {
    branches: branches.map((branch) => ({
      companyId: branch.companyId,
      id: branch.id,
      label: `${branch.company.displayName} / ${branch.name}`,
    })),
    companies: companies.map((company) => ({
      id: company.id,
      label: company.displayName,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      label: department.name,
    })),
    filters,
    rows,
    totals: {
      activeRows: activeRows.length,
      allocatedAmount: activeRows.reduce((sum, row) => sum + row.budgetAmount, 0),
      allocatedAmountText: formatBudgetMoney(activeRows.reduce((sum, row) => sum + row.budgetAmount, 0)),
      remainingAmount: activeRows.reduce((sum, row) => sum + row.remainingAmount, 0),
      remainingAmountText: formatBudgetMoney(activeRows.reduce((sum, row) => sum + row.remainingAmount, 0)),
      reservedAmount: activeRows.reduce((sum, row) => sum + row.reservedAmount, 0),
      reservedAmountText: formatBudgetMoney(activeRows.reduce((sum, row) => sum + row.reservedAmount, 0)),
      rowCount: rows.length,
      usedAmount: activeRows.reduce((sum, row) => sum + row.usedAmount, 0),
      usedAmountText: formatBudgetMoney(activeRows.reduce((sum, row) => sum + row.usedAmount, 0)),
    },
  };
}

export async function createBudgetFromFormData(formData: FormData) {
  const actor = await requirePermission("BUDGET_MANAGE");
  const data = buildBudgetCreateData({
    branchId: formData.get("branchId"),
    budgetAmount: formData.get("budgetAmount"),
    companyId: formData.get("companyId"),
    departmentId: formData.get("departmentId"),
    reservedAmount: formData.get("reservedAmount"),
    usedAmount: formData.get("usedAmount"),
    year: formData.get("year"),
  });

  return prisma.$transaction(async (tx) => {
    const [company, branch, department] = await Promise.all([
      tx.company.findUnique({ select: { displayName: true, id: true, isActive: true }, where: { id: data.companyId } }),
      data.branchId ? tx.branch.findUnique({ select: { companyId: true, id: true, isActive: true, name: true }, where: { id: data.branchId } }) : null,
      tx.department.findUnique({ select: { id: true, isActive: true, name: true }, where: { id: data.departmentId } }),
    ]);

    validateBudgetReferences(data, { branch, company, department });

    const scopeLabel = budgetScopeLabel({
      branchName: branch?.name || null,
      companyName: company?.displayName || data.companyId,
      departmentName: department?.name || data.departmentId,
      year: data.year,
    });
    const existing = await tx.budget.findFirst({
      select: { id: true },
      where: {
        branchId: data.branchId,
        companyId: data.companyId,
        departmentId: data.departmentId,
        year: data.year,
      },
    });

    validateBudgetDuplicate({ existingBudgetId: existing?.id, scopeLabel });

    const created = await tx.budget.create({ data });

    await createBudgetAudit(tx, {
      action: "Budget created",
      actorId: actor.id,
      budgetId: created.id,
      detail: `Created budget ${scopeLabel}`,
      metadata: { scopeKey: buildBudgetScopeKey(data), ...data },
    });

    return created;
  });
}

export async function updateBudgetFromFormData(formData: FormData) {
  const actor = await requirePermission("BUDGET_MANAGE");
  const budgetId = requiredIdValue(formData.get("budgetId"), "Budget");
  const data = buildBudgetUpdateData({
    budgetAmount: formData.get("budgetAmount"),
    reservedAmount: formData.get("reservedAmount"),
    usedAmount: formData.get("usedAmount"),
  });

  return prisma.$transaction(async (tx) => {
    const budget = await tx.budget.findUnique({
      include: {
        branch: { select: { name: true } },
        company: { select: { displayName: true } },
        department: { select: { name: true } },
      },
      where: { id: budgetId },
    });

    if (!budget) {
      throw new Error("Budget not found");
    }

    const updated = await tx.budget.update({
      data,
      where: { id: budgetId },
    });
    const scopeLabel = budgetScopeLabel({
      branchName: budget.branch?.name || null,
      companyName: budget.company.displayName,
      departmentName: budget.department.name,
      year: budget.year,
    });

    await createBudgetAudit(tx, {
      action: "Budget updated",
      actorId: actor.id,
      budgetId,
      detail: `Updated budget ${scopeLabel}`,
      metadata: data,
    });

    return updated;
  });
}

export async function setBudgetActiveFromFormData(formData: FormData, isActive: boolean) {
  const actor = await requirePermission("BUDGET_MANAGE");
  const budgetId = requiredIdValue(formData.get("budgetId"), "Budget");

  return prisma.$transaction(async (tx) => {
    const budget = await tx.budget.findUnique({
      include: {
        branch: { select: { name: true } },
        company: { select: { displayName: true } },
        department: { select: { name: true } },
      },
      where: { id: budgetId },
    });

    if (!budget) {
      throw new Error("Budget not found");
    }

    const updated = await tx.budget.update({
      data: { isActive },
      where: { id: budgetId },
    });
    const scopeLabel = budgetScopeLabel({
      branchName: budget.branch?.name || null,
      companyName: budget.company.displayName,
      departmentName: budget.department.name,
      year: budget.year,
    });

    await createBudgetAudit(tx, {
      action: isActive ? "Budget reactivated" : "Budget deactivated",
      actorId: actor.id,
      budgetId,
      detail: `${isActive ? "Reactivated" : "Deactivated"} budget ${scopeLabel}`,
      metadata: { isActive, scopeKey: buildBudgetScopeKey(budget) },
    });

    return updated;
  });
}
