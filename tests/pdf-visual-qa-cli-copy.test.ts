import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("pdf visual qa CLI wiring", () => {
  test("package exposes pdf:qa script and CLI file exists", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

    expect(packageJson.scripts["pdf:qa"]).toContain("scripts/pdf-visual-qa.mjs");
    expect(existsSync("scripts/pdf-visual-qa.mjs")).toBe(true);
  });

  test("CLI supports required arguments and Poppler rendering", () => {
    const source = readFileSync("scripts/pdf-visual-qa.mjs", "utf8");

    expect(source).toContain("--input");
    expect(source).toContain("--expected-pages");
    expect(source).toContain("--skip-render");
    expect(source).toContain("pdftoppm");
    expect(source).toContain("report.json");
    expect(source).toContain("report.md");
  });
});
