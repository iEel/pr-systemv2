import { existsSync, readFileSync } from "node:fs";
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

  test("presents a premium document workflow login without trust badges", () => {
    const source = readFileSync("app/login/page.tsx", "utf8");

    expect(source).toContain("IT PR Document Control");
    expect(source).toContain("เข้าสู่ระบบ IT PR");
    expect(source).toContain("/login-pr-illustration.png");
    expect(source).toContain("PR document workflow illustration");
    expect(source).not.toContain("workflowSteps");
    expect(source).not.toContain("Draft");
    expect(source).not.toContain("Preview");
    expect(source).not.toContain("Issue PR");
    expect(source).not.toContain("Signed");
    expect(existsSync("public/login-pr-illustration.png")).toBe(true);
    expect(source).not.toContain("SQL Server RBAC");
    expect(source).not.toContain("AD/LDAP ready");
    expect(source).not.toContain("Audit trail enabled");
  });
});
