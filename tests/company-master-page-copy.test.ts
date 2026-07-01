import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("company master page copy", () => {
  test("presents branch management as a focused workspace instead of repeated row actions", () => {
    const source = readFileSync("app/masters/companies/page.tsx", "utf8");
    const actionsSource = readFileSync("app/masters/companies/actions.ts", "utf8");

    expect(source).toContain("Manage branch");
    expect(source).toContain("Branch workspace");
    expect(source).toContain("Header & Footer assets");
    expect(source).toContain("Recommended: PNG or JPG");
    expect(source).toContain("Deactivate branch");
    expect(source).toContain("This will hide the branch from active PR creation");
    expect(source).toContain("scroll-mt-20");
    expect(source).toContain("Add Company");
    expect(source).toContain("Create Company");
    expect(source).toContain("Company / Office");
    expect(source).toContain("Company groups");
    expect(source).toContain("Header / Footer");
    expect(source).toContain("Upload Header");
    expect(source).toContain("Upload Footer");
    expect(source).toContain("Show inactive");
    expect(source).toContain('name="includeInactive"');
    expect(actionsSource).toContain("createCompanyAction");
    expect(actionsSource).toContain("buildCompanyMasterPanelHref");
    expect(source).not.toContain("<Eye aria-hidden className=\"h-4 w-4\" />View");
    expect(source).not.toContain("<Eye aria-hidden className=\"h-4 w-4\" />Assets");
    expect(source).not.toContain("<Edit3 aria-hidden className=\"h-4 w-4\" />Edit");
  });
});
