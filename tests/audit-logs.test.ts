import { describe, expect, test } from "vitest";
import {
  buildAuditFilterChips,
  buildAuditLogCloseDetailHref,
  buildAuditLogExportHref,
  buildAuditLogExportLabel,
  buildAuditLogInspectHref,
  buildAuditLogWhere,
  getAuditLogCategory,
  mapAuditLogRecord,
  serializeAuditLogsToCsv,
} from "../lib/audit-logs";

const baseRecord = {
  action: "Generated PDF",
  actor: { displayName: "Admin User", username: "admin" },
  actorId: "user_admin_seed",
  createdAt: new Date("2026-06-29T03:00:00.000Z"),
  entityId: "pr_seed_2606001",
  entityType: "PurchaseRequest",
  id: "audit_1",
  ipAddress: "192.168.1.10",
  metadataJson: JSON.stringify({ detail: "Generated ITPR_2606001", fileName: "ITPR_2606001.pdf" }),
  userAgent: "Chrome",
};

describe("audit log list helpers", () => {
  test("maps metadata detail and entity links for purchase request audit rows", () => {
    const item = mapAuditLogRecord(baseRecord);

    expect(item).toMatchObject({
      action: "Generated PDF",
      actor: "Admin User",
      actorUsername: "admin",
      date: "2026-06-29T03:00:00.000Z",
      detail: "Generated ITPR_2606001",
      entityHref: "/pr/pr_seed_2606001",
      entityId: "pr_seed_2606001",
      entityType: "PurchaseRequest",
      metadataSummary: "fileName: ITPR_2606001.pdf",
    });
    expect(item.category).toEqual({ label: "Document", tone: "info" });
    expect(item.metadataEntries).toEqual([{ key: "fileName", value: "ITPR_2606001.pdf" }]);
    expect(item.evidencePreview).toEqual(["fileName: ITPR_2606001.pdf"]);
  });

  test("falls back to system actor and raw metadata when JSON is invalid", () => {
    const item = mapAuditLogRecord({
      ...baseRecord,
      actor: null,
      actorId: null,
      entityType: "RunningNumberSetting",
      metadataJson: "{broken",
    });

    expect(item.actor).toBe("System");
    expect(item.detail).toBe("{broken");
    expect(item.entityHref).toBeNull();
    expect(item.metadataSummary).toBe("{broken");
    expect(item.metadataEntries).toEqual([{ key: "raw", value: "{broken" }]);
    expect(item.evidencePreview).toEqual(["raw: {broken"]);
  });

  test("categorizes audit events for scanning", () => {
    expect(getAuditLogCategory("Generated PDF", "PurchaseRequest")).toEqual({ label: "Document", tone: "info" });
    expect(getAuditLogCategory("Template validated", "DocumentTemplate")).toEqual({ label: "Template", tone: "purple" });
    expect(getAuditLogCategory("Company header uploaded", "Branch")).toEqual({ label: "Master Data", tone: "success" });
    expect(getAuditLogCategory("User role updated", "User")).toEqual({ label: "Users / Roles", tone: "neutral" });
    expect(getAuditLogCategory("Running number changed", "RunningNumberSetting")).toEqual({ label: "Settings", tone: "warning" });
    expect(getAuditLogCategory("Budget reserved", "Budget")).toEqual({ label: "Budget", tone: "warning" });
  });

  test("builds a Prisma where clause from search filters", () => {
    const where = buildAuditLogWhere({
      action: "Generated PDF",
      actorId: "user_admin_seed",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-29",
      entityType: "PurchaseRequest",
      q: "ITPR_2606001",
    });

    expect(where).toEqual({
      action: "Generated PDF",
      actorId: "user_admin_seed",
      createdAt: {
        gte: new Date("2026-06-01T00:00:00.000Z"),
        lte: new Date("2026-06-29T23:59:59.999Z"),
      },
      entityType: "PurchaseRequest",
      OR: [
        { action: { contains: "ITPR_2606001" } },
        { entityId: { contains: "ITPR_2606001" } },
        { metadataJson: { contains: "ITPR_2606001" } },
        { actor: { displayName: { contains: "ITPR_2606001" } } },
        { actor: { username: { contains: "ITPR_2606001" } } },
      ],
    });
  });

  test("ignores invalid date filters", () => {
    expect(buildAuditLogWhere({ dateFrom: "not-a-date", dateTo: "" })).toEqual({});
  });

  test("serializes audit rows to an Excel-friendly CSV with escaped fields", () => {
    const csv = serializeAuditLogsToCsv([
      {
        action: "Generated PDF",
        actor: "Admin User",
        actorUsername: "admin",
        category: { label: "Document", tone: "info" },
        date: "2026-06-29T03:00:00.000Z",
        detail: "Generated, reviewed\napproved",
        entityHref: "/pr/pr_seed_2606001",
        entityId: "pr_seed_2606001",
        entityType: "PurchaseRequest",
        evidencePreview: ['fileName: "ITPR_2606001.pdf"'],
        id: "audit_1",
        ipAddress: "192.168.1.10",
        metadataEntries: [{ key: "fileName", value: '"ITPR_2606001.pdf"' }],
        metadataSummary: 'fileName: "ITPR_2606001.pdf"',
        sourceSummary: "192.168.1.10 / Chrome",
        userAgent: "Chrome",
      },
    ]);

    expect(csv).toBe(
      [
        "Date,Action,Entity Type,Entity ID,Actor,Actor Username,Detail,Metadata,IP Address,User Agent",
        '2026-06-29T03:00:00.000Z,Generated PDF,PurchaseRequest,pr_seed_2606001,Admin User,admin,"Generated, reviewed approved","fileName: ""ITPR_2606001.pdf""",192.168.1.10,Chrome',
      ].join("\r\n"),
    );
  });

  test("builds export href with only active filters", () => {
    expect(
      buildAuditLogExportHref({
        action: "Generated PDF",
        actorId: "",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-29",
        entityType: "PurchaseRequest",
        q: "ITPR 2606001",
      }),
    ).toBe("/audit-logs/export?action=Generated+PDF&dateFrom=2026-06-01&dateTo=2026-06-29&entityType=PurchaseRequest&q=ITPR+2606001");
  });

  test("builds active filter chips with remove links while preserving selected event", () => {
    const chips = buildAuditFilterChips(
      {
        action: "Generated PDF",
        actorId: "user_admin_seed",
        dateFrom: "2026-06-01",
        entityType: "PurchaseRequest",
        eventId: "audit_1",
        q: "ITPR_2606008",
      },
      { actorLabels: { user_admin_seed: "Admin User (admin)" } },
    );

    expect(chips.map((chip) => `${chip.label}: ${chip.value}`)).toEqual([
      "Search: ITPR_2606008",
      "Entity: PurchaseRequest",
      "Action: Generated PDF",
      "Actor: Admin User (admin)",
      "From: 2026-06-01",
    ]);
    expect(chips[0]?.href).toBe("/audit-logs?action=Generated+PDF&actorId=user_admin_seed&dateFrom=2026-06-01&entityType=PurchaseRequest&eventId=audit_1");
  });

  test("builds inspect and close hrefs without polluting CSV export filters", () => {
    const filters = {
      action: "Generated PDF",
      entityType: "PurchaseRequest",
      eventId: "audit_1",
      q: "ITPR_2606008",
    };

    expect(buildAuditLogInspectHref(filters, "audit_2")).toBe("/audit-logs?action=Generated+PDF&entityType=PurchaseRequest&eventId=audit_2&q=ITPR_2606008");
    expect(buildAuditLogCloseDetailHref(filters)).toBe("/audit-logs?action=Generated+PDF&entityType=PurchaseRequest&q=ITPR_2606008");
    expect(buildAuditLogExportHref(filters)).toBe("/audit-logs/export?action=Generated+PDF&entityType=PurchaseRequest&q=ITPR_2606008");
  });

  test("builds export labels that explain scope and row limits", () => {
    expect(buildAuditLogExportLabel(58, {})).toEqual({
      label: "Export CSV",
      note: "CSV exports the current result view, up to 1,000 rows.",
    });
    expect(buildAuditLogExportLabel(1, { q: "ITPR_2606008" })).toEqual({
      label: "Export filtered CSV (1 row)",
      note: "CSV follows active filters and exports up to 1,000 rows.",
    });
    expect(buildAuditLogExportLabel(1200, { action: "Generated PDF" })).toEqual({
      label: "Export filtered CSV (first 1,000 rows)",
      note: "1,200 rows match; CSV exports the first 1,000 newest rows with active filters.",
    });
  });
});
