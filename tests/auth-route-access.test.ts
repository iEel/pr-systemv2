import { describe, expect, test } from "vitest";
import {
  buildForbiddenRedirectUrl,
  buildLoginRedirectUrl,
  canRoleAccessPath,
  isProtectedAppPath,
  requiredPermissionForPath,
} from "../lib/auth/route-access";

describe("auth route access", () => {
  test("identifies protected app paths without blocking public auth assets", () => {
    expect(isProtectedAppPath("/dashboard")).toBe(true);
    expect(isProtectedAppPath("/settings/users")).toBe(true);
    expect(isProtectedAppPath("/masters/budgets")).toBe(true);
    expect(isProtectedAppPath("/recurring-pr")).toBe(true);
    expect(isProtectedAppPath("/login")).toBe(false);
    expect(isProtectedAppPath("/api/auth/session")).toBe(false);
    expect(isProtectedAppPath("/_next/static/chunk.js")).toBe(false);
  });

  test("maps admin routes to their required permissions", () => {
    expect(requiredPermissionForPath("/settings/users")).toBe("USER_MANAGE");
    expect(requiredPermissionForPath("/settings/running-numbers")).toBe("RUNNING_NUMBER_MANAGE");
    expect(requiredPermissionForPath("/masters/budgets")).toBe("BUDGET_MANAGE");
    expect(requiredPermissionForPath("/masters/companies")).toBe("MASTER_DATA_MANAGE");
    expect(requiredPermissionForPath("/masters/pr-categories")).toBe("MASTER_DATA_MANAGE");
    expect(requiredPermissionForPath("/templates")).toBe("TEMPLATE_MANAGE");
    expect(requiredPermissionForPath("/audit-logs/export")).toBe("AUDIT_VIEW");
    expect(requiredPermissionForPath("/recurring-pr")).toBeNull();
    expect(requiredPermissionForPath("/dashboard")).toBeNull();
  });

  test("checks route access using SQL Server role permissions", () => {
    expect(canRoleAccessPath("ADMIN", "/settings/users")).toBe(true);
    expect(canRoleAccessPath("IT_ADMIN", "/settings/users")).toBe(true);
    expect(canRoleAccessPath("IT_USER", "/settings/users")).toBe(false);
    expect(canRoleAccessPath("IT_USER", "/masters/pr-categories")).toBe(false);
    expect(canRoleAccessPath("VIEWER", "/dashboard")).toBe(true);
  });

  test("builds login and forbidden redirects with safe callback context", () => {
    expect(buildLoginRedirectUrl("http://localhost:3000/settings/users?role=ADMIN").toString()).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fsettings%2Fusers%3Frole%3DADMIN",
    );
    expect(buildForbiddenRedirectUrl("http://localhost:3000/settings/users", "USER_MANAGE").toString()).toBe(
      "http://localhost:3000/forbidden?permission=USER_MANAGE&from=%2Fsettings%2Fusers",
    );
  });
});
