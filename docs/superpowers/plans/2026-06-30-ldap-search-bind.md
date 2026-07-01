# LDAP Search + Bind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AD/LDAP Search + Bind login for allowlisted IT users while keeping SQL Server `User.role` as the authoritative RBAC source.

**Architecture:** Keep Auth.js Credentials as the single browser-facing login provider, but replace the current local-only verifier with a hybrid credential verifier. Local users validate against SQL Server password hashes; LDAP users validate by service-account search plus DN password bind, then receive the SQL Server role from the allowlisted `User` row.

**Tech Stack:** Next.js App Router, Auth.js Credentials, Prisma SQL Server, `ldapts`, Vitest, TypeScript.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add `ldapts`.
- Modify `prisma/schema.prisma`: add user auth provider metadata and make `passwordHash` nullable.
- Create `prisma/migrations/000006_user_auth_provider/migration.sql`: SQL Server migration for provider metadata, nullable local password hash, and a filtered unique index for LDAP external identity.
- Modify `.env.example`: add LDAP/Auth mode keys without secrets.
- Create `lib/auth/ldap-config.ts`: parse LDAP environment variables and expose a typed config.
- Create `lib/auth/ldap-utils.ts`: normalize short usernames, escape LDAP filters, and convert LDAP attribute values.
- Create `lib/auth/ldap-provider.ts`: wrap `ldapts` Search + Bind behind injectable helpers.
- Create `lib/auth/credentials-provider.ts`: choose local or LDAP verification based on SQL `User.authProvider`.
- Modify `lib/auth/local-provider.ts`: support nullable `passwordHash` and keep hashing local passwords.
- Modify `auth.ts`: call the hybrid credential verifier.
- Modify `lib/user-management.ts`: support Local and LDAP user creation, LDAP verification, provider badges, duplicate external identity checks, and reset protection.
- Modify `app/settings/users/actions.ts`: add LDAP verify action and route user creation through provider-aware helper.
- Modify `app/settings/users/page.tsx`: add Local/LDAP New User tabs, provider badges, LDAP verify state, and hide password reset for LDAP users.
- Modify `prisma/seed.mjs`: seed local admin with `authProvider='LOCAL'`.
- Add or modify tests under `tests/`: cover utilities, LDAP provider, hybrid credentials, user management, page source, env docs, and migration source.
- Modify docs after implementation: `DEVELOPER_HANDOFF.md`, `docs/ADMIN_SETTINGS.md`, `docs/DATA_MODEL.md`, `docs/FEATURES.md`, `docs/QA_CHECKLIST.md`.

---

### Task 1: Dependency, Prisma Schema, Migration, Env

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/000006_user_auth_provider/migration.sql`
- Modify: `.env.example`
- Test: `tests/ldap-schema-env.test.ts`

- [ ] **Step 1: Install the LDAP package**

Run:

```powershell
npm install ldapts
```

Expected: `package.json` contains `ldapts`, and `package-lock.json` is updated.

- [ ] **Step 2: Write the schema/env regression test**

Create `tests/ldap-schema-env.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("LDAP schema and environment setup", () => {
  test("User model stores local and LDAP auth metadata", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    expect(schema).toContain("passwordHash String?  @db.NVarChar(255)");
    expect(schema).toContain('authProvider String   @default("LOCAL") @db.NVarChar(20)');
    expect(schema).toContain("externalUsername String?  @db.NVarChar(160)");
    expect(schema).toContain("externalId String?  @db.NVarChar(160)");
    expect(schema).toContain("lastLoginAt DateTime?");
    expect(schema).toContain("@@index([externalId])");
  });

  test("migration adds provider metadata and filtered external id uniqueness", () => {
    const migration = readFileSync("prisma/migrations/000006_user_auth_provider/migration.sql", "utf8");

    expect(migration).toContain("[authProvider] NVARCHAR(20) NOT NULL");
    expect(migration).toContain("[passwordHash] NVARCHAR(255) NULL");
    expect(migration).toContain("[externalUsername] NVARCHAR(160)");
    expect(migration).toContain("[externalId] NVARCHAR(160)");
    expect(migration).toContain("[lastLoginAt] DATETIME2");
    expect(migration).toContain("WHERE [externalId] IS NOT NULL");
  });

  test("example environment documents LDAP Search + Bind settings without secrets", () => {
    const env = readFileSync(".env.example", "utf8");

    expect(env).toContain("AUTH_MODE=HYBRID");
    expect(env).toContain("LDAP_ENABLED=false");
    expect(env).toContain("LDAP_URL=");
    expect(env).toContain("LDAP_BIND_DN=");
    expect(env).toContain("LDAP_BIND_PASSWORD=CHANGE_ME");
    expect(env).toContain("LDAP_BASE_DN=");
    expect(env).toContain("LDAP_USER_FILTER=(sAMAccountName={{username}})");
    expect(env).toContain("LDAP_ID_ATTRIBUTE=objectGUID");
  });
});
```

- [ ] **Step 3: Run the focused test to confirm it fails**

Run:

```powershell
npm test -- tests/ldap-schema-env.test.ts
```

Expected: FAIL because schema, migration, and env keys are not present yet.

- [ ] **Step 4: Update Prisma schema**

Change `model User` in `prisma/schema.prisma` to:

```prisma
model User {
  id               String   @id @default(cuid()) @db.NVarChar(30)
  username         String   @unique @db.NVarChar(80)
  displayName      String   @db.NVarChar(160)
  email            String?  @unique @db.NVarChar(220)
  passwordHash     String?  @db.NVarChar(255)
  authProvider     String   @default("LOCAL") @db.NVarChar(20)
  externalUsername String?  @db.NVarChar(160)
  externalId       String?  @db.NVarChar(160)
  lastLoginAt      DateTime?
  role             String   @default("IT_USER") @db.NVarChar(40)
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  createdPurchaseRequests PurchaseRequest[]       @relation("PurchaseRequestCreator")
  uploadedAttachments     PurchaseRequestAttachment[]
  createdTemplates        DocumentTemplate[]
  auditLogs               AuditLog[]

  @@index([externalId])
}
```

- [ ] **Step 5: Add SQL Server migration**

Create `prisma/migrations/000006_user_auth_provider/migration.sql`:

```sql
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[User] ADD [authProvider] NVARCHAR(20) NOT NULL CONSTRAINT [User_authProvider_df] DEFAULT 'LOCAL';
ALTER TABLE [dbo].[User] ADD [externalUsername] NVARCHAR(160);
ALTER TABLE [dbo].[User] ADD [externalId] NVARCHAR(160);
ALTER TABLE [dbo].[User] ADD [lastLoginAt] DATETIME2;
ALTER TABLE [dbo].[User] ALTER COLUMN [passwordHash] NVARCHAR(255) NULL;

CREATE INDEX [User_externalId_idx] ON [dbo].[User]([externalId]);
CREATE UNIQUE NONCLUSTERED INDEX [User_externalId_not_null_key] ON [dbo].[User]([externalId]) WHERE [externalId] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
```

- [ ] **Step 6: Update `.env.example`**

Append:

```env

# Authentication mode: LOCAL, LDAP, or HYBRID
AUTH_MODE=HYBRID

# AD/LDAP Search + Bind. Keep real values in .env only.
LDAP_ENABLED=false
LDAP_URL=
LDAP_BIND_DN=
LDAP_BIND_PASSWORD=CHANGE_ME
LDAP_BASE_DN=
LDAP_USER_FILTER=(sAMAccountName={{username}})
LDAP_ID_ATTRIBUTE=objectGUID
LDAP_DISPLAY_NAME_ATTRIBUTE=displayName
LDAP_EMAIL_ATTRIBUTE=mail
LDAP_TLS_REJECT_UNAUTHORIZED=true
```

- [ ] **Step 7: Run the focused test and Prisma validation**

Run:

```powershell
npm test -- tests/ldap-schema-env.test.ts
npx prisma validate
```

Expected: PASS for the test; Prisma schema validates.

---

### Task 2: LDAP Config And Utilities

**Files:**
- Create: `lib/auth/ldap-config.ts`
- Create: `lib/auth/ldap-utils.ts`
- Test: `tests/ldap-utils.test.ts`

- [ ] **Step 1: Write utility tests**

Create `tests/ldap-utils.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { escapeLdapFilterValue, normalizeShortUsername, valueToStableString } from "../lib/auth/ldap-utils";
import { parseLdapConfig } from "../lib/auth/ldap-config";

describe("LDAP utilities", () => {
  test("normalizes allowed short usernames", () => {
    expect(normalizeShortUsername(" Somchai.S ")).toBe("somchai.s");
    expect(normalizeShortUsername("it-user_01")).toBe("it-user_01");
  });

  test("rejects email, domain, spaces, and LDAP filter characters", () => {
    expect(() => normalizeShortUsername("somchai.s@example.local")).toThrow("Short username is required");
    expect(() => normalizeShortUsername("DOMAIN\\somchai.s")).toThrow("Short username is required");
    expect(() => normalizeShortUsername("somchai s")).toThrow("Short username is required");
    expect(() => normalizeShortUsername("somchai*")).toThrow("Short username is required");
  });

  test("escapes LDAP filter values using RFC4515 replacements", () => {
    expect(escapeLdapFilterValue("a*b(c)d\\e\u0000")).toBe("a\\2ab\\28c\\29d\\5ce\\00");
  });

  test("converts binary LDAP identifiers to stable strings", () => {
    expect(valueToStableString(Buffer.from([0xde, 0xad, 0xbe, 0xef]))).toBe("deadbeef");
    expect(valueToStableString("abc")).toBe("abc");
    expect(valueToStableString(["abc"])).toBe("abc");
    expect(valueToStableString(undefined)).toBe("");
  });

  test("parses LDAP config from environment", () => {
    expect(
      parseLdapConfig({
        AUTH_MODE: "HYBRID",
        LDAP_BASE_DN: "DC=example,DC=local",
        LDAP_BIND_DN: "CN=ldap-reader,DC=example,DC=local",
        LDAP_BIND_PASSWORD: "secret",
        LDAP_ENABLED: "true",
        LDAP_URL: "ldap://example.local:389",
      }),
    ).toMatchObject({
      authMode: "HYBRID",
      baseDn: "DC=example,DC=local",
      bindDn: "CN=ldap-reader,DC=example,DC=local",
      enabled: true,
      url: "ldap://example.local:389",
      userFilter: "(sAMAccountName={{username}})",
    });
  });
});
```

- [ ] **Step 2: Run utility tests to confirm they fail**

Run:

```powershell
npm test -- tests/ldap-utils.test.ts
```

Expected: FAIL because `ldap-config.ts` and `ldap-utils.ts` do not exist.

- [ ] **Step 3: Implement config parser**

Create `lib/auth/ldap-config.ts`:

```ts
export type AuthMode = "LOCAL" | "LDAP" | "HYBRID";

export type LdapConfig = {
  authMode: AuthMode;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  displayNameAttribute: string;
  emailAttribute: string;
  enabled: boolean;
  idAttribute: string;
  tlsRejectUnauthorized: boolean;
  url: string;
  userFilter: string;
};

function normalizeAuthMode(value: string | undefined): AuthMode {
  const mode = String(value || "HYBRID").trim().toUpperCase();
  return mode === "LOCAL" || mode === "LDAP" || mode === "HYBRID" ? mode : "HYBRID";
}

function boolValue(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

export function parseLdapConfig(env: NodeJS.ProcessEnv = process.env): LdapConfig {
  return {
    authMode: normalizeAuthMode(env.AUTH_MODE),
    baseDn: String(env.LDAP_BASE_DN || ""),
    bindDn: String(env.LDAP_BIND_DN || ""),
    bindPassword: String(env.LDAP_BIND_PASSWORD || ""),
    displayNameAttribute: String(env.LDAP_DISPLAY_NAME_ATTRIBUTE || "displayName"),
    emailAttribute: String(env.LDAP_EMAIL_ATTRIBUTE || "mail"),
    enabled: boolValue(env.LDAP_ENABLED, false),
    idAttribute: String(env.LDAP_ID_ATTRIBUTE || "objectGUID"),
    tlsRejectUnauthorized: boolValue(env.LDAP_TLS_REJECT_UNAUTHORIZED, true),
    url: String(env.LDAP_URL || ""),
    userFilter: String(env.LDAP_USER_FILTER || "(sAMAccountName={{username}})"),
  };
}

export function assertLdapConfigReady(config: LdapConfig) {
  const missing = [
    ["LDAP_URL", config.url],
    ["LDAP_BIND_DN", config.bindDn],
    ["LDAP_BIND_PASSWORD", config.bindPassword],
    ["LDAP_BASE_DN", config.baseDn],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`LDAP configuration is missing: ${missing.map(([key]) => key).join(", ")}`);
  }
}
```

- [ ] **Step 4: Implement LDAP utility functions**

Create `lib/auth/ldap-utils.ts`:

```ts
export function normalizeShortUsername(value: string) {
  const username = value.trim().toLowerCase();

  if (!/^[a-z0-9._-]{2,80}$/.test(username)) {
    throw new Error("Short username is required");
  }

  return username;
}

export function tryNormalizeShortUsername(value: string) {
  try {
    return normalizeShortUsername(value);
  } catch {
    return "";
  }
}

export function escapeLdapFilterValue(value: string) {
  return value.replace(/[\0()*\\]/g, (char) => {
    if (char === "\0") return "\\00";
    if (char === "(") return "\\28";
    if (char === ")") return "\\29";
    if (char === "*") return "\\2a";
    return "\\5c";
  });
}

export function valueToStableString(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;

  if (Buffer.isBuffer(first)) return first.toString("hex");
  if (typeof first === "string") return first;
  if (first === null || first === undefined) return "";

  return String(first);
}
```

- [ ] **Step 5: Run utility tests**

Run:

```powershell
npm test -- tests/ldap-utils.test.ts
```

Expected: PASS.

---

### Task 3: LDAP Search + Bind Provider

**Files:**
- Create: `lib/auth/ldap-provider.ts`
- Test: `tests/ldap-provider.test.ts`

- [ ] **Step 1: Write LDAP provider tests with an injectable client**

Create `tests/ldap-provider.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { findLdapUser, verifyLdapUserPassword, type LdapClientLike } from "../lib/auth/ldap-provider";
import type { LdapConfig } from "../lib/auth/ldap-config";

const config: LdapConfig = {
  authMode: "HYBRID",
  baseDn: "DC=example,DC=local",
  bindDn: "CN=ldap-reader,DC=example,DC=local",
  bindPassword: "service-secret",
  displayNameAttribute: "displayName",
  emailAttribute: "mail",
  enabled: true,
  idAttribute: "objectGUID",
  tlsRejectUnauthorized: true,
  url: "ldap://example.local:389",
  userFilter: "(sAMAccountName={{username}})",
};

function fakeClient(entries: Record<string, unknown>[], bindCalls: string[] = []): LdapClientLike {
  return {
    async bind(dn, password) {
      bindCalls.push(`${dn}:${password}`);
    },
    async search(baseDn, options) {
      return { searchEntries: entries, baseDn, options };
    },
    async unbind() {},
  };
}

describe("LDAP Search + Bind provider", () => {
  test("finds one LDAP user by short username", async () => {
    const bindCalls: string[] = [];
    const result = await findLdapUser("somchai.s", config, () =>
      fakeClient(
        [
          {
            dn: "CN=Somchai S,OU=IT,DC=example,DC=local",
            displayName: "Somchai S.",
            mail: "somchai.s@example.local",
            objectGUID: Buffer.from([1, 2, 3, 4]),
            sAMAccountName: "somchai.s",
          },
        ],
        bindCalls,
      ),
    );

    expect(bindCalls).toEqual(["CN=ldap-reader,DC=example,DC=local:service-secret"]);
    expect(result).toEqual({
      displayName: "Somchai S.",
      dn: "CN=Somchai S,OU=IT,DC=example,DC=local",
      email: "somchai.s@example.local",
      externalId: "01020304",
      username: "somchai.s",
    });
  });

  test("rejects missing and ambiguous LDAP search results", async () => {
    await expect(findLdapUser("missing.u", config, () => fakeClient([]))).rejects.toThrow("LDAP user not found");
    await expect(findLdapUser("dup.u", config, () => fakeClient([{ dn: "one" }, { dn: "two" }]))).rejects.toThrow("LDAP search returned multiple users");
  });

  test("binds as the found DN with the submitted password", async () => {
    const bindCalls: string[] = [];
    const ok = await verifyLdapUserPassword("CN=Somchai S,DC=example,DC=local", "ad-password", config, () => fakeClient([], bindCalls));

    expect(ok).toBe(true);
    expect(bindCalls).toEqual(["CN=Somchai S,DC=example,DC=local:ad-password"]);
  });
});
```

- [ ] **Step 2: Run LDAP provider tests to confirm they fail**

Run:

```powershell
npm test -- tests/ldap-provider.test.ts
```

Expected: FAIL because `ldap-provider.ts` does not exist.

- [ ] **Step 3: Implement the provider wrapper**

Create `lib/auth/ldap-provider.ts`:

```ts
import { Client, type SearchOptions } from "ldapts";
import { assertLdapConfigReady, type LdapConfig } from "./ldap-config";
import { escapeLdapFilterValue, normalizeShortUsername, valueToStableString } from "./ldap-utils";

export type LdapClientLike = {
  bind(dn: string, password: string): Promise<void>;
  search(baseDn: string, options: SearchOptions): Promise<{ searchEntries: Record<string, unknown>[] }>;
  unbind(): Promise<void>;
};

export type LdapUserProfile = {
  displayName: string;
  dn: string;
  email: string | null;
  externalId: string;
  username: string;
};

export function createLdapClient(config: LdapConfig): LdapClientLike {
  return new Client({
    tlsOptions: { rejectUnauthorized: config.tlsRejectUnauthorized },
    url: config.url,
  });
}

export async function findLdapUser(
  usernameInput: string,
  config: LdapConfig,
  clientFactory: (config: LdapConfig) => LdapClientLike = createLdapClient,
): Promise<LdapUserProfile> {
  assertLdapConfigReady(config);

  const username = normalizeShortUsername(usernameInput);
  const client = clientFactory(config);
  const filter = config.userFilter.replace("{{username}}", escapeLdapFilterValue(username));

  try {
    await client.bind(config.bindDn, config.bindPassword);
    const result = await client.search(config.baseDn, {
      attributes: ["dn", "sAMAccountName", config.idAttribute, config.displayNameAttribute, config.emailAttribute],
      filter,
      scope: "sub",
      sizeLimit: 2,
    });

    if (result.searchEntries.length === 0) {
      throw new Error("LDAP user not found");
    }

    if (result.searchEntries.length > 1) {
      throw new Error("LDAP search returned multiple users");
    }

    const entry = result.searchEntries[0];
    const dn = valueToStableString(entry.dn);
    const externalId = valueToStableString(entry[config.idAttribute]);

    if (!dn || !externalId) {
      throw new Error("LDAP user result is missing DN or external identity");
    }

    return {
      displayName: valueToStableString(entry[config.displayNameAttribute]) || username,
      dn,
      email: valueToStableString(entry[config.emailAttribute]) || null,
      externalId,
      username,
    };
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export async function verifyLdapUserPassword(
  dn: string,
  password: string,
  config: LdapConfig,
  clientFactory: (config: LdapConfig) => LdapClientLike = createLdapClient,
) {
  assertLdapConfigReady(config);

  if (!password) return false;

  const client = clientFactory(config);

  try {
    await client.bind(dn, password);
    return true;
  } catch {
    return false;
  } finally {
    await client.unbind().catch(() => undefined);
  }
}
```

- [ ] **Step 4: Run LDAP provider tests**

Run:

```powershell
npm test -- tests/ldap-provider.test.ts
```

Expected: PASS.

---

### Task 4: Hybrid Credentials Provider

**Files:**
- Modify: `lib/auth/local-provider.ts`
- Create: `lib/auth/credentials-provider.ts`
- Modify: `auth.ts`
- Test: `tests/auth-credentials-provider.test.ts`
- Modify: `tests/auth-local-provider.test.ts`

- [ ] **Step 1: Write hybrid credential tests**

Create `tests/auth-credentials-provider.test.ts`:

```ts
import { describe, expect, test } from "vitest";
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
});
```

- [ ] **Step 2: Update local provider tests for nullable password hash**

In `tests/auth-local-provider.test.ts`, add:

```ts
  test("rejects local users without a password hash", async () => {
    const result = await verifyLocalCredentials(
      { username: "admin", password: "secret" },
      {
        findUserByUsername: async () => ({
          displayName: "Admin User",
          email: "admin@example.local",
          id: "user_admin",
          isActive: true,
          passwordHash: null,
          role: "ADMIN",
          username: "admin",
        }),
      },
    );

    expect(result).toBeNull();
  });
```

- [ ] **Step 3: Run auth tests to confirm they fail**

Run:

```powershell
npm test -- tests/auth-credentials-provider.test.ts tests/auth-local-provider.test.ts
```

Expected: FAIL because hybrid verifier is missing and local type does not accept nullable hash yet.

- [ ] **Step 4: Update `lib/auth/local-provider.ts`**

Change the user type and guard:

```ts
type LocalUserRecord = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  passwordHash: string | null;
  role: string;
  isActive: boolean;
};
```

Add before password verification:

```ts
  if (!user.passwordHash) {
    return null;
  }
```

- [ ] **Step 5: Create hybrid credential verifier**

Create `lib/auth/credentials-provider.ts`:

```ts
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

function providerOf(value: string): AuthProvider {
  return value === "LDAP" ? "LDAP" : "LOCAL";
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
  if (!modeAllowsProvider(dependencies.authMode, provider)) return null;

  if (provider === "LOCAL") {
    const localUser = await verifyLocalCredentials(credentials, {
      findUserByUsername: async () => user,
    });
    if (!localUser) return null;
  } else {
    const valid = await dependencies.verifyLdapUser(user, credentials.password);
    if (!valid) return null;
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
      if (!config.enabled || !user.externalUsername) return false;
      const profile = await findLdapUser(user.externalUsername, config);
      if (user.externalId && profile.externalId !== user.externalId) return false;
      return verifyLdapUserPassword(profile.dn, password, config);
    },
  });
}
```

- [ ] **Step 6: Update `auth.ts` import**

Change:

```ts
import { verifySqlServerCredentials } from "./lib/auth/local-provider";
```

to:

```ts
import { verifySqlServerCredentials } from "./lib/auth/credentials-provider";
```

- [ ] **Step 7: Run auth tests**

Run:

```powershell
npm test -- tests/auth-credentials-provider.test.ts tests/auth-local-provider.test.ts
```

Expected: PASS.

---

### Task 5: Provider-Aware User Management Helpers

**Files:**
- Modify: `lib/user-management.ts`
- Test: `tests/user-management.test.ts`
- Create: `tests/user-management-ldap.test.ts`

- [ ] **Step 1: Add helper tests for LDAP create/reset rules**

Create `tests/user-management-ldap.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  buildLdapUserCreateData,
  buildLocalUserCreateData,
  canResetUserPassword,
  mapUserRecordToRow,
} from "../lib/user-management";

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
      }),
    ).toEqual({
      authProvider: "LDAP",
      isActive: true,
      role: "IT_USER",
      username: "somchai.s",
    });
  });

  test("rejects LDAP create usernames that are not short usernames", () => {
    expect(() => buildLdapUserCreateData({ role: "IT_USER", username: "somchai.s@example.local" })).toThrow("Short username is required");
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
});
```

- [ ] **Step 2: Update existing helper test imports**

In `tests/user-management.test.ts`, replace `buildUserCreateData` import and assertions with `buildLocalUserCreateData`. Keep expected output the same plus `authProvider: "LOCAL"`.

Expected local create assertion:

```ts
    ).toEqual({
      authProvider: "LOCAL",
      displayName: "Admin User",
      email: "admin@example.local",
      isActive: true,
      password: "admin123",
      role: "ADMIN",
      username: "admin",
    });
```

- [ ] **Step 3: Run user helper tests to confirm they fail**

Run:

```powershell
npm test -- tests/user-management.test.ts tests/user-management-ldap.test.ts
```

Expected: FAIL because new functions and row fields do not exist.

- [ ] **Step 4: Update user record and row mapping types**

In `lib/user-management.ts`, extend `UserRecord`:

```ts
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
```

Add helpers:

```ts
export type UserAuthProvider = "LOCAL" | "LDAP";

function parseAuthProvider(value: unknown): UserAuthProvider {
  return textValue(value).toUpperCase() === "LDAP" ? "LDAP" : "LOCAL";
}

export function canResetUserPassword(row: Pick<UserManagementRow, "authProvider">) {
  return row.authProvider === "LOCAL";
}
```

Update `mapUserRecordToRow` to include:

```ts
    authProvider: parseAuthProvider(record.authProvider),
    externalUsername: record.externalUsername || null,
    providerLabel: parseAuthProvider(record.authProvider) === "LDAP" ? "AD/LDAP" : "Local",
```

- [ ] **Step 5: Split local and LDAP create data builders**

Replace `buildUserCreateData` with:

```ts
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
  return {
    authProvider: "LDAP" as const,
    isActive: true,
    role: parseRole(values.role),
    username: normalizeShortUsername(requiredText(values.username, "Username")),
  };
}
```

Import `normalizeShortUsername`, `findLdapUser`, and `parseLdapConfig`.

- [ ] **Step 6: Update create/reset operations**

Update `createUserFromFormData` to branch on `authProvider`:

```ts
export async function createUserFromFormData(formData: FormData) {
  const provider = parseAuthProvider(formData.get("authProvider"));

  return provider === "LDAP" ? createLdapUserFromFormData(formData) : createLocalUserFromFormData(formData);
}
```

Add `createLocalUserFromFormData` by moving the current create logic and setting `authProvider: "LOCAL"`.

Add `createLdapUserFromFormData`:

```ts
export async function createLdapUserFromFormData(formData: FormData) {
  const actor = await requirePermission("USER_MANAGE");
  const data = buildLdapUserCreateData({
    role: formData.get("role"),
    username: formData.get("username"),
  });
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
```

In `resetUserPasswordFromFormData`, fetch `authProvider` and reject LDAP users:

```ts
    const existing = await tx.user.findUnique({ select: { authProvider: true, id: true, username: true }, where: { id: userId } });
    if (!existing) throw new Error("User not found");
    if (existing.authProvider === "LDAP") throw new Error("LDAP user passwords are managed by AD");
```

- [ ] **Step 7: Add LDAP verification helper for the admin action**

Add:

```ts
export async function verifyLdapUserForAdmin(usernameInput: unknown) {
  await requirePermission("USER_MANAGE");
  const username = normalizeShortUsername(requiredText(usernameInput, "Username"));
  return findLdapUser(username, parseLdapConfig());
}
```

- [ ] **Step 8: Run user helper tests**

Run:

```powershell
npm test -- tests/user-management.test.ts tests/user-management-ldap.test.ts
```

Expected: PASS.

---

### Task 6: Users / Roles Actions And UI

**Files:**
- Modify: `app/settings/users/actions.ts`
- Modify: `app/settings/users/page.tsx`
- Modify: `lib/user-management.ts`
- Test: `tests/admin-settings-page-copy.test.ts`

- [ ] **Step 1: Update page source tests**

Add assertions to `tests/admin-settings-page-copy.test.ts`:

```ts
  test("users page supports LDAP allowlisted accounts without password reset", () => {
    const source = readFileSync("app/settings/users/page.tsx", "utf8");
    const actionsSource = readFileSync("app/settings/users/actions.ts", "utf8");

    expect(source).toContain("AD/LDAP");
    expect(source).toContain("Verify AD User");
    expect(source).toContain("LDAP user passwords are managed by AD");
    expect(source).toContain("authProvider");
    expect(source).toContain("providerLabel");
    expect(actionsSource).toContain("verifyLdapUserAction");
  });
```

- [ ] **Step 2: Run page source test to confirm it fails**

Run:

```powershell
npm test -- tests/admin-settings-page-copy.test.ts
```

Expected: FAIL because LDAP UI/actions are not present.

- [ ] **Step 3: Extend user filters for create provider and LDAP verification result**

In `UserManagementFilters`, add:

```ts
  createAuthProvider: UserAuthProvider;
  ldapVerifiedDisplayName: string;
  ldapVerifiedEmail: string;
  ldapVerifiedUsername: string;
```

Update `normalizeUserFilters`, `buildUserManagementHref`, and `readUserRedirectFilters` so those fields round-trip through query params.

- [ ] **Step 4: Add verify action**

In `app/settings/users/actions.ts`, import `verifyLdapUserForAdmin` and add:

```ts
export async function verifyLdapUserAction(formData: FormData) {
  try {
    const profile = await verifyLdapUserForAdmin(formData.get("username"));
    redirectBackToUsers(formData, {
      createAuthProvider: "LDAP",
      createUser: true,
      feedbackMessage: `Verified AD user ${profile.username}`,
      feedbackType: "success",
      ldapVerifiedDisplayName: profile.displayName,
      ldapVerifiedEmail: profile.email || "",
      ldapVerifiedUsername: profile.username,
    });
  } catch (error) {
    redirectBackToUsers(formData, {
      createAuthProvider: "LDAP",
      createUser: true,
      feedbackMessage: `Could not verify AD user: ${messageFromError(error)}`,
      feedbackType: "error",
    });
  }
}
```

- [ ] **Step 5: Add Local/LDAP New User tabs**

In `app/settings/users/page.tsx`, add provider switch links inside `createUserForm`:

```tsx
<div className="inline-flex rounded-md border border-border bg-surface p-1">
  <Link className={providerTabClass(filters.createAuthProvider === "LOCAL")} href={buildUserManagementHref({ ...userBaseFilters(filters), createUser: true, createAuthProvider: "LOCAL" })}>
    Local
  </Link>
  <Link className={providerTabClass(filters.createAuthProvider === "LDAP")} href={buildUserManagementHref({ ...userBaseFilters(filters), createUser: true, createAuthProvider: "LDAP" })}>
    AD/LDAP
  </Link>
</div>
```

Add a `providerTabClass(active: boolean)` helper near `linkButtonClass`.

- [ ] **Step 6: Render provider-specific create fields**

For Local mode, keep the current fields and add hidden:

```tsx
<input name="authProvider" type="hidden" value="LOCAL" />
```

For LDAP mode, render:

```tsx
<input name="authProvider" type="hidden" value="LDAP" />
<label className="grid gap-1.5 text-sm font-semibold text-ink">
  Short username
  <input className={inputClass()} defaultValue={filters.ldapVerifiedUsername} name="username" placeholder="somchai.s" required />
</label>
<Button formAction={verifyLdapUserAction} type="submit" variant="secondary">
  <ShieldCheck aria-hidden className="h-4 w-4" />
  Verify AD User
</Button>
```

Show verified data only when `filters.ldapVerifiedUsername` exists:

```tsx
<div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
  <div>{filters.ldapVerifiedDisplayName}</div>
  <div className="text-xs">{filters.ldapVerifiedEmail || "-"}</div>
</div>
```

Render the Create LDAP User button only after verification:

```tsx
{filters.ldapVerifiedUsername ? (
  <Button type="submit">
    <Plus aria-hidden className="h-4 w-4" />
    Create LDAP User
  </Button>
) : null}
```

- [ ] **Step 7: Show provider badges and hide reset for LDAP rows**

In `userRow`, add:

```tsx
<Badge tone={row.authProvider === "LDAP" ? "info" : "neutral"}>{row.providerLabel}</Badge>
```

For actions:

```tsx
{row.authProvider === "LOCAL" ? (
  <Link className={linkButtonClass(isResetting ? "primary" : "secondary")} href={userModeHref(filters, row, "reset")}>
    <KeyRound aria-hidden className="h-4 w-4" />
    Open password reset
  </Link>
) : (
  <span className="inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-xs font-bold text-muted">
    LDAP user passwords are managed by AD
  </span>
)}
```

- [ ] **Step 8: Run page source tests**

Run:

```powershell
npm test -- tests/admin-settings-page-copy.test.ts
```

Expected: PASS.

---

### Task 7: Seed, Docs, And Prisma Client

**Files:**
- Modify: `prisma/seed.mjs`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/ADMIN_SETTINGS.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/QA_CHECKLIST.md`
- Test: `tests/docs-ldap.test.ts`

- [ ] **Step 1: Write docs regression test**

Create `tests/docs-ldap.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("LDAP documentation", () => {
  test("handoff and docs describe Search + Bind behavior", () => {
    const handoff = readFileSync("DEVELOPER_HANDOFF.md", "utf8");
    const admin = readFileSync("docs/ADMIN_SETTINGS.md", "utf8");
    const dataModel = readFileSync("docs/DATA_MODEL.md", "utf8");
    const features = readFileSync("docs/FEATURES.md", "utf8");
    const qa = readFileSync("docs/QA_CHECKLIST.md", "utf8");

    expect(handoff).toContain("AD/LDAP Search + Bind");
    expect(admin).toContain("Verify AD User");
    expect(dataModel).toContain("authProvider");
    expect(features).toContain("LDAP Search + Bind");
    expect(qa).toContain("Login with an allowlisted LDAP user such as `somchai.s`");
  });
});
```

- [ ] **Step 2: Run docs test to confirm it fails**

Run:

```powershell
npm test -- tests/docs-ldap.test.ts
```

Expected: FAIL until implementation docs are updated.

- [ ] **Step 3: Update seed**

In `prisma/seed.mjs`, set local admin provider data in both create and update branches:

```js
      authProvider: "LOCAL",
      externalId: null,
      externalUsername: null,
      lastLoginAt: null,
```

- [ ] **Step 4: Generate Prisma Client**

Run:

```powershell
npx prisma generate
```

Expected: Prisma Client generation succeeds.

- [ ] **Step 5: Apply migration to SQL Server alpha**

Run:

```powershell
npx prisma migrate deploy
```

Expected: migration `000006_user_auth_provider` applies to SQL Server database `IT_PR_DMS` on the configured `alpha` instance.

- [ ] **Step 6: Update docs**

Update docs with these durable statements:

- `DEVELOPER_HANDOFF.md`: move AD/LDAP from not connected to implemented if code is complete; list latest verification results; mention local admin fallback.
- `docs/ADMIN_SETTINGS.md`: describe Local/LDAP account creation, Verify AD User, provider badges, and disabled LDAP password reset.
- `docs/DATA_MODEL.md`: add `authProvider`, `externalUsername`, `externalId`, `lastLoginAt`, and nullable `passwordHash`.
- `docs/FEATURES.md`: add hybrid local + LDAP Search + Bind auth.
- `docs/QA_CHECKLIST.md`: add local admin login, LDAP allowlisted login, inactive SQL user denial, LDAP password reset hidden, and LDAP config checks.

- [ ] **Step 7: Run docs test**

Run:

```powershell
npm test -- tests/docs-ldap.test.ts
```

Expected: PASS.

---

### Task 8: Full Verification

**Files:**
- No source edits unless verification finds a defect.

- [ ] **Step 1: Run focused LDAP/auth/user tests**

Run:

```powershell
npm test -- tests/ldap-schema-env.test.ts tests/ldap-utils.test.ts tests/ldap-provider.test.ts tests/auth-credentials-provider.test.ts tests/auth-local-provider.test.ts tests/user-management.test.ts tests/user-management-ldap.test.ts tests/admin-settings-page-copy.test.ts tests/docs-ldap.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full automated verification**

Run:

```powershell
npm test
npm run typecheck
npx prisma validate
npm run build
```

Expected: all pass. Existing Prisma/MSSQL `DEP0123` warning may still appear and remains non-blocking.

- [ ] **Step 3: Manual app smoke**

Run the app:

```powershell
npm run dev -- --port 3000
```

Open:

```text
http://localhost:3000/login
```

Smoke checks:

- Login as `admin/admin123`; expected redirect to `/dashboard`.
- Open `/settings/users`; expected `AD/LDAP` provider tab and `Verify AD User`.
- With real LDAP env configured, verify `somchai.s`; expected display name/email preview.
- Create `somchai.s` as an LDAP user with role `IT_USER`; expected row badge `AD/LDAP`.
- Logout, then login as `somchai.s` using AD password; expected access based on SQL role.
- Deactivate `somchai.s` in SQL UI; expected login denied even if AD password is valid.
- Confirm local `admin/admin123` still works after LDAP tests.

---

## Self-Review

- Spec coverage: plan covers hybrid Auth.js login, short username validation, LDAP Search + Bind, SQL allowlist/role boundary, Local admin fallback, Users/Roles UX, error handling, tests, env, migration, and docs.
- Placeholder scan: no task uses TBD, TODO, or vague "handle errors" instructions.
- Type consistency: `authProvider`, `externalUsername`, `externalId`, `lastLoginAt`, and nullable `passwordHash` are introduced in schema, helpers, tests, and docs with the same names.
- SQL Server null uniqueness: Prisma schema uses a normal `@@index([externalId])`; the migration adds a manual filtered unique index so many local users can keep `externalId = NULL` while LDAP identities remain unique.
