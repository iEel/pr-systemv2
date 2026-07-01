import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findLdapUser: vi.fn(),
  hashPassword: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
  },
  requirePermission: vi.fn(),
}));

vi.mock("../lib/auth/current-user", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("../lib/auth/ldap-provider", () => ({
  findLdapUser: mocks.findLdapUser,
}));

vi.mock("../lib/auth/local-provider", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("../lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import {
  buildLdapUserCreateData,
  buildLocalUserCreateData,
  canResetUserPassword,
  createUserFromFormData,
  mapUserRecordToRow,
  resetUserPasswordFromFormData,
} from "../lib/user-management";

function buildTx() {
  return {
    auditLog: {
      create: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

function useTransaction(tx = buildTx()) {
  mocks.prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) => callback(tx));
  return tx;
}

function buildLdapCreateFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    authProvider: "LDAP",
    role: "IT_USER",
    username: " Somchai.S ",
    verifiedUsername: " somchai.s ",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => formData.set(key, value));

  return formData;
}

function buildPasswordResetFormData() {
  const formData = new FormData();
  formData.set("userId", "user_somchai");
  formData.set("password", "newpass123");
  formData.set("passwordConfirm", "newpass123");
  return formData;
}

const ldapProfile = {
  displayName: "Somchai S.",
  dn: "CN=Somchai S,OU=Users,DC=example,DC=local",
  email: "somchai.s@example.local",
  externalId: "01020304",
  username: "somchai.s",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findLdapUser.mockResolvedValue(ldapProfile);
  mocks.hashPassword.mockResolvedValue("hashed-password");
  mocks.prisma.user.findUnique.mockResolvedValue(null);
  mocks.requirePermission.mockResolvedValue({ id: "user_admin" });
});

describe("LDAP user management helpers", () => {
  test("builds local and LDAP create data separately", () => {
    expect(
      buildLocalUserCreateData({
        displayName: " Admin User ",
        email: " admin@example.local ",
        password: " admin123 ",
        role: "ADMIN",
        username: " admin ",
      }),
    ).toMatchObject({
      authProvider: "LOCAL",
      password: "admin123",
      username: "admin",
    });

    expect(
      buildLdapUserCreateData({
        role: "IT_USER",
        username: " Somchai.S ",
        verifiedUsername: " somchai.s ",
      }),
    ).toEqual({
      authProvider: "LDAP",
      isActive: true,
      role: "IT_USER",
      username: "somchai.s",
    });
  });

  test("rejects LDAP create usernames that are not short usernames", () => {
    expect(() => buildLdapUserCreateData({ role: "IT_USER", username: "somchai.s@example.local", verifiedUsername: "somchai.s" })).toThrow(
      "Short username is required",
    );
  });

  test("rejects LDAP create data that does not match a verified username", () => {
    expect(() => buildLdapUserCreateData({ role: "IT_USER", username: "somchai.s" })).toThrow(
      "Verify AD user again before creating this account",
    );
    expect(() => buildLdapUserCreateData({ role: "IT_USER", username: "somchai.s", verifiedUsername: "other.user" })).toThrow(
      "Verify AD user again before creating this account",
    );
  });

  test("maps provider metadata to rows", () => {
    const row = mapUserRecordToRow(
      {
        authProvider: "LDAP",
        createdAt: new Date("2026-06-29T00:00:00.000Z"),
        displayName: "Somchai S.",
        email: "somchai.s@example.local",
        externalId: "01020304",
        externalUsername: "somchai.s",
        id: "user_somchai",
        isActive: true,
        passwordHash: null,
        role: "IT_USER",
        updatedAt: new Date("2026-06-30T00:00:00.000Z"),
        username: "somchai.s",
      },
      "",
    );

    expect(row.authProvider).toBe("LDAP");
    expect(row.providerLabel).toBe("AD/LDAP");
    expect(row.externalUsername).toBe("somchai.s");
    expect(canResetUserPassword(row)).toBe(false);
  });

  test("maps unknown persisted providers as non-resettable", () => {
    const row = mapUserRecordToRow(
      {
        authProvider: "SAML",
        createdAt: new Date("2026-06-29T00:00:00.000Z"),
        displayName: "Unknown Provider",
        email: null,
        id: "user_unknown",
        isActive: true,
        passwordHash: null,
        role: "IT_USER",
        updatedAt: new Date("2026-06-30T00:00:00.000Z"),
        username: "unknown.provider",
      },
      "",
    );

    expect(row.authProvider).toBe("UNKNOWN");
    expect(row.providerLabel).toBe("Unknown");
    expect(canResetUserPassword(row)).toBe(false);
  });
});

describe("LDAP user management operations", () => {
  test("createUserFromFormData branches to LDAP and writes profile-derived user data", async () => {
    const tx = useTransaction();
    tx.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    tx.user.findFirst.mockResolvedValueOnce(null);
    tx.user.create.mockResolvedValueOnce({
      authProvider: "LDAP",
      displayName: ldapProfile.displayName,
      email: ldapProfile.email,
      externalId: ldapProfile.externalId,
      externalUsername: ldapProfile.username,
      id: "user_somchai",
      role: "IT_ADMIN",
      username: ldapProfile.username,
    });

    const created = await createUserFromFormData(buildLdapCreateFormData({ role: "IT_ADMIN" }));

    expect(created).toMatchObject({ authProvider: "LDAP", id: "user_somchai", username: "somchai.s" });
    expect(mocks.findLdapUser).toHaveBeenCalledWith("somchai.s", expect.objectContaining({ userFilter: expect.any(String) }));
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        authProvider: "LDAP",
        displayName: ldapProfile.displayName,
        email: ldapProfile.email,
        externalId: ldapProfile.externalId,
        externalUsername: ldapProfile.username,
        isActive: true,
        passwordHash: null,
        role: "IT_ADMIN",
        username: "somchai.s",
      },
    });

    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    const auditPayload = tx.auditLog.create.mock.calls[0][0].data;
    expect(JSON.parse(auditPayload.metadataJson)).toEqual({
      authProvider: "LDAP",
      detail: "Created LDAP user somchai.s",
      role: "IT_ADMIN",
      username: "somchai.s",
    });
    expect(JSON.stringify(auditPayload)).not.toContain(ldapProfile.externalId);
    expect(JSON.stringify(auditPayload).toLowerCase()).not.toContain("password");
  });

  test("rejects duplicate LDAP username before directory lookup", async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ id: "existing_user" });

    await expect(createUserFromFormData(buildLdapCreateFormData())).rejects.toThrow("Username somchai.s already exists");

    expect(mocks.findLdapUser).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  test.each([
    ["missing", { verifiedUsername: "" }],
    ["mismatched", { verifiedUsername: "other.user" }],
  ])("rejects LDAP create with %s verification before directory lookup or mutation", async (_label, overrides) => {
    await expect(createUserFromFormData(buildLdapCreateFormData(overrides))).rejects.toThrow(
      "Verify AD user again before creating this account",
    );

    expect(mocks.findLdapUser).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  test("rejects duplicate LDAP external identity without creating a user or audit", async () => {
    const tx = useTransaction();
    tx.user.findUnique.mockResolvedValueOnce(null);
    tx.user.findFirst.mockResolvedValueOnce({ id: "existing_external" });

    await expect(createUserFromFormData(buildLdapCreateFormData())).rejects.toThrow("LDAP identity already exists");

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  test("rejects duplicate LDAP profile email without creating a user or audit", async () => {
    const tx = useTransaction();
    tx.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "existing_email" });
    tx.user.findFirst.mockResolvedValueOnce(null);

    await expect(createUserFromFormData(buildLdapCreateFormData())).rejects.toThrow("Email somchai.s@example.local already exists");

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  test("rejects password reset for LDAP before mutation", async () => {
    const tx = useTransaction();
    tx.user.findUnique.mockResolvedValueOnce({
      authProvider: "LDAP",
      id: "user_somchai",
      username: "somchai.s",
    });

    await expect(resetUserPasswordFromFormData(buildPasswordResetFormData())).rejects.toThrow("LDAP user passwords are managed by AD");

    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  test.each(["ldap", "", "SAML"])("rejects password reset for provider %s with provider-neutral copy", async (authProvider) => {
    const tx = useTransaction();
    tx.user.findUnique.mockResolvedValueOnce({
      authProvider,
      id: "user_somchai",
      username: "somchai.s",
    });

    await expect(resetUserPasswordFromFormData(buildPasswordResetFormData())).rejects.toThrow("Password reset is unavailable for this provider.");

    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
