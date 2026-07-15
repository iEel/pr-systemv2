import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("annual recurring PR schema", () => {
  test("stores normalized schedules and one run per occurrence year", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migrationPath = "prisma/migrations/000010_annual_recurring_pr/migration.sql";

    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, "utf8");

    expect(schema).toContain("model RecurringPurchaseRequestSchedule");
    expect(schema).toContain("model RecurringPurchaseRequestScheduleItem");
    expect(schema).toContain("model RecurringPurchaseRequestRun");
    expect(schema).toContain("@@unique([scheduleId, occurrenceYear])");
    expect(migration).toContain("RecurringPurchaseRequestRun_scheduleId_occurrenceYear_key");
    expect(migration).toContain("RecurringSchedule_status_check");
  });
});
