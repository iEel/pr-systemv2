import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { renderCarboneTemplate } from "./carbone-client";
import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";
import { buildBudgetReference, issueDraftBudget } from "./budget-tracking";

type NumericValue = string | number | { toString(): string };

type RunningNumberLike = {
  prefix: string;
  yearFormat: string;
  monthFormat: string;
  padding: number;
  currentValue: number;
};

type PurchaseRequestRenderRecord = {
  id: string;
  prNo: string | null;
  refNo: string | null;
  documentDate: Date;
  requiredDate: Date | null;
  purpose: string;
  purchaseMethod: string;
  remark: string | null;
  subtotal: NumericValue;
  vatRate: NumericValue;
  vatAmount: NumericValue;
  totalAmount: NumericValue;
  company: { displayName: string; legalName: string; taxId: string | null };
  branch: {
    name: string;
    code: string;
    address: string | null;
    documentAddress?: string | null;
    documentDisplayName?: string | null;
    documentFooterAssetPath?: string | null;
    documentHeaderAssetPath?: string | null;
    documentLegalName?: string | null;
    documentRefNo?: string | null;
    documentTaxId?: string | null;
  };
  department: { name: string };
  division: { name: string } | null;
  createdBy: { displayName: string };
  items: Array<{
    lineNo: number;
    rowType?: string | null;
    accountCode: string;
    description: string;
    quantity: NumericValue;
    unitCost: NumericValue;
    totalAmount: NumericValue;
  }>;
};

export type PurchaseRequestRenderPayload = ReturnType<typeof buildPurchaseRequestRenderPayload>;

type PurchaseRequestAssetDataUris = {
  footer?: string;
  footerBuffer?: Buffer | null;
  header?: string;
  headerBuffer?: Buffer | null;
};

type PurchaseRequestTemplateImageBuffers = {
  footer?: Buffer | null;
  header?: Buffer | null;
};

function toNumber(value: NumericValue) {
  return Number(value);
}

function formatDateTH(date: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTHBText(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace(/\u00a0/g, " ");
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeItemRowType(value: string | null | undefined): "ITEM" | "HEADING" {
  return value === "HEADING" ? "HEADING" : "ITEM";
}

const remarkTemplateLineMaxLength = 78;

function normalizeRemarkLines(value: string | null | undefined) {
  return (value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitAtPreferredBreak(value: string, maxLineLength: number) {
  if (value.length <= maxLineLength) {
    return { line: value, rest: "" };
  }

  const preferredBreak = value.lastIndexOf(" ", maxLineLength + 1);
  const splitIndex = preferredBreak >= Math.floor(maxLineLength * 0.55) ? preferredBreak : maxLineLength;

  return {
    line: value.slice(0, splitIndex).trim(),
    rest: value.slice(splitIndex).trim(),
  };
}

function fitTemplateLine(value: string, maxLineLength: number) {
  if (value.length <= maxLineLength) return value;

  const clipLength = Math.max(0, maxLineLength - 3);
  const clipped = value.slice(0, clipLength).trimEnd();

  return clipped ? `${clipped}...` : "";
}

export function splitRemarkIntoTemplateLines(value: string | null | undefined, maxLineLength = remarkTemplateLineMaxLength) {
  const lines = normalizeRemarkLines(value);
  if (lines.length === 0) {
    return { line1: "-", line2: "" };
  }

  const [firstLineSource = "", ...remainingLines] = lines;
  const firstLine = splitAtPreferredBreak(firstLineSource, maxLineLength);
  const secondLineSource = [firstLine.rest, ...remainingLines].filter(Boolean).join(" ");

  return {
    line1: fitTemplateLine(firstLine.line, maxLineLength) || "-",
    line2: fitTemplateLine(secondLineSource, maxLineLength),
  };
}

function buildRunningNumberParts(setting: RunningNumberLike, date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const yearPart = setting.yearFormat === "YYYY" ? String(year) : String(year).slice(-2);
  const monthPart = setting.monthFormat === "MM" ? String(month).padStart(2, "0") : "";

  return {
    documentPrefix: `${setting.prefix}${yearPart}${monthPart}`,
    monthPart,
    yearPart,
  };
}

export function getNextRunningNumberValue(setting: Pick<RunningNumberLike, "currentValue">, highestExistingValue = 0) {
  return Math.max(setting.currentValue, highestExistingValue) + 1;
}

function formatRunningNumberValue(setting: RunningNumberLike, date: Date, value: number) {
  const { documentPrefix } = buildRunningNumberParts(setting, date);
  const numberPart = String(value).padStart(setting.padding, "0");

  return `${documentPrefix}${numberPart}`;
}

export function formatRunningNumber(setting: RunningNumberLike, date: Date) {
  return formatRunningNumberValue(setting, date, getNextRunningNumberValue(setting));
}

function checkboxMark(matches: boolean) {
  return matches ? "X" : "";
}

export function buildPurchaseRequestRenderPayload(record: PurchaseRequestRenderRecord, prNo: string, assetDataUris: PurchaseRequestAssetDataUris = {}) {
  const subtotal = toNumber(record.subtotal);
  const vatRate = toNumber(record.vatRate);
  const vatAmount = toNumber(record.vatAmount);
  const totalAmount = toNumber(record.totalAmount);
  const remarkLines = splitRemarkIntoTemplateLines(record.remark);

  return {
    id: record.id,
    prNo,
    refNo: record.refNo || record.branch.documentRefNo || "-",
    documentDate: formatDateTH(record.documentDate),
    requiredDate: formatDateTH(record.requiredDate),
    companyName: record.company.displayName,
    companyDisplayName: record.branch.documentDisplayName || record.company.displayName,
    companyLegalName: record.branch.documentLegalName || record.company.legalName,
    companyTaxId: record.branch.documentTaxId || record.company.taxId || "-",
    companyHeaderAssetPath: record.branch.documentHeaderAssetPath || "",
    companyFooterAssetPath: record.branch.documentFooterAssetPath || "",
    companyHeaderImage: assetDataUris.header || "",
    companyFooterImage: assetDataUris.footer || "",
    branchName: record.branch.name,
    branchCode: record.branch.code,
    branchAddress: record.branch.documentAddress || record.branch.address || "-",
    department: record.department.name,
    division: record.division?.name || "-",
    purpose: record.purpose,
    purposeNewMark: checkboxMark(record.purpose === "ซื้อใหม่"),
    purposeRenewalMark: checkboxMark(record.purpose === "ต่ออายุ"),
    purposeRepairMark: checkboxMark(record.purpose === "ซ่อมแซม"),
    purposeReplacementMark: checkboxMark(record.purpose === "ทดแทนของเดิม"),
    purchaseMethod: record.purchaseMethod,
    purchaseByProcurementMark: checkboxMark(record.purchaseMethod === "ฝ่ายจัดซื้อจัดหา" || record.purchaseMethod === "ฝ่ายจัดซื้อ"),
    purchaseSelfMark: checkboxMark(record.purchaseMethod === "ขอซื้อเอง"),
    remark: record.remark || "-",
    remarkLine1: remarkLines.line1,
    remarkLine2: remarkLines.line2,
    createdBy: record.createdBy.displayName,
    subtotal,
    subtotalFormatted: formatAmount(subtotal),
    vatRate,
    vatAmount,
    vatAmountFormatted: formatAmount(vatAmount),
    totalAmount,
    totalAmountFormatted: formatAmount(totalAmount),
    totalAmountText: formatTHBText(totalAmount),
    items: record.items
      .slice()
      .sort((left, right) => left.lineNo - right.lineNo)
      .map((item) => ({
        ...item,
        rowType: normalizeItemRowType(item.rowType),
      }))
      .reduce<Array<{
        lineNo: number | "";
        itemNo: number | "";
        rowType: "ITEM" | "HEADING";
        isHeading: boolean;
        accountCode: string;
        description: string;
        quantity: number | "";
        unitCost: number;
        unitCostFormatted: string;
        totalAmount: number;
        totalAmountFormatted: string;
      }>>((items, item) => {
        const isHeading = item.rowType === "HEADING";
        const itemNo = isHeading ? "" : items.filter((current) => !current.isHeading).length + 1;

        items.push({
          lineNo: itemNo,
          itemNo,
          rowType: item.rowType,
          isHeading,
          accountCode: item.accountCode,
          description: item.description,
          quantity: isHeading ? "" : toNumber(item.quantity),
          unitCost: toNumber(item.unitCost),
          unitCostFormatted: isHeading ? "" : formatAmount(toNumber(item.unitCost)),
          totalAmount: toNumber(item.totalAmount),
          totalAmountFormatted: isHeading ? "" : formatAmount(toNumber(item.totalAmount)),
        });

        return items;
      }, []),
  };
}

export function buildGeneratedFileInfo(prNo: string) {
  const fileName = `${prNo}.pdf`;
  const storagePath = path.posix.join("generated", fileName);

  return {
    fileName,
    mimeType: "application/pdf",
    storagePath,
  };
}

export function buildDraftPreviewFileInfo(id: string) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "draft";

  return {
    fileName: `PR_DRAFT_PREVIEW_${safeId}.pdf`,
    mimeType: "application/pdf",
  };
}

export function sha256Hex(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function resolveStoragePath(storagePath: string) {
  return path.join(process.cwd(), "storage", storagePath);
}

function resolveSafeStoragePath(storagePath: string | null | undefined) {
  if (!storagePath) return null;

  const storageRoot = path.resolve(process.cwd(), "storage");
  const resolved = path.resolve(storageRoot, storagePath);

  if (resolved !== storageRoot && !resolved.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid storage path");
  }

  return resolved;
}

function storageImageContentType(storagePath: string) {
  return path.extname(storagePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
}

async function buildStorageImageDataUri(storagePath: string | null | undefined) {
  const filePath = resolveSafeStoragePath(storagePath);
  if (!filePath || !storagePath) return { buffer: null, dataUri: "" };

  const file = await fs.readFile(filePath).catch(() => null);
  if (!file) return { buffer: null, dataUri: "" };

  return {
    buffer: file,
    dataUri: `data:${storageImageContentType(storagePath)};base64,${file.toString("base64")}`,
  };
}

async function loadBranchAssetDataUris(branch: PurchaseRequestRenderRecord["branch"]) {
  const [header, footer] = await Promise.all([
    buildStorageImageDataUri(branch.documentHeaderAssetPath),
    buildStorageImageDataUri(branch.documentFooterAssetPath),
  ]);

  return {
    footer: footer.dataUri,
    footerBuffer: footer.buffer,
    header: header.dataUri,
    headerBuffer: header.buffer,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectOfficeImageType(buffer: Buffer) {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { contentType: "image/png", extension: "png" };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  return null;
}

async function ensureDocxImageContentType(zip: JSZip, imageType: { contentType: string; extension: string }) {
  const contentTypePath = "[Content_Types].xml";
  const contentTypeFile = zip.file(contentTypePath);
  if (!contentTypeFile) return;

  let xml = await contentTypeFile.async("string");
  const extensionPattern = new RegExp(`<Default\\b[^>]*\\bExtension="${escapeRegExp(imageType.extension)}"`, "i");
  if (extensionPattern.test(xml)) return;

  xml = xml.replace("</Types>", `<Default Extension="${imageType.extension}" ContentType="${imageType.contentType}"/></Types>`);
  zip.file(contentTypePath, xml);
}

function resolveRelationshipTargetPath(partName: string, target: string) {
  return path.posix.normalize(path.posix.join(path.posix.dirname(partName), target));
}

function replaceRelationshipTargetExtension(target: string, extension: string) {
  const currentExtension = path.posix.extname(target);
  return currentExtension ? `${target.slice(0, -currentExtension.length)}.${extension}` : `${target}.${extension}`;
}

async function replaceDocxRelatedImage(zip: JSZip, partName: string, relId: string, image: Buffer) {
  const relsPath = path.posix.join(path.posix.dirname(partName), "_rels", `${path.posix.basename(partName)}.rels`);
  const relsFile = zip.file(relsPath);
  if (!relsFile) return false;

  let relsXml = await relsFile.async("string");
  const relationshipPattern = new RegExp(`<Relationship\\b(?=[^>]*\\bId="${escapeRegExp(relId)}")[^>]*\\/?>`, "i");
  const relationshipMatch = relsXml.match(relationshipPattern);
  const relationshipXml = relationshipMatch?.[0];
  if (!relationshipXml) return false;

  const targetMatch = relationshipXml.match(/\bTarget="([^"]+)"/i);
  const target = targetMatch?.[1];
  if (!target || /^https?:\/\//i.test(target)) return false;

  const imageType = detectOfficeImageType(image);
  const currentExtension = path.posix.extname(target).replace(/^\./, "").toLowerCase();
  let nextTarget = target;

  if (imageType && currentExtension !== imageType.extension) {
    nextTarget = replaceRelationshipTargetExtension(target, imageType.extension);
    const nextRelationshipXml = relationshipXml.replace(/\bTarget="[^"]+"/i, `Target="${nextTarget}"`);
    relsXml = relsXml.replace(relationshipXml, nextRelationshipXml);
    zip.file(relsPath, relsXml);
    await ensureDocxImageContentType(zip, imageType);
  }

  zip.file(resolveRelationshipTargetPath(partName, nextTarget), image);
  return true;
}

async function replaceDocxImagesForTag(zip: JSZip, partNamePattern: RegExp, tag: string, image: Buffer | null | undefined) {
  if (!image) return false;

  let replaced = false;
  const partNames = Object.keys(zip.files).filter((name) => partNamePattern.test(name) && !zip.files[name]?.dir);

  for (const partName of partNames) {
    const partFile = zip.file(partName);
    if (!partFile) continue;

    const xml = await partFile.async("string");
    if (!xml.includes(tag)) continue;

    const relationshipIds = Array.from(xml.matchAll(/\b\w+:embed="([^"]+)"/g), (match) => match[1]);
    for (const relationshipId of relationshipIds) {
      replaced = (await replaceDocxRelatedImage(zip, partName, relationshipId, image)) || replaced;
    }
  }

  return replaced;
}

export async function applyBranchImagesToDocxTemplate(templateBuffer: Buffer, images: PurchaseRequestTemplateImageBuffers) {
  if (!images.header && !images.footer) return templateBuffer;

  const zip = await JSZip.loadAsync(templateBuffer);
  const headerReplaced = await replaceDocxImagesForTag(zip, /^word\/header\d+\.xml$/i, "{d.companyHeaderImage}", images.header);
  const footerReplaced = await replaceDocxImagesForTag(zip, /^word\/footer\d+\.xml$/i, "{d.companyFooterImage}", images.footer);

  if (!headerReplaced && !footerReplaced) return templateBuffer;

  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function loadActiveTemplate() {
  const template = await prisma.documentTemplate.findFirst({
    orderBy: { activatedAt: "desc" },
    where: {
      name: "PR_STANDARD",
      status: "ACTIVE",
      templateType: "DOCX",
    },
  });

  if (!template) {
    throw new Error("No active PR_STANDARD template is available");
  }

  return template;
}

async function findHighestExistingRunningNumberValue(
  tx: Pick<typeof prisma, "$queryRaw">,
  setting: RunningNumberLike,
  date: Date,
) {
  const { documentPrefix } = buildRunningNumberParts(setting, date);
  const sequenceStart = documentPrefix.length + 1;
  const expectedLength = documentPrefix.length + setting.padding;
  const rows = await tx.$queryRaw<Array<{ maxValue: number | null }>>`
    SELECT MAX(TRY_CONVERT(int, SUBSTRING([prNo], ${sequenceStart}, ${setting.padding}))) AS [maxValue]
    FROM [dbo].[PurchaseRequest]
    WHERE [prNo] LIKE ${`${documentPrefix}%`}
      AND LEN([prNo]) = ${expectedLength}
  `;

  return Number(rows[0]?.maxValue ?? 0);
}

async function loadDraftForGeneration(id: string) {
  const record = await prisma.purchaseRequest.findFirst({
    include: {
      branch: true,
      company: true,
      createdBy: true,
      department: true,
      division: true,
      items: { orderBy: { lineNo: "asc" } },
    },
    where: {
      id,
      status: "DRAFT",
    },
  });

  if (!record) {
    throw new Error("Only draft purchase requests can be generated");
  }

  if (record.items.length === 0) {
    throw new Error("Draft purchase request must have at least one item before generation");
  }

  return record;
}

async function loadDraftForPreview(id: string) {
  const record = await prisma.purchaseRequest.findFirst({
    include: {
      branch: true,
      company: true,
      createdBy: true,
      department: true,
      division: true,
      items: { orderBy: { lineNo: "asc" } },
    },
    where: {
      id,
      status: "DRAFT",
    },
  });

  if (!record) {
    throw new Error("Only draft purchase requests can be previewed");
  }

  if (record.items.length === 0) {
    throw new Error("Draft purchase request must have at least one item before preview");
  }

  return record;
}

async function renderPurchaseRequestPdfFromRecord(record: PurchaseRequestRenderRecord, prNo: string, templateBuffer: Buffer) {
  const assetDataUris = await loadBranchAssetDataUris(record.branch);
  const payload = buildPurchaseRequestRenderPayload(record, prNo, {
    footer: assetDataUris.footer,
    header: assetDataUris.header,
  });
  const renderTemplateBuffer = await applyBranchImagesToDocxTemplate(templateBuffer, {
    footer: assetDataUris.footerBuffer,
    header: assetDataUris.headerBuffer,
  });

  return renderCarboneTemplate({
    data: payload,
    template: renderTemplateBuffer,
    convertTo: "pdf",
  });
}

export async function previewDraftPurchaseRequestPdf(id: string) {
  await requirePermission("PR_UPDATE_DRAFT");

  const [template, record] = await Promise.all([
    loadActiveTemplate(),
    loadDraftForPreview(id),
  ]);
  const templateBuffer = await fs.readFile(resolveStoragePath(template.storagePath));
  const rendered = await renderPurchaseRequestPdfFromRecord(record, "DRAFT PREVIEW", templateBuffer);
  const fileInfo = buildDraftPreviewFileInfo(id);

  return {
    contentType: rendered.contentType,
    fileName: fileInfo.fileName,
    mimeType: fileInfo.mimeType,
    output: rendered.output,
  };
}

export async function generatePurchaseRequestPdf(id: string) {
  const actor = await requirePermission("PR_GENERATE");
  const template = await loadActiveTemplate();
  const templatePath = resolveStoragePath(template.storagePath);
  const templateBuffer = await fs.readFile(templatePath);

  const allocation = await prisma.$transaction(async (tx) => {
    const record = await tx.purchaseRequest.findFirst({
      include: {
        branch: true,
        company: true,
        createdBy: true,
        department: true,
        division: true,
        items: { orderBy: { lineNo: "asc" } },
      },
      where: {
        id,
        status: "DRAFT",
      },
    });

    if (!record) {
      throw new Error("Only draft purchase requests can be generated");
    }

    if (record.items.length === 0) {
      throw new Error("Draft purchase request must have at least one item before generation");
    }

    const setting = await tx.runningNumberSetting.findFirst({
      where: { documentType: "ITPR" },
    });

    if (!setting) {
      throw new Error("Missing ITPR running number setting");
    }

    const highestExistingValue = await findHighestExistingRunningNumberValue(tx, setting, record.documentDate);
    const nextValue = getNextRunningNumberValue(setting, highestExistingValue);
    const prNo = formatRunningNumberValue(setting, record.documentDate, nextValue);
    const payload = buildPurchaseRequestRenderPayload(record, prNo);
    const snapshot = {
      generatedAt: new Date().toISOString(),
      payload,
      template: {
        id: template.id,
        name: template.name,
        version: template.version,
      },
    };

    await tx.runningNumberSetting.update({
      data: { currentValue: nextValue },
      where: { id: setting.id },
    });

    await tx.purchaseRequest.update({
      data: {
        generatedSnapshotJson: JSON.stringify(snapshot),
        prNo,
        templateVersionId: template.id,
      },
      where: { id },
    });

    return {
      branch: record.branch,
      budgetReference: buildBudgetReference({
        branchId: record.branchId,
        companyId: record.companyId,
        departmentId: record.departmentId,
        documentDate: record.documentDate,
        totalAmount: record.totalAmount,
      }),
      payload,
      prNo,
      snapshot,
    };
  });

  const assetDataUris = await loadBranchAssetDataUris(allocation.branch);
  const renderPayload = {
    ...allocation.payload,
    companyFooterImage: assetDataUris.footer,
    companyHeaderImage: assetDataUris.header,
  };
  const renderTemplateBuffer = await applyBranchImagesToDocxTemplate(templateBuffer, {
    footer: assetDataUris.footerBuffer,
    header: assetDataUris.headerBuffer,
  });
  const rendered = await renderCarboneTemplate({
    data: renderPayload,
    template: renderTemplateBuffer,
    convertTo: "pdf",
  });
  const fileInfo = buildGeneratedFileInfo(allocation.prNo);
  const filePath = resolveStoragePath(fileInfo.storagePath);
  const hash = sha256Hex(rendered.output);
  await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, rendered.output);

  return prisma.$transaction(async (tx) => {
    const budgetResult = await issueDraftBudget(tx, allocation.budgetReference);

    await tx.purchaseRequest.update({
      data: {
        generatedAt: new Date(),
        status: "GENERATED",
      },
      where: { id },
    });

    await tx.purchaseRequestAttachment.upsert({
      create: {
        fileName: fileInfo.fileName,
        fileSize: rendered.output.length,
        mimeType: fileInfo.mimeType,
        purchaseRequestId: id,
        sha256: hash,
        storagePath: fileInfo.storagePath,
        type: "GENERATED_PDF",
        uploadedById: actor.id,
        version: 1,
      },
      update: {
        fileName: fileInfo.fileName,
        fileSize: rendered.output.length,
        mimeType: fileInfo.mimeType,
        sha256: hash,
        storagePath: fileInfo.storagePath,
        uploadedById: actor.id,
        uploadedAt: new Date(),
      },
      where: {
        purchaseRequestId_type_version: {
          purchaseRequestId: id,
          type: "GENERATED_PDF",
          version: 1,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Generated PDF",
        actorId: actor.id,
        entityId: id,
        entityType: "PurchaseRequest",
        metadataJson: JSON.stringify({
          budget: budgetResult,
          budgetStatus: budgetResult.budgetStatus,
          detail: `Generated ${fileInfo.fileName} with ${template.name} ${template.version}`,
          fileName: fileInfo.fileName,
          sha256: hash,
          templateId: template.id,
        }),
      },
    });

    return {
      attachment: fileInfo,
      contentType: rendered.contentType,
      filePath,
      prNo: allocation.prNo,
      sha256: hash,
    };
  });
}
