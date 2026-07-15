import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const migrationPath = "prisma/migrations/000010_annual_recurring_pr/migration.sql";

function readSchemaContract() {
  return {
    schema: readFileSync("prisma/schema.prisma", "utf8"),
    migration: readFileSync(migrationPath, "utf8").replace(/\s+/g, " ").trim(),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectCatalogGuard(migration: string, catalog: string, name: string) {
  expect(migration).toMatch(
    new RegExp(`IF NOT EXISTS \\(\\s*SELECT 1 FROM ${catalog} WHERE \\[name\\] = N'${escapeRegExp(name)}'`, "i"),
  );
}

describe("annual recurring PR schema", () => {
  test("stores normalized schedules and one run per occurrence year", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const { schema, migration } = readSchemaContract();

    expect(schema).toContain("model RecurringPurchaseRequestSchedule");
    expect(schema).toContain("model RecurringPurchaseRequestScheduleItem");
    expect(schema).toContain("model RecurringPurchaseRequestRun");
    expect(schema).toContain("@@unique([scheduleId, occurrenceYear])");
    expect(migration).toContain("RecurringPurchaseRequestRun_scheduleId_occurrenceYear_key");
    expect(migration).toContain("RecurringSchedule_status_check");
  });

  test("preserves SQL Server check constraints and schedule/run uniqueness", () => {
    const { migration } = readSchemaContract();
    const checkConstraints = [
      ["RecurringSchedule_status_check", "[status] IN (N'ACTIVE', N'PAUSED')"],
      ["RecurringSchedule_renewalMonth_check", "[renewalMonth] BETWEEN 1 AND 12"],
      ["RecurringSchedule_renewalDay_check", "[renewalDay] BETWEEN 1 AND 31"],
      ["RecurringSchedule_leadDays_check", "[leadDays] BETWEEN 1 AND 365"],
      ["RecurringScheduleItem_rowType_check", "[rowType] IN (N'ITEM', N'HEADING', N'DETAIL')"],
      ["RecurringPurchaseRequestRun_status_check", "[status] IN (N'PROCESSING', N'SUCCEEDED', N'FAILED')"],
    ];

    for (const [name, expression] of checkConstraints) {
      expect(migration).toContain(`ADD CONSTRAINT [${name}] CHECK (${expression});`);
    }

    expect(migration).toContain(
      "CONSTRAINT [RecurringPurchaseRequestScheduleItem_scheduleId_lineNo_key] UNIQUE NONCLUSTERED ([scheduleId], [lineNo])",
    );
    expect(migration).toContain(
      "CONSTRAINT [RecurringPurchaseRequestRun_scheduleId_occurrenceYear_key] UNIQUE NONCLUSTERED ([scheduleId], [occurrenceYear])",
    );
    expect(migration).toContain(
      "CREATE UNIQUE NONCLUSTERED INDEX [RecurringPurchaseRequestRun_purchaseRequestId_key] ON [dbo].[RecurringPurchaseRequestRun]([purchaseRequestId]) WHERE [purchaseRequestId] IS NOT NULL;",
    );
  });

  test("keeps every recurring foreign key and its delete behavior", () => {
    const { migration } = readSchemaContract();
    const foreignKeys = [
      ["RecurringPurchaseRequestSchedule_sourcePurchaseRequestId_fkey", "sourcePurchaseRequestId", "PurchaseRequest", "SET NULL"],
      ["RecurringPurchaseRequestSchedule_companyId_fkey", "companyId", "Company", "NO ACTION"],
      ["RecurringPurchaseRequestSchedule_branchId_fkey", "branchId", "Branch", "NO ACTION"],
      ["RecurringPurchaseRequestSchedule_departmentId_fkey", "departmentId", "Department", "NO ACTION"],
      ["RecurringPurchaseRequestSchedule_divisionId_fkey", "divisionId", "Division", "NO ACTION"],
      ["RecurringPurchaseRequestSchedule_categoryId_fkey", "categoryId", "PurchaseRequestCategory", "NO ACTION"],
      ["RecurringPurchaseRequestSchedule_responsibleUserId_fkey", "responsibleUserId", "User", "NO ACTION"],
      ["RecurringPurchaseRequestSchedule_createdById_fkey", "createdById", "User", "NO ACTION"],
      ["RecurringPurchaseRequestScheduleItem_scheduleId_fkey", "scheduleId", "RecurringPurchaseRequestSchedule", "CASCADE"],
      ["RecurringPurchaseRequestRun_scheduleId_fkey", "scheduleId", "RecurringPurchaseRequestSchedule", "NO ACTION"],
      ["RecurringPurchaseRequestRun_purchaseRequestId_fkey", "purchaseRequestId", "PurchaseRequest", "SET NULL"],
    ];

    for (const [name, column, referencedTable, onDelete] of foreignKeys) {
      expect(migration).toContain(
        `ADD CONSTRAINT [${name}] FOREIGN KEY ([${column}]) REFERENCES [dbo].[${referencedTable}]([id]) ON DELETE ${onDelete} ON UPDATE NO ACTION;`,
      );
    }
  });

  test("keeps migration creation idempotent and Prisma SetNull relations nullable", () => {
    const { schema, migration } = readSchemaContract();
    const tables = [
      "RecurringPurchaseRequestSchedule",
      "RecurringPurchaseRequestScheduleItem",
      "RecurringPurchaseRequestRun",
    ];
    const checkConstraintNames = [
      "RecurringSchedule_status_check",
      "RecurringSchedule_renewalMonth_check",
      "RecurringSchedule_renewalDay_check",
      "RecurringSchedule_leadDays_check",
      "RecurringScheduleItem_rowType_check",
      "RecurringPurchaseRequestRun_status_check",
    ];
    const indexNames = [
      "RecurringPurchaseRequestSchedule_status_nextRunDate_idx",
      "RecurringPurchaseRequestSchedule_responsibleUserId_idx",
      "RecurringPurchaseRequestRun_purchaseRequestId_key",
      "RecurringPurchaseRequestRun_status_startedAt_idx",
    ];
    const foreignKeyNames = [
      "RecurringPurchaseRequestSchedule_sourcePurchaseRequestId_fkey",
      "RecurringPurchaseRequestSchedule_companyId_fkey",
      "RecurringPurchaseRequestSchedule_branchId_fkey",
      "RecurringPurchaseRequestSchedule_departmentId_fkey",
      "RecurringPurchaseRequestSchedule_divisionId_fkey",
      "RecurringPurchaseRequestSchedule_categoryId_fkey",
      "RecurringPurchaseRequestSchedule_responsibleUserId_fkey",
      "RecurringPurchaseRequestSchedule_createdById_fkey",
      "RecurringPurchaseRequestScheduleItem_scheduleId_fkey",
      "RecurringPurchaseRequestRun_scheduleId_fkey",
      "RecurringPurchaseRequestRun_purchaseRequestId_fkey",
    ];

    for (const table of tables) {
      expect(migration).toContain(`IF OBJECT_ID(N'[dbo].[${table}]', N'U') IS NULL BEGIN CREATE TABLE [dbo].[${table}]`);
    }
    for (const name of checkConstraintNames) expectCatalogGuard(migration, "sys\\.check_constraints", name);
    for (const name of indexNames) expectCatalogGuard(migration, "sys\\.indexes", name);
    for (const name of foreignKeyNames) expectCatalogGuard(migration, "sys\\.foreign_keys", name);

    expect(schema).toMatch(/sourcePurchaseRequestId\s+String\?/);
    expect(schema).toMatch(/sourcePurchaseRequest\s+PurchaseRequest\?\s+@relation\("RecurringScheduleSource",[\s\S]*?onDelete:\s+SetNull/);
    expect(schema).toMatch(/purchaseRequestId\s+String\?\s+@unique/);
    expect(schema).toMatch(/purchaseRequest\s+PurchaseRequest\?\s+@relation\("RecurringRunDraft",[\s\S]*?onDelete:\s+SetNull/);
  });
});
