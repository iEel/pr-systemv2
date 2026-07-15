import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("PR category SQL Server schema", () => {
  test("adds category master and a nullable legacy-compatible PR relation", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync("prisma/migrations/000009_pr_category_master/migration.sql", "utf8");

    expect(schema).toContain("model PurchaseRequestCategory");
    expect(schema).toMatch(/categoryId\s+String\?/);
    expect(schema).toContain("category PurchaseRequestCategory?");
    expect(migration).toContain("CREATE TABLE [dbo].[PurchaseRequestCategory]");
    expect(migration).toContain("PurchaseRequest_categoryId_fkey");
    expect(migration).toContain("cat_subscription_renewal");
  });

  test("terminates the CATCH rollback before THROW", () => {
    const migration = readFileSync("prisma/migrations/000009_pr_category_master/migration.sql", "utf8");
    const catchBlock = migration.split("BEGIN CATCH")[1] || "";

    expect(catchBlock).toMatch(/END;\s+THROW;/);
  });
});
