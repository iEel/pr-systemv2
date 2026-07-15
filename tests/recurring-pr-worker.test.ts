import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  buildRecurringDraftInput,
  processRecurringPrSchedules,
  sanitizeRecurringError,
} from "../lib/recurring-pr-worker";

describe("recurring PR worker orchestration", () => {
  test("uses today's Bangkok date, preserves due ordering, and continues after an isolated failure", async () => {
    const calls: string[] = [];
    const summary = await processRecurringPrSchedules({
      now: new Date("2026-07-14T17:30:00.000Z"),
      repository: {
        findDueScheduleIds: async (today) => {
          expect(today).toEqual(new Date("2026-07-15T00:00:00.000Z"));
          return ["sched_early", "sched_broken", "sched_late"];
        },
        processOccurrence: async (scheduleId) => {
          calls.push(scheduleId);
          if (scheduleId === "sched_broken") throw new Error("DATABASE_URL=mssql://secret");
          return { outcome: scheduleId === "sched_early" ? "CREATED" : "SKIPPED", scheduleId };
        },
      },
    });

    expect(calls).toEqual(["sched_early", "sched_broken", "sched_late"]);
    expect(summary).toMatchObject({ created: 1, failed: 1, skipped: 1, total: 3 });
    expect(summary.results[1]).toEqual({ error: "Recurring PR processing failed", outcome: "FAILED", scheduleId: "sched_broken" });
  });

  test("maps the normalized snapshot to a responsible-user Draft without losing row types", () => {
    const input = buildRecurringDraftInput({
      branchId: "branch_1",
      categoryId: "category_1",
      departmentId: "department_1",
      divisionId: "division_1",
      items: [
        { accountCode: "", description: "Licenses", lineNo: 1, quantity: 0, rowType: "HEADING", totalAmount: 0, unitCost: 0 },
        { accountCode: "6100", description: "Annual license", lineNo: 2, quantity: 2, rowType: "ITEM", totalAmount: 200, unitCost: 100 },
        { accountCode: "", description: "Renewal includes support", lineNo: 3, quantity: 0, rowType: "DETAIL", totalAmount: 0, unitCost: 0 },
      ],
      purpose: "Renew licenses",
      purchaseMethod: "PROCUREMENT",
      remark: "Annual renewal",
      responsibleUserId: "user_owner",
      vatRate: 7,
    }, {
      renewalDate: new Date("2026-09-01T00:00:00.000Z"),
      today: new Date("2026-08-02T00:00:00.000Z"),
    });

    expect(input).toMatchObject({
      branchId: "branch_1",
      categoryId: "category_1",
      createdById: "user_owner",
      departmentId: "department_1",
      documentDate: "2026-08-02",
      divisionId: "division_1",
      requiredDate: "2026-09-01",
    });
    expect(input.items.map((item) => item.rowType)).toEqual(["HEADING", "ITEM", "DETAIL"]);
  });

  test("only exposes known validation errors", () => {
    expect(sanitizeRecurringError(new Error("Company / Branch ไม่พร้อมใช้งาน"))).toBe("Company / Branch ไม่พร้อมใช้งาน");
    expect(sanitizeRecurringError(new Error("PrismaClientKnownRequestError: SELECT * FROM users"))).toBe("Recurring PR processing failed");
  });

  test("creates Drafts only and never renders or issues", () => {
    const source = readFileSync("lib/recurring-pr-worker.ts", "utf8");
    expect(source).not.toContain("renderTemplateWithCarbone");
    expect(source).not.toContain("generatePurchaseRequestPdf");
    expect(source).not.toContain("allocateRunningNumber");
    expect(source).toContain('status: "DRAFT"');
  });
});
