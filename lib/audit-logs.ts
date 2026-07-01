import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditLogFilters = {
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  entityType?: string;
  eventId?: string;
  q?: string;
};

type AuditLogCategoryTone = "info" | "purple" | "warning" | "neutral" | "success";

export type AuditLogCategory = {
  label: "Document" | "Template" | "Master Data" | "Users / Roles" | "Settings" | "Budget" | "System";
  tone: AuditLogCategoryTone;
};

export type AuditMetadataEntry = {
  key: string;
  value: string;
};

export type AuditLogListItem = {
  id: string;
  action: string;
  actor: string;
  actorUsername: string | null;
  category: AuditLogCategory;
  date: string;
  detail: string;
  entityHref: string | null;
  entityId: string;
  entityType: string;
  evidencePreview: string[];
  ipAddress: string | null;
  metadataEntries: AuditMetadataEntry[];
  metadataSummary: string;
  sourceSummary: string;
  userAgent: string | null;
};

export const AUDIT_LOG_EXPORT_LIMIT = 1000;
const auditLogCsvColumns: Array<{ header: string; read: (item: AuditLogListItem) => string | null }> = [
  { header: "Date", read: (item) => item.date },
  { header: "Action", read: (item) => item.action },
  { header: "Entity Type", read: (item) => item.entityType },
  { header: "Entity ID", read: (item) => item.entityId },
  { header: "Actor", read: (item) => item.actor },
  { header: "Actor Username", read: (item) => item.actorUsername },
  { header: "Detail", read: (item) => item.detail },
  { header: "Metadata", read: (item) => item.metadataSummary },
  { header: "IP Address", read: (item) => item.ipAddress },
  { header: "User Agent", read: (item) => item.userAgent },
];

export type AuditLogRecord = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  metadataJson: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  actor: { displayName: string; username: string } | null;
};

export type AuditFilterChip = {
  href: string;
  key: keyof AuditLogFilters;
  label: string;
  value: string;
};

const exportFilterKeys: Array<keyof AuditLogFilters> = ["action", "actorId", "dateFrom", "dateTo", "entityType", "q"];
const pageStateKeys: Array<keyof AuditLogFilters> = ["action", "actorId", "dateFrom", "dateTo", "entityType", "eventId", "q"];

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseDateStart(value: string | undefined) {
  const dateValue = clean(value);
  if (!dateValue) return undefined;

  const date = new Date(`${dateValue}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value: string | undefined) {
  const dateValue = clean(value);
  if (!dateValue) return undefined;

  const date = new Date(`${dateValue}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stringifyMetadataValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseMetadata(metadataJson: string | null) {
  if (!metadataJson) return { detail: "Recorded event", entries: [] as AuditMetadataEntry[], summary: "-" };

  try {
    const metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    const detail = typeof metadata.detail === "string" ? metadata.detail : "Recorded event";
    const entries = Object.entries(metadata)
      .filter(([key]) => key !== "detail")
      .map(([key, value]) => ({ key, value: stringifyMetadataValue(value) }));
    const summaryParts = entries.map((entry) => `${entry.key}: ${entry.value}`);

    return {
      detail,
      entries,
      summary: summaryParts.length ? summaryParts.join(" / ") : detail,
    };
  } catch {
    return { detail: metadataJson, entries: [{ key: "raw", value: metadataJson }], summary: metadataJson };
  }
}

function entityHref(entityType: string, entityId: string) {
  if (entityType === "PurchaseRequest") return `/pr/${entityId}`;
  if (entityType === "DocumentTemplate") return "/templates";
  return null;
}

export function getAuditLogCategory(action: string, entityType: string): AuditLogCategory {
  const normalized = `${action} ${entityType}`.toLowerCase();

  if (normalized.includes("budget")) return { label: "Budget", tone: "warning" };
  if (normalized.includes("user") || normalized.includes("role") || normalized.includes("rbac")) return { label: "Users / Roles", tone: "neutral" };
  if (normalized.includes("running") || normalized.includes("setting")) return { label: "Settings", tone: "warning" };
  if (normalized.includes("template")) return { label: "Template", tone: "purple" };
  if (
    normalized.includes("branch") ||
    normalized.includes("company") ||
    normalized.includes("header") ||
    normalized.includes("footer") ||
    normalized.includes("master") ||
    normalized.includes("profile")
  ) {
    return { label: "Master Data", tone: "success" };
  }
  if (
    normalized.includes("purchase") ||
    normalized.includes("draft") ||
    normalized.includes("generated") ||
    normalized.includes("printed") ||
    normalized.includes("signed") ||
    normalized.includes("cancel") ||
    normalized.includes("reissued")
  ) {
    return { label: "Document", tone: "info" };
  }

  return { label: "System", tone: "neutral" };
}

function evidencePreview(entries: AuditMetadataEntry[], summary: string) {
  if (entries.length) return entries.slice(0, 3).map((entry) => `${entry.key}: ${entry.value}`);
  if (summary && summary !== "-") return [summary];
  return [];
}

function sourceSummary(ipAddress: string | null, userAgent: string | null) {
  if (ipAddress && userAgent) return `${ipAddress} / ${userAgent}`;
  return ipAddress || userAgent || "-";
}

export function buildAuditLogWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const q = clean(filters.q);
  const dateFrom = parseDateStart(filters.dateFrom);
  const dateTo = parseDateEnd(filters.dateTo);
  const where: Prisma.AuditLogWhereInput = {};

  if (clean(filters.action)) where.action = filters.action;
  if (clean(filters.actorId)) where.actorId = filters.actorId;
  if (clean(filters.entityType)) where.entityType = filters.entityType;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }
  if (q) {
    where.OR = [
      { action: { contains: q } },
      { entityId: { contains: q } },
      { metadataJson: { contains: q } },
      { actor: { displayName: { contains: q } } },
      { actor: { username: { contains: q } } },
    ];
  }

  return where;
}

export function mapAuditLogRecord(record: AuditLogRecord): AuditLogListItem {
  const metadata = parseMetadata(record.metadataJson);

  return {
    id: record.id,
    action: record.action,
    actor: record.actor?.displayName || "System",
    actorUsername: record.actor?.username || null,
    category: getAuditLogCategory(record.action, record.entityType),
    date: record.createdAt.toISOString(),
    detail: metadata.detail,
    entityHref: entityHref(record.entityType, record.entityId),
    entityId: record.entityId,
    entityType: record.entityType,
    evidencePreview: evidencePreview(metadata.entries, metadata.summary),
    ipAddress: record.ipAddress,
    metadataEntries: metadata.entries,
    metadataSummary: metadata.summary,
    sourceSummary: sourceSummary(record.ipAddress, record.userAgent),
    userAgent: record.userAgent,
  };
}

function csvCell(value: string | null) {
  const normalized = (value || "").replace(/\r?\n/g, " ");
  return /[",]/.test(normalized) ? `"${normalized.replaceAll("\"", "\"\"")}"` : normalized;
}

export function serializeAuditLogsToCsv(items: AuditLogListItem[]) {
  const rows = [
    auditLogCsvColumns.map((column) => csvCell(column.header)).join(","),
    ...items.map((item) => auditLogCsvColumns.map((column) => csvCell(column.read(item))).join(",")),
  ];

  return rows.join("\r\n");
}

export function buildAuditLogExportHref(filters: AuditLogFilters = {}) {
  return buildAuditHref("/audit-logs/export", filters, exportFilterKeys);
}

export function buildAuditLogPageHref(filters: AuditLogFilters = {}) {
  return buildAuditHref("/audit-logs", filters, pageStateKeys);
}

function buildAuditHref(basePath: string, filters: AuditLogFilters = {}, keys: Array<keyof AuditLogFilters>) {
  const params = new URLSearchParams();

  for (const key of keys) {
    const value = clean(filters[key]);
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildAuditLogInspectHref(filters: AuditLogFilters, eventId: string) {
  return buildAuditLogPageHref({ ...filters, eventId });
}

export function buildAuditLogCloseDetailHref(filters: AuditLogFilters) {
  return buildAuditLogPageHref({ ...filters, eventId: "" });
}

export function hasActiveAuditFilters(filters: AuditLogFilters) {
  return exportFilterKeys.some((key) => Boolean(clean(filters[key])));
}

export function buildAuditFilterChips(filters: AuditLogFilters, options: { actorLabels?: Record<string, string> } = {}): AuditFilterChip[] {
  const chipSpecs: Array<{ key: keyof AuditLogFilters; label: string; value?: string }> = [
    { key: "q", label: "Search", value: clean(filters.q) },
    { key: "entityType", label: "Entity", value: clean(filters.entityType) },
    { key: "action", label: "Action", value: clean(filters.action) },
    { key: "actorId", label: "Actor", value: clean(filters.actorId) ? options.actorLabels?.[clean(filters.actorId) || ""] || clean(filters.actorId) : "" },
    { key: "dateFrom", label: "From", value: clean(filters.dateFrom) },
    { key: "dateTo", label: "To", value: clean(filters.dateTo) },
  ];

  return chipSpecs
    .filter((chip): chip is { key: keyof AuditLogFilters; label: string; value: string } => Boolean(chip.value))
    .map((chip) => ({
      href: buildAuditLogPageHref({ ...filters, [chip.key]: "" }),
      key: chip.key,
      label: chip.label,
      value: chip.value,
    }));
}

export function buildAuditLogExportLabel(total: number, filters: AuditLogFilters = {}) {
  const filtered = hasActiveAuditFilters(filters);
  const cappedTotal = AUDIT_LOG_EXPORT_LIMIT.toLocaleString("en-US");

  if (total > AUDIT_LOG_EXPORT_LIMIT) {
    return {
      label: `${filtered ? "Export filtered CSV" : "Export CSV"} (first ${cappedTotal} rows)`,
      note: `${total.toLocaleString("en-US")} rows match; CSV exports the first ${cappedTotal} newest rows${filtered ? " with active filters" : ""}.`,
    };
  }

  if (filtered) {
    return {
      label: `Export filtered CSV (${total.toLocaleString("en-US")} ${total === 1 ? "row" : "rows"})`,
      note: `CSV follows active filters and exports up to ${cappedTotal} rows.`,
    };
  }

  return {
    label: "Export CSV",
    note: `CSV exports the current result view, up to ${cappedTotal} rows.`,
  };
}

export function readAuditLogFiltersFromSearchParams(searchParams: URLSearchParams): AuditLogFilters {
  return {
    action: searchParams.get("action") || "",
    actorId: searchParams.get("actorId") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    entityType: searchParams.get("entityType") || "",
    eventId: searchParams.get("eventId") || "",
    q: searchParams.get("q") || "",
  };
}

export async function getAuditLogList(filters: AuditLogFilters = {}) {
  const where = buildAuditLogWhere(filters);
  const [records, total, actors, actions, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      include: { actor: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
      where,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      orderBy: { displayName: "asc" },
      select: { displayName: true, id: true, username: true },
      where: { auditLogs: { some: {} } },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      orderBy: { action: "asc" },
      select: { action: true },
    }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
      select: { entityType: true },
    }),
  ]);

  const items = records.map(mapAuditLogRecord);

  return {
    actions: actions.map((item) => item.action),
    actors,
    entityTypes: entityTypes.map((item) => item.entityType),
    items,
    total,
  };
}

export async function getAuditLogById(id: string | undefined) {
  const auditId = clean(id);
  if (!auditId) return null;

  const record = await prisma.auditLog.findUnique({
    include: { actor: { select: { displayName: true, username: true } } },
    where: { id: auditId },
  });

  return record ? mapAuditLogRecord(record) : null;
}

export async function getAuditLogCsv(filters: AuditLogFilters = {}) {
  const where = buildAuditLogWhere(filters);
  const records = await prisma.auditLog.findMany({
    include: { actor: { select: { displayName: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: AUDIT_LOG_EXPORT_LIMIT,
    where,
  });

  return serializeAuditLogsToCsv(records.map(mapAuditLogRecord));
}
