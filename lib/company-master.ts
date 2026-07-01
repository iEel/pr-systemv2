import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";

type CompanyMasterRecord = {
  id: string;
  code: string;
  displayName: string;
  legalName: string;
  taxId: string | null;
  isActive: boolean;
  branches: Array<{
    id: string;
    code: string;
    name: string;
    address: string | null;
    documentAddress: string | null;
    documentDisplayName: string | null;
    documentFooterAssetPath: string | null;
    documentHeaderAssetPath: string | null;
    documentLegalName: string | null;
    documentRefNo: string | null;
    documentTaxId: string | null;
    isActive: boolean;
    updatedAt?: Date | string;
  }>;
};

type UploadFileLike = {
  name: string;
  size: number;
  type: string;
};

export type CompanyAssetType = "HEADER" | "FOOTER";
export type BranchRemovalMode = "DEACTIVATE" | "DELETE";

const companyAssetUploadMaxBytes = 5 * 1024 * 1024;
const companyAssetUploadRules: Record<string, { extension: ".jpg" | ".png"; mimeType: "image/jpeg" | "image/png" }> = {
  ".jpeg": { extension: ".jpg", mimeType: "image/jpeg" },
  ".jpg": { extension: ".jpg", mimeType: "image/jpeg" },
  ".png": { extension: ".png", mimeType: "image/png" },
};

function assetFileStem(assetType: CompanyAssetType) {
  return assetType === "HEADER" ? "header" : "footer";
}

function safeStoragePart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "asset";
}

function displayValue(value: string | null | undefined, fallback = "-") {
  return value?.trim() || fallback;
}

function formTextValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredTextValue(value: unknown, label: string) {
  const text = formTextValue(value);

  if (!text) {
    throw new Error(`${label} is required`);
  }

  return text;
}

function normalizedCodeValue(value: unknown, label: string) {
  return requiredTextValue(value, label).toUpperCase();
}

function nullableText(value: unknown) {
  const text = formTextValue(value);

  return text || null;
}

function profileStatus(branch: CompanyMasterRecord["branches"][number]) {
  return branch.documentRefNo && branch.documentLegalName && branch.documentTaxId && branch.documentAddress ? "Complete" : "Incomplete";
}

export function validateCompanyAssetUploadFile(file: UploadFileLike | null | undefined) {
  if (!file || file.size === 0) {
    throw new Error("Header/Footer image is required");
  }

  if (file.size > companyAssetUploadMaxBytes) {
    throw new Error("Header/Footer image must be 5 MB or smaller");
  }

  const extension = path.extname(file.name).toLowerCase();
  const rule = companyAssetUploadRules[extension];

  if (!rule) {
    throw new Error("Header/Footer file must be a PNG or JPG image");
  }

  return rule;
}

export function buildCompanyAssetStoragePath({
  assetType,
  branchId,
  fileName,
}: {
  assetType: CompanyAssetType;
  branchId: string;
  fileName: string;
}) {
  const rule = validateCompanyAssetUploadFile({ name: fileName, size: 1, type: "" });

  return path.posix.join("company-assets", safeStoragePart(branchId), `${assetFileStem(assetType)}${rule.extension}`);
}

export function buildCompanyMasterPanelHref({
  branchId,
  includeInactive = false,
}: {
  branchId: string;
  includeInactive?: boolean;
}) {
  const cleanBranchId = branchId.trim();

  if (!cleanBranchId) {
    return "/masters/companies";
  }

  const params = new URLSearchParams();

  if (includeInactive) {
    params.set("includeInactive", "1");
  }

  params.set("view", cleanBranchId);

  return `/masters/companies?${params.toString()}#branch-workspace-${encodeURIComponent(cleanBranchId)}`;
}

export function buildCompanyAssetDeliveryHeaders(storagePath: string) {
  const contentType = path.extname(storagePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg";

  return {
    "cache-control": "private, no-store",
    "content-type": contentType,
    "x-content-type-options": "nosniff",
  };
}

export function buildBranchDocumentProfileUpdateData(values: Partial<Record<string, unknown>>) {
  return {
    documentAddress: nullableText(values.documentAddress),
    documentDisplayName: nullableText(values.displayName),
    documentLegalName: nullableText(values.documentLegalName),
    documentRefNo: nullableText(values.documentRefNo),
    documentTaxId: nullableText(values.documentTaxId),
    isActive: values.isActive === "on" || values.isActive === "true" || values.isActive === true,
  };
}

export function buildCompanyWithBranchCreateData(values: Partial<Record<string, unknown>>) {
  const companyCode = normalizedCodeValue(values.companyCode, "Company code");
  const companyDisplayName = requiredTextValue(values.companyDisplayName, "Company display name");
  const companyLegalName = requiredTextValue(values.companyLegalName, "Company legal name");
  const companyTaxId = nullableText(values.companyTaxId);
  const branchCode = normalizedCodeValue(values.branchCode, "Branch code");
  const branchName = requiredTextValue(values.branchName, "Branch name");
  const branchAddress = nullableText(values.branchAddress);

  return {
    branch: {
      address: branchAddress,
      code: branchCode,
      documentAddress: nullableText(values.documentAddress) || branchAddress,
      documentDisplayName: nullableText(values.documentDisplayName) || branchName,
      documentLegalName: nullableText(values.documentLegalName) || companyLegalName,
      documentRefNo: nullableText(values.documentRefNo),
      documentTaxId: nullableText(values.documentTaxId) || companyTaxId,
      isActive: true,
      name: branchName,
    },
    company: {
      code: companyCode,
      displayName: companyDisplayName,
      isActive: true,
      legalName: companyLegalName,
      taxId: companyTaxId,
    },
  };
}

export function determineBranchRemovalMode({
  budgets,
  purchaseRequests,
}: {
  budgets: number;
  purchaseRequests: number;
}): BranchRemovalMode {
  return budgets > 0 || purchaseRequests > 0 ? "DEACTIVATE" : "DELETE";
}

export function mapCompanyMasterItems(companies: CompanyMasterRecord[], { includeInactive = false }: { includeInactive?: boolean } = {}) {
  return companies.flatMap((company) =>
    company.branches
      .filter((branch) => includeInactive || (company.isActive && branch.isActive))
      .map((branch) => ({
        branchCode: branch.code,
        branchId: branch.id,
        branchIsActive: branch.isActive,
        branchName: branch.name,
        companyCode: company.code,
        companyId: company.id,
        companyIsActive: company.isActive,
        displayName: displayValue(branch.documentDisplayName, company.displayName),
        documentAddress: displayValue(branch.documentAddress, branch.address || "-"),
        documentLegalName: displayValue(branch.documentLegalName, company.legalName),
        documentRefNo: displayValue(branch.documentRefNo),
        documentTaxId: displayValue(branch.documentTaxId, company.taxId || "-"),
        footerAssetPath: branch.documentFooterAssetPath,
        headerAssetPath: branch.documentHeaderAssetPath,
        profileStatus: profileStatus(branch),
        rawDocumentAddress: branch.documentAddress || "",
        rawDocumentDisplayName: branch.documentDisplayName || "",
        rawDocumentLegalName: branch.documentLegalName || "",
        rawDocumentRefNo: branch.documentRefNo || "",
        rawDocumentTaxId: branch.documentTaxId || "",
        status: company.isActive && branch.isActive ? "Active" : "Inactive",
        updatedAt: branch.updatedAt ? new Date(branch.updatedAt).toISOString() : null,
      })),
  );
}

export type CompanyMasterItem = ReturnType<typeof mapCompanyMasterItems>[number];

function normalizeCompanyGroupName(name: string) {
  const normalized = name
    .replace(/\s*\((สำนักงานใหญ่|สาขา:\s*[^)]+)\)\s*/g, " ")
    .replace(/\s*สำนักงานใหญ่\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || name;
}

function officeLabelForBranch(item: CompanyMasterItem) {
  const branchCode = item.branchCode.trim();
  const branchText = `${item.branchName} ${item.documentLegalName} ${branchCode}`;

  if (branchCode.toUpperCase() === "HQ" || branchText.includes("สำนักงานใหญ่")) {
    return "สำนักงานใหญ่";
  }

  return `สาขา ${branchCode || item.branchName}`;
}

function compareOfficeBranches(a: CompanyMasterItem & { officeLabel: string }, b: CompanyMasterItem & { officeLabel: string }) {
  if (a.officeLabel === "สำนักงานใหญ่" && b.officeLabel !== "สำนักงานใหญ่") return -1;
  if (b.officeLabel === "สำนักงานใหญ่" && a.officeLabel !== "สำนักงานใหญ่") return 1;

  return a.branchCode.localeCompare(b.branchCode, undefined, { numeric: true, sensitivity: "base" });
}

export function groupCompanyMasterItems(items: CompanyMasterItem[]) {
  const groups = new Map<
    string,
    {
      branchCount: number;
      branches: Array<CompanyMasterItem & { officeLabel: string }>;
      companyCodes: string[];
      companyName: string;
      completedCount: number;
      footerCount: number;
      headerCount: number;
      key: string;
      taxId: string;
    }
  >();

  for (const item of items) {
    const hasTaxId = item.documentTaxId !== "-";
    const key = hasTaxId ? `tax:${item.documentTaxId}` : `company:${item.companyId}`;
    const existing = groups.get(key);
    const group =
      existing ||
      {
        branchCount: 0,
        branches: [],
        companyCodes: [],
        companyName: normalizeCompanyGroupName(item.documentLegalName !== "-" ? item.documentLegalName : item.displayName),
        completedCount: 0,
        footerCount: 0,
        headerCount: 0,
        key,
        taxId: item.documentTaxId,
      };

    group.branchCount += 1;
    group.branches.push({ ...item, officeLabel: officeLabelForBranch(item) });
    group.completedCount += item.profileStatus === "Complete" ? 1 : 0;
    group.footerCount += item.footerAssetPath ? 1 : 0;
    group.headerCount += item.headerAssetPath ? 1 : 0;

    if (!group.companyCodes.includes(item.companyCode)) {
      group.companyCodes.push(item.companyCode);
    }

    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    branches: group.branches.sort(compareOfficeBranches),
  }));
}

export async function getCompanyMasterItems({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const companies = await prisma.company.findMany({
    include: {
      branches: { orderBy: { name: "asc" } },
    },
    orderBy: [{ displayName: "asc" }, { code: "asc" }],
  });

  return mapCompanyMasterItems(companies, { includeInactive });
}

function resolveStoragePath(storagePath: string) {
  const storageRoot = path.resolve(process.cwd(), "storage");
  const resolved = path.resolve(storageRoot, storagePath);

  if (resolved !== storageRoot && !resolved.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid company asset storage path");
  }

  return resolved;
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function sha256Hex(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function createCompanyAssetAudit(
  tx: Prisma.TransactionClient,
  {
    action,
    actorId,
    branchId,
    detail,
    metadata,
  }: {
    action: string;
    actorId: string;
    branchId: string;
    detail: string;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.auditLog.create({
    data: {
      action,
      actorId,
      entityId: branchId,
      entityType: "Branch",
      metadataJson: JSON.stringify({ detail, ...metadata }),
    },
  });
}

export async function uploadCompanyAssetFromFormData(formData: FormData) {
  const actor = await requirePermission("MASTER_DATA_MANAGE");
  const branchId = String(formData.get("branchId") || "").trim();
  const assetType = String(formData.get("assetType") || "").trim() as CompanyAssetType;
  const file = formData.get("assetFile");

  if (!branchId) {
    throw new Error("Branch is required");
  }

  if (assetType !== "HEADER" && assetType !== "FOOTER") {
    throw new Error("Asset type must be HEADER or FOOTER");
  }

  if (!(file instanceof File)) {
    throw new Error("Header/Footer image is required");
  }

  validateCompanyAssetUploadFile(file);

  const branch = await prisma.branch.findUnique({
    include: { company: true },
    where: { id: branchId },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = buildCompanyAssetStoragePath({ assetType, branchId, fileName: file.name });
  const filePath = resolveStoragePath(storagePath);

  await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, buffer);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.branch.update({
      data: assetType === "HEADER" ? { documentHeaderAssetPath: storagePath } : { documentFooterAssetPath: storagePath },
      where: { id: branchId },
    });

    await createCompanyAssetAudit(tx, {
      action: assetType === "HEADER" ? "Company header uploaded" : "Company footer uploaded",
      actorId: actor.id,
      branchId,
      detail: `Uploaded ${assetFileStem(assetType)} asset for ${branch.company.displayName} / ${branch.name}`,
      metadata: {
        assetType,
        fileName: file.name,
        sha256: sha256Hex(buffer),
        storagePath,
      },
    });

    return updated;
  });
}

export async function createCompanyWithBranchFromFormData(formData: FormData) {
  const actor = await requirePermission("MASTER_DATA_MANAGE");
  const createData = buildCompanyWithBranchCreateData({
    branchAddress: formData.get("branchAddress"),
    branchCode: formData.get("branchCode"),
    branchName: formData.get("branchName"),
    companyCode: formData.get("companyCode"),
    companyDisplayName: formData.get("companyDisplayName"),
    companyLegalName: formData.get("companyLegalName"),
    companyTaxId: formData.get("companyTaxId"),
    documentAddress: formData.get("documentAddress"),
    documentDisplayName: formData.get("documentDisplayName"),
    documentLegalName: formData.get("documentLegalName"),
    documentRefNo: formData.get("documentRefNo"),
    documentTaxId: formData.get("documentTaxId"),
  });

  return prisma.$transaction(async (tx) => {
    const existingCompany = await tx.company.findUnique({
      where: { code: createData.company.code },
    });

    if (existingCompany) {
      throw new Error(`Company code ${createData.company.code} already exists`);
    }

    const company = await tx.company.create({
      data: createData.company,
    });
    const branch = await tx.branch.create({
      data: {
        ...createData.branch,
        companyId: company.id,
      },
    });

    await createCompanyAssetAudit(tx, {
      action: "Company branch created",
      actorId: actor.id,
      branchId: branch.id,
      detail: `Created company master ${company.displayName} / ${branch.name}`,
      metadata: {
        branchCode: branch.code,
        companyCode: company.code,
      },
    });

    return branch;
  });
}

export async function updateBranchDocumentProfileFromFormData(formData: FormData) {
  const actor = await requirePermission("MASTER_DATA_MANAGE");
  const branchId = String(formData.get("branchId") || "").trim();

  if (!branchId) {
    throw new Error("Branch is required");
  }

  const updateData = buildBranchDocumentProfileUpdateData({
    displayName: formData.get("displayName"),
    documentAddress: formData.get("documentAddress"),
    documentLegalName: formData.get("documentLegalName"),
    documentRefNo: formData.get("documentRefNo"),
    documentTaxId: formData.get("documentTaxId"),
    isActive: formData.get("isActive"),
  });

  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUnique({
      include: { company: true },
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    const updated = await tx.branch.update({
      data: updateData,
      where: { id: branchId },
    });

    await createCompanyAssetAudit(tx, {
      action: "Branch document profile updated",
      actorId: actor.id,
      branchId,
      detail: `Updated document profile for ${branch.company.displayName} / ${branch.name}`,
      metadata: updateData,
    });

    return updated;
  });
}

export async function removeBranchFromFormData(formData: FormData) {
  const actor = await requirePermission("MASTER_DATA_MANAGE");
  const branchId = String(formData.get("branchId") || "").trim();
  const confirmed = formData.get("confirmBranchRemoval") === "on";

  if (!branchId) {
    throw new Error("Branch is required");
  }

  if (!confirmed) {
    throw new Error("Branch deactivation must be confirmed");
  }

  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUnique({
      include: { company: true },
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    const [purchaseRequests, budgets] = await Promise.all([
      tx.purchaseRequest.count({ where: { branchId } }),
      tx.budget.count({ where: { branchId } }),
    ]);
    const mode = determineBranchRemovalMode({ budgets, purchaseRequests });

    if (mode === "DELETE") {
      await tx.branch.delete({ where: { id: branchId } });
    } else {
      await tx.branch.update({
        data: { isActive: false },
        where: { id: branchId },
      });
    }

    await createCompanyAssetAudit(tx, {
      action: mode === "DELETE" ? "Branch deleted" : "Branch deactivated",
      actorId: actor.id,
      branchId,
      detail:
        mode === "DELETE"
          ? `Deleted unused branch ${branch.company.displayName} / ${branch.name}`
          : `Deactivated branch ${branch.company.displayName} / ${branch.name} because it has dependent records`,
      metadata: { budgets, mode, purchaseRequests },
    });

    return { mode };
  });
}

export async function getCompanyAssetFileForPreview(branchId: string, assetType: CompanyAssetType) {
  const branch = await prisma.branch.findUnique({
    select: {
      documentFooterAssetPath: true,
      documentHeaderAssetPath: true,
    },
    where: { id: branchId },
  });

  if (!branch) return null;

  const storagePath = assetType === "HEADER" ? branch.documentHeaderAssetPath : branch.documentFooterAssetPath;
  if (!storagePath) return null;

  const filePath = resolveStoragePath(storagePath);
  const file = await fs.readFile(filePath).catch(() => null);
  if (!file) return null;

  return {
    file,
    headers: buildCompanyAssetDeliveryHeaders(storagePath),
  };
}
