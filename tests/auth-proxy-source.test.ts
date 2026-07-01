import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("auth proxy source", () => {
  test("protects app routes before server components throw authorization errors", () => {
    expect(existsSync("proxy.ts")).toBe(true);
    expect(existsSync("app/forbidden/page.tsx")).toBe(true);

    const proxy = readFileSync("proxy.ts", "utf8");
    const forbiddenPage = readFileSync("app/forbidden/page.tsx", "utf8");

    expect(proxy).toContain("getToken");
    expect(proxy).toContain("isProtectedAppPath");
    expect(proxy).toContain("buildLoginRedirectUrl");
    expect(proxy).toContain("buildForbiddenRedirectUrl");
    expect(proxy).toContain("canRoleAccessPath");
    expect(proxy).toContain("matcher");
    expect(forbiddenPage).toContain("Access denied");
    expect(forbiddenPage).toContain("Back to Dashboard");
  });
});
