import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("dashboard copy", () => {
  test("uses reporting aggregates instead of static dashboard placeholders", () => {
    const pageSource = readFileSync("app/dashboard/page.tsx", "utf8");
    const chartSource = readFileSync("components/dashboard/DashboardCharts.tsx", "utf8");
    const cardSource = readFileSync("components/dashboard/BudgetCards.tsx", "utf8");

    expect(pageSource).not.toContain("DB-backed shell");
    expect(pageSource).toContain("getDashboardReportData");
    expect(chartSource).not.toContain("@/lib/sample-data");
    expect(chartSource).not.toContain("sample PR");
    expect(chartSource).not.toContain("รอเชื่อม Dashboard/Reports phase");
    expect(cardSource).not.toContain("8750000");
  });
});
