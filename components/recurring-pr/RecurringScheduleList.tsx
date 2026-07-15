import Link from "next/link";
import { CalendarClock, Filter, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import type { RecurringScheduleFilters, RecurringScheduleOptions, RecurringScheduleRow } from "@/lib/recurring-pr";
import { formatDate, formatDateTime } from "@/lib/utils";

type Props = { canManage: boolean; filters: RecurringScheduleFilters; options: RecurringScheduleOptions; rows: RecurringScheduleRow[]; summary: { active: number; needsAttention: number; paused: number; upcoming: number } };

function buildHref(filters: Partial<RecurringScheduleFilters> = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.categoryId && filters.categoryId !== "ALL") params.set("categoryId", filters.categoryId);
  if (filters.responsibleUserId && filters.responsibleUserId !== "ALL") params.set("responsibleUserId", filters.responsibleUserId);
  if (filters.upcoming && filters.upcoming !== "ALL") params.set("upcoming", filters.upcoming);
  const query = params.toString();
  return `/recurring-pr${query ? `?${query}` : ""}`;
}

function statusTone(status: RecurringScheduleRow["status"]) {
  return status === "ACTIVE" ? "active" : status === "PAUSED" ? "neutral" : "warning";
}

export function RecurringScheduleList({ canManage, filters, options, rows, summary }: Props) {

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Recurring PR</h1>
          <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted">Annual renewal schedules create reviewable Draft PRs before each renewal date.</p>
        </div>
        {canManage ? <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90" href="/pr"><Plus aria-hidden className="h-4 w-4" />Create from PR</Link> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Schedule summary">
        {[["Active", summary.active], ["Upcoming", summary.upcoming], ["Needs attention", summary.needsAttention], ["Paused", summary.paused]].map(([label, count]) => (
          <div className="rounded-md border border-border bg-panel px-4 py-3" key={String(label)}><div className="text-sm font-semibold text-muted">{label}</div><div className="mt-1 text-lg font-bold tabular-nums text-ink">{count}</div></div>
        ))}
      </div>

      <form className="grid gap-3 rounded-lg border border-border bg-panel p-4 lg:grid-cols-[minmax(14rem,1fr)_10rem_13rem_13rem_9rem_auto] lg:items-end" method="get">
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Search<input className={inputClass()} defaultValue={filters.q} name="q" placeholder="Schedule, category, owner" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Status<select className={inputClass()} defaultValue={filters.status} name="status"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="NEEDS_ATTENTION">Needs attention</option><option value="PAUSED">Paused</option></select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Category<select className={inputClass()} defaultValue={filters.categoryId} name="categoryId"><option value="ALL">All categories</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Responsible<select className={inputClass()} defaultValue={filters.responsibleUserId} name="responsibleUserId"><option value="ALL">All users</option>{options.responsibleUsers.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Upcoming<select className={inputClass()} defaultValue={filters.upcoming} name="upcoming"><option value="ALL">Any date</option><option value="30">Within 30 days</option><option value="60">Within 60 days</option><option value="90">Within 90 days</option></select></label>
        <div className="flex gap-2"><Button type="submit" variant="secondary"><Filter aria-hidden className="h-4 w-4" />Apply</Button><Link className="inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-ink hover:bg-surface" href={buildHref()}>Reset</Link></div>
      </form>

      <TableWrap>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead><tr>{["Schedule", "Category", "Renewal", "Lead", "Responsible", "Next Draft", "Last Run", "Status", "Actions"].map((head) => <th className={`${tableHeaderClass} ${head === "Actions" ? "sticky right-0 z-20 bg-slate-50" : ""} px-4 py-3`} key={head}>{head}</th>)}</tr></thead>
            <tbody>{rows.length ? rows.map((row) => (
              <tr className="align-top hover:bg-slate-50" key={row.id}>
                <td className={`${tableCellClass} min-w-56`}><Link className="font-bold text-primary hover:underline" href={`/recurring-pr/${row.id}`}>{row.name}</Link>{row.sourcePurchaseRequest ? <div className="mt-1 text-xs font-semibold text-muted">Source: {row.sourcePurchaseRequest.label}</div> : null}</td>
                <td className={`${tableCellClass} min-w-44 text-xs font-semibold text-muted`}>{row.category.label}</td>
                <td className={`${tableCellClass} whitespace-nowrap`}>{row.renewalMonth}/{row.renewalDay}</td>
                <td className={`${tableCellClass} whitespace-nowrap`}>{row.leadDays} days</td>
                <td className={`${tableCellClass} min-w-40`}>{row.responsibleUser.name}</td>
                <td className={`${tableCellClass} whitespace-nowrap font-semibold`}>{formatDate(row.nextRunDate)}</td>
                <td className={`${tableCellClass} min-w-40 text-xs text-muted`}>{row.lastRun ? `${row.lastRun.status} · ${formatDateTime(row.lastRun.occurredAt)}` : "Not run yet"}</td>
                <td className={tableCellClass}><Badge tone={statusTone(row.status)}>{row.status === "NEEDS_ATTENTION" ? "Needs attention" : row.status}</Badge></td>
                <td className={`${tableCellClass} sticky right-0 z-10 min-w-28 bg-panel`}><div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-xs font-semibold text-ink hover:bg-surface" href={`/recurring-pr/${row.id}`}>View</Link>{canManage ? <Link aria-label={`Edit ${row.name}`} className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-xs font-semibold text-ink hover:bg-surface" href={`/recurring-pr/${row.id}/edit`}><Pencil aria-hidden className="h-4 w-4" /></Link> : null}</div></td>
              </tr>
            )) : <tr><td className="px-4 py-12 text-center" colSpan={9}><CalendarClock aria-hidden className="mx-auto h-5 w-5 text-muted" /><div className="mt-3 text-sm font-bold text-ink">No recurring schedules match this view</div><p className="mt-1 text-sm text-muted">Adjust filters or create a schedule from an existing PR.</p></td></tr>}</tbody>
          </table>
        </div>
      </TableWrap>
    </div>
  );
}
