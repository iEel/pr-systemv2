import { DraftValidationError, type DraftLineItem, type DraftLineItemRowType } from "./pr-draft";

type NumericValue = string | number | { toString(): string };

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
  branch?: { isActive: boolean; company?: { isActive: boolean } | null } | null;
  category?: { isActive: boolean } | null;
  department?: { id: string; isActive: boolean } | null;
  division?: { departmentId?: string; isActive: boolean } | null;
  responsibleUser?: { isActive: boolean } | null;
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
  if (!lookup.branch?.isActive || lookup.branch.company?.isActive === false) fieldErrors.branchId = "Company / Branch ไม่พร้อมใช้งาน";
  if (!lookup.department?.isActive) fieldErrors.departmentId = "Department ไม่พร้อมใช้งาน";
  if (!lookup.category?.isActive) fieldErrors.categoryId = "หมวดหมู่ PR ไม่พร้อมใช้งาน";
  if (lookup.division && (!lookup.division.isActive || (lookup.division.departmentId && lookup.department && lookup.division.departmentId !== lookup.department.id))) {
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
