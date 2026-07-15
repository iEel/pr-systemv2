import Link from "next/link";
import { notFound } from "next/navigation";
import { Pause, Pencil, Play, ShieldAlert } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/auth/permissions";
import { getRecurringScheduleDetail } from "@/lib/recurring-pr";
import { formatDate, formatDateTime } from "@/lib/utils";
import { pauseRecurringScheduleAction, resumeRecurringScheduleAction } from "../actions";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  return status === "ACTIVE" || status === "SUCCEEDED" ? "active" : status === "PAUSED" ? "neutral" : status === "FAILED" || status === "NEEDS_ATTENTION" ? "warning" : "info";
}

export default async function RecurringScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const detail = await getRecurringScheduleDetail(id);
  if (!detail) notFound();
  const canManage = hasPermission(user.role, "PR_RECURRING_MANAGE");

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title={detail.name}
          description="Annual PR renewal configuration, next operational action, and completed run record."
          action={<div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(detail.status)}>{detail.status === "NEEDS_ATTENTION" ? "Needs attention" : detail.status}</Badge>{canManage ? <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" href={`/recurring-pr/${id}/edit`}><Pencil aria-hidden className="h-4 w-4" />Edit</Link> : null}</div>}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <Card>
              <h2 className="text-base font-bold text-ink">Schedule configuration</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[["Category", detail.category.label], ["Renewal", `${detail.renewalMonth}/${detail.renewalDay}`], ["Lead", `${detail.leadDays} days`], ["Responsible", detail.responsibleUser.name], ["Next Draft", formatDate(detail.nextRunDate)]].map(([label, value]) => <div key={label}><div className="text-xs font-bold text-muted">{label}</div><div className="mt-1 text-sm font-semibold text-ink">{value}</div></div>)}
                <div><div className="text-xs font-bold text-muted">Source PR</div><div className="mt-1 text-sm font-semibold text-ink">{detail.sourcePurchaseRequest ? <Link className="text-primary hover:underline" href={`/pr/${detail.sourcePurchaseRequest.id}`}>{detail.sourcePurchaseRequest.label}</Link> : "No source PR"}</div></div>
              </div>
            </Card>
            <TableWrap>
              <div className="border-b border-border px-4 py-3"><h2 className="text-base font-bold text-ink">Run history</h2></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[780px] border-collapse"><thead><tr>{["Year", "Renewal", "Draft date", "Status", "Generated Draft", "Note"].map((head) => <th className={`${tableHeaderClass} px-4 py-3`} key={head}>{head}</th>)}</tr></thead><tbody>{detail.runs.length ? detail.runs.map((run) => <tr className="align-top" key={run.id}><td className={tableCellClass}>{run.occurrenceYear}</td><td className={`${tableCellClass} whitespace-nowrap`}>{formatDate(run.renewalDate)}</td><td className={`${tableCellClass} whitespace-nowrap`}>{formatDate(run.scheduledDraftDate)}</td><td className={tableCellClass}><Badge tone={statusTone(run.status)}>{run.status}</Badge></td><td className={tableCellClass}>{run.purchaseRequest ? <Link className="font-semibold text-primary hover:underline" href={`/pr/${run.purchaseRequest.id}`}>{run.purchaseRequest.label}</Link> : "-"}</td><td className={`${tableCellClass} max-w-xs text-sm text-muted`}>{run.status === "FAILED" ? "Could not complete the recurring draft. Review the schedule references and configuration before the next action." : "-"}</td></tr>) : <tr><td className="px-4 py-10 text-center text-sm text-muted" colSpan={6}>No runs recorded yet.</td></tr>}</tbody></table></div>
            </TableWrap>
          </div>
          <aside className="space-y-5">
            <Card className={detail.status === "NEEDS_ATTENTION" ? "border-amber-200 bg-amber-50 shadow-none" : undefined}>
              <div className="flex gap-3"><ShieldAlert aria-hidden className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="text-base font-bold text-ink">Next action</h2><p className="mt-1 text-sm leading-6 text-muted">{detail.status === "NEEDS_ATTENTION" ? "Resolve inactive references or review the latest failed run before relying on this schedule." : `The next Draft is planned for ${formatDate(detail.nextRunDate)}.`}</p></div></div>
            </Card>
            {detail.latestGeneratedDraft ? <Card><h2 className="text-base font-bold text-ink">Generated Draft</h2><Link className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline" href={`/pr/${detail.latestGeneratedDraft.id}`}>{detail.latestGeneratedDraft.label}</Link></Card> : null}
            {canManage ? <Card><h2 className="text-base font-bold text-ink">Schedule state</h2><p className="mt-1 text-sm leading-6 text-muted">Pausing preserves the configuration and stops future worker processing.</p>{detail.status === "PAUSED" ? <form action={resumeRecurringScheduleAction.bind(null, id)} className="mt-4"><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90" type="submit"><Play aria-hidden className="h-4 w-4" />Resume</button></form> : <form action={pauseRecurringScheduleAction.bind(null, id)} className="mt-4"><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90" type="submit"><Pause aria-hidden className="h-4 w-4" />Pause</button></form>}</Card> : null}
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
