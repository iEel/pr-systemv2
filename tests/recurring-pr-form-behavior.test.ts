import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseRecurringScheduleForm } from "../lib/recurring-pr";
import {
  getRecurringDraftTimingState,
  getRecurringScheduleReadiness,
  resetDivisionForDepartmentChange,
  thaiMonthOptions,
} from "../lib/recurring-pr-form";

function formWithDivision(divisionId: string) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    branchId: "branch_1", categoryId: "category_1", departmentId: "department_2", divisionId, leadDays: "30", name: "Renewal", purchaseMethod: "Procurement", purpose: "Renew", renewalDay: "1", renewalMonth: "9", responsibleUserId: "user_1", sourcePurchaseRequestId: "pr_1",
  })) form.set(key, value);
  form.append("rowType", "ITEM"); form.append("accountCode", ""); form.append("description", "License"); form.append("quantity", "1"); form.append("unitCost", "1");
  return form;
}

describe("Recurring schedule form behavior", () => {
  test("lists incomplete schedule requirements in stable order", () => {
    expect(getRecurringScheduleReadiness({
      categoryId: "",
      name: " ",
      previewValid: false,
      responsibleUserId: "",
    })).toEqual({
      ready: false,
      missing: ["Schedule name", "Responsible user", "PR category", "Valid renewal date"],
    });
  });

  test("marks a complete valid schedule as ready", () => {
    expect(getRecurringScheduleReadiness({
      categoryId: "cat_1",
      name: "Annual infrastructure renewal",
      previewValid: true,
      responsibleUserId: "user_1",
    })).toEqual({ ready: true, missing: [] });
  });

  test("classifies Draft timing against the Bangkok date", () => {
    expect(getRecurringDraftTimingState(new Date("2026-07-17T00:00:00.000Z"), "2026-07-16")).toBe("upcoming");
    expect(getRecurringDraftTimingState(new Date("2026-07-16T00:00:00.000Z"), "2026-07-16")).toBe("dueToday");
    expect(getRecurringDraftTimingState(new Date("2026-06-16T00:00:00.000Z"), "2026-07-16")).toBe("overdue");
  });

  test("provides all twelve localized month options", () => {
    expect(thaiMonthOptions).toHaveLength(12);
    expect(thaiMonthOptions[0]).toEqual({ label: "มกราคม", value: 1 });
    expect(thaiMonthOptions[11]).toEqual({ label: "ธันวาคม", value: 12 });
  });

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
    expect(source).toContain("getRecurringScheduleReadiness");
    expect(source).toContain("getRecurringDraftTimingState");
    expect(source).toContain("responsibleUserLabel");
  });

  test("passes every visible server-validated error into its rendered field", () => {
    const source = readFileSync("components/recurring-pr/RecurringScheduleForm.tsx", "utf8");

    for (const field of ["name", "responsibleUserId", "renewalMonth", "renewalDay", "leadDays", "branchId", "departmentId", "divisionId", "categoryId", "purpose", "purchaseMethod"]) {
      expect(source).toContain(`error={state.fieldErrors.${field}}`);
    }
    expect(source).toContain('id="source-purchase-request-error"');
    expect(source).toContain("state.fieldErrors.items");
  });

  test("gives every editable item control a row-specific accessible name", () => {
    const source = readFileSync("components/pr/PRItemEditor.tsx", "utf8");

    for (const label of ["type", "account code", "description", "quantity", "unit cost"]) {
      expect(source).toContain(`aria-label={\`Row \${index + 1} ${label}\`}`);
    }
  });

  test("pairs the sticky actions header with its sticky cells", () => {
    const source = readFileSync("components/recurring-pr/RecurringScheduleList.tsx", "utf8");

    expect(source).toContain("sticky right-0 z-20 bg-slate-50");
    expect(source).toContain("sticky right-0 z-10");
    expect(source).toContain("bg-panel");
    expect(source).not.toContain("Date.now");
  });
});
