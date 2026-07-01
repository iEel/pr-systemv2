import crypto from "node:crypto";
import { promisify } from "node:util";
import { normalizeRole, type AuthenticatedUser } from "./permissions";
import { prisma } from "../prisma";

const scrypt = promisify(crypto.scrypt);
const passwordKeyLength = 64;
const passwordHashPrefix = "scrypt";

type LocalUserRecord = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  passwordHash: string | null;
  role: string;
  isActive: boolean;
};

type Credentials = {
  username: string;
  password: string;
};

type LocalCredentialDependencies = {
  findUserByUsername(username: string): Promise<LocalUserRecord | null>;
};

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, passwordKeyLength)) as Buffer;

  return `${passwordHashPrefix}$1$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [prefix, version, salt, hash] = storedHash.split("$");

  if (prefix !== passwordHashPrefix || version !== "1" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function verifyLocalCredentials(credentials: Credentials, dependencies: LocalCredentialDependencies): Promise<AuthenticatedUser | null> {
  const username = credentials.username.trim();
  const password = credentials.password;

  if (!username || !password) {
    return null;
  }

  const user = await dependencies.findUserByUsername(username);

  if (!user || !user.isActive) {
    return null;
  }

  if (!user.passwordHash) {
    return null;
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return null;
  }

  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    role: normalizeRole(user.role),
    username: user.username,
  };
}

export async function verifySqlServerCredentials(credentials: Credentials) {
  return verifyLocalCredentials(credentials, {
    findUserByUsername: (username) =>
      prisma.user.findUnique({
        where: { username },
      }),
  });
}
