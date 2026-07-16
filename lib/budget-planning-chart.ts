import type { BudgetPlanningCategoryRow } from "./budget-planning";

export type BudgetPlanningChartRow = {
  key: string;
  label: string;
  actualSpend: number;
  planningBaseline: number;
  actualPercent: number;
  baselinePercent: number;
};

function safeAmount(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function buildBudgetPlanningChartRows(rows: BudgetPlanningCategoryRow[]): BudgetPlanningChartRow[] {
  const values = rows.flatMap((row) => [safeAmount(row.actualSpend), safeAmount(row.planningBaseline)]);
  const maximum = Math.max(0, ...values);
  const percent = (value: number) => maximum > 0 ? (value * 100) / maximum : 0;

  return rows.map((row) => {
    const actualSpend = safeAmount(row.actualSpend);
    const planningBaseline = safeAmount(row.planningBaseline);
    return {
      key: row.categoryId || "__not_categorized__",
      label: row.categoryCode,
      actualSpend,
      planningBaseline,
      actualPercent: percent(actualSpend),
      baselinePercent: percent(planningBaseline),
    };
  });
}
