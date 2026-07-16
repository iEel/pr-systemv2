import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const pageSource = readFileSync("app/dashboard/page.tsx", "utf8");
const viewSource = readFileSync("components/dashboard/BudgetPlanningView.tsx", "utf8");

describe("dashboard budget planning page", () => {
  test("loads only the data required by the selected dashboard view", () => {
    const planningBranchStart = pageSource.indexOf('if (view === "planning")');
    const overviewBranchStart = pageSource.indexOf("const [requests, report]");
    const planningBranch = pageSource.slice(planningBranchStart, overviewBranchStart);
    const overviewBranch = pageSource.slice(overviewBranchStart);

    expect(planningBranchStart).toBeGreaterThan(-1);
    expect(overviewBranchStart).toBeGreaterThan(planningBranchStart);
    expect(pageSource).toContain('view === "planning"');
    expect(planningBranch).toContain("getBudgetPlanningPageData({");
    expect(planningBranch).toContain('year: read("year")');
    expect(planningBranch).toContain('companyId: read("companyId")');
    expect(planningBranch).toContain('categoryId: read("categoryId")');
    expect(planningBranch).toContain("return (");
    expect(planningBranch).not.toContain("getPurchaseRequestListItems");
    expect(planningBranch).not.toContain("getDashboardReportData");
    expect(overviewBranch).toContain("Promise.all([");
    expect(overviewBranch).toContain("getPurchaseRequestListItems({ take: 6 })");
    expect(overviewBranch).toContain("getDashboardReportData()");
    expect(overviewBranch).not.toContain("getBudgetPlanningPageData({");
    expect(pageSource.match(/getBudgetPlanningPageData\(\{/g)).toHaveLength(1);
  });

  test("preserves the overview dashboard and New PR action", () => {
    expect(pageSource).toContain("Dashboard งบประมาณ IT");
    expect(pageSource).toContain('href="/pr/new"');
    expect(pageSource).toContain("<BudgetCards");
    expect(pageSource).toContain("<DashboardCharts");
    expect(pageSource).toContain("<PRList");
  });

  test("provides URL-addressable navigation with a visible current state", () => {
    expect(viewSource).toContain("export function DashboardViewNav");
    expect(viewSource).toContain("Overview");
    expect(viewSource).toContain("Budget Planning");
    expect(viewSource).toContain('aria-current={current ===');
    expect(viewSource).toContain("focus-visible:ring-2");
    expect(viewSource).toContain('"bg-primary text-white ring-2 ring-primary ring-offset-1"');
    expect(pageSource).toContain('<DashboardViewNav current="overview"');
    expect(viewSource).toContain('<DashboardViewNav current="planning"');
  });

  test("renders the planning heading, filters, forecast helper, reset, and export action", () => {
    for (const copy of [
      "Budget Planning ${data.filters.baseYear} → ${data.filters.forecastYear}",
      "Base Year",
      "Company",
      "PR Category",
      "Forecast Year:",
      "Apply Filters",
      "Reset",
      "Export Budget Plan",
    ]) {
      expect(viewSource).toContain(copy);
    }
    expect(viewSource).toMatch(/<input[^>]*name="view"[^>]*value="planning"/);
    expect(viewSource).toContain('min="2000"');
    expect(viewSource).toContain('max="2100"');
    expect(viewSource).toContain("buildBudgetPlanningExportHref(data.filters)");
  });

  test("shows all five planning summary metrics", () => {
    for (const label of [
      "Actual Spend",
      "Recurring Included in Actual",
      "Non-recurring Actual",
      "Active Recurring Forecast",
      "Planning Baseline",
    ]) {
      expect(viewSource).toContain(label);
    }
    expect(viewSource).toContain("formatTHB");
    expect(viewSource).not.toContain("truncate text-lg");
    expect(viewSource).toContain("break-words text-lg");
  });

  test("uses gap dividers that remain correct at one, two, and five columns", () => {
    expect(viewSource).toContain('className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-5"');
    expect(viewSource).toContain('className="min-w-0 bg-panel p-4"');
    expect(viewSource).not.toContain("index > 0 &&");
    expect(viewSource).not.toContain("index === 2 &&");
  });

  test("renders the complete category analysis table in a contained scroller", () => {
    expect(viewSource).toContain('aria-label="Budget plan by PR Category"');
    for (const column of [
      "Category",
      "Actual PR",
      "Actual Spend",
      "Recurring in Actual",
      "Non-recurring Actual",
      "Active Schedules",
      "Next-year Recurring",
      "Planning Baseline",
    ]) {
      expect(viewSource).toContain(column);
    }
    expect(viewSource).toContain("<TableWrap");
    expect(viewSource).toContain("overflow-x-auto");
    expect(viewSource).toContain("formatAmount");
    expect(viewSource).toContain("Inactive");
  });

  test("documents the exact planning method and source-specific empty states", () => {
    expect(viewSource).toContain("Planning Baseline = Non-recurring Actual + Active Recurring Forecast");
    expect(viewSource).toContain("Actual รวมเฉพาะ PR สถานะ Generated, Printed และ Signed");
    expect(viewSource).toContain("Forecast รวมเฉพาะ Active schedules ตามราคาปัจจุบันโดยไม่คิด uplift");
    expect(viewSource).toContain("ยังไม่มี Actual PR สถานะ Generated, Printed หรือ Signed ในปีที่เลือก");
    expect(viewSource).toContain("ยังไม่มี Active Recurring PR สำหรับปี Forecast");
    expect(viewSource).toContain("ไม่พบข้อมูลวางแผนงบตาม filter ที่เลือก");
  });

  test("uses shared category URLs while leaving Not categorized as plain text", () => {
    expect(viewSource).toContain("buildBudgetPlanningHref({");
    expect(viewSource).toContain("categoryId: row.categoryId");
    expect(viewSource).toContain('row.categoryId ? (');
    expect(viewSource).toMatch(/\)\s*:\s*\(\s*<span>Not categorized<\/span>/);
  });
});
