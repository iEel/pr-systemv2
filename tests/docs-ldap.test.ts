import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("LDAP documentation and seed coverage", () => {
  test("documents implemented AD/LDAP Search + Bind workflow", () => {
    const handoff = read("DEVELOPER_HANDOFF.md");
    const admin = read("docs/ADMIN_SETTINGS.md");
    const dataModel = read("docs/DATA_MODEL.md");
    const features = read("docs/FEATURES.md");
    const qa = read("docs/QA_CHECKLIST.md");

    expect(handoff).toContain("AD/LDAP Search + Bind");
    expect(handoff).toContain("SQL allowlist");
    expect(admin).toContain("Verify AD User");
    expect(dataModel).toContain("authProvider");
    expect(features).toContain("LDAP Search + Bind");
    expect(qa).toContain("Login with an allowlisted LDAP user such as `veerapon.l`");
  });

  test("keeps seeded admin as an explicit local fallback user", () => {
    const seed = read("prisma/seed.mjs");

    expect(seed).toContain('authProvider: "LOCAL"');
    expect(seed).toContain("externalId: null");
    expect(seed).toContain("externalUsername: null");
    expect(seed).toContain("lastLoginAt: null");
  });
});
