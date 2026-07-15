import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";
import { buildBudgetReference, reserveDraftBudget, reverseUsedBudget } from "./budget-tracking";

export type PdfDeliveryMode = "inline" | "download";
export type SignedAttachmentType = "SIGNED_PDF" | "SIGNED_SCAN";
export type QuotationAttachmentType = "QUOTATION";

const signedUploadMaxBytes = 15 * 1024 * 1024;
const signedUploadTypes: Record<string, { extension: string; type: SignedAttachmentType }> = {
  "application/pdf": { extension: ".pdf", type: "SIGNED_PDF" },
  "image/jpeg": { extension: ".jpg", type: "SIGNED_SCAN" },
  "image/png": { extension: ".png", type: "SIGNED_SCAN" },
};
const quotationUploadMaxBytes = 15 * 1024 * 1024;
const quotationUploadTypesByExtension: Record<string, { extension: string; mimeType: string; type: QuotationAttachmentType }> = {
  ".docx": { extension: ".docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", type: "QUOTATION" },
  ".jpg": { extension: ".jpg", mimeType: "image/jpeg", type: "QUOTATION" },
  ".jpeg": { extension: ".jpg", mimeType: "image/jpeg", type: "QUOTATION" },
  ".pdf": { extension: ".pdf", mimeType: "application/pdf", type: "QUOTATION" },
  ".png": { extension: ".png", mimeType: "image/png", type: "QUOTATION" },
  ".xlsx": { extension: ".xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", type: "QUOTATION" },
};
const quotationUploadTypesByMimeType = Object.fromEntries(
  Object.values(quotationUploadTypesByExtension).map((rule) => [rule.mimeType, rule]),
) as Record<string, { extension: string; mimeType: string; type: QuotationAttachmentType }>;

type SignedUploadFileLike = {
  name: string;
  type: string;
  size: number;
};

export function resolveDocumentStoragePath(storagePath: string) {
  if (path.isAbsolute(storagePath)) {
    throw new Error("Invalid document storage path");
  }

  const storageRoot = path.resolve(process.cwd(), "storage");
  const resolved = path.resolve(storageRoot, storagePath);

  if (resolved !== storageRoot && !resolved.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid document storage path");
  }

  return resolved;
}

export function buildPdfDeliveryHeaders(fileName: string, mode: PdfDeliveryMode) {
  const disposition = mode === "download" ? "attachment" : "inline";

  return {
    "cache-control": "private, no-store",
    "content-disposition": `${disposition}; filename="${fileName.replaceAll('"', "")}"`,
    "content-type": "application/pdf",
    "x-content-type-options": "nosniff",
  };
}

export function buildAttachmentDeliveryHeaders(fileName: string, mimeType: string) {
  return {
    "cache-control": "private, no-store",
    "content-disposition": `attachment; filename="${fileName.replaceAll('"', "")}"`,
    "content-type": mimeType,
    "x-content-type-options": "nosniff",
  };
}

export function assertPrintableStatus(status: string) {
  if (status !== "GENERATED") {
    throw new Error("Only generated purchase requests can be marked printed");
  }
}

export function assertSignableStatus(status: string) {
  if (status !== "PRINTED") {
    throw new Error("Only printed purchase requests can receive signed documents");
  }
}

export function assertQuotationUploadableStatus(status: string) {
  if (!["DRAFT", "GENERATED", "PRINTED", "SIGNED"].includes(status)) {
    throw new Error("Cancelled or reissued purchase requests cannot receive quotations");
  }
}

export function assertCancellableStatus(status: string) {
  if (!["GENERATED", "PRINTED", "SIGNED"].includes(status)) {
    throw new Error("Only generated, printed, or signed purchase requests can be cancelled");
  }
}

export function assertReissuableStatus(status: string) {
  if (status !== "CANCELLED") {
    throw new Error("Only cancelled purchase requests can be reissued");
  }
}

export function normalizeCancelReason(reason: string) {
  const normalized = reason.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    throw new Error("Cancel reason is required");
  }

  return normalized;
}

export function validateSignedUploadFile(file: SignedUploadFileLike | null | undefined) {
  if (!file || file.size === 0) {
    throw new Error("Signed document file is required");
  }

  if (file.size > signedUploadMaxBytes) {
    throw new Error("Signed document must be 15 MB or smaller");
  }

  const rule = signedUploadTypes[file.type.toLowerCase()];
  if (!rule) {
    throw new Error("Signed document must be a PDF, JPG, JPEG, or PNG file");
  }

  return {
    extension: rule.extension,
    mimeType: file.type.toLowerCase(),
    type: rule.type,
  };
}

export function validateQuotationUploadFile(file: SignedUploadFileLike | null | undefined) {
  if (!file || file.size === 0) {
    throw new Error("Quotation file is required");
  }

  if (file.size > quotationUploadMaxBytes) {
    throw new Error("Quotation must be 15 MB or smaller");
  }

  const extension = path.extname(file.name).toLowerCase();
  const rule = quotationUploadTypesByExtension[extension] || quotationUploadTypesByMimeType[file.type.toLowerCase()];
  if (!rule) {
    throw new Error("Quotation must be a PDF, JPG, PNG, DOCX, or XLSX file");
  }

  return {
    extension: rule.extension,
    mimeType: file.type && file.type.toLowerCase() !== "application/octet-stream" ? file.type.toLowerCase() : rule.mimeType,
    type: rule.type,
  };
}

function safeDocumentBase(value: string | null) {
  const cleaned = (value || `pr_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || `pr_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function buildSignedDocumentStoragePath({
  mimeType,
  prNo,
  version,
}: {
  mimeType: string;
  originalName: string;
  prNo: string | null;
  version: number;
}) {
  const rule = signedUploadTypes[mimeType.toLowerCase()];
  if (!rule) {
    throw new Error("Signed document must be a PDF, JPG, JPEG, or PNG file");
  }

  return path.posix.join("signed", `${safeDocumentBase(prNo)}_signed_v${version}${rule.extension}`);
}

export function buildQuotationStoragePath({
  mimeType,
  originalName,
  prNo,
  purchaseRequestId,
  version,
}: {
  mimeType: string;
  originalName: string;
  prNo: string | null;
  purchaseRequestId: string;
  version: number;
}) {
  const validation = validateQuotationUploadFile({ name: originalName, size: 1, type: mimeType });

  return path.posix.join("quotations", `${safeDocumentBase(prNo || purchaseRequestId)}_quotation_v${version}${validation.extension}`);
}

function sha256Hex(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function getGeneratedPdfForPurchaseRequest(id: string) {
  await requirePermission("PR_GENERATE");

  const attachment = await prisma.purchaseRequestAttachment.findFirst({
    include: {
      purchaseRequest: { select: { id: true } },
    },
    orderBy: { version: "desc" },
    where: {
      purchaseRequestId: id,
      type: "GENERATED_PDF",
    },
  });

  if (!attachment) return null;

  const filePath = resolveDocumentStoragePath(attachment.storagePath);
  const file = await fs.readFile(filePath).catch(() => null);

  if (!file) return null;

  return {
    file,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    sha256: attachment.sha256,
  };
}

export async function getPurchaseRequestAttachmentFile(purchaseRequestId: string, attachmentId: string) {
  await requirePermission("PR_GENERATE");

  const attachment = await prisma.purchaseRequestAttachment.findFirst({
    where: {
      id: attachmentId,
      purchaseRequestId,
      type: { in: ["SIGNED_PDF", "SIGNED_SCAN", "QUOTATION", "OTHER"] },
    },
  });

  if (!attachment) return null;

  const filePath = resolveDocumentStoragePath(attachment.storagePath);
  const file = await fs.readFile(filePath).catch(() => null);

  if (!file) return null;

  return {
    file,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    sha256: attachment.sha256,
  };
}

export async function markPurchaseRequestPrinted(id: string) {
  const actor = await requirePermission("PR_MARK_PRINTED");

  return prisma.$transaction(async (tx) => {
    const record = await tx.purchaseRequest.findUnique({
      select: { id: true, status: true },
      where: { id },
    });

    if (!record) {
      throw new Error("Purchase request not found");
    }

    assertPrintableStatus(record.status);

    const printedAt = new Date();
    const updated = await tx.purchaseRequest.update({
      data: {
        printedAt,
        status: "PRINTED",
      },
      select: { id: true },
      where: { id },
    });

    await tx.auditLog.create({
      data: {
        action: "Marked printed",
        actorId: actor.id,
        entityId: id,
        entityType: "PurchaseRequest",
        metadataJson: JSON.stringify({ detail: "Generated document marked as printed" }),
      },
    });

    return updated;
  });
}

export async function uploadSignedDocumentForPurchaseRequest(id: string, file: File) {
  const actor = await requirePermission("PR_UPLOAD_SIGNED");
  const validation = validateSignedUploadFile(file);
  const record = await prisma.purchaseRequest.findUnique({
    select: { id: true, prNo: true, status: true },
    where: { id },
  });

  if (!record) {
    throw new Error("Purchase request not found");
  }

  assertSignableStatus(record.status);

  const latestSigned = await prisma.purchaseRequestAttachment.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
    where: {
      purchaseRequestId: id,
      type: validation.type,
    },
  });
  const version = (latestSigned?.version ?? 0) + 1;
  const storagePath = buildSignedDocumentStoragePath({
    mimeType: validation.mimeType,
    originalName: file.name,
    prNo: record.prNo,
    version,
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = sha256Hex(buffer);
  const filePath = resolveDocumentStoragePath(storagePath);
  const fileName = path.posix.basename(storagePath);

  await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, buffer);

  return prisma.$transaction(async (tx) => {
    const freshRecord = await tx.purchaseRequest.findUnique({
      select: { status: true },
      where: { id },
    });

    if (!freshRecord) {
      throw new Error("Purchase request not found");
    }

    assertSignableStatus(freshRecord.status);

    const attachment = await tx.purchaseRequestAttachment.create({
      data: {
        fileName,
        fileSize: buffer.length,
        mimeType: validation.mimeType,
        purchaseRequestId: id,
        sha256: hash,
        storagePath,
        type: validation.type,
        uploadedById: actor.id,
        version,
      },
      select: {
        id: true,
        fileName: true,
        storagePath: true,
        version: true,
      },
    });

    await tx.purchaseRequest.update({
      data: {
        signedAt: new Date(),
        status: "SIGNED",
      },
      where: { id },
    });

    await tx.auditLog.create({
      data: {
        action: "Uploaded signed document",
        actorId: actor.id,
        entityId: id,
        entityType: "PurchaseRequest",
        metadataJson: JSON.stringify({
          detail: `Uploaded ${fileName}`,
          fileName,
          sha256: hash,
          type: validation.type,
          version,
        }),
      },
    });

    return attachment;
  });
}

export async function uploadQuotationForPurchaseRequest(id: string, file: File) {
  const actor = await requirePermission("PR_UPLOAD_ATTACHMENT");
  const validation = validateQuotationUploadFile(file);
  const record = await prisma.purchaseRequest.findUnique({
    select: { id: true, prNo: true, status: true },
    where: { id },
  });

  if (!record) {
    throw new Error("Purchase request not found");
  }

  assertQuotationUploadableStatus(record.status);

  const latestQuotation = await prisma.purchaseRequestAttachment.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
    where: {
      purchaseRequestId: id,
      type: validation.type,
    },
  });
  const version = (latestQuotation?.version ?? 0) + 1;
  const storagePath = buildQuotationStoragePath({
    mimeType: validation.mimeType,
    originalName: file.name,
    prNo: record.prNo,
    purchaseRequestId: record.id,
    version,
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = sha256Hex(buffer);
  const filePath = resolveDocumentStoragePath(storagePath);
  const fileName = path.posix.basename(storagePath);

  await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, buffer);

  return prisma.$transaction(async (tx) => {
    const freshRecord = await tx.purchaseRequest.findUnique({
      select: { status: true },
      where: { id },
    });

    if (!freshRecord) {
      throw new Error("Purchase request not found");
    }

    assertQuotationUploadableStatus(freshRecord.status);

    const attachment = await tx.purchaseRequestAttachment.create({
      data: {
        fileName,
        fileSize: buffer.length,
        mimeType: validation.mimeType,
        purchaseRequestId: id,
        sha256: hash,
        storagePath,
        type: validation.type,
        uploadedById: actor.id,
        version,
      },
      select: {
        id: true,
        fileName: true,
        storagePath: true,
        version: true,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Uploaded quotation",
        actorId: actor.id,
        entityId: id,
        entityType: "PurchaseRequest",
        metadataJson: JSON.stringify({
          detail: `Uploaded quotation ${fileName}`,
          fileName,
          originalName: file.name,
          sha256: hash,
          type: validation.type,
          version,
        }),
      },
    });

    return attachment;
  });
}

export async function cancelPurchaseRequest(id: string, reason: string) {
  const actor = await requirePermission("PR_CANCEL_REISSUE");
  const cancelReason = normalizeCancelReason(reason);

  return prisma.$transaction(async (tx) => {
    const record = await tx.purchaseRequest.findUnique({
      select: {
        branchId: true,
        companyId: true,
        departmentId: true,
        documentDate: true,
        id: true,
        prNo: true,
        status: true,
        totalAmount: true,
      },
      where: { id },
    });

    if (!record) {
      throw new Error("Purchase request not found");
    }

    assertCancellableStatus(record.status);
    const budgetResult = await reverseUsedBudget(
      tx,
      buildBudgetReference({
        branchId: record.branchId,
        companyId: record.companyId,
        departmentId: record.departmentId,
        documentDate: record.documentDate,
        totalAmount: record.totalAmount,
      }),
    );

    const cancelledAt = new Date();
    const updated = await tx.purchaseRequest.update({
      data: {
        cancelledAt,
        status: "CANCELLED",
      },
      select: { id: true, prNo: true, status: true },
      where: { id },
    });

    await tx.auditLog.create({
      data: {
        action: "Cancelled",
        actorId: actor.id,
        entityId: id,
        entityType: "PurchaseRequest",
        metadataJson: JSON.stringify({
          budget: budgetResult,
          budgetStatus: budgetResult.budgetStatus,
          detail: `Cancelled ${record.prNo || record.id}: ${cancelReason}`,
          reason: cancelReason,
        }),
      },
    });

    return updated;
  });
}

export async function reissuePurchaseRequest(id: string) {
  const actor = await requirePermission("PR_CANCEL_REISSUE");

  return prisma.$transaction(async (tx) => {
    const original = await tx.purchaseRequest.findUnique({
      include: {
        items: { orderBy: { lineNo: "asc" } },
      },
      where: { id },
    });

    if (!original) {
      throw new Error("Purchase request not found");
    }

    assertReissuableStatus(original.status);
    const replacementDocumentDate = new Date();

    const replacement = await tx.purchaseRequest.create({
      data: {
        branchId: original.branchId,
        categoryId: original.categoryId,
        companyId: original.companyId,
        createdById: actor.id,
        departmentId: original.departmentId,
        divisionId: original.divisionId,
        documentDate: replacementDocumentDate,
        items: {
          create: original.items.map((item) => ({
            accountCode: item.accountCode,
            description: item.description,
            lineNo: item.lineNo,
            rowType: item.rowType,
            quantity: item.quantity,
            totalAmount: item.totalAmount,
            unitCost: item.unitCost,
          })),
        },
        purchaseMethod: original.purchaseMethod,
        purpose: original.purpose,
        refNo: original.refNo,
        reissuedFromId: original.id,
        remark: original.remark,
        requiredDate: original.requiredDate,
        status: "DRAFT",
        subtotal: original.subtotal,
        totalAmount: original.totalAmount,
        vatAmount: original.vatAmount,
        vatRate: original.vatRate,
      },
      select: { id: true },
    });
    const budgetResult = await reserveDraftBudget(
      tx,
      buildBudgetReference({
        branchId: original.branchId,
        companyId: original.companyId,
        departmentId: original.departmentId,
        documentDate: replacementDocumentDate,
        totalAmount: original.totalAmount,
      }),
    );

    await tx.purchaseRequest.update({
      data: { status: "REISSUED" },
      where: { id },
    });

    await tx.auditLog.create({
      data: {
        action: "Reissued",
        actorId: actor.id,
        entityId: id,
        entityType: "PurchaseRequest",
        metadataJson: JSON.stringify({
          detail: `Created replacement draft ${replacement.id}`,
          replacementId: replacement.id,
        }),
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Draft created",
        actorId: actor.id,
        entityId: replacement.id,
        entityType: "PurchaseRequest",
        metadataJson: JSON.stringify({
          budget: budgetResult,
          budgetStatus: budgetResult.budgetStatus,
          detail: `Reissued from ${original.prNo || original.id}`,
          reissuedFromId: original.id,
        }),
      },
    });

    return replacement;
  });
}
