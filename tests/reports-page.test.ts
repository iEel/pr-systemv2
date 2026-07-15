import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("reports page", () => {
  test("uses the real reporting console instead of the old ModulePage shell", () => {
    const source = readFileSync("app/reports/page.tsx", "utf8");

    expect(source).not.toContain("ModulePage");
    expect(source).toContain("getReportPageData");
    expect(source).toContain("buildReportExportHref");
    expect(source).toContain("Export Current View");
  });

  test("frames reports as a filter-driven export workspace", () => {
    const source = readFileSync("app/reports/page.tsx", "utf8");

    expect(source).toContain("ReportHealthStrip");
    expect(source).toContain("FilterSummary");
    expect(source).toContain("MiniBar");
    expect(source).toContain("Reset filters");
    expect(source).toContain("buildReportFilterChips");
    expect(source).toContain("calculateReportBarPercent");
    expect(source).toContain("getStatusConfig");
  });

  test("shows a strict no-budget warning instead of a misleading negative budget state", () => {
    const source = readFileSync("app/reports/page.tsx", "utf8");

    expect(source).toContain("budgetWarning");
    expect(source).toContain("ยังไม่มี Budget สำหรับมุมมองนี้");
    expect(source).toContain("/masters/budgets");
    expect(source).not.toContain("Budget health in current view");
    expect(source).toContain("ทุกบริษัท");
    expect(source).toContain("ทุกสถานะ");
  });

  test("keeps monthly and status summaries glanceable without the wide detail table layout", () => {
    const source = readFileSync("app/reports/page.tsx", "utf8");

    expect(source).toContain("MonthlySummaryTable");
    expect(source).toContain("StatusDistributionPanel");
    expect(source).toContain("xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]");
    expect(source).toContain("min-w-[560px]");
    expect(source).not.toContain('ReportTable columns={["Status", "PR Count", "Total Amount"]} title="Status Summary"');
  });

  test("aligns numeric summary headers with their values", () => {
    const source = readFileSync("app/reports/page.tsx", "utf8");

    expect(source).toContain("monthlySummaryColumns");
    expect(source).toContain("companySummaryColumns");
    expect(source).toContain("readTableAlignClass");
    expect(source).toContain("<colgroup>");
    expect(source).toContain('align: "right"');
    expect(source).toContain("tabular-nums");
    expect(source).not.toContain('ReportTable columns={["Company", "Branch", "PR Count", "Total Amount", "Used", "Latest Date"]}');
  });

  test("supports category filters and category summaries without breaking table spans", () => {
    const source = readFileSync("app/reports/page.tsx", "utf8");

    expect(source).toContain('name="categoryId"');
    expect(source).toContain("Category Summary");
    expect(source).toContain("categorySummary");
    expect(source).toContain("colSpan={9}");
  });
});
