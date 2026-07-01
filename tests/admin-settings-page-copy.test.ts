import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("admin settings pages", () => {
  test("users page is wired to SQL Server user management", () => {
    const source = readFileSync("app/settings/users/page.tsx", "utf8");
    const actionsSource = readFileSync("app/settings/users/actions.ts", "utf8");

    expect(source).toContain("Users / Roles");
    expect(source).toContain("Create User");
    expect(source).toContain("Update User");
    expect(source).toContain("Reset Password");
    expect(source).toContain("Include inactive");
    expect(source).toContain("getUserManagementPageData");
    expect(source).not.toContain("ModulePage");
    expect(actionsSource).toContain("createUserAction");
    expect(actionsSource).toContain("updateUserAction");
    expect(actionsSource).toContain("resetUserPasswordAction");
  });

  test("users page keeps dangerous account actions behind row expansions", () => {
    const source = readFileSync("app/settings/users/page.tsx", "utf8");
    const actionsSource = readFileSync("app/settings/users/actions.ts", "utf8");

    expect(source).toContain("editUserId");
    expect(source).toContain("resetUserId");
    expect(source).toContain("Edit profile");
    expect(source).toContain("Open password reset");
    expect(source).toContain("Role guide");
    expect(source).toContain("Current session");
    expect(source).toContain("Role is locked for your current session");
    expect(source).toContain("This action is audited");
    expect(source).toContain("ActionFeedback");
    expect(source).toContain("buildUserManagementHref");
    expect(actionsSource).toContain("redirectBackToUsers(formData,");
    expect(actionsSource).toContain("Could not update user");
    expect(actionsSource).toContain("Password reset completed");
  });

  test("users page keeps the table first and hardens password reset", () => {
    const source = readFileSync("app/settings/users/page.tsx", "utf8");
    const helperSource = readFileSync("lib/user-management.ts", "utf8");

    expect(source).toContain("New User");
    expect(source).toContain("createUser");
    expect(source).toContain("CompactRoleGuide");
    expect(source).toContain("Show role guide");
    expect(source).toContain("Reset target");
    expect(source).toContain("Confirm Password");
    expect(source).toContain("Password reset requires confirmation");
    expect(source.indexOf("usersTable({ filters, rows })")).toBeLessThan(source.indexOf("createUserForm({ filters })"));
    expect(helperSource).toContain("passwordConfirm");
    expect(helperSource).toContain("Password confirmation does not match");
  });

  test("users page supports LDAP allowlisted accounts without password reset", () => {
    const source = readFileSync("app/settings/users/page.tsx", "utf8");
    const actionsSource = readFileSync("app/settings/users/actions.ts", "utf8");
    const helperSource = readFileSync("lib/user-management.ts", "utf8");

    expect(source).toContain("AD/LDAP");
    expect(source).toContain("Verify AD User");
    expect(source).toContain("LDAP user passwords are managed by AD");
    expect(source).toContain("Password reset is unavailable for this provider.");
    expect(source).toContain("authProvider");
    expect(source).toContain("providerLabel");
    expect(source).toContain('name="verifiedUsername"');
    expect(source).toContain("readOnly={Boolean(filters.ldapVerifiedUsername)}");
    expect(source).toContain("Change AD user");
    expect(actionsSource).toContain("verifyLdapUserAction");
    expect(actionsSource).toContain("Could not verify AD user. Check the username or LDAP configuration.");
    expect(actionsSource).toContain("Could not create LDAP user. Verify the AD user again or check for duplicate account data.");
    expect(actionsSource).toContain("createUser: false");
    expect(actionsSource).toContain('ldapVerifiedUsername: ""');
    expect(helperSource).toContain("Verify AD user again before creating this account");
    expect(helperSource).toContain("Password reset is unavailable for this provider.");
  });

  test("running number page is wired to SQL Server settings", () => {
    const source = readFileSync("app/settings/running-numbers/page.tsx", "utf8");
    const actionsSource = readFileSync("app/settings/running-numbers/actions.ts", "utf8");

    expect(source).toContain("Running Number Settings");
    expect(source).toContain("Create Setting");
    expect(source).toContain("Update Setting");
    expect(source).toContain("Next Preview");
    expect(source).toContain("getRunningNumberSettingsPageData");
    expect(source).not.toContain("ModulePage");
    expect(actionsSource).toContain("createRunningNumberSettingAction");
    expect(actionsSource).toContain("updateRunningNumberSettingAction");
  });

  test("running number table rows use stable setting ids as React keys", () => {
    const source = readFileSync("app/settings/running-numbers/page.tsx", "utf8");

    expect(source).toContain("<tr key={row.id}");
  });
});
