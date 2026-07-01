import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";
import { formatRunningNumber } from "./pr-generate";

type RunningNumberRecord = {
  currentValue: number;
  documentType: string;
  id: string;
  monthFormat: string;
  padding: number;
  prefix: string;
  scopeBranchId: string | null;
  scopeCompanyId: string | null;
  updatedAt: Date | string;
  yearFormat: string;
};

type ScopeLookup = {
  branch?: { companyId: string; id: string; isActive: boolean; name?: string } | null;
  company?: { displayName?: string; id: string; isActive: boolean } | null;
};

type RunningNumberLookup = {
  asOf?: Date;
  branches?: Map<string, { companyId: string; name: string }>;
  companies?: Map<string, { displayName: string }>;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredText(value: unknown, label: string) {
  const text = textValue(value);

  if (!text) {
    throw new Error(`${label} is required`);
  }

  return text;
}

function nullableId(value: unknown) {
  const text = textValue(value);

  return text || null;
}

function parseInteger(value: unknown, label: string) {
  const text = requiredText(value, label);
  const number = Number.parseInt(text, 10);

  if (!Number.isInteger(number)) {
    throw new Error(`${label} must be a number`);
  }

  return number;
}

function parseYearFormat(value: unknown) {
  const format = requiredText(value, "Year format").toUpperCase();

  if (format !== "YY" && format !== "YYYY") {
    throw new Error("Year format is invalid");
  }

  return format;
}

function parseMonthFormat(value: unknown) {
  const format = requiredText(value, "Month format").toUpperCase();

  if (format === "NONE") return "";
  if (format !== "MM") {
    throw new Error("Month format is invalid");
  }

  return format;
}

function parsePadding(value: unknown) {
  const padding = parseInteger(value, "Padding");

  if (padding < 1 || padding > 8) {
    throw new Error("Padding must be between 1 and 8");
  }

  return padding;
}

function parseCurrentValue(value: unknown) {
  const currentValue = parseInteger(value, "Current value");

  if (currentValue < 0) {
    throw new Error("Current value must be non-negative");
  }

  return currentValue;
}

function scopeLabel({
  branchName,
  companyName,
  documentType,
}: {
  branchName?: string | null;
  companyName?: string | null;
  documentType: string;
}) {
  if (companyName && branchName) return `${documentType} / ${companyName} / ${branchName}`;
  if (companyName) return `${documentType} / ${companyName}`;

  return `${documentType} / Global`;
}

async function createRunningNumberAudit(
  tx: Prisma.TransactionClient,
  {
    action,
    actorId,
    detail,
    metadata,
    settingId,
  }: {
    action: string;
    actorId: string;
    detail: string;
    metadata?: Record<string, unknown>;
    settingId: string;
  },
) {
  await tx.auditLog.create({
    data: {
      action,
      actorId,
      entityId: settingId,
      entityType: "RunningNumberSetting",
      metadataJson: JSON.stringify({ detail, ...metadata }),
    },
  });
}

export function buildRunningNumberCreateData(values: Partial<Record<string, unknown>>) {
  return {
    currentValue: parseCurrentValue(values.currentValue),
    documentType: requiredText(values.documentType, "Document type").toUpperCase(),
    monthFormat: parseMonthFormat(values.monthFormat),
    padding: parsePadding(values.padding),
    prefix: requiredText(values.prefix, "Prefix"),
    scopeBranchId: nullableId(values.scopeBranchId),
    scopeCompanyId: nullableId(values.scopeCompanyId),
    yearFormat: parseYearFormat(values.yearFormat),
  };
}

export function buildRunningNumberUpdateData(values: Partial<Record<string, unknown>>) {
  return {
    currentValue: parseCurrentValue(values.currentValue),
    monthFormat: parseMonthFormat(values.monthFormat),
    padding: parsePadding(values.padding),
    prefix: requiredText(values.prefix, "Prefix"),
    yearFormat: parseYearFormat(values.yearFormat),
  };
}

export function buildRunningNumberPreview(
  setting: Pick<RunningNumberRecord, "currentValue" | "monthFormat" | "padding" | "prefix" | "yearFormat">,
  asOf = new Date(),
) {
  return formatRunningNumber(setting, asOf);
}

export function validateRunningNumberScope(
  reference: { scopeBranchId: string | null; scopeCompanyId: string | null },
  lookup: ScopeLookup,
) {
  if (reference.scopeCompanyId) {
    if (!lookup.company) {
      throw new Error("Company not found");
    }

    if (!lookup.company.isActive) {
      throw new Error("Company is inactive");
    }
  }

  if (reference.scopeBranchId) {
    if (!reference.scopeCompanyId) {
      throw new Error("Company is required when branch scope is selected");
    }

    if (!lookup.branch) {
      throw new Error("Branch not found");
    }

    if (!lookup.branch.isActive) {
      throw new Error("Branch is inactive");
    }

    if (lookup.branch.companyId !== reference.scopeCompanyId) {
      throw new Error("Selected branch does not belong to the selected company");
    }
  }
}

export function validateRunningNumberDuplicate({
  existingSettingId,
  scopeLabel,
}: {
  existingSettingId: string | null | undefined;
  scopeLabel: string;
}) {
  if (existingSettingId) {
    throw new Error(`Running number setting already exists for ${scopeLabel}`);
  }
}

export function mapRunningNumberSettingToRow(record: RunningNumberRecord, lookup: RunningNumberLookup = {}) {
  const companyName = record.scopeCompanyId ? lookup.companies?.get(record.scopeCompanyId)?.displayName || record.scopeCompanyId : null;
  const branchName = record.scopeBranchId ? lookup.branches?.get(record.scopeBranchId)?.name || record.scopeBranchId : null;

  return {
    currentValue: record.currentValue,
    documentType: record.documentType,
    formatLabel: `${record.prefix}${record.yearFormat}${record.monthFormat}${"#".repeat(record.padding)}`,
    id: record.id,
    monthFormat: record.monthFormat,
    nextPreview: buildRunningNumberPreview(record, lookup.asOf || new Date()),
    padding: record.padding,
    prefix: record.prefix,
    scopeBranchId: record.scopeBranchId,
    scopeCompanyId: record.scopeCompanyId,
    scopeLabel: scopeLabel({ branchName, companyName, documentType: record.documentType }).replace(`${record.documentType} / `, ""),
    updatedAt: new Date(record.updatedAt).toISOString(),
    yearFormat: record.yearFormat,
  };
}

export type RunningNumberSettingRow = ReturnType<typeof mapRunningNumberSettingToRow>;

export async function getRunningNumberSettingsPageData() {
  await requirePermission("RUNNING_NUMBER_MANAGE");

  const [settings, companies, branches] = await Promise.all([
    prisma.runningNumberSetting.findMany({
      orderBy: [{ documentType: "asc" }, { prefix: "asc" }],
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
  ]);
  const companyMap = new Map(companies.map((company) => [company.id, { displayName: company.displayName }]));
  const branchMap = new Map(branches.map((branch) => [branch.id, { companyId: branch.companyId, name: branch.name }]));

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
    rows: settings.map((setting) =>
      mapRunningNumberSettingToRow(setting, {
        branches: branchMap,
        companies: companyMap,
      }),
    ),
    totals: {
      rowCount: settings.length,
      scopedRows: settings.filter((setting) => setting.scopeCompanyId || setting.scopeBranchId).length,
    },
  };
}

export async function createRunningNumberSettingFromFormData(formData: FormData) {
  const actor = await requirePermission("RUNNING_NUMBER_MANAGE");
  const data = buildRunningNumberCreateData({
    currentValue: formData.get("currentValue"),
    documentType: formData.get("documentType"),
    monthFormat: formData.get("monthFormat"),
    padding: formData.get("padding"),
    prefix: formData.get("prefix"),
    scopeBranchId: formData.get("scopeBranchId"),
    scopeCompanyId: formData.get("scopeCompanyId"),
    yearFormat: formData.get("yearFormat"),
  });

  return prisma.$transaction(async (tx) => {
    const [company, branch] = await Promise.all([
      data.scopeCompanyId ? tx.company.findUnique({ select: { displayName: true, id: true, isActive: true }, where: { id: data.scopeCompanyId } }) : null,
      data.scopeBranchId ? tx.branch.findUnique({ select: { companyId: true, id: true, isActive: true, name: true }, where: { id: data.scopeBranchId } }) : null,
    ]);

    validateRunningNumberScope(data, { branch, company });

    const label = scopeLabel({
      branchName: branch?.name || null,
      companyName: company?.displayName || null,
      documentType: data.documentType,
    });
    const existing = await tx.runningNumberSetting.findFirst({
      select: { id: true },
      where: {
        documentType: data.documentType,
        scopeBranchId: data.scopeBranchId,
        scopeCompanyId: data.scopeCompanyId,
      },
    });

    validateRunningNumberDuplicate({ existingSettingId: existing?.id, scopeLabel: label });

    const created = await tx.runningNumberSetting.create({ data });

    await createRunningNumberAudit(tx, {
      action: "Running number setting created",
      actorId: actor.id,
      detail: `Created running number setting ${label}`,
      metadata: data,
      settingId: created.id,
    });

    return created;
  });
}

export async function updateRunningNumberSettingFromFormData(formData: FormData) {
  const actor = await requirePermission("RUNNING_NUMBER_MANAGE");
  const settingId = requiredText(formData.get("settingId"), "Setting");
  const data = buildRunningNumberUpdateData({
    currentValue: formData.get("currentValue"),
    monthFormat: formData.get("monthFormat"),
    padding: formData.get("padding"),
    prefix: formData.get("prefix"),
    yearFormat: formData.get("yearFormat"),
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.runningNumberSetting.findUnique({ where: { id: settingId } });

    if (!existing) {
      throw new Error("Running number setting not found");
    }

    const updated = await tx.runningNumberSetting.update({
      data,
      where: { id: settingId },
    });

    await createRunningNumberAudit(tx, {
      action: "Running number setting updated",
      actorId: actor.id,
      detail: `Updated running number setting ${existing.documentType}`,
      metadata: {
        ...data,
        documentType: existing.documentType,
        scopeBranchId: existing.scopeBranchId,
        scopeCompanyId: existing.scopeCompanyId,
      },
      settingId,
    });

    return updated;
  });
}
