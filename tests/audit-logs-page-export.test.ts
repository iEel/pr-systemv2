import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("audit logs export UI", () => {
  test("links the export action to the CSV route instead of leaving it disabled", () => {
    const source = readFileSync("app/audit-logs/page.tsx", "utf8");

    expect(source).toContain("buildAuditLogExportHref");
    expect(source).toContain("buildAuditLogExportLabel");
    expect(source).toContain("buildAuditFilterChips");
    expect(source).toContain("href={buildAuditLogExportHref(filters)}");
    expect(source).toContain("Export filtered CSV");
    expect(source).not.toContain("<Button disabled type=\"button\" variant=\"secondary\">");
  });

  test("renders investigation controls and taxonomy copy", () => {
    const source = readFileSync("app/audit-logs/page.tsx", "utf8");

    expect(source).toContain("Selected Event");
    expect(source).toContain("Inspect");
    expect(source).toContain("Active filter");
    expect(source).toContain("exports up to 1,000 rows");
    expect(source).toContain("Evidence");
    expect(source).toContain("Category");
    expect(source).toContain("metadataEntries");
  });

  test("keeps the inspect action and hash metadata readable on desktop", () => {
    const source = readFileSync("app/audit-logs/page.tsx", "utf8");

    expect(source).toContain("min-[1800px]:grid-cols-[minmax(0,1fr)_24rem]");
    expect(source).not.toContain("2xl:grid-cols-[minmax(0,1fr)_24rem]");
    expect(source).toContain('<col className="w-[8.5rem]" data-column="inspect" />');
    expect(source).toContain("break-all");
  });
});
