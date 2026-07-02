import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import JSZip from "jszip";
import { renderCarboneTemplate } from "./carbone-client";
import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";
import { buildPurchaseRequestRenderPayload } from "./pr-generate";

export type TemplateType = "DOCX" | "XLSX";
export type TemplateStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TemplatePreviewStatus = "PASSED" | "FAILED";

const templateUploadMaxBytes = 10 * 1024 * 1024;
const templateUploadRules: Record<string, { extension: ".docx" | ".xlsx"; templateType: TemplateType }> = {
  ".docx": { extension: ".docx", templateType: "DOCX" },
  ".xlsx": { extension: ".xlsx", templateType: "XLSX" },
};

export const requiredTemplateTags = [
  "d.prNo",
  "d.documentDate",
  "d.companyName",
  "d.branchName",
  "d.department",
  "d.purpose",
  "d.purchaseMethod",
  "d.totalAmount",
  "d.items[i].description",
  "d.items[i].quantity",
  "d.items[i].unitCost",
  "d.items[i].totalAmount",
] as const;

const knownTemplateTags = new Set<string>([
  ...requiredTemplateTags,
  "d.id",
  "d.refNo",
  "d.requiredDate",
  "d.companyLegalName",
  "d.companyTaxId",
  "d.companyDisplayName",
  "d.companyHeaderAssetPath",
  "d.companyFooterAssetPath",
  "d.companyHeaderImage",
  "d.companyFooterImage",
  "d.branchCode",
  "d.branchAddress",
  "d.division",
  "d.purposeNewMark",
  "d.purposeReplacementMark",
  "d.purposeRepairMark",
  "d.purposeRenewalMark",
  "d.purchaseByProcurementMark",
  "d.purchaseSelfMark",
  "d.remark",
  "d.remarkLine1",
  "d.remarkLine2",
  "d.createdBy",
  "d.subtotal",
  "d.subtotalFormatted",
  "d.vatRate",
  "d.vatAmount",
  "d.vatAmountFormatted",
  "d.totalAmountFormatted",
  "d.totalAmountText",
  "d.items[i].lineNo",
  "d.items[i].itemNo",
  "d.items[i].rowType",
  "d.items[i].isHeading",
  "d.items[i].isDetail",
  "d.items[i].accountCode",
  "d.items[i].unitCostFormatted",
  "d.items[i].totalAmountFormatted",
  "d.items[i+1]",
  "c.now",
]);

type UploadFileLike = {
  name: string;
  type: string;
  size: number;
};

export type TemplateValidationResult = {
  foundTags: string[];
  missingRequiredTags: string[];
  preview?: TemplatePreviewMetadata | null;
  totalTagsFound: number;
  unknownTags: string[];
};

export type TemplatePreviewMetadata = {
  contentType?: string;
  error?: string;
  fileName?: string;
  renderedAt: string;
  sha256?: string;
  status: TemplatePreviewStatus;
  storagePath?: string;
};

const templateContentTypes: Record<TemplateType, string> = {
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function safeNamePart(value: string) {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || "TEMPLATE";
}

export function validateTemplateUploadFile(file: UploadFileLike | null | undefined) {
  if (!file || file.size === 0) {
    throw new Error("Template file is required");
  }

  if (file.size > templateUploadMaxBytes) {
    throw new Error("Template file must be 10 MB or smaller");
  }

  const extension = path.extname(file.name).toLowerCase();
  const rule = templateUploadRules[extension];

  if (!rule) {
    throw new Error("Template file must be a DOCX or XLSX file");
  }

  return {
    extension: rule.extension,
    templateType: rule.templateType,
  };
}

export function buildTemplateStoragePath({
  name,
  templateType,
  version,
}: {
  name: string;
  templateType: TemplateType;
  version: string;
}) {
  const extension = templateType === "DOCX" ? ".docx" : ".xlsx";

  return path.posix.join("templates", `${safeNamePart(name)}_${safeNamePart(version)}${extension}`);
}

export function buildTemplatePreviewFileInfo({
  name,
  templateType,
  version,
}: {
  name: string;
  templateType: TemplateType;
  version: string;
}) {
  const baseName = `${safeNamePart(name)}_${safeNamePart(version)}_${templateType}`;

  return {
    fileName: `TEMPLATE_PREVIEW_${baseName}.pdf`,
    mimeType: "application/pdf",
    storagePath: path.posix.join("template-previews", `${baseName}.pdf`),
  };
}

export function buildTemplateDeliveryHeaders(fileName: string, templateType: TemplateType) {
  return {
    "cache-control": "private, no-store",
    "content-disposition": `attachment; filename="${fileName.replaceAll('"', "")}"`,
    "content-type": templateContentTypes[templateType],
    "x-content-type-options": "nosniff",
  };
}

export function assertArchivableTemplateStatus(status: string) {
  if (status === "ARCHIVED") {
    throw new Error("Template is already archived");
  }
}

function templateXmlFileMatcher(templateType: TemplateType, fileName: string) {
  if (!fileName.endsWith(".xml")) return false;

  if (templateType === "DOCX") {
    return fileName.startsWith("word/");
  }

  return fileName.startsWith("xl/sharedStrings") || fileName.startsWith("xl/worksheets/");
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function extractCarboneTagsFromTemplateBuffer(buffer: Buffer, templateType: TemplateType) {
  const zip = await JSZip.loadAsync(buffer);
  const tags = new Set<string>();

  for (const [fileName, entry] of Object.entries(zip.files)) {
    if (entry.dir || !templateXmlFileMatcher(templateType, fileName)) continue;

    const xml = decodeXmlText(await entry.async("string"));
    const matches = xml.matchAll(/\{([^{}]+)\}/g);

    for (const match of matches) {
      const tag = match[1]?.trim();

      if (tag && /^(d\.|c\.|#|\$|t\(|o\.)/.test(tag)) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags).sort();
}

function getTemplateTagIdentity(tag: string) {
  if (!tag.startsWith("d.") && !tag.startsWith("c.")) return tag;

  return tag.split(":")[0]?.trim() || tag;
}

export function validateTemplateTags(foundTags: string[]): TemplateValidationResult {
  const sortedTags = Array.from(new Set(foundTags)).sort();
  const tagIdentities = new Set(sortedTags.map(getTemplateTagIdentity));

  return {
    foundTags: sortedTags,
    missingRequiredTags: requiredTemplateTags.filter((tag) => !tagIdentities.has(tag)),
    totalTagsFound: sortedTags.length,
    unknownTags: sortedTags
      .filter((tag) => tag.startsWith("d.") || tag.startsWith("c."))
      .filter((tag) => !knownTemplateTags.has(getTemplateTagIdentity(tag))),
  };
}

export function normalizeTemplatePreview(value: unknown): TemplatePreviewMetadata | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (record.status !== "PASSED" && record.status !== "FAILED") return null;
  if (typeof record.renderedAt !== "string" || !record.renderedAt.trim()) return null;

  const preview: TemplatePreviewMetadata = {
    renderedAt: record.renderedAt,
    status: record.status,
  };

  if (typeof record.contentType === "string") preview.contentType = record.contentType;
  if (typeof record.error === "string") preview.error = record.error;
  if (typeof record.fileName === "string") preview.fileName = record.fileName;
  if (typeof record.sha256 === "string") preview.sha256 = record.sha256;
  if (typeof record.storagePath === "string") preview.storagePath = record.storagePath;

  return preview;
}

export function normalizeTemplateValidation(value: unknown): TemplateValidationResult | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Partial<TemplateValidationResult> & {
    missingRequiredTags?: unknown;
    preview?: unknown;
    totalTagsFound?: unknown;
    unknownTags?: unknown;
  };

  if (
    typeof record.totalTagsFound !== "number" &&
    !Array.isArray(record.foundTags) &&
    !Array.isArray(record.missingRequiredTags) &&
    !Array.isArray(record.unknownTags)
  ) {
    return null;
  }

  const foundTags = Array.isArray(record.foundTags) ? record.foundTags.filter((tag): tag is string => typeof tag === "string") : [];
  const missingRequiredTags = Array.isArray(record.missingRequiredTags)
    ? record.missingRequiredTags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const unknownTags = Array.isArray(record.unknownTags) ? record.unknownTags.filter((tag): tag is string => typeof tag === "string") : [];
  const totalTagsFound = typeof record.totalTagsFound === "number" ? record.totalTagsFound : foundTags.length;

  return {
    foundTags,
    missingRequiredTags,
    preview: normalizeTemplatePreview(record.preview),
    totalTagsFound,
    unknownTags,
  };
}

export function mergeTemplatePreviewResult(
  validation: TemplateValidationResult,
  preview: TemplatePreviewMetadata,
): TemplateValidationResult {
  return {
    foundTags: validation.foundTags,
    missingRequiredTags: validation.missingRequiredTags,
    preview,
    totalTagsFound: validation.totalTagsFound,
    unknownTags: validation.unknownTags,
  };
}

export function canActivateTemplateVersion({
  name,
  templateType,
  validation,
}: {
  name: string;
  templateType: TemplateType;
  validation: TemplateValidationResult | null;
}) {
  if (!validation) {
    return {
      canActivate: false,
      reason: "Template must pass validation before activation",
    };
  }

  if (validation.missingRequiredTags.length > 0) {
    return {
      canActivate: false,
      reason: "Template must pass validation before activation",
    };
  }

  if (name.toUpperCase() === "PR_STANDARD" && templateType === "DOCX" && validation.preview?.status !== "PASSED") {
    return {
      canActivate: false,
      reason: "PR_STANDARD DOCX template must pass preview before activation",
    };
  }

  return {
    canActivate: true,
    reason: null,
  };
}

export function buildTemplatePreviewPayload() {
  return buildPurchaseRequestRenderPayload(
    {
      id: "template_preview",
      prNo: null,
      refNo: null,
      documentDate: new Date("2026-06-30T00:00:00.000Z"),
      requiredDate: new Date("2026-07-15T00:00:00.000Z"),
      purpose: "ซื้อใหม่",
      purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
      remark: "ตัวอย่างสำหรับตรวจสอบ Template ก่อนเปิดใช้งานจริง รองรับการตัดบรรทัดบนช่อง Remark ของเอกสาร PR",
      subtotal: "108650.50",
      vatRate: "7",
      vatAmount: "7605.535",
      totalAmount: "116256.035",
      company: { displayName: "Sonic_04", legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน)", taxId: "0107560000427" },
      branch: {
        name: "Sonic_04",
        code: "00004",
        address: "Bangkok",
        documentAddress: "509/10 ถนนบางนา-ตราด แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260",
        documentDisplayName: "Sonic 00004 (PT)",
        documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
        documentRefNo: "SN17-DOCSA011",
        documentTaxId: "0107560000427",
      },
      department: { name: "IT" },
      division: { name: "IT" },
      createdBy: { displayName: "Admin User" },
      items: [
        {
          lineNo: 1,
          accountCode: "",
          description: "Dell PowerEdge R750 Server",
          quantity: "1",
          unitCost: "78500",
          totalAmount: "78500",
        },
        {
          lineNo: 2,
          rowType: "DETAIL",
          accountCode: "",
          description: "Includes rack rail kit and onsite setup",
          quantity: "0",
          unitCost: "0",
          totalAmount: "0",
        },
        {
          lineNo: 3,
          accountCode: "",
          description: "Samsung SSD 1.92TB SATA",
          quantity: "2",
          unitCost: "12450",
          totalAmount: "24900",
        },
        {
          lineNo: 4,
          accountCode: "",
          description: "UTP Cat6 Cable 305M",
          quantity: "1",
          unitCost: "5250.5",
          totalAmount: "5250.5",
        },
      ],
    },
    "TEMPLATE PREVIEW",
  );
}

function resolveTemplatePath(storagePath: string) {
  const storageRoot = path.resolve(process.cwd(), "storage");
  const resolved = path.resolve(storageRoot, storagePath);

  if (resolved !== storageRoot && !resolved.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid template storage path");
  }

  return resolved;
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function sha256Hex(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function createTemplateAudit(
  tx: Prisma.TransactionClient,
  {
    action,
    actorId,
    detail,
    metadata,
    templateId,
  }: {
    action: string;
    actorId: string;
    detail: string;
    metadata?: Record<string, unknown>;
    templateId: string;
  },
) {
  await tx.auditLog.create({
    data: {
      action,
      actorId,
      entityId: templateId,
      entityType: "DocumentTemplate",
      metadataJson: JSON.stringify({ detail, ...metadata }),
    },
  });
}

function parseTemplateValidationJson(value: string | null) {
  if (!value) return null;

  try {
    return normalizeTemplateValidation(JSON.parse(value));
  } catch {
    return null;
  }
}

export async function getTemplateManagementItems() {
  const templates = await prisma.documentTemplate.findMany({
    orderBy: [{ name: "asc" }, { templateType: "asc" }, { createdAt: "desc" }],
  });

  return templates.map((template) => {
    const validation = parseTemplateValidationJson(template.validationJson);

    return {
      id: template.id,
      name: template.name,
      version: template.version,
      contractName: template.contractName,
      status: template.status as TemplateStatus,
      templateType: template.templateType as TemplateType,
      fileName: template.fileName,
      storagePath: template.storagePath,
      updatedAt: (template.activatedAt || template.archivedAt || template.createdAt).toISOString(),
      validation,
    };
  });
}

export async function uploadTemplateFromFormData(formData: FormData) {
  const actor = await requirePermission("TEMPLATE_MANAGE");
  const file = formData.get("templateFile");
  if (!(file instanceof File)) {
    throw new Error("Template file is required");
  }

  const name = String(formData.get("name") || "").trim() || "PR_STANDARD";
  const version = String(formData.get("version") || "").trim() || "V1";
  const contractName = String(formData.get("contractName") || "").trim() || "IT PR Contract";
  const validation = validateTemplateUploadFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = buildTemplateStoragePath({ name, templateType: validation.templateType, version });
  const filePath = resolveTemplatePath(storagePath);

  await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, buffer);

  return prisma.$transaction(async (tx) => {
    const result = await tx.documentTemplate.upsert({
      create: {
        contractName,
        createdById: actor.id,
        fileName: path.posix.basename(storagePath),
        name,
        status: "DRAFT",
        storagePath,
        templateType: validation.templateType,
        validationJson: JSON.stringify({ sha256: sha256Hex(buffer) }),
        version,
      },
      update: {
        contractName,
        fileName: path.posix.basename(storagePath),
        status: "DRAFT",
        storagePath,
        validationJson: JSON.stringify({ sha256: sha256Hex(buffer) }),
      },
      where: {
        name_version_templateType: {
          name,
          templateType: validation.templateType,
          version,
        },
      },
    });

    await createTemplateAudit(tx, {
      action: "Template uploaded",
      actorId: actor.id,
      detail: `Uploaded ${result.name} ${result.version} ${result.templateType}`,
      metadata: { fileName: result.fileName, sha256: sha256Hex(buffer), templateType: result.templateType },
      templateId: result.id,
    });

    return result;
  });
}

export async function validateTemplate(id: string) {
  const actor = await requirePermission("TEMPLATE_MANAGE");
  const template = await prisma.documentTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const buffer = await fs.readFile(resolveTemplatePath(template.storagePath));
  const foundTags = await extractCarboneTagsFromTemplateBuffer(buffer, template.templateType as TemplateType);
  const validation = validateTemplateTags(foundTags);

  await prisma.$transaction(async (tx) => {
    await tx.documentTemplate.update({
      data: { validationJson: JSON.stringify(validation) },
      where: { id },
    });

    await createTemplateAudit(tx, {
      action: "Template validated",
      actorId: actor.id,
      detail: `Validated ${template.name} ${template.version} ${template.templateType}`,
      metadata: {
        missingRequiredTags: validation.missingRequiredTags.length,
        totalTagsFound: validation.totalTagsFound,
        unknownTags: validation.unknownTags.length,
      },
      templateId: id,
    });
  });

  return validation;
}

export async function previewTemplate(id: string) {
  const actor = await requirePermission("TEMPLATE_MANAGE");
  const template = await prisma.documentTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  if (template.templateType !== "DOCX") {
    throw new Error("Template preview PDF is available for DOCX templates only");
  }

  const validation = parseTemplateValidationJson(template.validationJson);
  if (!validation || validation.missingRequiredTags.length > 0) {
    throw new Error("Template must pass validation before preview");
  }

  const fileInfo = buildTemplatePreviewFileInfo({
    name: template.name,
    templateType: template.templateType as TemplateType,
    version: template.version,
  });
  const templatePath = resolveTemplatePath(template.storagePath);
  const previewPath = resolveTemplatePath(fileInfo.storagePath);
  const renderedAt = new Date().toISOString();

  try {
    const templateBuffer = await fs.readFile(templatePath);
    const rendered = await renderCarboneTemplate({
      convertTo: "pdf",
      data: buildTemplatePreviewPayload(),
      template: templateBuffer,
    });
    const hash = sha256Hex(rendered.output);
    const preview = mergeTemplatePreviewResult(validation, {
      contentType: rendered.contentType,
      fileName: fileInfo.fileName,
      renderedAt,
      sha256: hash,
      status: "PASSED",
      storagePath: fileInfo.storagePath,
    });

    await ensureParentDirectory(previewPath);
    await fs.writeFile(previewPath, rendered.output);

    await prisma.$transaction(async (tx) => {
      await tx.documentTemplate.update({
        data: { validationJson: JSON.stringify(preview) },
        where: { id },
      });

      await createTemplateAudit(tx, {
        action: "Template preview rendered",
        actorId: actor.id,
        detail: `Rendered preview for ${template.name} ${template.version} ${template.templateType}`,
        metadata: {
          fileName: fileInfo.fileName,
          sha256: hash,
          templateType: template.templateType,
        },
        templateId: id,
      });
    });

    return {
      fileName: fileInfo.fileName,
      sha256: hash,
      storagePath: fileInfo.storagePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Template preview failed";
    const preview = mergeTemplatePreviewResult(validation, {
      error: message.slice(0, 500),
      renderedAt: new Date().toISOString(),
      status: "FAILED",
    });

    await prisma.$transaction(async (tx) => {
      await tx.documentTemplate.update({
        data: { validationJson: JSON.stringify(preview) },
        where: { id },
      });

      await createTemplateAudit(tx, {
        action: "Template preview failed",
        actorId: actor.id,
        detail: `Preview failed for ${template.name} ${template.version} ${template.templateType}: ${message.slice(0, 180)}`,
        metadata: {
          error: message.slice(0, 500),
          templateType: template.templateType,
        },
        templateId: id,
      });
    });

    throw error;
  }
}

export async function activateTemplate(id: string) {
  const actor = await requirePermission("TEMPLATE_MANAGE");

  return prisma.$transaction(async (tx) => {
    const template = await tx.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    const validation = parseTemplateValidationJson(template.validationJson);
    const activation = canActivateTemplateVersion({
      name: template.name,
      templateType: template.templateType as TemplateType,
      validation,
    });

    if (!activation.canActivate) {
      throw new Error(activation.reason || "Template must pass activation checks");
    }

    const now = new Date();

    await tx.documentTemplate.updateMany({
      data: {
        archivedAt: now,
        status: "ARCHIVED",
      },
      where: {
        id: { not: id },
        name: template.name,
        status: "ACTIVE",
        templateType: template.templateType,
      },
    });

    const activated = await tx.documentTemplate.update({
      data: {
        activatedAt: now,
        archivedAt: null,
        status: "ACTIVE",
      },
      where: { id },
    });

    await createTemplateAudit(tx, {
      action: "Template activated",
      actorId: actor.id,
      detail: `Activated ${template.name} ${template.version} ${template.templateType}`,
      metadata: { templateType: template.templateType },
      templateId: id,
    });

    return activated;
  });
}

export async function getTemplateFileForDownload(id: string) {
  await requirePermission("TEMPLATE_MANAGE");

  const template = await prisma.documentTemplate.findUnique({
    where: { id },
  });

  if (!template) return null;

  const filePath = resolveTemplatePath(template.storagePath);
  const file = await fs.readFile(filePath).catch(() => null);

  if (!file) return null;

  return {
    file,
    fileName: template.fileName,
    templateType: template.templateType as TemplateType,
  };
}

export async function getTemplatePreviewPdf(id: string) {
  await requirePermission("TEMPLATE_MANAGE");

  const template = await prisma.documentTemplate.findUnique({
    where: { id },
  });

  if (!template) return null;

  const validation = parseTemplateValidationJson(template.validationJson);
  const preview = validation?.preview;

  if (preview?.status !== "PASSED" || !preview.storagePath) return null;

  const filePath = resolveTemplatePath(preview.storagePath);
  const file = await fs.readFile(filePath).catch(() => null);

  if (!file) return null;

  return {
    file,
    fileName: preview.fileName || buildTemplatePreviewFileInfo({
      name: template.name,
      templateType: template.templateType as TemplateType,
      version: template.version,
    }).fileName,
  };
}

export async function archiveTemplate(id: string) {
  const actor = await requirePermission("TEMPLATE_MANAGE");

  return prisma.$transaction(async (tx) => {
    const template = await tx.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    assertArchivableTemplateStatus(template.status);

    const archived = await tx.documentTemplate.update({
      data: {
        archivedAt: new Date(),
        status: "ARCHIVED",
      },
      where: { id },
    });

    await createTemplateAudit(tx, {
      action: "Template archived",
      actorId: actor.id,
      detail: `Archived ${template.name} ${template.version} ${template.templateType}`,
      metadata: { templateType: template.templateType },
      templateId: id,
    });

    return archived;
  });
}
