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
    expect(migration).toContain("CREATE INDEX [User_externalId_idx] ON [dbo].[User]([externalId])");
    expect(migration).toContain("CREATE UNIQUE NONCLUSTERED INDEX [User_externalId_not_null_key]");
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
    expect(env).toContain("LDAP_DISPLAY_NAME_ATTRIBUTE=displayName");
    expect(env).toContain("LDAP_EMAIL_ATTRIBUTE=mail");
    expect(env).toContain("LDAP_TLS_REJECT_UNAUTHORIZED=true");
  });
});
