import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Prisma SQL Server schema constraints", () => {
  test("allows multiple draft purchase requests with null PR numbers", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migrations = readFileSync("prisma/migrations/000004_pr_no_filtered_unique/migration.sql", "utf8");
    const prNoField = schema.match(/prNo\s+String\?\s+[^\n]*/)?.[0] || "";

    expect(prNoField).not.toContain("@unique");
    expect(migrations).toContain("DROP CONSTRAINT [PurchaseRequest_prNo_key]");
    expect(migrations).toContain("WHERE [prNo] IS NOT NULL");
  });
});
