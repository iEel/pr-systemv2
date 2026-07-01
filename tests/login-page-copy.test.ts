import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("login page copy", () => {
  test("does not prefill the username or show unsupported login controls", () => {
    const source = readFileSync("app/login/page.tsx", "utf8");

    expect(source).toContain('name="username"');
    expect(source).not.toContain('defaultValue="admin"');
    expect(source).not.toContain("Forgot password?");
    expect(source).not.toContain("ไทย (TH)");
    expect(source).not.toContain("Globe2");
    expect(source).not.toContain("ChevronDown");
  });
});
