import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("budget master page copy", () => {
  test("uses the SQL Server budget admin console instead of the placeholder module shell", () => {
    const source = readFileSync("app/masters/budgets/page.tsx", "utf8");
    const actionsSource = readFileSync("app/masters/budgets/actions.ts", "utf8");

    expect(source).toContain("Budget Master");
    expect(source).toContain("Create Budget");
    expect(source).toContain("Update Budget");
    expect(source).toContain("Deactivate");
    expect(source).toContain("Reactivate");
    expect(source).toContain("Include inactive");
    expect(source).toContain("getBudgetMasterPageData");
    expect(source).not.toContain("ModulePage");
    expect(actionsSource).toContain("createBudgetAction");
    expect(actionsSource).toContain("updateBudgetAction");
    expect(actionsSource).toContain("deactivateBudgetAction");
    expect(actionsSource).toContain("reactivateBudgetAction");
  });

  test("budget table rows use stable budget ids as React keys", () => {
    const source = readFileSync("app/masters/budgets/page.tsx", "utf8");

    expect(source).toContain("<tr key={row.id}");
  });
});
