import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("PR category admin page", () => {
  test("provides focused category CRUD and shared master navigation", () => {
    const page = readFileSync("app/masters/pr-categories/page.tsx", "utf8");
    const nav = readFileSync("components/masters/MasterDataNav.tsx", "utf8");

    expect(page).toContain("PR Categories");
    expect(page).toContain("Create Category");
    expect(page).toContain("Include inactive");
    expect(page).toContain("Deactivate");
    expect(nav).toContain("/masters/companies");
    expect(nav).toContain("/masters/pr-categories");
  });

  test("preserves active category filters in category mutation forms", () => {
    const page = readFileSync("app/masters/pr-categories/page.tsx", "utf8");

    expect(page).toContain('name="redirectQ" type="hidden" value={filters.q}');
    expect(page).toContain('name="includeInactive" type="hidden" value={filters.includeInactive ? "1" : "0"}');
  });

  test("labels the PR category route correctly in the topbar breadcrumb", () => {
    const breadcrumbs = readFileSync("components/app/Breadcrumbs.tsx", "utf8");

    expect(breadcrumbs).toContain('"pr-categories": "PR Categories"');
    expect(breadcrumbs).toContain('labels[segment] ?? (segment.startsWith("pr-") ? "PR Detail" : segment)');
  });

  test("requires a named deactivation impact confirmation with affected recurring schedule links", () => {
    const page = readFileSync("app/masters/pr-categories/page.tsx", "utf8");

    expect(page).toContain("Category Deactivation Impact");
    expect(page).toContain("affected active recurring schedule");
    expect(page).toContain("/recurring-pr/");
    expect(page).toContain('name="categoryId"');
    expect(page).toContain("Cancel");
  });
});
