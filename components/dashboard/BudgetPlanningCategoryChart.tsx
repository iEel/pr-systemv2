import { buildBudgetPlanningChartRows } from "@/lib/budget-planning-chart";
import type { BudgetPlanningCategoryRow } from "@/lib/budget-planning";
import { formatTHB } from "@/lib/utils";

type BudgetPlanningCategoryChartProps = {
  rows: BudgetPlanningCategoryRow[];
};

export function BudgetPlanningCategoryChart({ rows }: BudgetPlanningCategoryChartProps): React.ReactNode {
  const chartRows = buildBudgetPlanningChartRows(rows);

  return (
    <section aria-labelledby="budget-category-chart-title" className="rounded-lg border border-border bg-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink" id="budget-category-chart-title">
            Actual vs Planning Baseline by PR Category
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            เปรียบเทียบยอดใช้จริงกับฐานงบประมาณปีถัดไป โดยใช้สเกลเดียวกันทุกหมวดหมู่
          </p>
        </div>
        <div aria-label="Chart legend" className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
            Actual Spend
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Planning Baseline
          </span>
        </div>
      </div>

      {chartRows.length > 0 ? (
        <div className="mt-5 divide-y divide-border" role="list">
          {chartRows.map((row) => (
            <article className="py-4 first:pt-0 last:pb-0" key={row.key} role="listitem">
              <h3 className="mb-3 text-sm font-bold text-ink">{row.label}</h3>
              <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_8.5rem] sm:items-center sm:gap-x-4 sm:gap-y-2">
                <p className="text-xs font-semibold text-muted">Actual Spend</p>
                <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-400" style={{ width: `${row.actualPercent}%` }} />
                </div>
                <p className="text-right text-sm font-semibold tabular-nums text-ink" title={formatTHB(row.actualSpend)}>
                  {formatTHB(row.actualSpend)}
                </p>

                <p className="text-xs font-semibold text-muted">Planning Baseline</p>
                <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-blue-50">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.baselinePercent}%` }} />
                </div>
                <p className="text-right text-sm font-bold tabular-nums text-ink" title={formatTHB(row.planningBaseline)}>
                  {formatTHB(row.planningBaseline)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-surface px-4 py-6 text-center text-sm text-muted">
          ไม่พบข้อมูลตาม filter ที่เลือกสำหรับแสดงในกราฟ
        </p>
      )}
    </section>
  );
}
