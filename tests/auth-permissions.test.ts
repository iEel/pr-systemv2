import { describe, expect, test } from "vitest";
import { AuthorizationError, assertPermission, hasPermission, rolePermissions } from "../lib/auth/permissions";

describe("RBAC permissions", () => {
  test("grants every permission to admins", () => {
    for (const permission of rolePermissions.ADMIN) {
      expect(hasPermission("ADMIN", permission)).toBe(true);
    }

    expect(hasPermission("ADMIN", "PR_RECURRING_MANAGE")).toBe(true);
    expect(hasPermission("IT_ADMIN", "PR_RECURRING_MANAGE")).toBe(true);
    expect(hasPermission("IT_USER", "PR_RECURRING_MANAGE")).toBe(false);
    expect(hasPermission("VIEWER", "PR_RECURRING_MANAGE")).toBe(false);
  });

  test("allows IT users to run PR document-control commands but not template management", () => {
    expect(hasPermission("IT_USER", "PR_CREATE")).toBe(true);
    expect(hasPermission("IT_USER", "PR_GENERATE")).toBe(true);
    expect(hasPermission("IT_USER", "PR_UPLOAD_ATTACHMENT")).toBe(true);
    expect(hasPermission("IT_USER", "PR_CANCEL_REISSUE")).toBe(true);
    expect(hasPermission("IT_USER", "TEMPLATE_MANAGE")).toBe(false);
    expect(hasPermission("IT_USER", "MASTER_DATA_MANAGE")).toBe(false);
    expect(hasPermission("IT_USER", "BUDGET_MANAGE")).toBe(false);
    expect(hasPermission("IT_USER", "USER_MANAGE")).toBe(false);
    expect(hasPermission("IT_USER", "RUNNING_NUMBER_MANAGE")).toBe(false);
    expect(hasPermission("IT_USER", "AUDIT_VIEW")).toBe(false);
  });

  test("keeps viewers read-only", () => {
    expect(hasPermission("VIEWER", "PR_CREATE")).toBe(false);
    expect(hasPermission("VIEWER", "TEMPLATE_MANAGE")).toBe(false);
    expect(hasPermission("VIEWER", "BUDGET_MANAGE")).toBe(false);
    expect(hasPermission("VIEWER", "USER_MANAGE")).toBe(false);
    expect(hasPermission("VIEWER", "RUNNING_NUMBER_MANAGE")).toBe(false);
    expect(hasPermission("VIEWER", "AUDIT_VIEW")).toBe(false);
  });

  test("throws a typed authorization error when permission is missing", () => {
    expect(() => assertPermission({ role: "VIEWER" }, "PR_GENERATE")).toThrow(AuthorizationError);
    expect(() => assertPermission({ role: "IT_ADMIN" }, "TEMPLATE_MANAGE")).not.toThrow();
    expect(() => assertPermission({ role: "IT_ADMIN" }, "BUDGET_MANAGE")).not.toThrow();
    expect(() => assertPermission({ role: "IT_ADMIN" }, "USER_MANAGE")).not.toThrow();
    expect(() => assertPermission({ role: "IT_ADMIN" }, "RUNNING_NUMBER_MANAGE")).not.toThrow();
  });
});
