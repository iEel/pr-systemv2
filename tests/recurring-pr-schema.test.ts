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

function expectCatalogGuard(
  migration: string,
  catalog: string,
  name: string,
  table: string,
  objectIdColumn: "object_id" | "parent_object_id",
) {
  expect(migration).toMatch(
    new RegExp(
      `IF NOT EXISTS \\(\\s*SELECT 1 FROM ${catalog} WHERE \\[name\\] = N'${escapeRegExp(name)}' AND \\[${objectIdColumn}\\] = OBJECT_ID\\(N'dbo\\.${escapeRegExp(table)}'\\)`,
      "i",
    ),
  );
}

function modelBlock(schema: string, model: string) {
  const match = schema.match(new RegExp(`model\\s+${escapeRegExp(model)}\\s+\\{([\\s\\S]*?)\\n\\}`, "m"));

  expect(match, `Expected ${model} model`).not.toBeNull();

  return match![1];
}

function nullableSetNullRelationPattern(field: string, relationName: string, foreignKey: string) {
  return new RegExp(
    `${field}\\s+PurchaseRequest\\?\\s+@relation\\(\\s*"${relationName}"\\s*,\\s*fields:\\s*\\[${foreignKey}\\]\\s*,\\s*references:\\s*\\[id\\]\\s*,\\s*onDelete:\\s*SetNull\\s*,\\s*onUpdate:\\s*NoAction\\s*\\)`,
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

  test("keeps migration creation idempotent", () => {
    const { migration } = readSchemaContract();
    const tables = [
      "RecurringPurchaseRequestSchedule",
      "RecurringPurchaseRequestScheduleItem",
      "RecurringPurchaseRequestRun",
    ];
    const checkConstraints = [
      ["RecurringSchedule_status_check", "RecurringPurchaseRequestSchedule"],
      ["RecurringSchedule_renewalMonth_check", "RecurringPurchaseRequestSchedule"],
      ["RecurringSchedule_renewalDay_check", "RecurringPurchaseRequestSchedule"],
      ["RecurringSchedule_leadDays_check", "RecurringPurchaseRequestSchedule"],
      ["RecurringScheduleItem_rowType_check", "RecurringPurchaseRequestScheduleItem"],
      ["RecurringPurchaseRequestRun_status_check", "RecurringPurchaseRequestRun"],
    ];
    const indexes = [
      ["RecurringPurchaseRequestSchedule_status_nextRunDate_idx", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_responsibleUserId_idx", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestRun_purchaseRequestId_key", "RecurringPurchaseRequestRun"],
      ["RecurringPurchaseRequestRun_status_startedAt_idx", "RecurringPurchaseRequestRun"],
    ];
    const foreignKeys = [
      ["RecurringPurchaseRequestSchedule_sourcePurchaseRequestId_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_companyId_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_branchId_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_departmentId_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_divisionId_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_categoryId_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_responsibleUserId_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestSchedule_createdById_fkey", "RecurringPurchaseRequestSchedule"],
      ["RecurringPurchaseRequestScheduleItem_scheduleId_fkey", "RecurringPurchaseRequestScheduleItem"],
      ["RecurringPurchaseRequestRun_scheduleId_fkey", "RecurringPurchaseRequestRun"],
      ["RecurringPurchaseRequestRun_purchaseRequestId_fkey", "RecurringPurchaseRequestRun"],
    ];

    for (const table of tables) {
      expect(migration).toContain(`IF OBJECT_ID(N'[dbo].[${table}]', N'U') IS NULL BEGIN CREATE TABLE [dbo].[${table}]`);
    }
    for (const [name, table] of checkConstraints) {
      expectCatalogGuard(migration, "sys\\.check_constraints", name, table, "parent_object_id");
    }
    for (const [name, table] of indexes) expectCatalogGuard(migration, "sys\\.indexes", name, table, "object_id");
    for (const [name, table] of foreignKeys) {
      expectCatalogGuard(migration, "sys\\.foreign_keys", name, table, "parent_object_id");
    }
  });

  test("requires SetNull on the nullable source PR relation in the schedule model", () => {
    const { schema } = readSchemaContract();
    const schedule = modelBlock(schema, "RecurringPurchaseRequestSchedule");
    const sourceRelation = nullableSetNullRelationPattern(
      "sourcePurchaseRequest",
      "RecurringScheduleSource",
      "sourcePurchaseRequestId",
    );

    expect(schedule).toMatch(/sourcePurchaseRequestId\s+String\?/);
    expect(schedule).toMatch(sourceRelation);

    const withoutSetNull = schedule.replace("onDelete: SetNull", "onDelete: NoAction");
    expect(withoutSetNull).not.toMatch(sourceRelation);
  });

  test("requires SetNull on the nullable generated PR relation in the run model", () => {
    const { schema } = readSchemaContract();
    const run = modelBlock(schema, "RecurringPurchaseRequestRun");
    const generatedRelation = nullableSetNullRelationPattern(
      "purchaseRequest",
      "RecurringRunDraft",
      "purchaseRequestId",
    );

    expect(run).toMatch(/purchaseRequestId\s+String\?\s+@unique/);
    expect(run).toMatch(generatedRelation);

    const withoutSetNull = run.replace("onDelete: SetNull", "onDelete: NoAction");
    expect(withoutSetNull).not.toMatch(generatedRelation);
  });
});
