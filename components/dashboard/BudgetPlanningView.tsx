import Link from "next/link";
import { Download } from "lucide-react";
import { BudgetPlanningCategoryChart } from "@/components/dashboard/BudgetPlanningCategoryChart";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import {
  buildBudgetPlanningExportHref,
  buildBudgetPlanningHref,
} from "@/lib/budget-planning";
import type { BudgetPlanningPageData } from "@/lib/budget-planning.server";
import { cn, formatAmount, formatTHB } from "@/lib/utils";

const navLinkClass =
  "inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export function DashboardViewNav({ current }: { current: "overview" | "planning" }): React.ReactNode {
  return (
    <nav aria-label="Dashboard views" className="flex w-full flex-wrap gap-1 rounded-md border border-border bg-panel p-1">
      <Link
        aria-current={current === "overview" ? "page" : undefined}
        className={cn(navLinkClass, current === "overview" ? "bg-primary text-white ring-2 ring-primary ring-offset-1" : "text-ink hover:bg-surface")}
        href="/dashboard"
      >
        Overview
      </Link>
      <Link
        aria-current={current === "planning" ? "page" : undefined}
        className={cn(navLinkClass, current === "planning" ? "bg-primary text-white ring-2 ring-primary ring-offset-1" : "text-ink hover:bg-surface")}
        href="/dashboard?view=planning"
      >
        Budget Planning
      </Link>
    </nav>
  );
}

export function BudgetPlanningView({ data }: { data: BudgetPlanningPageData }): React.ReactNode {
  const hasActual = data.summary.actualPrCount > 0;
  const hasRecurring = data.summary.activeScheduleCount > 0;
  const summaryItems = [
    { label: "Actual Spend", helper: `Base Year ${data.filters.baseYear}`, value: data.summary.actualSpend },
    {
      label: "Recurring Included in Actual",
      helper: `Base Year ${data.filters.baseYear}`,
      value: data.summary.recurringIncludedInActual,
    },
    { label: "Non-recurring Actual", helper: `Base Year ${data.filters.baseYear}`, value: data.summary.nonRecurringActual },
    {
      label: "Active Recurring Forecast",
      helper: `Forecast Year ${data.filters.forecastYear}`,
      value: data.summary.activeRecurringForecast,
    },
    { label: "Planning Baseline", helper: `Forecast Year ${data.filters.forecastYear}`, value: data.summary.planningBaseline },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <SectionHeader
        title={`Budget Planning ${data.filters.baseYear} → ${data.filters.forecastYear}`}
        description="วิเคราะห์ยอดใช้จริงและภาระผูกพัน Recurring PR เพื่อเตรียมฐานงบประมาณปีถัดไป"
        action={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            href={buildBudgetPlanningExportHref(data.filters)}
          >
            <Download aria-hidden className="h-4 w-4" />
            Export Budget Plan
          </Link>
        }
      />

      <DashboardViewNav current="planning" />

      <form action="/dashboard" className="rounded-lg border border-border bg-panel p-4" method="get">
        <input name="view" type="hidden" value="planning" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(10rem,0.7fr)_minmax(12rem,1fr)_minmax(14rem,1.2fr)_auto] xl:items-end">
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Base Year
            <select className={inputClass()} defaultValue={String(data.filters.baseYear)} name="year">
              {data.baseYears.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Company
            <select className={inputClass()} defaultValue={data.filters.companyId} name="companyId">
              {data.companies.map((company) => <option key={company.value} value={company.value}>{company.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            PR Category
            <select className={inputClass()} defaultValue={data.filters.categoryId} name="categoryId">
              {data.categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" type="submit">
              Apply Filters
            </button>
            <Link className="inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href="/dashboard?view=planning">
              Reset
            </Link>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">Forecast Year: <span className="font-semibold tabular-nums text-ink">{data.filters.forecastYear}</span></p>
      </form>

      <section aria-label="Budget planning summary" className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-5">
          {summaryItems.map((item) => (
            <div className="min-w-0 bg-panel p-4" key={item.label}>
              <p className="text-sm font-semibold text-muted">{item.label}</p>
              <p className="mt-2 break-words text-lg font-bold leading-6 tabular-nums text-ink" title={formatTHB(item.value)}>{formatTHB(item.value)}</p>
              <p className="mt-1 text-xs text-muted">{item.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <BudgetPlanningCategoryChart rows={data.categoryRows} />

      <section aria-label="Budget plan by PR Category" className="min-w-0 space-y-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Budget plan by PR Category</h2>
          <p className="mt-1 text-sm text-muted">เปรียบเทียบยอดใช้จริงและภาระผูกพันตามหมวดหมู่ PR</p>
        </div>
        <TableWrap>
          <div className="overflow-x-auto">
            <table aria-label="Budget plan by PR Category" className="w-full min-w-[1050px] border-collapse">
              <thead className={tableHeaderClass}>
                <tr>
                  <th className="px-4 py-3" scope="col">Category</th>
                  <th className="px-4 py-3 text-right" scope="col">Actual PR</th>
                  <th className="px-4 py-3 text-right" scope="col">Actual Spend</th>
                  <th className="px-4 py-3 text-right" scope="col">Recurring in Actual</th>
                  <th className="px-4 py-3 text-right" scope="col">Non-recurring Actual</th>
                  <th className="px-4 py-3 text-right" scope="col">Active Schedules</th>
                  <th className="px-4 py-3 text-right" scope="col">Next-year Recurring</th>
                  <th className="px-4 py-3 text-right" scope="col">Planning Baseline</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryRows.map((row) => (
                  <tr key={row.categoryId || "not-categorized"}>
                    <th className={cn(tableCellClass, "text-left font-normal")} scope="row">
                      <div className="flex items-start gap-2">
                        <div>
                          {row.categoryId ? (
                            <Link
                              className="inline-flex min-h-10 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              href={buildBudgetPlanningHref({
                                ...data.filters,
                                categoryId: row.categoryId,
                              })}
                            >
                              {row.categoryCode}
                            </Link>
                          ) : (
                            <span>Not categorized</span>
                          )}
                          {row.categoryId ? <p className="mt-0.5 text-xs text-muted">{row.categoryName}</p> : null}
                        </div>
                        {!row.categoryIsActive && row.categoryId ? <Badge>Inactive</Badge> : null}
                      </div>
                    </th>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>{row.actualPrCount}</td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>{formatAmount(row.actualSpend)}</td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>{formatAmount(row.recurringIncludedInActual)}</td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>{formatAmount(row.nonRecurringActual)}</td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>{row.activeScheduleCount}</td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>{formatAmount(row.activeRecurringForecast)}</td>
                    <td className={cn(tableCellClass, "text-right font-bold tabular-nums text-ink")}>{formatAmount(row.planningBaseline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hasActual && !hasRecurring ? (
            <p className="border-t border-border px-4 py-6 text-center text-sm text-muted">ไม่พบข้อมูลวางแผนงบตาม filter ที่เลือก</p>
          ) : (
            <div className="border-t border-border px-4 py-3 text-sm text-muted">
              {!hasActual ? <p>ยังไม่มี Actual PR สถานะ Generated, Printed หรือ Signed ในปีที่เลือก</p> : null}
              {!hasRecurring ? <p>ยังไม่มี Active Recurring PR สำหรับปี Forecast</p> : null}
            </div>
          )}
        </TableWrap>
      </section>

      <section aria-labelledby="planning-methodology" className="rounded-lg border border-border bg-panel p-4">
        <h2 className="text-sm font-bold text-ink" id="planning-methodology">Methodology</h2>
        <p className="mt-2 font-semibold text-ink">Planning Baseline = Non-recurring Actual + Active Recurring Forecast</p>
        <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted">Actual รวมเฉพาะ PR สถานะ Generated, Printed และ Signed ส่วน Forecast รวมเฉพาะ Active schedules ตามราคาปัจจุบันโดยไม่คิด uplift</p>
      </section>
    </div>
  );
}
