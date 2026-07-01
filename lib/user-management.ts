import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requirePermission } from "./auth/current-user";
import { parseLdapConfig } from "./auth/ldap-config";
import { findLdapUser } from "./auth/ldap-provider";
import { normalizeShortUsername } from "./auth/ldap-utils";
import { hashPassword } from "./auth/local-provider";
import { isRole, type Role } from "./auth/permissions";

type SearchParams = Record<string, string | string[] | undefined>;

type UserRecord = {
  authProvider: string;
  createdAt: Date | string;
  displayName: string;
  email: string | null;
  externalId?: string | null;
  externalUsername?: string | null;
  id: string;
  isActive: boolean;
  passwordHash?: string | null;
  role: string;
  updatedAt: Date | string;
  username: string;
};

export type UserManagementFilters = {
  createAuthProvider: UserAuthProvider;
  createUser: boolean;
  editUserId: string;
  feedbackMessage: string;
  feedbackType: "error" | "success" | "";
  includeInactive: boolean;
  ldapVerifiedDisplayName: string;
  ldapVerifiedEmail: string;
  ldapVerifiedUsername: string;
  q: string;
  resetUserId: string;
  role: Role | "ALL";
};

export const manageableRoles: Role[] = ["ADMIN", "IT_ADMIN", "IT_USER", "VIEWER"];

export type UserAuthProvider = "LOCAL" | "LDAP" | "UNKNOWN";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  IT_ADMIN: "IT Administrator",
  IT_USER: "IT User",
  VIEWER: "Viewer",
};

const roleDescriptions: Record<Role, string> = {
  ADMIN: "Full system administration, including users, settings, templates, budgets, audit logs, and PR workflows.",
  IT_ADMIN: "IT administration for PR operations, templates, master data, budgets, users, and running numbers.",
  IT_USER: "Daily PR document workflow: create drafts, issue PRs, print, upload signed files, cancel, and reissue.",
  VIEWER: "Read-only access to protected operational screens without document-control mutations.",
};

function searchValue(params: SearchParams | undefined, key: string) {
  const value = params?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseFormAuthProvider(value: unknown): Exclude<UserAuthProvider, "UNKNOWN"> {
  return textValue(value).toUpperCase() === "LDAP" ? "LDAP" : "LOCAL";
}

function parsePersistedAuthProvider(value: unknown): UserAuthProvider {
  if (value === "LOCAL" || value === "LDAP") return value;

  return "UNKNOWN";
}

function requiredText(value: unknown, label: string) {
  const text = textValue(value);

  if (!text) {
    throw new Error(`${label} is required`);
  }

  return text;
}

function nullableEmail(value: unknown) {
  const email = textValue(value);

  return email || null;
}

function parseRole(value: unknown): Role {
  const role = textValue(value);

  if (!isRole(role)) {
    throw new Error("Role is invalid");
  }

  return role;
}

function parsePassword(value: unknown) {
  const password = textValue(value);

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  return password;
}

function requiredUserId(value: unknown) {
  return requiredText(value, "User");
}

function verifiedLdapUsername(value: unknown) {
  try {
    return normalizeShortUsername(requiredText(value, "Verified username"));
  } catch {
    throw new Error("Verify AD user again before creating this account");
  }
}

async function createUserAudit(
  tx: Prisma.TransactionClient,
  {
    action,
    actorId,
    detail,
    metadata,
    userId,
  }: {
    action: string;
    actorId: string;
    detail: string;
    metadata?: Record<string, unknown>;
    userId: string;
  },
) {
  await tx.auditLog.create({
    data: {
      action,
      actorId,
      entityId: userId,
      entityType: "User",
      metadataJson: JSON.stringify({ detail, ...metadata }),
    },
  });
}

export function roleLabel(role: string) {
  return isRole(role) ? roleLabels[role] : "Viewer";
}

export function roleDescription(role: string) {
  return isRole(role) ? roleDescriptions[role] : roleDescriptions.VIEWER;
}

export function normalizeUserFilters(params: SearchParams | undefined): UserManagementFilters {
  const role = textValue(searchValue(params, "role"));
  const feedbackType = textValue(searchValue(params, "feedbackType"));

  return {
    createAuthProvider: parseFormAuthProvider(searchValue(params, "createAuthProvider")),
    createUser: searchValue(params, "createUser") === "1",
    editUserId: textValue(searchValue(params, "editUserId")),
    feedbackMessage: textValue(searchValue(params, "feedbackMessage")),
    feedbackType: feedbackType === "success" || feedbackType === "error" ? feedbackType : "",
    includeInactive: searchValue(params, "includeInactive") === "1",
    ldapVerifiedDisplayName: textValue(searchValue(params, "ldapVerifiedDisplayName")),
    ldapVerifiedEmail: textValue(searchValue(params, "ldapVerifiedEmail")),
    ldapVerifiedUsername: textValue(searchValue(params, "ldapVerifiedUsername")),
    q: textValue(searchValue(params, "q")),
    resetUserId: textValue(searchValue(params, "resetUserId")),
    role: isRole(role) ? role : "ALL",
  };
}

export function buildUserManagementHref(filters: Partial<UserManagementFilters>) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.role && filters.role !== "ALL") params.set("role", filters.role);
  if (filters.includeInactive) params.set("includeInactive", "1");
  if (filters.createUser) params.set("createUser", "1");
  if (filters.createAuthProvider && filters.createAuthProvider !== "LOCAL") params.set("createAuthProvider", filters.createAuthProvider);
  if (filters.editUserId) params.set("editUserId", filters.editUserId);
  if (filters.resetUserId) params.set("resetUserId", filters.resetUserId);
  if (filters.feedbackType) params.set("feedbackType", filters.feedbackType);
  if (filters.feedbackMessage) params.set("feedbackMessage", filters.feedbackMessage);
  if (filters.ldapVerifiedUsername) params.set("ldapVerifiedUsername", filters.ldapVerifiedUsername);
  if (filters.ldapVerifiedDisplayName) params.set("ldapVerifiedDisplayName", filters.ldapVerifiedDisplayName);
  if (filters.ldapVerifiedEmail) params.set("ldapVerifiedEmail", filters.ldapVerifiedEmail);

  const query = params.toString();

  return `/settings/users${query ? `?${query}` : ""}`;
}

export function readUserRedirectFilters(formData: FormData) {
  return normalizeUserFilters({
    createAuthProvider: String(formData.get("redirectCreateAuthProvider") || "LOCAL"),
    createUser: formData.get("redirectCreateUser") === "1" ? "1" : undefined,
    includeInactive: formData.get("includeInactive") === "1" ? "1" : undefined,
    ldapVerifiedDisplayName: String(formData.get("redirectLdapVerifiedDisplayName") || ""),
    ldapVerifiedEmail: String(formData.get("redirectLdapVerifiedEmail") || ""),
    ldapVerifiedUsername: String(formData.get("redirectLdapVerifiedUsername") || ""),
    q: String(formData.get("redirectQ") || ""),
    role: String(formData.get("redirectRole") || "ALL"),
  });
}

export function buildLocalUserCreateData(values: Partial<Record<string, unknown>>) {
  return {
    authProvider: "LOCAL" as const,
    displayName: requiredText(values.displayName, "Display name"),
    email: nullableEmail(values.email),
    isActive: true,
    password: parsePassword(values.password),
    role: parseRole(values.role),
    username: requiredText(values.username, "Username").toLowerCase(),
  };
}

export function buildLdapUserCreateData(values: Partial<Record<string, unknown>>) {
  const username = normalizeShortUsername(requiredText(values.username, "Username"));
  const verifiedUsername = verifiedLdapUsername(values.verifiedUsername);

  if (username !== verifiedUsername) {
    throw new Error("Verify AD user again before creating this account");
  }

  return {
    authProvider: "LDAP" as const,
    isActive: true,
    role: parseRole(values.role),
    username,
  };
}

export function buildUserUpdateData(values: Partial<Record<string, unknown>>) {
  return {
    displayName: requiredText(values.displayName, "Display name"),
    email: nullableEmail(values.email),
    isActive: values.isActive === "on" || values.isActive === "true" || values.isActive === true,
    role: parseRole(values.role),
  };
}

export function buildUserPasswordResetData(values: Partial<Record<string, unknown>>) {
  const password = parsePassword(values.password);
  const passwordConfirm = textValue(values.passwordConfirm);

  if (password !== passwordConfirm) {
    throw new Error("Password confirmation does not match");
  }

  return {
    password,
  };
}

export function validateUserSelfProtection({
  actorId,
  nextIsActive,
  nextRole,
  targetId,
  targetRole,
}: {
  actorId: string;
  nextIsActive: boolean;
  nextRole: Role;
  targetId: string;
  targetRole: Role;
}) {
  if (actorId !== targetId) return;

  if (!nextIsActive) {
    throw new Error("You cannot deactivate your own user");
  }

  if (nextRole !== targetRole) {
    throw new Error("You cannot change your own role");
  }
}

export function mapUserRecordToRow(record: UserRecord, currentUserId = "") {
  const authProvider = parsePersistedAuthProvider(record.authProvider);
  const role = isRole(record.role) ? record.role : "VIEWER";

  return {
    authProvider,
    createdAt: new Date(record.createdAt).toISOString(),
    displayName: record.displayName,
    email: record.email,
    externalUsername: record.externalUsername || null,
    id: record.id,
    isActive: record.isActive,
    isCurrentUser: record.id === currentUserId,
    providerLabel: authProvider === "LDAP" ? "AD/LDAP" : authProvider === "LOCAL" ? "Local" : "Unknown",
    role,
    roleLabel: roleLabel(role),
    status: record.isActive ? "Active" : "Inactive",
    updatedAt: new Date(record.updatedAt).toISOString(),
    username: record.username,
  };
}

export type UserManagementRow = ReturnType<typeof mapUserRecordToRow>;

export function canResetUserPassword(row: Pick<UserManagementRow, "authProvider">) {
  return row.authProvider === "LOCAL";
}

export async function getUserManagementPageData(params: SearchParams | undefined = {}) {
  const actor = await requirePermission("USER_MANAGE");

  const filters = normalizeUserFilters(params);
  const where: Prisma.UserWhereInput = {
    ...(filters.includeInactive ? {} : { isActive: true }),
    ...(filters.role !== "ALL" ? { role: filters.role } : {}),
    ...(filters.q
      ? {
          OR: [
            { username: { contains: filters.q } },
            { displayName: { contains: filters.q } },
            { email: { contains: filters.q } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { username: "asc" }],
    where,
  });
  const rows = users.map((user) => mapUserRecordToRow(user, actor.id));

  return {
    filters,
    roles: manageableRoles.map((role) => ({ id: role, label: roleLabel(role) })),
    rows,
    totals: {
      activeUsers: rows.filter((row) => row.isActive).length,
      adminUsers: rows.filter((row) => row.role === "ADMIN" || row.role === "IT_ADMIN").length,
      inactiveUsers: rows.filter((row) => !row.isActive).length,
      rowCount: rows.length,
    },
  };
}

export async function createUserFromFormData(formData: FormData) {
  const provider = parseFormAuthProvider(formData.get("authProvider"));

  return provider === "LDAP" ? createLdapUserFromFormData(formData) : createLocalUserFromFormData(formData);
}

export async function createLocalUserFromFormData(formData: FormData) {
  const actor = await requirePermission("USER_MANAGE");
  const data = buildLocalUserCreateData({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    username: formData.get("username"),
  });
  const passwordHash = await hashPassword(data.password);

  return prisma.$transaction(async (tx) => {
    const existingUsername = await tx.user.findUnique({ select: { id: true }, where: { username: data.username } });
    if (existingUsername) {
      throw new Error(`Username ${data.username} already exists`);
    }

    if (data.email) {
      const existingEmail = await tx.user.findUnique({ select: { id: true }, where: { email: data.email } });
      if (existingEmail) {
        throw new Error(`Email ${data.email} already exists`);
      }
    }

    const created = await tx.user.create({
      data: {
        authProvider: data.authProvider,
        displayName: data.displayName,
        email: data.email,
        isActive: data.isActive,
        passwordHash,
        role: data.role,
        username: data.username,
      },
    });

    await createUserAudit(tx, {
      action: "User created",
      actorId: actor.id,
      detail: `Created user ${created.username}`,
      metadata: { authProvider: data.authProvider, role: created.role, username: created.username },
      userId: created.id,
    });

    return created;
  });
}

export async function createLdapUserFromFormData(formData: FormData) {
  const actor = await requirePermission("USER_MANAGE");
  const data = buildLdapUserCreateData({
    role: formData.get("role"),
    username: formData.get("username"),
    verifiedUsername: formData.get("verifiedUsername"),
  });

  const existingUsername = await prisma.user.findUnique({ select: { id: true }, where: { username: data.username } });
  if (existingUsername) throw new Error(`Username ${data.username} already exists`);

  const profile = await findLdapUser(data.username, parseLdapConfig());

  return prisma.$transaction(async (tx) => {
    const existingUsername = await tx.user.findUnique({ select: { id: true }, where: { username: data.username } });
    if (existingUsername) throw new Error(`Username ${data.username} already exists`);

    const existingExternalId = await tx.user.findFirst({ select: { id: true }, where: { externalId: profile.externalId } });
    if (existingExternalId) throw new Error("LDAP identity already exists");

    if (profile.email) {
      const existingEmail = await tx.user.findUnique({ select: { id: true }, where: { email: profile.email } });
      if (existingEmail) throw new Error(`Email ${profile.email} already exists`);
    }

    const created = await tx.user.create({
      data: {
        authProvider: "LDAP",
        displayName: profile.displayName,
        email: profile.email,
        externalId: profile.externalId,
        externalUsername: profile.username,
        isActive: data.isActive,
        passwordHash: null,
        role: data.role,
        username: data.username,
      },
    });

    await createUserAudit(tx, {
      action: "LDAP user created",
      actorId: actor.id,
      detail: `Created LDAP user ${created.username}`,
      metadata: { authProvider: "LDAP", role: created.role, username: created.username },
      userId: created.id,
    });

    return created;
  });
}

export async function updateUserFromFormData(formData: FormData) {
  const actor = await requirePermission("USER_MANAGE");
  const userId = requiredUserId(formData.get("userId"));
  const data = buildUserUpdateData({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    isActive: formData.get("isActive"),
    role: formData.get("role"),
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id: userId } });

    if (!existing) {
      throw new Error("User not found");
    }

    const targetRole = isRole(existing.role) ? existing.role : "VIEWER";
    validateUserSelfProtection({
      actorId: actor.id,
      nextIsActive: data.isActive,
      nextRole: data.role,
      targetId: userId,
      targetRole,
    });

    if (data.email) {
      const existingEmail = await tx.user.findUnique({ select: { id: true }, where: { email: data.email } });
      if (existingEmail && existingEmail.id !== userId) {
        throw new Error(`Email ${data.email} already exists`);
      }
    }

    const updated = await tx.user.update({
      data,
      where: { id: userId },
    });

    await createUserAudit(tx, {
      action: "User updated",
      actorId: actor.id,
      detail: `Updated user ${updated.username}`,
      metadata: {
        displayName: updated.displayName,
        email: updated.email,
        isActive: updated.isActive,
        role: updated.role,
        username: updated.username,
      },
      userId,
    });

    return updated;
  });
}

export async function resetUserPasswordFromFormData(formData: FormData) {
  const actor = await requirePermission("USER_MANAGE");
  const userId = requiredUserId(formData.get("userId"));
  const data = buildUserPasswordResetData({ password: formData.get("password"), passwordConfirm: formData.get("passwordConfirm") });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ select: { authProvider: true, id: true, username: true }, where: { id: userId } });

    if (!existing) {
      throw new Error("User not found");
    }

    if (existing.authProvider === "LDAP") {
      throw new Error("LDAP user passwords are managed by AD");
    }

    if (existing.authProvider !== "LOCAL") {
      throw new Error("Password reset is unavailable for this provider.");
    }

    const passwordHash = await hashPassword(data.password);
    const updated = await tx.user.update({
      data: { passwordHash },
      where: { id: userId },
    });

    await createUserAudit(tx, {
      action: "User password reset",
      actorId: actor.id,
      detail: `Reset password for user ${existing.username}`,
      metadata: { username: existing.username },
      userId,
    });

    return updated;
  });
}

export async function verifyLdapUserForAdmin(usernameInput: unknown) {
  await requirePermission("USER_MANAGE");
  const username = normalizeShortUsername(requiredText(usernameInput, "Username"));
  return findLdapUser(username, parseLdapConfig());
}
