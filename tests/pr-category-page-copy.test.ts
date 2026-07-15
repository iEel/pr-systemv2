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
});
