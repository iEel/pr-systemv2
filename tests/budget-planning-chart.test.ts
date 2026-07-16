import { describe, expect, test } from "vitest";
import { buildBudgetPlanningChartRows } from "../lib/budget-planning-chart";
import type { BudgetPlanningCategoryRow } from "../lib/budget-planning";

function row(overrides: Partial<BudgetPlanningCategoryRow> = {}): BudgetPlanningCategoryRow {
  return {
    categoryId: "cat_hw",
    categoryCode: "HARDWARE",
    categoryName: "Hardware",
    categoryIsActive: true,
    actualSpend: 100,
    recurringIncludedInActual: 0,
    nonRecurringActual: 100,
    activeRecurringForecast: 50,
    planningBaseline: 150,
    actualPrCount: 1,
    activeScheduleCount: 1,
    ...overrides,
  };
}

describe("budget planning chart rows", () => {
  test("uses one shared maximum for Actual and Planning Baseline", () => {
    expect(buildBudgetPlanningChartRows([
      row(),
      row({ categoryId: "cat_sw", categoryCode: "SOFTWARE", actualSpend: 300, planningBaseline: 120 }),
    ])).toEqual([
      expect.objectContaining({ key: "cat_hw", actualPercent: 100 / 3, baselinePercent: 50 }),
      expect.objectContaining({ key: "cat_sw", actualPercent: 100, baselinePercent: 40 }),
    ]);
  });

  test("keeps zero bars at zero and clamps non-finite or negative values", () => {
    expect(buildBudgetPlanningChartRows([
      row({ categoryId: null, categoryCode: "Not categorized", actualSpend: Number.NaN, planningBaseline: -10 }),
    ])).toEqual([
      {
        key: "__not_categorized__",
        label: "Not categorized",
        actualSpend: 0,
        planningBaseline: 0,
        actualPercent: 0,
        baselinePercent: 0,
      },
    ]);
  });
});
