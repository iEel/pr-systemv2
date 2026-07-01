import { describe, expect, test } from "vitest";
import {
  buildUserManagementHref,
  buildLocalUserCreateData,
  buildUserPasswordResetData,
  buildUserUpdateData,
  mapUserRecordToRow,
  normalizeUserFilters,
  readUserRedirectFilters,
  validateUserSelfProtection,
} from "../lib/user-management";

describe("user management helpers", () => {
  test("normalizes user filters", () => {
    expect(normalizeUserFilters({ includeInactive: "1", q: " admin ", role: "IT_ADMIN" })).toEqual({
      createAuthProvider: "LOCAL",
      createUser: false,
      editUserId: "",
      feedbackMessage: "",
      feedbackType: "",
      includeInactive: true,
      ldapVerifiedDisplayName: "",
      ldapVerifiedEmail: "",
      ldapVerifiedUsername: "",
      q: "admin",
      resetUserId: "",
      role: "IT_ADMIN",
    });

    expect(normalizeUserFilters({ role: "bad" })).toEqual({
      createAuthProvider: "LOCAL",
      createUser: false,
      editUserId: "",
      feedbackMessage: "",
      feedbackType: "",
      includeInactive: false,
      ldapVerifiedDisplayName: "",
      ldapVerifiedEmail: "",
      ldapVerifiedUsername: "",
      q: "",
      resetUserId: "",
      role: "ALL",
    });

    expect(
      normalizeUserFilters({
        createAuthProvider: "LDAP",
        ldapVerifiedDisplayName: " Somchai S. ",
        ldapVerifiedEmail: " somchai.s@example.local ",
        ldapVerifiedUsername: " somchai.s ",
      }),
    ).toMatchObject({
      createAuthProvider: "LDAP",
      ldapVerifiedDisplayName: "Somchai S.",
      ldapVerifiedEmail: "somchai.s@example.local",
      ldapVerifiedUsername: "somchai.s",
    });
  });

  test("builds user management href with row expansion and feedback state", () => {
    expect(
      buildUserManagementHref({
        createAuthProvider: "LDAP",
        editUserId: "user_admin",
        feedbackMessage: "Updated",
        feedbackType: "success",
        includeInactive: true,
        ldapVerifiedDisplayName: "Somchai S.",
        ldapVerifiedEmail: "somchai.s@example.local",
        ldapVerifiedUsername: "somchai.s",
        q: "admin",
        createUser: true,
        resetUserId: "user_it",
        role: "ADMIN",
      }),
    ).toBe(
      "/settings/users?q=admin&role=ADMIN&includeInactive=1&createUser=1&createAuthProvider=LDAP&editUserId=user_admin&resetUserId=user_it&feedbackType=success&feedbackMessage=Updated&ldapVerifiedUsername=somchai.s&ldapVerifiedDisplayName=Somchai+S.&ldapVerifiedEmail=somchai.s%40example.local",
    );
  });

  test("reads user redirect filters with LDAP verification state", () => {
    const formData = new FormData();
    formData.set("redirectCreateUser", "1");
    formData.set("redirectCreateAuthProvider", "LDAP");
    formData.set("redirectLdapVerifiedDisplayName", "Somchai S.");
    formData.set("redirectLdapVerifiedEmail", "somchai.s@example.local");
    formData.set("redirectLdapVerifiedUsername", "somchai.s");

    expect(readUserRedirectFilters(formData)).toMatchObject({
      createAuthProvider: "LDAP",
      createUser: true,
      ldapVerifiedDisplayName: "Somchai S.",
      ldapVerifiedEmail: "somchai.s@example.local",
      ldapVerifiedUsername: "somchai.s",
    });
  });

  test("builds create data with trimmed fields and validated role", () => {
    expect(
      buildLocalUserCreateData({
        displayName: " Admin User ",
        email: " admin@example.local ",
        password: " admin123 ",
        role: "ADMIN",
        username: " admin ",
      }),
    ).toEqual({
      authProvider: "LOCAL",
      displayName: "Admin User",
      email: "admin@example.local",
      isActive: true,
      password: "admin123",
      role: "ADMIN",
      username: "admin",
    });

    expect(() => buildLocalUserCreateData({ username: "u", displayName: "User", password: "short", role: "IT_USER" })).toThrow(
      "Password must be at least 8 characters",
    );
    expect(() => buildLocalUserCreateData({ username: "u", displayName: "User", password: "admin123", role: "BAD" })).toThrow(
      "Role is invalid",
    );
  });

  test("builds update and password reset data", () => {
    expect(
      buildUserUpdateData({
        displayName: " Somchai S. ",
        email: "",
        isActive: "on",
        role: "IT_USER",
      }),
    ).toEqual({
      displayName: "Somchai S.",
      email: null,
      isActive: true,
      role: "IT_USER",
    });

    expect(buildUserPasswordResetData({ password: " newpass123 ", passwordConfirm: " newpass123 " })).toEqual({ password: "newpass123" });
    expect(() => buildUserPasswordResetData({ password: "newpass123", passwordConfirm: "different123" })).toThrow(
      "Password confirmation does not match",
    );
  });

  test("protects the current admin from self-deactivation and self-role changes", () => {
    expect(() =>
      validateUserSelfProtection({
        actorId: "user_admin",
        nextIsActive: false,
        nextRole: "ADMIN",
        targetId: "user_admin",
        targetRole: "ADMIN",
      }),
    ).toThrow("You cannot deactivate your own user");

    expect(() =>
      validateUserSelfProtection({
        actorId: "user_admin",
        nextIsActive: true,
        nextRole: "VIEWER",
        targetId: "user_admin",
        targetRole: "ADMIN",
      }),
    ).toThrow("You cannot change your own role");
  });

  test("maps user records without leaking password hashes", () => {
    expect(
      mapUserRecordToRow(
        {
          authProvider: "LOCAL",
          createdAt: new Date("2026-06-29T00:00:00.000Z"),
          displayName: "Admin User",
          email: "admin@example.local",
          id: "user_admin",
          isActive: true,
          passwordHash: "secret-hash",
          role: "ADMIN",
          updatedAt: new Date("2026-06-30T00:00:00.000Z"),
          username: "admin",
        },
        "user_admin",
      ),
    ).toEqual({
      authProvider: "LOCAL",
      createdAt: "2026-06-29T00:00:00.000Z",
      displayName: "Admin User",
      email: "admin@example.local",
      externalUsername: null,
      id: "user_admin",
      isActive: true,
      isCurrentUser: true,
      providerLabel: "Local",
      role: "ADMIN",
      roleLabel: "Administrator",
      status: "Active",
      updatedAt: "2026-06-30T00:00:00.000Z",
      username: "admin",
    });
  });
});
