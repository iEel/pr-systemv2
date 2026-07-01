import Link from "next/link";
import { Filter, Plus, Power, RotateCcw, Save } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import {
  buildBudgetMasterHref,
  getBudgetMasterPageData,
  type BudgetMasterFilters,
  type BudgetMasterOption,
  type BudgetMasterRow,
} from "@/lib/budget-master";
import { createBudgetAction, deactivateBudgetAction, reactivateBudgetAction, updateBudgetAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function linkButtonClass(tone: "danger" | "primary" | "secondary" = "secondary") {
  const tones = {
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    primary: "border-primary bg-primary text-white hover:bg-primary/90",
    secondary: "border-border bg-panel text-ink hover:bg-surface",
  };

  return `inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${tones[tone]}`;
}

function redirectInputs(filters: BudgetMasterFilters) {
  return (
    <>
      <input name="redirectYear" type="hidden" value={filters.year} />
      <input name="redirectCompanyId" type="hidden" value={filters.companyId} />
      <input name="includeInactive" type="hidden" value={filters.includeInactive ? "1" : "0"} />
    </>
  );
}

function yearOptions(activeYear: number) {
  const years = new Set([activeYear - 1, activeYear, activeYear + 1, new Date().getFullYear()]);

  return Array.from(years).sort((a, b) => b - a);
}

function selectOptions(options: BudgetMasterOption[]) {
  return options.map((option) => (
    <option key={option.id} value={option.id}>
      {option.label}
    </option>
  ));
}

function summaryCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <div className="text-xs font-bold uppercase text-muted">{label}</div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted">{detail}</div>
    </Card>
  );
}

function filterForm({
  companies,
  filters,
}: {
  companies: BudgetMasterOption[];
  filters: BudgetMasterFilters;
}) {
  return (
    <form className="grid gap-3 rounded-lg border border-border bg-panel p-4 lg:grid-cols-[10rem_minmax(14rem,1fr)_auto_auto]" method="get">
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Year
        <select className={inputClass()} defaultValue={filters.year} name="year">
          {yearOptions(filters.year).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Company
        <select className={inputClass()} defaultValue={filters.companyId} name="companyId">
          <option value="ALL">All companies</option>
          {selectOptions(companies)}
        </select>
      </label>
      <label className="inline-flex min-h-10 items-center gap-2 self-end text-sm font-bold text-ink">
        <input className="h-4 w-4 rounded border-border" defaultChecked={filters.includeInactive} name="includeInactive" type="checkbox" value="1" />
        Include inactive
      </label>
      <div className="flex items-end gap-2">
        <Button className="min-h-10" type="submit">
          <Filter aria-hidden className="h-4 w-4" />Apply
        </Button>
        <Link className={linkButtonClass()} href="/masters/budgets">
          Reset
        </Link>
      </div>
    </form>
  );
}

function createBudgetForm({
  branches,
  companies,
  departments,
  filters,
}: {
  branches: BudgetMasterOption[];
  companies: BudgetMasterOption[];
  departments: BudgetMasterOption[];
  filters: BudgetMasterFilters;
}) {
  return (
    <Card className="border-blue-200 bg-white shadow-none">
      <form action={createBudgetAction} className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Create Budget</h2>
            <p className="mt-1 text-sm leading-6 text-muted">เพิ่มงบประมาณ IT รายปีสำหรับ company, optional branch, และ department</p>
          </div>
          <Badge tone="neutral">SQL Server</Badge>
        </div>
        <input name="includeInactive" type="hidden" value={filters.includeInactive ? "1" : "0"} />
        <div className="grid gap-4 lg:grid-cols-5">
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Year
            <input className={inputClass()} defaultValue={filters.year} min="2000" name="year" required type="number" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Company
            <select className={inputClass()} defaultValue={filters.companyId === "ALL" ? "" : filters.companyId} name="companyId" required>
              <option value="">Select company</option>
              {selectOptions(companies)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Branch
            <select className={inputClass()} name="branchId">
              <option value="">All branches</option>
              {selectOptions(branches)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Department
            <select className={inputClass()} name="departmentId" required>
              <option value="">Select department</option>
              {selectOptions(departments)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Budget Amount
            <input className={inputClass("text-right")} inputMode="decimal" name="budgetAmount" placeholder="0.00" required />
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            <Plus aria-hidden className="h-4 w-4" />Create Budget
          </Button>
        </div>
      </form>
    </Card>
  );
}

function budgetRow({ filters, row }: { filters: BudgetMasterFilters; row: BudgetMasterRow }) {
  return (
    <tr key={row.id} className="align-top hover:bg-slate-50">
      <td className={`${tableCellClass} min-w-64`}>
        <div className="font-bold text-ink">{row.companyName}</div>
        <div className="mt-1 text-xs font-semibold text-muted">{row.branchName}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="neutral">{row.year}</Badge>
          <Badge tone={row.isActive ? "active" : "neutral"}>{row.status}</Badge>
        </div>
      </td>
      <td className={`${tableCellClass} min-w-40`}>
        <div className="font-bold text-ink">{row.departmentName}</div>
        <div className="mt-1 break-all text-xs font-semibold text-muted">{row.scopeKey}</div>
      </td>
      <td className={`${tableCellClass} min-w-[28rem]`}>
        <form action={updateBudgetAction} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          {redirectInputs(filters)}
          <input name="budgetId" type="hidden" value={row.id} />
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Budget
            <input className={inputClass("text-right")} defaultValue={row.budgetAmountText} inputMode="decimal" name="budgetAmount" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Used
            <input className={inputClass("text-right")} defaultValue={row.usedAmountText} inputMode="decimal" name="usedAmount" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Reserved
            <input className={inputClass("text-right")} defaultValue={row.reservedAmountText} inputMode="decimal" name="reservedAmount" />
          </label>
          <Button className="min-h-10 px-3" type="submit" variant="secondary">
            <Save aria-hidden className="h-4 w-4" />Update Budget
          </Button>
        </form>
      </td>
      <td className={`${tableCellClass} min-w-36 text-right`}>
        <div className={`font-bold ${row.remainingAmount < 0 ? "text-red-700" : "text-emerald-700"}`}>{row.remainingAmountText}</div>
        <div className="mt-1 text-xs font-semibold text-muted">remaining</div>
      </td>
      <td className={`${tableCellClass} min-w-36`}>
        {row.isActive ? (
          <form action={deactivateBudgetAction}>
            {redirectInputs(filters)}
            <input name="budgetId" type="hidden" value={row.id} />
            <Button className="min-h-10 w-full" type="submit" variant="danger">
              <Power aria-hidden className="h-4 w-4" />Deactivate
            </Button>
          </form>
        ) : (
          <form action={reactivateBudgetAction}>
            {redirectInputs(filters)}
            <input name="budgetId" type="hidden" value={row.id} />
            <Button className="min-h-10 w-full" type="submit" variant="success">
              <RotateCcw aria-hidden className="h-4 w-4" />Reactivate
            </Button>
          </form>
        )}
      </td>
    </tr>
  );
}

function budgetTable({ filters, rows }: { filters: BudgetMasterFilters; rows: BudgetMasterRow[] }) {
  return (
    <TableWrap>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse">
          <thead>
            <tr>
              {["Company / Branch", "Department", "Budget Controls", "Remaining", "State"].map((head) => (
                <th className={`${tableHeaderClass} px-4 py-3`} key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm font-semibold text-muted" colSpan={5}>
                  No budget rows match this filter. Create a budget or include inactive rows.
                </td>
              </tr>
            ) : (
              rows.map((row) => budgetRow({ filters, row }))
            )}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const { branches, companies, departments, filters, rows, totals } = await getBudgetMasterPageData(params);

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="Budget Master"
          description="จัดการงบประมาณ IT รายปีที่ Dashboard และ Reports ใช้คำนวณ allocated, used, reserved, และ remaining"
          action={
            <Link className={linkButtonClass("primary")} href={buildBudgetMasterHref({ ...filters, includeInactive: true })}>
              Show active + inactive
            </Link>
          }
        />

        {filterForm({ companies, filters })}

        <div className="grid gap-4 lg:grid-cols-5">
          {summaryCard({ detail: `${totals.activeRows}/${totals.rowCount} active visible rows`, label: "Allocated", value: totals.allocatedAmountText })}
          {summaryCard({ detail: "Generated, printed, signed PR usage", label: "Used", value: totals.usedAmountText })}
          {summaryCard({ detail: "Reserved amount maintained by admin", label: "Reserved", value: totals.reservedAmountText })}
          {summaryCard({ detail: "Allocated minus used and reserved", label: "Remaining", value: totals.remainingAmountText })}
          {summaryCard({ detail: filters.includeInactive ? "Including inactive rows" : "Active rows only", label: "Rows", value: String(totals.rowCount) })}
        </div>

        {createBudgetForm({ branches, companies, departments, filters })}

        <div className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Empty branch means <span className="font-bold">All branches</span>. Deactivate hides a budget from dashboard/report active totals without deleting audit history.
          </span>
          {filters.includeInactive ? (
            <Link className={linkButtonClass()} href={buildBudgetMasterHref({ ...filters, includeInactive: false })}>
              Hide inactive
            </Link>
          ) : null}
        </div>

        {budgetTable({ filters, rows })}
      </div>
    </AppFrame>
  );
}
