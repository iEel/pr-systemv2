import { describe, expect, test, vi } from "vitest";
import { hashPassword } from "../lib/auth/local-provider";
import { verifyApplicationCredentials, type CredentialUserRecord } from "../lib/auth/credentials-provider";

function user(overrides: Partial<CredentialUserRecord> = {}): CredentialUserRecord {
  return {
    authProvider: "LOCAL",
    displayName: "Admin User",
    email: "admin@example.local",
    externalId: null,
    externalUsername: null,
    id: "user_admin",
    isActive: true,
    passwordHash: "hash",
    role: "ADMIN",
    username: "admin",
    ...overrides,
  };
}

describe("hybrid application credentials", () => {
  test("keeps local admin login working", async () => {
    const passwordHash = await hashPassword("admin123");
    const result = await verifyApplicationCredentials(
      { username: "admin", password: "admin123" },
      {
        authMode: "HYBRID",
        findUserByUsername: async () => user({ passwordHash }),
        markLastLogin: async () => undefined,
        verifyLdapUser: async () => false,
      },
    );

    expect(result?.username).toBe("admin");
    expect(result?.role).toBe("ADMIN");
  });

  test("logs LDAP user in only when SQL allowlist and LDAP bind both pass", async () => {
    const result = await verifyApplicationCredentials(
      { username: " Somchai.S ", password: "ad-password" },
      {
        authMode: "HYBRID",
        findUserByUsername: async () =>
          user({
            authProvider: "LDAP",
            displayName: "Somchai S.",
            email: "somchai.s@example.local",
            externalId: "01020304",
            externalUsername: "somchai.s",
            id: "user_somchai",
            passwordHash: null,
            role: "IT_USER",
            username: "somchai.s",
          }),
        markLastLogin: async () => undefined,
        verifyLdapUser: async (record, password) => record.externalUsername === "somchai.s" && password === "ad-password",
      },
    );

    expect(result).toEqual({
      displayName: "Somchai S.",
      email: "somchai.s@example.local",
      id: "user_somchai",
      role: "IT_USER",
      username: "somchai.s",
    });
  });

  test("denies LDAP login when the SQL row is missing or inactive", async () => {
    await expect(
      verifyApplicationCredentials(
        { username: "somchai.s", password: "ad-password" },
        {
          authMode: "HYBRID",
          findUserByUsername: async () => null,
          markLastLogin: async () => undefined,
          verifyLdapUser: async () => true,
        },
      ),
    ).resolves.toBeNull();

    await expect(
      verifyApplicationCredentials(
        { username: "somchai.s", password: "ad-password" },
        {
          authMode: "HYBRID",
          findUserByUsername: async () => user({ authProvider: "LDAP", isActive: false }),
          markLastLogin: async () => undefined,
          verifyLdapUser: async () => true,
        },
      ),
    ).resolves.toBeNull();
  });

  test("respects LOCAL and LDAP auth modes", async () => {
    await expect(
      verifyApplicationCredentials(
        { username: "admin", password: "admin123" },
        {
          authMode: "LDAP",
          findUserByUsername: async () => user({ authProvider: "LOCAL" }),
          markLastLogin: async () => undefined,
          verifyLdapUser: async () => false,
        },
      ),
    ).resolves.toBeNull();

    await expect(
      verifyApplicationCredentials(
        { username: "somchai.s", password: "ad-password" },
        {
          authMode: "LOCAL",
          findUserByUsername: async () => user({ authProvider: "LDAP", username: "somchai.s" }),
          markLastLogin: async () => undefined,
          verifyLdapUser: async () => true,
        },
      ),
    ).resolves.toBeNull();
  });

  test("returns null when LDAP verification throws", async () => {
    const markLastLogin = vi.fn(async () => undefined);
    const verifyLdapUser = vi.fn(async () => {
      throw new Error("LDAP unavailable");
    });

    await expect(
      verifyApplicationCredentials(
        { username: "somchai.s", password: "ad-password" },
        {
          authMode: "HYBRID",
          findUserByUsername: async () =>
            user({
              authProvider: "LDAP",
              externalId: "01020304",
              externalUsername: "somchai.s",
              passwordHash: null,
              username: "somchai.s",
            }),
          markLastLogin,
          verifyLdapUser,
        },
      ),
    ).resolves.toBeNull();

    expect(markLastLogin).not.toHaveBeenCalled();
  });

  test("denies LDAP users without an external id before verification", async () => {
    const markLastLogin = vi.fn(async () => undefined);
    const verifyLdapUser = vi.fn(async () => true);

    const result = await verifyApplicationCredentials(
      { username: "somchai.s", password: "ad-password" },
      {
        authMode: "HYBRID",
        findUserByUsername: async () =>
          user({
            authProvider: "LDAP",
            externalId: null,
            externalUsername: "somchai.s",
            passwordHash: null,
            username: "somchai.s",
          }),
        markLastLogin,
        verifyLdapUser,
      },
    );

    expect(result).toBeNull();
    expect(verifyLdapUser).not.toHaveBeenCalled();
    expect(markLastLogin).not.toHaveBeenCalled();
  });

  test("denies LDAP users without an external username before verification", async () => {
    const markLastLogin = vi.fn(async () => undefined);
    const verifyLdapUser = vi.fn(async () => true);

    const result = await verifyApplicationCredentials(
      { username: "somchai.s", password: "ad-password" },
      {
        authMode: "HYBRID",
        findUserByUsername: async () =>
          user({
            authProvider: "LDAP",
            externalId: "01020304",
            externalUsername: null,
            passwordHash: null,
            username: "somchai.s",
          }),
        markLastLogin,
        verifyLdapUser,
      },
    );

    expect(result).toBeNull();
    expect(verifyLdapUser).not.toHaveBeenCalled();
    expect(markLastLogin).not.toHaveBeenCalled();
  });

  test("denies users with unknown auth providers", async () => {
    const passwordHash = await hashPassword("admin123");
    const markLastLogin = vi.fn(async () => undefined);

    const result = await verifyApplicationCredentials(
      { username: "admin", password: "admin123" },
      {
        authMode: "HYBRID",
        findUserByUsername: async () => user({ authProvider: "OAUTH", passwordHash }),
        markLastLogin,
        verifyLdapUser: async () => false,
      },
    );

    expect(result).toBeNull();
    expect(markLastLogin).not.toHaveBeenCalled();
  });

  test("marks last login only after successful authentication", async () => {
    const passwordHash = await hashPassword("admin123");
    const successfulMarkLastLogin = vi.fn(async () => undefined);

    const success = await verifyApplicationCredentials(
      { username: "admin", password: "admin123" },
      {
        authMode: "HYBRID",
        findUserByUsername: async () => user({ passwordHash }),
        markLastLogin: successfulMarkLastLogin,
        verifyLdapUser: async () => false,
      },
    );

    expect(success?.id).toBe("user_admin");
    expect(successfulMarkLastLogin).toHaveBeenCalledTimes(1);
    expect(successfulMarkLastLogin).toHaveBeenCalledWith("user_admin");

    const deniedMarkLastLogin = vi.fn(async () => undefined);

    await expect(
      verifyApplicationCredentials(
        { username: "admin", password: "wrong" },
        {
          authMode: "HYBRID",
          findUserByUsername: async () => user({ passwordHash }),
          markLastLogin: deniedMarkLastLogin,
          verifyLdapUser: async () => false,
        },
      ),
    ).resolves.toBeNull();

    expect(deniedMarkLastLogin).not.toHaveBeenCalled();
  });

  test("does not mark login when LDAP verification rejects the external identity", async () => {
    const markLastLogin = vi.fn(async () => undefined);
    const verifyLdapUser = vi.fn(async (record: CredentialUserRecord) => record.externalId === "expected-external-id");

    const result = await verifyApplicationCredentials(
      { username: "somchai.s", password: "ad-password" },
      {
        authMode: "HYBRID",
        findUserByUsername: async () =>
          user({
            authProvider: "LDAP",
            externalId: "different-external-id",
            externalUsername: "somchai.s",
            passwordHash: null,
            username: "somchai.s",
          }),
        markLastLogin,
        verifyLdapUser,
      },
    );

    expect(result).toBeNull();
    expect(verifyLdapUser).toHaveBeenCalledTimes(1);
    expect(markLastLogin).not.toHaveBeenCalled();
  });
});
