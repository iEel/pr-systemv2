import { prisma } from "./prisma";
import type { PRStatus } from "./status";

export type PurchaseRequestListItem = {
  id: string;
  prNo: string;
  date: string;
  company: string;
  branch: string;
  department: string;
  division: string;
  createdBy: string;
  category: string;
  categoryId: string | null;
  total: number;
  status: PRStatus;
};

export type PurchaseRequestDetail = {
  header: {
    id: string;
    prNo: string;
    refNo: string;
    date: string;
    requiredDate: string | null;
    company: string;
    branch: string;
    department: string;
    division: string;
    category: string;
    categoryId: string | null;
    purpose: string;
    purchaseMethod: string;
    createdBy: string;
    generatedAt: string | null;
    printedAt: string | null;
    signedAt: string | null;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
    status: PRStatus;
    recurringOrigin: { scheduleId: string; scheduleName: string } | null;
  };
  items: Array<{
    lineNo: number;
    displayLineNo: number | "";
    rowType: "ITEM" | "HEADING" | "DETAIL";
    accountCode: string;
    description: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  attachments: Array<{
    id: string;
    type: string;
    label: string;
    version: number;
    fileName: string;
    fileSizeLabel: string;
    uploadedAt: string;
  }>;
  timeline: Array<{
    id: string;
    action: string;
    actor: string;
    date: string;
    detail: string;
  }>;
  reissue: {
    categoryId: string;
    categories: Array<{ id: string; label: string }>;
  };
};

type NumericValue = string | number | { toString(): string };

type PurchaseRequestRecord = {
  id: string;
  prNo: string | null;
  documentDate: Date;
  totalAmount: NumericValue;
  status: string;
  company: { displayName: string };
  branch: { name: string };
  department: { name: string };
  division: { name: string } | null;
  createdBy: { displayName: string };
  category: { id: string; name: string } | null;
};

type PurchaseRequestDetailRecord = PurchaseRequestRecord & {
  categoryId: string | null;
  category: { id: string; isActive: boolean; name: string } | null;
  refNo: string | null;
  requiredDate: Date | null;
  purpose: string;
  purchaseMethod: string;
  subtotal: NumericValue;
  vatRate: NumericValue;
  vatAmount: NumericValue;
  generatedAt: Date | null;
  printedAt: Date | null;
  signedAt: Date | null;
  recurringRun?: { schedule: { id: string; name: string } } | null;
  items: Array<{
    lineNo: number;
    rowType?: string | null;
    accountCode: string;
    description: string;
    quantity: NumericValue;
    unitCost: NumericValue;
    totalAmount: NumericValue;
  }>;
  attachments: Array<{
    id: string;
    type: string;
    version: number;
    fileName: string;
    fileSize: number;
    uploadedAt: Date;
  }>;
};

type PurchaseRequestAuditRecord = {
  id: string;
  action: string;
  detail?: string | null;
  metadataJson?: string | null;
  createdAt: Date;
  actor: { displayName: string } | null;
};

type PurchaseRequestCategoryOptionRecord = {
  id: string;
  code: string;
  name: string;
};

const dbStatusToUiStatus: Record<string, PRStatus> = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  PRINTED: "Printed",
  SIGNED: "Signed",
  CANCELLED: "Cancelled",
  REISSUED: "Reissued",
};

const attachmentLabels: Record<string, string> = {
  GENERATED_PDF: "Generated PDF",
  SIGNED_PDF: "Signed PDF / Scan",
  SIGNED_SCAN: "Signed PDF / Scan",
  QUOTATION: "Quotation",
  OTHER: "Other Attachment",
};

export function mapDbStatusToUiStatus(status: string): PRStatus {
  return dbStatusToUiStatus[status.toUpperCase()] ?? "Draft";
}

function toNumber(value: NumericValue) {
  return Number(value);
}

function toDateString(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function normalizeItemRowType(value: string | null | undefined): "ITEM" | "HEADING" | "DETAIL" {
  return value === "HEADING" || value === "DETAIL" ? value : "ITEM";
}

function toDateTimeString(date: Date | null) {
  return date ? date.toISOString() : null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readAuditDetail(audit: PurchaseRequestAuditRecord) {
  if (audit.detail) return audit.detail;

  if (audit.metadataJson) {
    try {
      const metadata = JSON.parse(audit.metadataJson) as { detail?: unknown; template?: unknown };
      if (typeof metadata.detail === "string") return metadata.detail;
      if (typeof metadata.template === "string") return `Template ${metadata.template}`;
    } catch {
      return audit.metadataJson;
    }
  }

  return "Recorded event";
}

export function mapPurchaseRequestRecordToListItem(record: PurchaseRequestRecord): PurchaseRequestListItem {
  return {
    id: record.id,
    prNo: record.prNo || "Draft pending",
    date: record.documentDate.toISOString().slice(0, 10),
    company: record.company.displayName,
    branch: record.branch.name,
    department: record.department.name,
    division: record.division?.name || "-",
    createdBy: record.createdBy.displayName,
    category: record.category?.name || "Not categorized",
    categoryId: record.category?.id || null,
    total: toNumber(record.totalAmount),
    status: mapDbStatusToUiStatus(record.status),
  };
}

export function mapPurchaseRequestDetailRecord(
  record: PurchaseRequestDetailRecord,
  auditLogs: PurchaseRequestAuditRecord[],
  reissueCategories: PurchaseRequestCategoryOptionRecord[] = [],
): PurchaseRequestDetail {
  return {
    header: {
      id: record.id,
      prNo: record.prNo || "Draft pending",
      refNo: record.refNo || "-",
      date: record.documentDate.toISOString().slice(0, 10),
      requiredDate: toDateString(record.requiredDate),
      company: record.company.displayName,
      branch: record.branch.name,
      department: record.department.name,
      division: record.division?.name || "-",
      category: record.category?.name || "Not categorized",
      categoryId: record.category?.id || null,
      purpose: record.purpose,
      purchaseMethod: record.purchaseMethod,
      createdBy: record.createdBy.displayName,
      generatedAt: toDateTimeString(record.generatedAt),
      printedAt: toDateTimeString(record.printedAt),
      signedAt: toDateTimeString(record.signedAt),
      subtotal: toNumber(record.subtotal),
      vatRate: toNumber(record.vatRate),
      vatAmount: toNumber(record.vatAmount),
      total: toNumber(record.totalAmount),
      status: mapDbStatusToUiStatus(record.status),
      recurringOrigin: record.recurringRun ? { scheduleId: record.recurringRun.schedule.id, scheduleName: record.recurringRun.schedule.name } : null,
    },
    items: record.items.reduce<PurchaseRequestDetail["items"]>((items, item) => {
      const rowType = normalizeItemRowType(item.rowType);
      const isPricedItem = rowType === "ITEM";
      const displayLineNo = isPricedItem ? items.filter((current) => current.rowType === "ITEM").length + 1 : "";

      items.push({
        lineNo: item.lineNo,
        displayLineNo,
        rowType,
        accountCode: item.accountCode,
        description: item.description,
        quantity: isPricedItem ? toNumber(item.quantity) : 0,
        unitCost: isPricedItem ? toNumber(item.unitCost) : 0,
        total: isPricedItem ? toNumber(item.totalAmount) : 0,
      });

      return items;
    }, []),
    attachments: record.attachments.map((attachment) => ({
      id: attachment.id,
      type: attachment.type,
      label: attachmentLabels[attachment.type] ?? attachmentLabels.OTHER,
      version: attachment.version,
      fileName: attachment.fileName,
      fileSizeLabel: formatBytes(attachment.fileSize),
      uploadedAt: attachment.uploadedAt.toISOString(),
    })),
    timeline: auditLogs.map((audit) => ({
      id: audit.id,
      action: audit.action,
      actor: audit.actor?.displayName || "System",
      date: audit.createdAt.toISOString(),
      detail: readAuditDetail(audit),
    })),
    reissue: {
      categoryId: record.category?.isActive ? record.category.id : "",
      categories: reissueCategories.map((category) => ({
        id: category.id,
        label: `${category.code} - ${category.name}`,
      })),
    },
  };
}

export async function getPurchaseRequestListItems({ take }: { take?: number } = {}) {
  const records = await prisma.purchaseRequest.findMany({
    include: {
      branch: true,
      category: { select: { id: true, name: true } },
      company: true,
      createdBy: true,
      department: true,
      division: true,
    },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    take,
  });

  return records.map(mapPurchaseRequestRecordToListItem);
}

export async function getPurchaseRequestDetail(id: string) {
  const record = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: [{ type: "asc" }, { version: "desc" }] },
      branch: true,
      category: { select: { id: true, isActive: true, name: true } },
      company: true,
      createdBy: true,
      department: true,
      division: true,
      items: { orderBy: { lineNo: "asc" } },
      recurringRun: { select: { schedule: { select: { id: true, name: true } } } },
    },
  });

  if (!record) return null;

  const [auditLogs, reissueCategories] = await Promise.all([
    prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "asc" },
      where: {
        entityId: id,
        entityType: "PurchaseRequest",
      },
    }),
    record.status === "CANCELLED"
      ? prisma.purchaseRequestCategory.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { code: true, id: true, name: true },
          where: { isActive: true },
        })
      : Promise.resolve([]),
  ]);

  return mapPurchaseRequestDetailRecord(record, auditLogs, reissueCategories);
}
