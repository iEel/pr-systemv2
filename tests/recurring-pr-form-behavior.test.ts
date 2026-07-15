import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseRecurringScheduleForm } from "../lib/recurring-pr";
import { resetDivisionForDepartmentChange } from "../lib/recurring-pr-form";

function formWithDivision(divisionId: string) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    branchId: "branch_1", categoryId: "category_1", departmentId: "department_2", divisionId, leadDays: "30", name: "Renewal", purchaseMethod: "Procurement", purpose: "Renew", renewalDay: "1", renewalMonth: "9", responsibleUserId: "user_1", sourcePurchaseRequestId: "pr_1",
  })) form.set(key, value);
  form.append("rowType", "ITEM"); form.append("accountCode", ""); form.append("description", "License"); form.append("quantity", "1"); form.append("unitCost", "1");
  return form;
}

describe("Recurring schedule form behavior", () => {
  test("resets a dependent division before its changed-department FormData is submitted", () => {
    const resetValue = resetDivisionForDepartmentChange("division_from_department_1");
    expect(resetValue).toBe("");
    expect(parseRecurringScheduleForm(formWithDivision(resetValue)).divisionId).toBeNull();
  });

  test("uses an invalid preview state, controlled division reset, and accessible server validation feedback", () => {
    const source = readFileSync("components/recurring-pr/RecurringScheduleForm.tsx", "utf8");

    expect(source).toContain("getRenewalPreview");
    expect(source).toContain("Invalid renewal date");
    expect(source).toContain("resetDivisionForDepartmentChange");
    expect(source).toContain("disabled={divisions.length === 0}");
    expect(source).toContain("useActionState");
    expect(source).toContain("aria-invalid");
  });

  test("pairs the sticky actions header with its sticky cells", () => {
    const source = readFileSync("components/recurring-pr/RecurringScheduleList.tsx", "utf8");

    expect(source).toContain("sticky right-0 z-20 bg-slate-50");
    expect(source).toContain("sticky right-0 z-10");
    expect(source).toContain("bg-panel");
    expect(source).not.toContain("Date.now");
  });
});
