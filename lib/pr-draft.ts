import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";
import { buildBudgetReference, reserveDraftBudget, updateDraftBudgetReservation } from "./budget-tracking";
import { buildDefaultDraftItems } from "./pr-form-defaults";

export { buildDefaultDraftItems, buildDefaultDraftRemark, type DraftDefaultLineItem } from "./pr-form-defaults";

export type DraftLineItem = {
  accountCode: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
};

export type DraftPurchaseRequestInput = {
  branchId: string;
  departmentId: string;
  divisionId: string | null;
  documentDate: string;
  requiredDate: string | null;
  purpose: string;
  purchaseMethod: string;
  remark: string | null;
  items: DraftLineItem[];
};

export type DraftTotals = {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
};

export type DraftFormOptions = Awaited<ReturnType<typeof getDraftFormOptions>>;

export type DraftFormInitialValue = {
  id: string;
  branchId: string;
  departmentId: string;
  divisionId: string | null;
  documentDate: string;
  requiredDate: string | null;
  purpose: string;
  purchaseMethod: string;
  remark: string | null;
  items: Array<{
    accountCode: string;
    description: string;
    quantity: number;
    unitCost: number;
  }>;
};

export type DraftCloneSource = {
  id: string;
  label: string;
};

type NumericValue = string | number | { toString(): string };

type DepartmentOption = {
  id: string;
  name: string;
  divisions: Array<{ id: string; name: string }>;
};

type DraftEditRecord = {
  id: string;
  branchId: string;
  departmentId: string;
  divisionId: string | null;
  documentDate: Date;
  requiredDate: Date | null;
  purpose: string;
  purchaseMethod: string;
  remark: string | null;
  items: Array<{
    lineNo: number;
    accountCode: string;
    description: string;
    quantity: NumericValue;
    unitCost: NumericValue;
  }>;
};

type DraftCreateContext = {
  clonedFromId?: string | null;
};

export class DraftValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super("Invalid draft purchase request");
    this.name = "DraftValidationError";
    this.fieldErrors = fieldErrors;
  }
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getTextList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

function parseAmount(value: string) {
  const normalized = value.replaceAll(",", "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isInputDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function toUtcInputDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toInputDateString(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function toNumber(value: NumericValue) {
  return Number(value);
}

function isPreferredItName(value: string) {
  return value.trim().toLowerCase() === "it";
}

export function selectDefaultDepartmentAndDivision(departments: DepartmentOption[]) {
  const defaultDepartment = departments.find((department) => isPreferredItName(department.name)) || departments[0];
  const defaultDivision = defaultDepartment?.divisions.find((division) => isPreferredItName(division.name)) || defaultDepartment?.divisions[0];

  return {
    defaultDepartmentId: defaultDepartment?.id || "",
    defaultDivisionId: defaultDivision?.id || "",
  };
}

export function calculateDraftTotals(items: DraftLineItem[]): DraftTotals {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.totalAmount, 0));
  const vatRate = 7;
  const vatAmount = roundMoney(subtotal * (vatRate / 100));

  return {
    subtotal,
    vatRate,
    vatAmount,
    totalAmount: roundMoney(subtotal + vatAmount),
  };
}

export function parseDraftPurchaseRequestForm(formData: FormData): DraftPurchaseRequestInput {
  const fieldErrors: Record<string, string> = {};
  const branchId = getText(formData, "branchId");
  const departmentId = getText(formData, "departmentId");
  const divisionId = getText(formData, "divisionId");
  const documentDate = getText(formData, "documentDate");
  const requiredDate = getText(formData, "requiredDate");
  const purpose = getText(formData, "purpose");
  const purchaseMethod = getText(formData, "purchaseMethod");
  const remark = getText(formData, "remark");

  if (!branchId) fieldErrors.branchId = "เลือก Company / Branch";
  if (!departmentId) fieldErrors.departmentId = "เลือก Department";
  if (!documentDate || !isInputDate(documentDate)) fieldErrors.documentDate = "ระบุ Document Date";
  if (requiredDate && !isInputDate(requiredDate)) fieldErrors.requiredDate = "Required Date ไม่ถูกต้อง";
  if (!purpose) fieldErrors.purpose = "เลือกวัตถุประสงค์";
  if (!purchaseMethod) fieldErrors.purchaseMethod = "เลือกประเภทการจัดซื้อ";

  const accountCodes = getTextList(formData, "itemAccountCode");
  const descriptions = getTextList(formData, "itemDescription");
  const quantities = getTextList(formData, "itemQuantity");
  const unitCosts = getTextList(formData, "itemUnitCost");
  const maxRows = Math.max(accountCodes.length, descriptions.length, quantities.length, unitCosts.length);
  const items: DraftLineItem[] = [];

  for (let index = 0; index < maxRows; index += 1) {
    const accountCode = accountCodes[index] || "";
    const description = descriptions[index] || "";
    const quantityText = quantities[index] || "";
    const unitCostText = unitCosts[index] || "";
    const rowHasValue = [accountCode, description, quantityText, unitCostText].some(Boolean);

    if (!rowHasValue) continue;

    const quantity = parseAmount(quantityText);
    const unitCost = parseAmount(unitCostText);

    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      fieldErrors.items = "ตรวจสอบรายการสินค้า/บริการให้ครบถ้วน";
      continue;
    }

    items.push({
      accountCode,
      description,
      quantity,
      unitCost,
      totalAmount: roundMoney(quantity * unitCost),
    });
  }

  if (items.length === 0) fieldErrors.items = "ต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ";

  if (Object.keys(fieldErrors).length > 0) {
    throw new DraftValidationError(fieldErrors);
  }

  return {
    branchId,
    departmentId,
    divisionId: divisionId || null,
    documentDate,
    requiredDate: requiredDate || null,
    purpose,
    purchaseMethod,
    remark: remark || null,
    items,
  };
}

export function buildDraftCreateData(
  input: DraftPurchaseRequestInput,
  context: { companyId: string; createdById: string; documentRefNo?: string | null; clonedFromId?: string | null },
) {
  const totals = calculateDraftTotals(input.items);

  return {
    clonedFromId: context.clonedFromId || null,
    generatedSnapshotJson: undefined,
    prNo: null,
    refNo: context.documentRefNo || null,
    templateVersionId: undefined,
    companyId: context.companyId,
    branchId: input.branchId,
    departmentId: input.departmentId,
    divisionId: input.divisionId,
    documentDate: toUtcInputDate(input.documentDate),
    requiredDate: input.requiredDate ? toUtcInputDate(input.requiredDate) : null,
    purpose: input.purpose,
    purchaseMethod: input.purchaseMethod,
    remark: input.remark,
    subtotal: totals.subtotal,
    vatRate: totals.vatRate,
    vatAmount: totals.vatAmount,
    totalAmount: totals.totalAmount,
    status: "DRAFT",
    createdById: context.createdById,
    items: {
      create: input.items.map((item, index) => ({
        lineNo: index + 1,
        accountCode: item.accountCode,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalAmount: item.totalAmount,
      })),
    },
  };
}

export function mapDraftEditRecordToInitialValue(record: DraftEditRecord): DraftFormInitialValue {
  return {
    id: record.id,
    branchId: record.branchId,
    departmentId: record.departmentId,
    divisionId: record.divisionId,
    documentDate: record.documentDate.toISOString().slice(0, 10),
    requiredDate: toInputDateString(record.requiredDate),
    purpose: record.purpose,
    purchaseMethod: record.purchaseMethod,
    remark: record.remark,
    items: record.items
      .sort((left, right) => left.lineNo - right.lineNo)
      .map((item) => ({
        accountCode: item.accountCode,
        description: item.description,
        quantity: toNumber(item.quantity),
        unitCost: toNumber(item.unitCost),
      })),
  };
}

export function mapCloneSourceRecordToInitialValue(record: DraftEditRecord, defaultDocumentDate: string): DraftFormInitialValue {
  return {
    ...mapDraftEditRecordToInitialValue(record),
    documentDate: defaultDocumentDate,
    requiredDate: null,
  };
}

export function buildDraftUpdateData(input: DraftPurchaseRequestInput, context: { companyId: string; documentRefNo?: string | null }) {
  const totals = calculateDraftTotals(input.items);

  return {
    purchaseRequest: {
      companyId: context.companyId,
      branchId: input.branchId,
      departmentId: input.departmentId,
      divisionId: input.divisionId,
      documentDate: toUtcInputDate(input.documentDate),
      requiredDate: input.requiredDate ? toUtcInputDate(input.requiredDate) : null,
      purpose: input.purpose,
      purchaseMethod: input.purchaseMethod,
      refNo: context.documentRefNo || null,
      remark: input.remark,
      subtotal: totals.subtotal,
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      status: "DRAFT",
    },
    items: input.items.map((item, index) => ({
      lineNo: index + 1,
      accountCode: item.accountCode,
      description: item.description,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalAmount: item.totalAmount,
    })),
  };
}

export async function createDraftPurchaseRequest(input: DraftPurchaseRequestInput, context: DraftCreateContext = {}) {
  const actor = await requirePermission("PR_CREATE");

  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findFirst({
      select: { companyId: true, documentRefNo: true, id: true },
      where: { id: input.branchId, isActive: true, company: { isActive: true } },
    });

    if (!branch) {
      throw new DraftValidationError({ branchId: "Company / Branch ไม่พร้อมใช้งาน" });
    }

    const department = await tx.department.findFirst({
      select: { id: true },
      where: { id: input.departmentId, isActive: true },
    });

    if (!department) {
      throw new DraftValidationError({ departmentId: "Department ไม่พร้อมใช้งาน" });
    }

    if (input.divisionId) {
      const division = await tx.division.findFirst({
        select: { id: true },
        where: { id: input.divisionId, departmentId: input.departmentId, isActive: true },
      });

      if (!division) {
        throw new DraftValidationError({ divisionId: "Division ไม่ตรงกับ Department" });
      }
    }

    const cloneSource = context.clonedFromId
      ? await tx.purchaseRequest.findUnique({
          select: { id: true, prNo: true },
          where: { id: context.clonedFromId },
        })
      : null;

    if (context.clonedFromId && !cloneSource) {
      throw new DraftValidationError({ cloneSourceId: "ไม่พบ PR ต้นทางสำหรับ Clone" });
    }

    const createData = buildDraftCreateData(input, {
      clonedFromId: cloneSource?.id || null,
      companyId: branch.companyId,
      createdById: actor.id,
      documentRefNo: branch.documentRefNo,
    });

    const created = await tx.purchaseRequest.create({
      data: createData,
      select: { id: true },
    });
    const budgetResult = await reserveDraftBudget(
      tx,
      buildBudgetReference({
        branchId: createData.branchId,
        companyId: createData.companyId,
        departmentId: createData.departmentId,
        documentDate: createData.documentDate,
        totalAmount: createData.totalAmount,
      }),
    );

    await tx.auditLog.create({
      data: {
        entityType: "PurchaseRequest",
        entityId: created.id,
        action: cloneSource ? "Draft cloned" : "Draft created",
        actorId: actor.id,
        metadataJson: JSON.stringify({
          budget: budgetResult,
          budgetStatus: budgetResult.budgetStatus,
          clonedFromId: cloneSource?.id,
          detail: cloneSource ? `Cloned from ${cloneSource.prNo || cloneSource.id}` : "Draft saved from web form",
        }),
      },
    });

    return created;
  });
}

export async function createDraftPurchaseRequestFromFormData(formData: FormData) {
  const cloneSourceId = getText(formData, "cloneSourceId");

  return createDraftPurchaseRequest(parseDraftPurchaseRequestForm(formData), { clonedFromId: cloneSourceId || null });
}

export async function getEditableDraftPurchaseRequest(id: string) {
  const record = await prisma.purchaseRequest.findFirst({
    include: {
      items: { orderBy: { lineNo: "asc" } },
    },
    where: {
      id,
      status: "DRAFT",
    },
  });

  return record ? mapDraftEditRecordToInitialValue(record) : null;
}

export async function getCloneablePurchaseRequestInitialValue(id: string, defaultDocumentDate: string) {
  await requirePermission("PR_CREATE");

  const record = await prisma.purchaseRequest.findFirst({
    include: {
      items: { orderBy: { lineNo: "asc" } },
    },
    where: {
      id,
      branch: { isActive: true, company: { isActive: true } },
      department: { isActive: true },
    },
  });

  if (!record) return null;

  return {
    cloneSource: {
      id: record.id,
      label: record.prNo || "Draft pending",
    } satisfies DraftCloneSource,
    initialDraft: mapCloneSourceRecordToInitialValue(record, defaultDocumentDate),
  };
}

export async function updateDraftPurchaseRequest(id: string, input: DraftPurchaseRequestInput) {
  const actor = await requirePermission("PR_UPDATE_DRAFT");

  return prisma.$transaction(async (tx) => {
    const current = await tx.purchaseRequest.findFirst({
      select: {
        branchId: true,
        companyId: true,
        departmentId: true,
        documentDate: true,
        id: true,
        totalAmount: true,
      },
      where: { id, status: "DRAFT" },
    });

    if (!current) {
      throw new DraftValidationError({ status: "แก้ไขได้เฉพาะเอกสารสถานะ Draft" });
    }

    const branch = await tx.branch.findFirst({
      select: { companyId: true, documentRefNo: true, id: true },
      where: { id: input.branchId, isActive: true, company: { isActive: true } },
    });

    if (!branch) {
      throw new DraftValidationError({ branchId: "Company / Branch ไม่พร้อมใช้งาน" });
    }

    const department = await tx.department.findFirst({
      select: { id: true },
      where: { id: input.departmentId, isActive: true },
    });

    if (!department) {
      throw new DraftValidationError({ departmentId: "Department ไม่พร้อมใช้งาน" });
    }

    if (input.divisionId) {
      const division = await tx.division.findFirst({
        select: { id: true },
        where: { id: input.divisionId, departmentId: input.departmentId, isActive: true },
      });

      if (!division) {
        throw new DraftValidationError({ divisionId: "Division ไม่ตรงกับ Department" });
      }
    }

    const updateData = buildDraftUpdateData(input, { companyId: branch.companyId, documentRefNo: branch.documentRefNo });

    const updated = await tx.purchaseRequest.update({
      data: updateData.purchaseRequest,
      select: { id: true },
      where: { id },
    });

    await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });

    for (const item of updateData.items) {
      await tx.purchaseRequestItem.create({
        data: {
          purchaseRequestId: id,
          ...item,
        },
      });
    }
    const budgetResult = await updateDraftBudgetReservation(
      tx,
      buildBudgetReference({
        branchId: current.branchId,
        companyId: current.companyId,
        departmentId: current.departmentId,
        documentDate: current.documentDate,
        totalAmount: current.totalAmount,
      }),
      buildBudgetReference({
        branchId: updateData.purchaseRequest.branchId,
        companyId: updateData.purchaseRequest.companyId,
        departmentId: updateData.purchaseRequest.departmentId,
        documentDate: updateData.purchaseRequest.documentDate,
        totalAmount: updateData.purchaseRequest.totalAmount,
      }),
    );

    await tx.auditLog.create({
      data: {
        entityType: "PurchaseRequest",
        entityId: id,
        action: "Draft updated",
        actorId: actor.id,
        metadataJson: JSON.stringify({ budget: budgetResult, budgetStatus: budgetResult.budgetStatus, detail: "Draft updated from web form" }),
      },
    });

    return updated;
  });
}

export async function updateDraftPurchaseRequestFromFormData(id: string, formData: FormData) {
  return updateDraftPurchaseRequest(id, parseDraftPurchaseRequestForm(formData));
}

export async function getDraftFormOptions() {
  const [branches, departments] = await Promise.all([
    prisma.branch.findMany({
      include: { company: true },
      orderBy: [{ company: { displayName: "asc" } }, { name: "asc" }],
      where: { isActive: true, company: { isActive: true } },
    }),
    prisma.department.findMany({
      include: { divisions: { orderBy: { name: "asc" }, where: { isActive: true } } },
      orderBy: { name: "asc" },
      where: { isActive: true },
    }),
  ]);

  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
    divisions: department.divisions.map((division) => ({
      id: division.id,
      name: division.name,
    })),
  }));
  const defaultSelection = selectDefaultDepartmentAndDivision(departmentOptions);

  return {
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      companyId: branch.companyId,
      companyDisplayName: branch.company.displayName,
      companyLegalName: branch.company.legalName,
    })),
    departments: departmentOptions,
    ...defaultSelection,
    defaultDocumentDate: new Date().toISOString().slice(0, 10),
    defaultItems: buildDefaultDraftItems(),
  };
}
