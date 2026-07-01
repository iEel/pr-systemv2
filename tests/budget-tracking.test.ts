import { describe, expect, test } from "vitest";
import {
  adjustBudgetBuckets,
  buildBudgetReference,
  selectBudgetMatch,
  type BudgetCandidate,
} from "../lib/budget-tracking";

const exact: BudgetCandidate = {
  budgetAmount: "1000.00",
  branchId: "br_hq",
  companyId: "co_sonic",
  departmentId: "dep_it",
  id: "budget_exact",
  reservedAmount: "100.00",
  usedAmount: "200.00",
  year: 2026,
};

const allBranches: BudgetCandidate = {
  ...exact,
  branchId: null,
  id: "budget_all",
};

describe("budget tracking helpers", () => {
  test("matches exact branch budget before all-branches fallback", () => {
    const reference = buildBudgetReference({
      branchId: "br_hq",
      companyId: "co_sonic",
      departmentId: "dep_it",
      documentDate: new Date("2026-06-30T00:00:00.000Z"),
      totalAmount: "250.00",
    });

    expect(selectBudgetMatch(reference, [allBranches, exact])?.id).toBe("budget_exact");
  });

  test("falls back to all-branches budget and reports missing when none match", () => {
    const reference = buildBudgetReference({
      branchId: "br_other",
      companyId: "co_sonic",
      departmentId: "dep_it",
      documentDate: new Date("2026-06-30T00:00:00.000Z"),
      totalAmount: "250.00",
    });

    expect(selectBudgetMatch(reference, [allBranches])?.id).toBe("budget_all");
    expect(selectBudgetMatch(reference, [])).toBeNull();
  });

  test("updates reserved and used buckets without blocking over-budget states", () => {
    expect(adjustBudgetBuckets(exact, { reservedDelta: 950, usedDelta: 0 })).toMatchObject({
      reservedAmount: "1050.00",
      status: "OVER_BUDGET",
    });

    expect(adjustBudgetBuckets(exact, { reservedDelta: -25, usedDelta: 25 })).toMatchObject({
      reservedAmount: "75.00",
      status: "MATCHED",
      usedAmount: "225.00",
    });
  });

  test("clamps subtract operations at zero", () => {
    expect(adjustBudgetBuckets(exact, { reservedDelta: -500, usedDelta: -500 })).toMatchObject({
      reservedAmount: "0.00",
      status: "MATCHED",
      usedAmount: "0.00",
    });
  });
});
