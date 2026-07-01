import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("app sidebar copy", () => {
  test("does not present the connected app as a phase 1 sample shell", () => {
    const source = readFileSync("components/app/AppSidebar.tsx", "utf8");

    expect(source).not.toContain("Phase 1 Shell");
    expect(source).not.toContain("Local UI sample data");
    expect(source).toContain("SQL Server connected");
  });

  test("keeps desktop navigation fixed in place while page content scrolls", () => {
    const source = readFileSync("components/app/AppSidebar.tsx", "utf8");

    expect(source).toContain("lg:sticky lg:top-0");
    expect(source).toContain("lg:h-screen");
    expect(source).toContain("min-h-0 flex-1");
    expect(source).toContain("overflow-y-auto");
  });
});
