import { Prisma } from "@prisma/client";
import { requirePermission } from "./auth/current-user";
import { DraftValidationError, type DraftLineItem, type DraftLineItemRowType } from "./pr-draft";
import { buildAnnualOccurrence, calculateNextAnnualOccurrence, chooseInitialOccurrenceYear, toBangkokDateOnly } from "./recurring-pr-date";
import { prisma } from "./prisma";

type NumericValue = string | number | { toString(): string };

type SearchParams = Record<string, string | string[] | undefined>;
type RecurringSchedulePersistedStatus = "ACTIVE" | "PAUSED";
type RecurringScheduleUiStatus = RecurringSchedulePersistedStatus | "NEEDS_ATTENTION";

export type RecurringScheduleFilters = {
  categoryId: string | "ALL";
  q: string;
  responsibleUserId: string | "ALL";
  status: "ALL" | RecurringScheduleUiStatus;
  upcoming: "ALL" | "30" | "60" | "90";
};

export type RecurringScheduleRow = {
  category: { id: string; label: string };
  id: string;
  lastRun: { status: string; occurredAt: string } | null;
  latestGeneratedDraft: { id: string; label: string } | null;
  leadDays: number;
  name: string;
  nextRunDate: string;
  renewalDay: number;
  renewalMonth: number;
  responsibleUser: { id: string; name: string; isActive: boolean };
  sourcePurchaseRequest: { id: string; label: string } | null;
  status: RecurringScheduleUiStatus;
};

export type RecurringScheduleDetail = RecurringScheduleRow & {
  formValue: RecurringScheduleFormValue;
  runs: Array<{
    errorMessage: string | null;
    id: string;
    occurrenceYear: number;
    purchaseRequest: { id: string; label: string } | null;
    renewalDate: string;
    scheduledDraftDate: string;
    status: string;
  }>;
};

export type RecurringScheduleOptions = {
  branches: Array<{ companyDisplayName: string; companyId: string; id: string; name: string }>;
  categories: Array<{ id: string; label: string }>;
  departments: Array<{ id: string; name: string; divisions: Array<{ id: string; name: string }> }>;
  responsibleUsers: Array<{ disabled: boolean; id: string; label: string }>;
};

export type RecurringScheduleItemInput = DraftLineItem;

export type RecurringScheduleInput = {
  name: string;
  sourcePurchaseRequestId: string;
  branchId: string;
  categoryId: string;
  departmentId: string;
  divisionId: string | null;
  purpose: string;
  purchaseMethod: string;
  remark: string | null;
  renewalMonth: number;
  renewalDay: number;
  leadDays: number;
  responsibleUserId: string;
  items: RecurringScheduleItemInput[];
};

export type RecurringScheduleFormValue = Omit<RecurringScheduleInput, "items"> & {
  items: Array<{
    rowType: DraftLineItemRowType;
    accountCode: string;
    description: string;
    quantity: number;
    unitCost: number;
  }>;
};

export type RecurringScheduleReferenceLookup = {
  branch: { isActive: boolean; company: { isActive: boolean } | null } | null;
  category: { isActive: boolean } | null;
  department: { id: string; isActive: boolean } | null;
  division: { departmentId: string; isActive: boolean } | null;
  responsibleUser: { isActive: boolean } | null;
};

type RecurringScheduleSourceRecord = {
  [key: string]: unknown;
  id: string;
  branchId: string;
  categoryId: string | null;
  departmentId: string;
  divisionId: string | null;
  purpose: string;
  purchaseMethod: string;
  remark: string | null;
  items: Array<{
    lineNo: number;
    rowType?: string | null;
    accountCode: string;
    description: string;
    quantity: NumericValue;
    unitCost: NumericValue;
  }>;
};

type RecurringScheduleDates = Pick<RecurringScheduleFormValue, "leadDays" | "renewalDay" | "renewalMonth"> & {
  responsibleUserId?: string;
};

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getTextList(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value.trim() : ""));
}

function normalizeRowType(value: string | null | undefined): DraftLineItemRowType {
  return value === "HEADING" || value === "DETAIL" ? value : "ITEM";
}

function parseAmount(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPricedItem(item: Pick<RecurringScheduleItemInput, "rowType">) {
  return normalizeRowType(item.rowType) === "ITEM";
}

function toNumber(value: NumericValue) {
  return Number(value);
}

function searchValue(params: SearchParams | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function isoDate(value: Date | string) {
  return new Date(value).toISOString();
}

function recurringScheduleItems(items: RecurringScheduleItemInput[]) {
  return items.map((item, index) => ({
    accountCode: item.accountCode,
    description: item.description,
    lineNo: index + 1,
    quantity: item.rowType === "ITEM" ? item.quantity : 0,
    rowType: item.rowType,
    totalAmount: item.rowType === "ITEM" ? item.totalAmount : 0,
    unitCost: item.rowType === "ITEM" ? item.unitCost : 0,
  }));
}

function requiredScheduleId(value: string) {
  const id = value.trim();
  if (!id) throw new Error("Recurring schedule is required");
  return id;
}

function ensureSourceMatches(input: RecurringScheduleInput, sourcePurchaseRequestId: string) {
  if (input.sourcePurchaseRequestId !== sourcePurchaseRequestId) {
    throw new DraftValidationError({ sourcePurchaseRequestId: "PR ต้นทางไม่ตรงกับ Schedule" });
  }
}

async function validateActiveScheduleReferences(tx: Prisma.TransactionClient, input: RecurringScheduleInput) {
  const [branch, department, category, division, responsibleUser] = await Promise.all([
    tx.branch.findFirst({
      select: { companyId: true, id: true },
      where: { id: input.branchId, isActive: true, company: { isActive: true } },
    }),
    tx.department.findFirst({ select: { id: true }, where: { id: input.departmentId, isActive: true } }),
    tx.purchaseRequestCategory.findFirst({ select: { id: true }, where: { id: input.categoryId, isActive: true } }),
    input.divisionId
      ? tx.division.findFirst({ select: { id: true }, where: { departmentId: input.departmentId, id: input.divisionId, isActive: true } })
      : Promise.resolve(null),
    tx.user.findFirst({ select: { id: true }, where: { id: input.responsibleUserId, isActive: true } }),
  ]);

  validateRecurringScheduleReferences({
    branch: branch ? { company: { isActive: true }, isActive: true } : null,
    category: category ? { isActive: true } : null,
    department: department ? { id: department.id, isActive: true } : null,
    division: input.divisionId ? (division ? { departmentId: input.departmentId, isActive: true } : null) : null,
    responsibleUser: responsibleUser ? { isActive: true } : null,
  });

  return { branch };
}

async function createRecurringScheduleAudit(
  tx: Prisma.TransactionClient,
  {
    action,
    actorId,
    scheduleId,
    sourcePurchaseRequestId,
    nextRunDate,
  }: {
    action: "Recurring schedule created" | "Recurring schedule paused" | "Recurring schedule resumed" | "Recurring schedule updated";
    actorId: string;
    scheduleId: string;
    sourcePurchaseRequestId?: string | null;
    nextRunDate?: Date;
  },
) {
  await tx.auditLog.create({
    data: {
      action,
      actorId,
      entityId: scheduleId,
      entityType: "RecurringPurchaseRequestSchedule",
      metadataJson: JSON.stringify({
        nextRunDate: nextRunDate?.toISOString(),
        scheduleId,
        sourcePurchaseRequestId: sourcePurchaseRequestId || null,
      }),
    },
  });
}

function referencesAreActive(record: any) {
  return Boolean(
    record.branch?.isActive &&
      record.branch.company?.isActive &&
      record.category?.isActive &&
      record.department?.isActive &&
      (!record.division || record.division.isActive) &&
      record.responsibleUser?.isActive,
  );
}

function mapRecurringScheduleRecordToRow(record: any): RecurringScheduleRow {
  const latestRun = record.runs?.[0] || null;
  const generatedDraft = latestRun?.purchaseRequest || null;

  return {
    category: { id: record.category.id, label: `${record.category.code} - ${record.category.name}` },
    id: record.id,
    lastRun: latestRun ? { occurredAt: isoDate(latestRun.startedAt), status: latestRun.status } : null,
    latestGeneratedDraft: generatedDraft ? { id: generatedDraft.id, label: generatedDraft.prNo || "Draft pending" } : null,
    leadDays: record.leadDays,
    name: record.name,
    nextRunDate: isoDate(record.nextRunDate),
    renewalDay: record.renewalDay,
    renewalMonth: record.renewalMonth,
    responsibleUser: { id: record.responsibleUser.id, isActive: record.responsibleUser.isActive, name: record.responsibleUser.displayName },
    sourcePurchaseRequest: record.sourcePurchaseRequest
      ? { id: record.sourcePurchaseRequest.id, label: record.sourcePurchaseRequest.prNo || "Draft pending" }
      : null,
    status: deriveRecurringScheduleUiStatus({
      latestRunStatus: latestRun?.status || null,
      persistedStatus: record.status,
      referencesActive: referencesAreActive(record),
    }),
  };
}

export function normalizeRecurringScheduleFilters(params: SearchParams | undefined): RecurringScheduleFilters {
  const status = String(searchValue(params, "status") || "ALL").trim().toUpperCase();
  const upcoming = String(searchValue(params, "upcoming") || "ALL").trim();

  return {
    categoryId: String(searchValue(params, "categoryId") || "ALL").trim() || "ALL",
    q: String(searchValue(params, "q") || "").trim(),
    responsibleUserId: String(searchValue(params, "responsibleUserId") || "ALL").trim() || "ALL",
    status: status === "ACTIVE" || status === "PAUSED" || status === "NEEDS_ATTENTION" ? status : "ALL",
    upcoming: upcoming === "30" || upcoming === "60" || upcoming === "90" ? upcoming : "ALL",
  };
}

export function deriveRecurringScheduleUiStatus({
  latestRunStatus,
  persistedStatus,
  referencesActive,
}: {
  latestRunStatus: string | null;
  persistedStatus: string;
  referencesActive: boolean;
}): RecurringScheduleUiStatus {
  if (latestRunStatus === "FAILED" || !referencesActive) return "NEEDS_ATTENTION";
  return persistedStatus === "PAUSED" ? "PAUSED" : "ACTIVE";
}

export function parseRecurringScheduleForm(formData: FormData): RecurringScheduleInput {
  const fieldErrors: Record<string, string> = {};
  const name = getText(formData, "name");
  const sourcePurchaseRequestId = getText(formData, "sourcePurchaseRequestId");
  const branchId = getText(formData, "branchId");
  const categoryId = getText(formData, "categoryId");
  const departmentId = getText(formData, "departmentId");
  const divisionId = getText(formData, "divisionId");
  const purpose = getText(formData, "purpose");
  const purchaseMethod = getText(formData, "purchaseMethod");
  const remark = getText(formData, "remark");
  const renewalMonth = parseInteger(getText(formData, "renewalMonth"));
  const renewalDay = parseInteger(getText(formData, "renewalDay"));
  const leadDays = parseInteger(getText(formData, "leadDays"));
  const responsibleUserId = getText(formData, "responsibleUserId");

  if (!name) fieldErrors.name = "ระบุชื่อ Schedule";
  if (!sourcePurchaseRequestId) fieldErrors.sourcePurchaseRequestId = "ไม่พบ PR ต้นทาง";
  if (!branchId) fieldErrors.branchId = "เลือก Company / Branch";
  if (!categoryId) fieldErrors.categoryId = "กรุณาเลือกหมวดหมู่ PR";
  if (!departmentId) fieldErrors.departmentId = "เลือก Department";
  if (!purpose) fieldErrors.purpose = "เลือกวัตถุประสงค์";
  if (!purchaseMethod) fieldErrors.purchaseMethod = "เลือกประเภทการจัดซื้อ";
  if (!responsibleUserId) fieldErrors.responsibleUserId = "เลือกผู้รับผิดชอบ";
  if (!Number.isInteger(renewalMonth) || renewalMonth < 1 || renewalMonth > 12) fieldErrors.renewalMonth = "ระบุเดือนต่ออายุให้ถูกต้อง";
  if (!Number.isInteger(leadDays) || leadDays < 1 || leadDays > 365) fieldErrors.leadDays = "ระบุ Lead days ระหว่าง 1 ถึง 365";

  const maximumRenewalDay = Number.isInteger(renewalMonth) && renewalMonth >= 1 && renewalMonth <= 12
    ? new Date(Date.UTC(2024, renewalMonth, 0)).getUTCDate()
    : 0;
  if (!Number.isInteger(renewalDay) || renewalDay < 1 || renewalDay > maximumRenewalDay) fieldErrors.renewalDay = "ระบุวันต่ออายุให้ถูกต้อง";

  const accountCodes = getTextList(formData, "accountCode");
  const descriptions = getTextList(formData, "description");
  const quantities = getTextList(formData, "quantity");
  const rowTypes = getTextList(formData, "rowType");
  const unitCosts = getTextList(formData, "unitCost");
  const maxRows = Math.max(accountCodes.length, descriptions.length, quantities.length, rowTypes.length, unitCosts.length);
  const items: RecurringScheduleItemInput[] = [];

  for (let index = 0; index < maxRows; index += 1) {
    const accountCode = accountCodes[index] || "";
    const description = descriptions[index] || "";
    const quantityText = quantities[index] || "";
    const unitCostText = unitCosts[index] || "";
    const rowType = normalizeRowType(rowTypes[index]);
    const rowHasValue = [accountCode, description, quantityText, unitCostText].some(Boolean);

    if (!rowHasValue) continue;

    if (!isPricedItem({ rowType })) {
      if (!description) {
        fieldErrors.items = "ตรวจสอบหัวข้อ/รายละเอียดรายการให้ครบถ้วน";
        continue;
      }

      items.push({ rowType, accountCode: "", description, quantity: 0, unitCost: 0, totalAmount: 0 });
      continue;
    }

    const quantity = parseAmount(quantityText);
    const unitCost = parseAmount(unitCostText);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      fieldErrors.items = "ตรวจสอบรายการสินค้า/บริการให้ครบถ้วน";
      continue;
    }

    items.push({ rowType, accountCode, description, quantity, unitCost, totalAmount: roundMoney(quantity * unitCost) });
  }

  if (!items.some(isPricedItem)) fieldErrors.items = "ต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ";
  if (Object.keys(fieldErrors).length > 0) throw new DraftValidationError(fieldErrors);

  return {
    name,
    sourcePurchaseRequestId,
    branchId,
    categoryId,
    departmentId,
    divisionId: divisionId || null,
    purpose,
    purchaseMethod,
    remark: remark || null,
    renewalMonth,
    renewalDay,
    leadDays,
    responsibleUserId,
    items,
  };
}

export function validateRecurringScheduleReferences(lookup: RecurringScheduleReferenceLookup) {
  const fieldErrors: Record<string, string> = {};
  if (!lookup.branch?.isActive || !lookup.branch.company?.isActive) fieldErrors.branchId = "Company / Branch ไม่พร้อมใช้งาน";
  if (!lookup.department?.isActive) fieldErrors.departmentId = "Department ไม่พร้อมใช้งาน";
  if (!lookup.category?.isActive) fieldErrors.categoryId = "หมวดหมู่ PR ไม่พร้อมใช้งาน";
  if (lookup.division && (!lookup.division.isActive || !lookup.department?.isActive || lookup.division.departmentId !== lookup.department.id)) {
    fieldErrors.divisionId = "Division ไม่ตรงกับ Department";
  }
  if (!lookup.responsibleUser?.isActive) fieldErrors.responsibleUserId = "ผู้รับผิดชอบไม่พร้อมใช้งาน";
  if (Object.keys(fieldErrors).length > 0) throw new DraftValidationError(fieldErrors);
}

export function mapSourcePrToScheduleForm(record: RecurringScheduleSourceRecord, dates: RecurringScheduleDates): RecurringScheduleFormValue {
  return {
    name: "",
    sourcePurchaseRequestId: record.id,
    branchId: record.branchId,
    categoryId: record.categoryId || "",
    departmentId: record.departmentId,
    divisionId: record.divisionId,
    purpose: record.purpose,
    purchaseMethod: record.purchaseMethod,
    remark: record.remark,
    renewalMonth: dates.renewalMonth,
    renewalDay: dates.renewalDay,
    leadDays: dates.leadDays,
    responsibleUserId: dates.responsibleUserId || "",
    items: record.items
      .slice()
      .sort((left, right) => left.lineNo - right.lineNo)
      .map((item) => {
        const rowType = normalizeRowType(item.rowType);
        return {
          rowType,
          accountCode: rowType === "ITEM" ? item.accountCode : "",
          description: item.description,
          quantity: rowType === "ITEM" ? toNumber(item.quantity) : 0,
          unitCost: rowType === "ITEM" ? toNumber(item.unitCost) : 0,
        };
      }),
  };
}

export async function getRecurringSchedulePageData(filters: SearchParams | RecurringScheduleFilters = {}, _viewerId?: string) {
  const normalized = normalizeRecurringScheduleFilters(filters);
  const now = new Date();
  const upcomingLimit = normalized.upcoming === "ALL" ? null : new Date(now.getTime() + Number(normalized.upcoming) * 24 * 60 * 60 * 1000);
  const where = {
    ...(normalized.categoryId === "ALL" ? {} : { categoryId: normalized.categoryId }),
    ...(normalized.responsibleUserId === "ALL" ? {} : { responsibleUserId: normalized.responsibleUserId }),
    ...(normalized.status === "ACTIVE" || normalized.status === "PAUSED" ? { status: normalized.status } : {}),
    ...(upcomingLimit ? { nextRunDate: { lte: upcomingLimit } } : {}),
    ...(normalized.q
      ? {
          OR: [
            { name: { contains: normalized.q } },
            { category: { code: { contains: normalized.q } } },
            { category: { name: { contains: normalized.q } } },
            { responsibleUser: { displayName: { contains: normalized.q } } },
            { sourcePurchaseRequest: { prNo: { contains: normalized.q } } },
          ],
        }
      : {}),
  };
  const records = await prisma.recurringPurchaseRequestSchedule.findMany({
    include: {
      branch: { include: { company: true } },
      category: true,
      department: true,
      division: true,
      responsibleUser: true,
      runs: { include: { purchaseRequest: { select: { id: true, prNo: true } } }, orderBy: { startedAt: "desc" }, take: 1 },
      sourcePurchaseRequest: { select: { id: true, prNo: true } },
    },
    orderBy: [{ nextRunDate: "asc" }, { name: "asc" }, { id: "asc" }],
    where,
  });
  const rows = records.map(mapRecurringScheduleRecordToRow).filter((row) => normalized.status !== "NEEDS_ATTENTION" || row.status === "NEEDS_ATTENTION");

  return { filters: normalized, rows };
}

export async function getRecurringScheduleOptions(selectedResponsibleUserId?: string): Promise<RecurringScheduleOptions> {
  const [branches, categories, departments, activeUsers] = await Promise.all([
    prisma.branch.findMany({
      include: { company: true },
      orderBy: [{ company: { displayName: "asc" } }, { name: "asc" }],
      where: { isActive: true, company: { isActive: true } },
    }),
    prisma.purchaseRequestCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], where: { isActive: true } }),
    prisma.department.findMany({
      include: { divisions: { orderBy: { name: "asc" }, where: { isActive: true } } },
      orderBy: { name: "asc" },
      where: { isActive: true },
    }),
    prisma.user.findMany({ orderBy: [{ displayName: "asc" }, { username: "asc" }], where: { isActive: true } }),
  ]);
  const selectedInactiveUser =
    selectedResponsibleUserId && !activeUsers.some((user) => user.id === selectedResponsibleUserId)
      ? await prisma.user.findUnique({ select: { displayName: true, id: true, isActive: true }, where: { id: selectedResponsibleUserId } })
      : null;
  const responsibleUsers = activeUsers.map((user) => ({ disabled: false, id: user.id, label: user.displayName }));

  if (selectedInactiveUser && !selectedInactiveUser.isActive) {
    responsibleUsers.push({ disabled: true, id: selectedInactiveUser.id, label: `${selectedInactiveUser.displayName} (inactive)` });
  }

  return {
    branches: branches.map((branch) => ({ companyDisplayName: branch.company.displayName, companyId: branch.companyId, id: branch.id, name: branch.name })),
    categories: categories.map((category) => ({ id: category.id, label: `${category.code} - ${category.name}` })),
    departments: departments.map((department) => ({
      divisions: department.divisions.map((division) => ({ id: division.id, name: division.name })),
      id: department.id,
      name: department.name,
    })),
    responsibleUsers,
  };
}

export async function getRecurringScheduleDetail(id: string): Promise<RecurringScheduleDetail | null> {
  const scheduleId = requiredScheduleId(id);
  const record = await prisma.recurringPurchaseRequestSchedule.findUnique({
    include: {
      branch: { include: { company: true } },
      category: true,
      department: true,
      division: true,
      items: { orderBy: { lineNo: "asc" } },
      responsibleUser: true,
      runs: {
        include: { purchaseRequest: { select: { id: true, prNo: true } } },
        orderBy: [{ occurrenceYear: "desc" }, { startedAt: "desc" }],
      },
      sourcePurchaseRequest: { select: { id: true, prNo: true } },
    },
    where: { id: scheduleId },
  });

  if (!record) return null;

  const row = mapRecurringScheduleRecordToRow({ ...record, runs: record.runs.slice(0, 1) });
  return {
    ...row,
    formValue: {
      branchId: record.branchId,
      categoryId: record.categoryId,
      departmentId: record.departmentId,
      divisionId: record.divisionId,
      items: record.items.map((item) => ({
        accountCode: item.accountCode,
        description: item.description,
        quantity: Number(item.quantity),
        rowType: normalizeRowType(item.rowType),
        unitCost: Number(item.unitCost),
      })),
      leadDays: record.leadDays,
      name: record.name,
      purpose: record.purpose,
      purchaseMethod: record.purchaseMethod,
      remark: record.remark,
      renewalDay: record.renewalDay,
      renewalMonth: record.renewalMonth,
      responsibleUserId: record.responsibleUserId,
      sourcePurchaseRequestId: record.sourcePurchaseRequestId || "",
    },
    runs: record.runs.map((run) => ({
      errorMessage: run.errorMessage,
      id: run.id,
      occurrenceYear: run.occurrenceYear,
      purchaseRequest: run.purchaseRequest ? { id: run.purchaseRequest.id, label: run.purchaseRequest.prNo || "Draft pending" } : null,
      renewalDate: isoDate(run.renewalDate),
      scheduledDraftDate: isoDate(run.scheduledDraftDate),
      status: run.status,
    })),
  };
}

export async function getRecurringScheduleSource(sourcePrId: string) {
  await requirePermission("PR_RECURRING_MANAGE");
  const sourcePurchaseRequestId = requiredScheduleId(sourcePrId);
  const record = await prisma.purchaseRequest.findUnique({
    include: { items: { orderBy: { lineNo: "asc" } } },
    where: { id: sourcePurchaseRequestId },
  });
  if (!record) return null;

  const [, month, day] = toBangkokDateOnly(new Date()).split("-").map(Number);
  return mapSourcePrToScheduleForm(record, { leadDays: 30, renewalDay: day, renewalMonth: month });
}

export async function createRecurringScheduleFromFormData(sourcePrId: string, formData: FormData) {
  const actor = await requirePermission("PR_RECURRING_MANAGE");
  const sourcePurchaseRequestId = requiredScheduleId(sourcePrId);
  const input = parseRecurringScheduleForm(formData);
  ensureSourceMatches(input, sourcePurchaseRequestId);

  return prisma.$transaction(
    async (tx) => {
      const source = await tx.purchaseRequest.findUnique({
        include: { items: { orderBy: { lineNo: "asc" } } },
        where: { id: sourcePurchaseRequestId },
      });
      if (!source) throw new DraftValidationError({ sourcePurchaseRequestId: "ไม่พบ PR ต้นทาง" });

      const { branch } = await validateActiveScheduleReferences(tx, input);
      if (!branch) throw new DraftValidationError({ branchId: "Company / Branch ไม่พร้อมใช้งาน" });
      const occurrenceYear = chooseInitialOccurrenceYear({
        renewalDay: input.renewalDay,
        renewalMonth: input.renewalMonth,
        today: toBangkokDateOnly(new Date()),
      });
      const occurrence = buildAnnualOccurrence({ ...input, year: occurrenceYear });
      const created = await tx.recurringPurchaseRequestSchedule.create({
        data: {
          branchId: input.branchId,
          categoryId: input.categoryId,
          companyId: branch.companyId,
          createdById: actor.id,
          departmentId: input.departmentId,
          divisionId: input.divisionId,
          items: { create: recurringScheduleItems(input.items) },
          leadDays: input.leadDays,
          name: input.name,
          nextRunDate: occurrence.scheduledDraftDate,
          purpose: input.purpose,
          purchaseMethod: input.purchaseMethod,
          remark: input.remark,
          renewalDay: input.renewalDay,
          renewalMonth: input.renewalMonth,
          responsibleUserId: input.responsibleUserId,
          sourcePurchaseRequestId,
          status: "ACTIVE",
          vatRate: source.vatRate,
        },
        select: { id: true },
      });
      await createRecurringScheduleAudit(tx, {
        action: "Recurring schedule created",
        actorId: actor.id,
        nextRunDate: occurrence.scheduledDraftDate,
        scheduleId: created.id,
        sourcePurchaseRequestId,
      });

      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function updateRecurringScheduleFromFormData(id: string, formData: FormData) {
  const actor = await requirePermission("PR_RECURRING_MANAGE");
  const scheduleId = requiredScheduleId(id);
  const input = parseRecurringScheduleForm(formData);

  return prisma.$transaction(
    async (tx) => {
      const current = await tx.recurringPurchaseRequestSchedule.findUnique({
        select: {
          id: true,
          runs: { orderBy: { occurrenceYear: "desc" }, select: { occurrenceYear: true, status: true } },
          sourcePurchaseRequestId: true,
        },
        where: { id: scheduleId },
      });
      if (!current) throw new Error("Recurring schedule not found");
      if (current.sourcePurchaseRequestId) ensureSourceMatches(input, current.sourcePurchaseRequestId);

      const { branch } = await validateActiveScheduleReferences(tx, input);
      if (!branch) throw new DraftValidationError({ branchId: "Company / Branch ไม่พร้อมใช้งาน" });
      const latestSucceededRun = current.runs.find((run) => run.status === "SUCCEEDED");
      const occurrence = latestSucceededRun
        ? calculateNextAnnualOccurrence({
            leadDays: input.leadDays,
            occurrenceYear: latestSucceededRun.occurrenceYear,
            renewalDay: input.renewalDay,
            renewalMonth: input.renewalMonth,
          })
        : buildAnnualOccurrence({
            leadDays: input.leadDays,
            renewalDay: input.renewalDay,
            renewalMonth: input.renewalMonth,
            year: chooseInitialOccurrenceYear({
              renewalDay: input.renewalDay,
              renewalMonth: input.renewalMonth,
              today: toBangkokDateOnly(new Date()),
            }),
          });
      const updated = await tx.recurringPurchaseRequestSchedule.update({
        data: {
          branchId: input.branchId,
          categoryId: input.categoryId,
          companyId: branch.companyId,
          departmentId: input.departmentId,
          divisionId: input.divisionId,
          leadDays: input.leadDays,
          name: input.name,
          nextRunDate: occurrence.scheduledDraftDate,
          purpose: input.purpose,
          purchaseMethod: input.purchaseMethod,
          remark: input.remark,
          renewalDay: input.renewalDay,
          renewalMonth: input.renewalMonth,
          responsibleUserId: input.responsibleUserId,
        },
        select: { id: true },
        where: { id: scheduleId },
      });
      await tx.recurringPurchaseRequestScheduleItem.deleteMany({ where: { scheduleId } });
      await tx.recurringPurchaseRequestScheduleItem.createMany({ data: recurringScheduleItems(input.items).map((item) => ({ ...item, scheduleId })) });
      await createRecurringScheduleAudit(tx, {
        action: "Recurring schedule updated",
        actorId: actor.id,
        nextRunDate: occurrence.scheduledDraftDate,
        scheduleId: updated.id,
        sourcePurchaseRequestId: current.sourcePurchaseRequestId,
      });

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function setRecurringScheduleStatus(id: string, status: RecurringSchedulePersistedStatus) {
  if (status !== "ACTIVE" && status !== "PAUSED") throw new Error("Schedule status must be ACTIVE or PAUSED");
  const actor = await requirePermission("PR_RECURRING_MANAGE");
  const scheduleId = requiredScheduleId(id);

  return prisma.$transaction(
    async (tx) => {
      const current = await tx.recurringPurchaseRequestSchedule.findUnique({
        select: { id: true, nextRunDate: true, sourcePurchaseRequestId: true },
        where: { id: scheduleId },
      });
      if (!current) throw new Error("Recurring schedule not found");
      const updated = await tx.recurringPurchaseRequestSchedule.update({ data: { status }, select: { id: true }, where: { id: scheduleId } });
      await createRecurringScheduleAudit(tx, {
        action: status === "PAUSED" ? "Recurring schedule paused" : "Recurring schedule resumed",
        actorId: actor.id,
        nextRunDate: current.nextRunDate,
        scheduleId: updated.id,
        sourcePurchaseRequestId: current.sourcePurchaseRequestId,
      });
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
