import { Prisma } from "@prisma/client";
import { requirePermission } from "./auth/current-user";
import { createCategoryDeactivationConfirmation as createConfirmation, verifyCategoryDeactivationConfirmation } from "./category-deactivation-confirmation.server";
import { prisma } from "./prisma";

type SearchParams = Record<string, string | string[] | undefined>;

type PrCategoryRecord = {
  _count: { purchaseRequests: number };
  code: string;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
  updatedAt: Date | string;
};

type CategoryAuditAction = "PR category created" | "PR category updated" | "PR category activated" | "PR category deactivated";

export type PrCategoryFilters = {
  includeInactive: boolean;
  q: string;
};

export type PrCategoryInput = {
  code: string;
  description: string | null;
  name: string;
  sortOrder: number;
};

export type PrCategoryOption = {
  id: string;
  label: string;
};

export type PrCategoryRow = {
  affectedActiveScheduleCount: number;
  code: string;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  referenceCount: number;
  sortOrder: number;
  status: "Active" | "Inactive";
  updatedAt: string;
};

export const createCategoryDeactivationConfirmation = createConfirmation;

function searchValue(params: SearchParams | undefined, key: string) {
  const value = params?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function requiredCategoryId(value: unknown) {
  const categoryId = String(value || "").trim();

  if (!categoryId) {
    throw new Error("Category is required");
  }

  return categoryId;
}

function isUniqueCategoryCodeError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createCategoryAudit(
  tx: Prisma.TransactionClient,
  {
    action,
    affectedScheduleIds,
    actorId,
    category,
    detail,
  }: {
    action: CategoryAuditAction;
    actorId: string;
    category: Pick<PrCategoryRecord, "code" | "id" | "name">;
    detail: string;
    affectedScheduleIds?: string[];
  },
) {
  await tx.auditLog.create({
    data: {
      action,
      actorId,
      entityId: category.id,
      entityType: "PurchaseRequestCategory",
      metadataJson: JSON.stringify({
        affectedScheduleIds: affectedScheduleIds || [],
        code: category.code,
        detail,
        name: category.name,
      }),
    },
  });
}

function rethrowCategoryCodeUniqueError(error: unknown): never {
  if (isUniqueCategoryCodeError(error)) {
    throw new Error("Category code already exists");
  }

  throw error;
}

export function normalizePrCategoryFilters(params: SearchParams | undefined): PrCategoryFilters {
  return {
    includeInactive: searchValue(params, "includeInactive") === "1",
    q: String(searchValue(params, "q") || "").trim(),
  };
}

export function buildPrCategoryHref(filters: Partial<PrCategoryFilters> = {}) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.includeInactive) params.set("includeInactive", "1");

  const query = params.toString();

  return `/masters/pr-categories${query ? `?${query}` : ""}`;
}

export function readPrCategoryRedirectFilters(formData: FormData) {
  return normalizePrCategoryFilters({
    includeInactive: formData.get("includeInactive") === "1" ? "1" : undefined,
    q: String(formData.get("redirectQ") || ""),
  });
}

export function parsePrCategoryInput(values: Partial<Record<string, unknown>>): PrCategoryInput {
  const code = String(values.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const name = String(values.name || "").trim();
  const description = String(values.description || "").trim() || null;
  const sortOrder = Number(values.sortOrder);

  if (!code) throw new Error("Category code is required");
  if (!name) throw new Error("Category name is required");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) throw new Error("Sort order must be between 0 and 9999");

  return { code, description, name, sortOrder };
}

export function validateCategoryCodeMutation({
  currentCode,
  nextCode,
  referenceCount,
}: {
  currentCode: string;
  nextCode: string;
  referenceCount: number;
}) {
  if (referenceCount > 0 && currentCode !== nextCode) {
    throw new Error("Category code cannot change after it is used");
  }
}

export function mapPrCategoryRecordToRow(record: PrCategoryRecord): PrCategoryRow {
  return {
    affectedActiveScheduleCount: 0,
    code: record.code,
    description: record.description,
    id: record.id,
    isActive: record.isActive,
    name: record.name,
    referenceCount: record._count.purchaseRequests,
    sortOrder: record.sortOrder,
    status: record.isActive ? "Active" : "Inactive",
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

export async function getPrCategoryPageData(params: SearchParams | undefined = {}) {
  await requirePermission("MASTER_DATA_MANAGE");

  const filters = normalizePrCategoryFilters(params);
  const categories = await prisma.purchaseRequestCategory.findMany({
    include: { _count: { select: { purchaseRequests: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { code: "asc" }],
    where: {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.q
        ? {
            OR: [
              { code: { contains: filters.q } },
              { description: { contains: filters.q } },
              { name: { contains: filters.q } },
            ],
          }
        : {}),
    },
  });

  const rows = categories.map(mapPrCategoryRecordToRow);

  return {
    filters,
    options: rows.filter((row) => row.isActive).map((row): PrCategoryOption => ({ id: row.id, label: `${row.code} - ${row.name}` })),
    rows,
  };
}

export async function getPrCategoryDeactivationImpact(categoryId: string) {
  await requirePermission("MASTER_DATA_MANAGE");
  const id = requiredCategoryId(categoryId);
  const category = await prisma.purchaseRequestCategory.findUnique({
    select: { code: true, id: true, isActive: true, name: true, updatedAt: true },
    where: { id },
  });
  if (!category) throw new Error("Category not found");

  const activeSchedules = await prisma.recurringPurchaseRequestSchedule.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, nextRunDate: true, responsibleUser: { select: { displayName: true } } },
    where: { categoryId: id, status: "ACTIVE" },
  });

  return {
    activeSchedules: activeSchedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      nextRunDate: schedule.nextRunDate.toISOString(),
      responsibleUserName: schedule.responsibleUser.displayName,
    })),
    category,
  };
}

export async function createPrCategoryFromFormData(formData: FormData) {
  const actor = await requirePermission("MASTER_DATA_MANAGE");
  const data = parsePrCategoryInput({
    code: formData.get("code"),
    description: formData.get("description"),
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequestCategory.findUnique({ select: { id: true }, where: { code: data.code } });

      if (existing) {
        throw new Error("Category code already exists");
      }

      const created = await tx.purchaseRequestCategory.create({ data });

      await createCategoryAudit(tx, {
        action: "PR category created",
        actorId: actor.id,
        category: created,
        detail: `Created PR category ${created.code} - ${created.name}`,
      });

      return created;
    });
  } catch (error) {
    rethrowCategoryCodeUniqueError(error);
  }
}

export async function updatePrCategoryFromFormData(formData: FormData) {
  const actor = await requirePermission("MASTER_DATA_MANAGE");
  const categoryId = requiredCategoryId(formData.get("categoryId"));
  const data = parsePrCategoryInput({
    code: formData.get("code"),
    description: formData.get("description"),
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
  });

  try {
    return await prisma.$transaction(
      async (tx) => {
        const category = await tx.purchaseRequestCategory.findUnique({
          include: { _count: { select: { purchaseRequests: true } } },
          where: { id: categoryId },
        });

        if (!category) {
          throw new Error("Category not found");
        }

        validateCategoryCodeMutation({
          currentCode: category.code,
          nextCode: data.code,
          referenceCount: category._count.purchaseRequests,
        });

        const existing = await tx.purchaseRequestCategory.findUnique({ select: { id: true }, where: { code: data.code } });

        if (existing && existing.id !== categoryId) {
          throw new Error("Category code already exists");
        }

        const updated = await tx.purchaseRequestCategory.update({ data, where: { id: categoryId } });

        await createCategoryAudit(tx, {
          action: "PR category updated",
          actorId: actor.id,
          category: updated,
          detail: `Updated PR category ${updated.code} - ${updated.name}`,
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    rethrowCategoryCodeUniqueError(error);
  }
}

export async function setPrCategoryActiveFromFormData(formData: FormData, isActive: boolean) {
  const actor = await requirePermission("MASTER_DATA_MANAGE");
  const categoryId = requiredCategoryId(formData.get("categoryId"));
  const confirmationToken = String(formData.get("confirmationToken") || "");
  const intendedIsActive = String(formData.get("intendedIsActive") || "");

  return prisma.$transaction(
    async (tx) => {
      const category = await tx.purchaseRequestCategory.findUnique({
        select: { code: true, id: true, isActive: true, name: true, updatedAt: true },
        where: { id: categoryId },
      });

      if (!category) {
        throw new Error("Category not found");
      }

      const affectedSchedules = isActive
        ? []
        : await tx.recurringPurchaseRequestSchedule.findMany({
            orderBy: [{ name: "asc" }, { id: "asc" }],
            select: { id: true },
            where: { categoryId, status: "ACTIVE" },
          });
      if (!isActive && (intendedIsActive !== "0" || !verifyCategoryDeactivationConfirmation({
        categoryId,
        categoryIsActive: category.isActive,
        categoryUpdatedAt: category.updatedAt,
        scheduleIds: affectedSchedules.map((schedule) => schedule.id),
        token: confirmationToken,
      }))) {
        throw new Error("Category deactivation confirmation is invalid or expired");
      }
      const updated = await tx.purchaseRequestCategory.update({
        data: { isActive },
        where: isActive ? { id: categoryId } : { id: categoryId, isActive: true, updatedAt: category.updatedAt },
      });

      await createCategoryAudit(tx, {
        action: isActive ? "PR category activated" : "PR category deactivated",
        actorId: actor.id,
        affectedScheduleIds: affectedSchedules.map((schedule) => schedule.id),
        category: updated,
        detail: `${isActive ? "Activated" : "Deactivated"} PR category ${updated.code} - ${updated.name}`,
      });

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
