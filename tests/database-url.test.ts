import { describe, expect, test } from "vitest";
import { buildSqlServerUrl, redactDatabaseUrl, resolveDatabaseUrl } from "../lib/database-url";

describe("database URL helpers", () => {
  test("uses DATABASE_URL when SQLSERVER_* values are not complete", () => {
    const url = "sqlserver://db-host:1433;database=IT_PR_DMS;user=app;password=secret;encrypt=true";

    expect(resolveDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });


  test("prefers escaped SQLSERVER_* values over a raw DATABASE_URL when all values are present", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "sqlserver://raw:1433;database=WRONG;user=raw;password=raw;encrypt=true",
        SQLSERVER_HOST: "sqlserver.internal.example",
        SQLSERVER_PORT: "1433",
        SQLSERVER_DATABASE: "IT_PR_DMS",
        SQLSERVER_USER: "it_pr_app",
        SQLSERVER_PASSWORD: "p:ass;word",
        SQLSERVER_TRUST_CERT: "true",
      }),
    ).toContain("password={p:ass;word}");
  });
  test("builds a Prisma SQL Server URL from SQLSERVER_* values", () => {
    expect(
      buildSqlServerUrl({
        SQLSERVER_HOST: "sqlserver.internal.example",
        SQLSERVER_PORT: "1433",
        SQLSERVER_DATABASE: "IT_PR_DMS",
        SQLSERVER_USER: "it/pr_app",
        SQLSERVER_PASSWORD: "p:ass;word",
        SQLSERVER_TRUST_CERT: "true",
      }),
    ).toBe(
      "sqlserver://sqlserver.internal.example:1433;database=IT_PR_DMS;user={it/pr_app};password={p:ass;word};encrypt=true;trustServerCertificate=true;schema=dbo",
    );
  });


  test("uses SQLSERVER_INSTANCE instead of port when an instance is configured", () => {
    expect(
      buildSqlServerUrl({
        SQLSERVER_HOST: "sqlserver.internal.example",
        SQLSERVER_INSTANCE: "alpha",
        SQLSERVER_PORT: "1433",
        SQLSERVER_DATABASE: "IT_PR_DMS",
        SQLSERVER_USER: "it_pr_app",
        SQLSERVER_PASSWORD: "secret",
        SQLSERVER_TRUST_CERT: "true",
      }),
    ).toBe(
      "sqlserver://sqlserver.internal.example\\alpha;database=IT_PR_DMS;user=it_pr_app;password=secret;encrypt=true;trustServerCertificate=true;schema=dbo",
    );
  });
  test("redacts credentials before a database URL is logged", () => {
    expect(
      redactDatabaseUrl(
        "sqlserver://sqlserver.internal.example:1433;database=IT_PR_DMS;user=it_pr_app;password=secret;encrypt=true;trustServerCertificate=true",
      ),
    ).toBe("sqlserver://sqlserver.internal.example:1433;database=IT_PR_DMS;user=<redacted>;password=<redacted>;encrypt=true;trustServerCertificate=true");
  });
});
