import { prisma } from "../prisma";
import { parseLdapConfig, type AuthMode } from "./ldap-config";
import { findLdapUser, verifyLdapUserPassword } from "./ldap-provider";
import { normalizeShortUsername } from "./ldap-utils";
import { verifyLocalCredentials } from "./local-provider";
import { normalizeRole, type AuthenticatedUser } from "./permissions";

export type AuthProvider = "LOCAL" | "LDAP";

export type CredentialUserRecord = {
  authProvider: string;
  displayName: string;
  email: string | null;
  externalId: string | null;
  externalUsername: string | null;
  id: string;
  isActive: boolean;
  passwordHash: string | null;
  role: string;
  username: string;
};

type Credentials = {
  username: string;
  password: string;
};

type Dependencies = {
  authMode: AuthMode;
  findUserByUsername(username: string): Promise<CredentialUserRecord | null>;
  markLastLogin(userId: string): Promise<void>;
  verifyLdapUser(user: CredentialUserRecord, password: string): Promise<boolean>;
};

function providerOf(value: string): AuthProvider | null {
  if (value === "LOCAL" || value === "LDAP") return value;
  return null;
}

function modeAllowsProvider(mode: AuthMode, provider: AuthProvider) {
  return mode === "HYBRID" || mode === provider;
}

function toAuthenticatedUser(user: CredentialUserRecord): AuthenticatedUser {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    role: normalizeRole(user.role),
    username: user.username,
  };
}

export async function verifyApplicationCredentials(credentials: Credentials, dependencies: Dependencies): Promise<AuthenticatedUser | null> {
  let username = "";

  try {
    username = normalizeShortUsername(credentials.username);
  } catch {
    return null;
  }

  if (!credentials.password) return null;

  const user = await dependencies.findUserByUsername(username);
  if (!user || !user.isActive) return null;

  const provider = providerOf(user.authProvider);
  if (!provider) return null;
  if (!modeAllowsProvider(dependencies.authMode, provider)) return null;

  try {
    if (provider === "LOCAL") {
      const localUser = await verifyLocalCredentials(credentials, {
        findUserByUsername: async () => user,
      });
      if (!localUser) return null;
    } else {
      if (!user.externalUsername || !user.externalId) return null;

      const valid = await dependencies.verifyLdapUser(user, credentials.password);
      if (!valid) return null;
    }
  } catch {
    return null;
  }

  await dependencies.markLastLogin(user.id);
  return toAuthenticatedUser(user);
}

export async function verifySqlServerCredentials(credentials: Credentials) {
  const config = parseLdapConfig();

  return verifyApplicationCredentials(credentials, {
    authMode: config.authMode,
    findUserByUsername: (username) => prisma.user.findUnique({ where: { username } }),
    markLastLogin: async (userId) => {
      await prisma.user.update({ data: { lastLoginAt: new Date() }, where: { id: userId } });
    },
    verifyLdapUser: async (user, password) => {
      if (!config.enabled || !user.externalUsername || !user.externalId) return false;
      const profile = await findLdapUser(user.externalUsername, config);
      if (profile.externalId !== user.externalId) return false;
      return verifyLdapUserPassword(profile.dn, password, config);
    },
  });
}
