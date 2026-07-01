import { describe, expect, test } from "vitest";
import {
  buildBudgetCreateData,
  buildBudgetScopeKey,
  buildBudgetUpdateData,
  calculateRemainingBudget,
  formatBudgetMoney,
  mapBudgetRecordToRow,
  normalizeBudgetFilters,
  parseBudgetMoneyInput,
  validateBudgetDuplicate,
  validateBudgetReferences,
} from "../lib/budget-master";

describe("budget master helpers", () => {
  test("normalizes budget page filters", () => {
    expect(
      normalizeBudgetFilters(
        {
          companyId: " co_sonic ",
          includeInactive: "1",
          year: "2027",
        },
        { currentYear: 2026 },
      ),
    ).toEqual({
      companyId: "co_sonic",
      includeInactive: true,
      year: 2027,
    });

    expect(normalizeBudgetFilters({ companyId: "all", year: "bad" }, { currentYear: 2026 })).toEqual({
      companyId: "ALL",
      includeInactive: false,
      year: 2026,
    });
  });

  test("parses and formats budget money values", () => {
    expect(parseBudgetMoneyInput(" 1,234,567.5 ", "Budget amount")).toBe("1234567.50");
    expect(parseBudgetMoneyInput("", "Reserved amount")).toBe("0.00");
    expect(formatBudgetMoney(1234567.5)).toBe("1,234,567.50");
    expect(formatBudgetMoney("2500")).toBe("2,500.00");

    expect(() => parseBudgetMoneyInput("-1", "Budget amount")).toThrow("Budget amount must be non-negative");
    expect(() => parseBudgetMoneyInput("abc", "Budget amount")).toThrow("Budget amount must be a valid number");
  });

  test("calculates remaining amount after used and reserved budget", () => {
    expect(calculateRemainingBudget({ budgetAmount: "1000.00", reservedAmount: "25.25", usedAmount: "200.50" })).toBe(774.25);
    expect(calculateRemainingBudget({ budgetAmount: 1000, reservedAmount: 0, usedAmount: 1250 })).toBe(-250);
  });

  test("builds stable budget scope keys", () => {
    expect(buildBudgetScopeKey({ branchId: null, companyId: "co_sonic", departmentId: "dep_it", year: 2026 })).toBe(
      "2026|co_sonic|ALL_BRANCHES|dep_it",
    );
    expect(buildBudgetScopeKey({ branchId: "br_hq", companyId: "co_sonic", departmentId: "dep_it", year: 2026 })).toBe(
      "2026|co_sonic|br_hq|dep_it",
    );
  });

  test("builds create and update data from form-like values", () => {
    expect(
      buildBudgetCreateData({
        branchId: "",
        budgetAmount: "8,750,000",
        companyId: " co_sonic ",
        departmentId: " dep_it ",
        year: "2026",
      }),
    ).toEqual({
      branchId: null,
      budgetAmount: "8750000.00",
      companyId: "co_sonic",
      departmentId: "dep_it",
      isActive: true,
      reservedAmount: "0.00",
      usedAmount: "0.00",
      year: 2026,
    });

    expect(
      buildBudgetUpdateData({
        budgetAmount: "9000000",
        reservedAmount: "50,000.25",
        usedAmount: "125,000",
      }),
    ).toEqual({
      budgetAmount: "9000000.00",
      reservedAmount: "50000.25",
      usedAmount: "125000.00",
    });
  });

  test("validates budget references and duplicate scopes before writing", () => {
    expect(() =>
      validateBudgetReferences(
        {
          branchId: "br_sonic04",
          companyId: "co_sonic",
          departmentId: "dep_it",
        },
        {
          branch: { companyId: "co_other", id: "br_sonic04", isActive: true },
          company: { id: "co_sonic", isActive: true },
          department: { id: "dep_it", isActive: true },
        },
      ),
    ).toThrow("Selected branch does not belong to the selected company");

    expect(() =>
      validateBudgetDuplicate({
        existingBudgetId: "bud_1",
        scopeLabel: "2026 / Sonic / IT",
      }),
    ).toThrow("Budget already exists for 2026 / Sonic / IT");
  });

  test("maps budget records to display rows", () => {
    const row = mapBudgetRecordToRow({
      branch: null,
      branchId: null,
      budgetAmount: "8750000.00",
      company: { displayName: "Sonic", id: "co_sonic" },
      companyId: "co_sonic",
      department: { id: "dep_it", name: "IT" },
      departmentId: "dep_it",
      id: "bud_1",
      isActive: true,
      reservedAmount: "125670.80",
      updatedAt: new Date("2026-06-29T09:00:00.000Z"),
      usedAmount: "3245120.35",
      year: 2026,
    });

    expect(row).toMatchObject({
      branchId: null,
      branchName: "All branches",
      budgetAmount: 8750000,
      budgetAmountText: "8,750,000.00",
      remainingAmount: 5379208.85,
      remainingAmountText: "5,379,208.85",
      scopeKey: "2026|co_sonic|ALL_BRANCHES|dep_it",
      status: "Active",
    });
  });
});
