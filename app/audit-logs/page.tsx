import Link from "next/link";
import { Activity, Database, ExternalLink, Eye, Filter, Search, ShieldCheck, X } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { requirePermission } from "@/lib/auth/current-user";
import {
  buildAuditFilterChips,
  buildAuditLogCloseDetailHref,
  buildAuditLogExportHref,
  buildAuditLogExportLabel,
  buildAuditLogInspectHref,
  getAuditLogById,
  getAuditLogList,
  type AuditLogFilters,
  type AuditLogListItem,
} from "@/lib/audit-logs";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(params: Awaited<SearchParams>, key: keyof AuditLogFilters) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function buildFilters(params: Awaited<SearchParams>): AuditLogFilters {
  return {
    action: readParam(params, "action"),
    actorId: readParam(params, "actorId"),
    dateFrom: readParam(params, "dateFrom"),
    dateTo: readParam(params, "dateTo"),
    entityType: readParam(params, "entityType"),
    eventId: readParam(params, "eventId"),
    q: readParam(params, "q"),
  };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-border py-3 first:border-t-0 first:pt-0">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function SelectedEventPanel({
  closeHref,
  eventId,
  item,
}: {
  closeHref: string;
  eventId?: string;
  item: AuditLogListItem | null;
}) {
  if (!item) {
    return (
      <Card className="min-[1800px]:sticky min-[1800px]:top-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-ink">Selected Event</div>
            <p className="mt-1 text-sm leading-6 text-muted">
              {eventId ? "ไม่พบ audit event ที่เลือก อาจถูกกรองออกหรือไม่มีอยู่ในระบบ" : "กด Inspect ที่แถว audit log เพื่อดูหลักฐาน รายละเอียด metadata และ source ของเหตุการณ์"}
            </p>
          </div>
          {eventId ? (
            <Link className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted hover:bg-surface hover:text-ink" href={closeHref} title="Close selected event">
              <X aria-hidden className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card className="min-[1800px]:sticky min-[1800px]:top-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-ink">Selected Event</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={item.category.tone}>{item.category.label}</Badge>
            <span className="text-xs font-semibold text-muted">Category</span>
          </div>
        </div>
        <Link className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted hover:bg-surface hover:text-ink" href={closeHref} title="Close selected event">
          <X aria-hidden className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3">
        <div className="text-base font-bold text-ink">{item.action}</div>
        <div className="mt-1 text-xs font-semibold text-blue-800">{formatDateTime(item.date)}</div>
      </div>

      <dl className="mt-4">
        <DetailRow label="Event ID">
          <code className="text-xs">{item.id}</code>
        </DetailRow>
        <DetailRow label="Actor">
          {item.actor}
          <span className="ml-2 text-xs text-muted">{item.actorUsername || "system"}</span>
        </DetailRow>
        <DetailRow label="Target">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{item.entityType}</Badge>
            {item.entityHref ? (
              <Link className="inline-flex items-center gap-1 text-primary hover:text-primary/80" href={item.entityHref}>
                <code className="text-xs">{item.entityId}</code>
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <code className="text-xs">{item.entityId}</code>
            )}
          </div>
        </DetailRow>
        <DetailRow label="Detail">{item.detail}</DetailRow>
        <DetailRow label="Source">
          <div className="grid gap-1">
            <span>{item.ipAddress || "-"}</span>
            <span className="text-xs font-medium leading-5 text-muted">{item.userAgent || "-"}</span>
          </div>
        </DetailRow>
      </dl>

      <div className="mt-4">
        <div className="text-xs font-bold text-muted">Metadata</div>
        {item.metadataEntries.length ? (
          <div className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
            {item.metadataEntries.map((entry) => (
              <div className="grid min-w-0 gap-1 px-3 py-2" key={entry.key}>
                <div className="text-xs font-bold text-muted">{entry.key}</div>
                <code className="block min-w-0 whitespace-pre-wrap break-all text-xs font-semibold leading-5 text-ink">{entry.value}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted">No structured metadata</p>
        )}
      </div>
    </Card>
  );
}

export default async function AuditLogsPage({ searchParams }: { searchParams?: SearchParams }) {
  await requirePermission("AUDIT_VIEW");

  const params = searchParams ? await searchParams : {};
  const filters = buildFilters(params);
  const data = await getAuditLogList(filters);
  const selectedEvent = filters.eventId ? await getAuditLogById(filters.eventId) : null;
  const latest = data.items[0] || null;
  const actorLabels = Object.fromEntries(data.actors.map((actor) => [actor.id, `${actor.displayName} (${actor.username})`]));
  const filterChips = buildAuditFilterChips(filters, { actorLabels });
  const exportLabel = buildAuditLogExportLabel(data.total, filters);
  const actorCount = new Set(data.items.map((item) => item.actor).filter(Boolean)).size;

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="Audit Logs"
          description="ตรวจสอบกิจกรรมสำคัญของระบบ PR, Template, Running Number และการทำงานของผู้ใช้แบบย้อนหลัง"
          action={
            <div className="flex flex-col items-start gap-1 sm:items-end" data-export-copy="Export filtered CSV">
              <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href={buildAuditLogExportHref(filters)}>
                {exportLabel.label}
              </Link>
              <p className="max-w-72 text-xs font-semibold leading-5 text-muted" title="CSV exports up to 1,000 rows">
                {exportLabel.note}
              </p>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="shadow-none">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-primary">
                <Activity aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-muted">Matched Events</div>
                <div className="text-2xl font-bold text-ink">{data.total}</div>
              </div>
            </div>
          </Card>
          <Card className="shadow-none">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-50 text-violet-700">
                <Filter aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-muted">Active Filters</div>
                <div className="text-2xl font-bold text-ink">{filterChips.length}</div>
              </div>
            </div>
          </Card>
          <Card className="shadow-none">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-muted">Actors in View</div>
                <div className="text-2xl font-bold text-ink">{actorCount}</div>
              </div>
            </div>
          </Card>
          <Card className="shadow-none">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <Database aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-muted">Latest Event</div>
                <div className="text-sm font-bold text-ink">{latest ? formatDateTime(latest.date) : "-"}</div>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <form className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_0.9fr_0.9fr_auto_auto] lg:items-end">
            {filters.eventId ? <input name="eventId" type="hidden" value={filters.eventId} /> : null}
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Search
              <div className="relative">
                <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input className={inputClass("pl-10")} defaultValue={filters.q} name="q" placeholder="PR No., action, actor, metadata, file name, hash" />
              </div>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Entity
              <select className={inputClass()} defaultValue={filters.entityType} name="entityType">
                <option value="">All entities</option>
                {data.entityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Action
              <select className={inputClass()} defaultValue={filters.action} name="action">
                <option value="">All actions</option>
                {data.actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Actor
              <select className={inputClass()} defaultValue={filters.actorId} name="actorId">
                <option value="">All actors</option>
                {data.actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.displayName} ({actor.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              From
              <input className={inputClass()} defaultValue={filters.dateFrom} name="dateFrom" type="date" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              To
              <input className={inputClass()} defaultValue={filters.dateTo} name="dateTo" type="date" />
            </label>
            <Button type="submit">
              <Filter aria-hidden className="h-4 w-4" />
              Apply
            </Button>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href="/audit-logs">
              Reset
            </Link>
          </form>

          <div className="mt-4 border-t border-border pt-4">
            <div className="text-xs font-bold text-muted">Active filters</div>
            {filterChips.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {filterChips.map((chip) => (
                  <Link className="inline-flex min-h-8 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100" href={chip.href} key={chip.key}>
                    <span>
                      {chip.label}: {chip.value}
                    </span>
                    <X aria-hidden className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-muted">No active filters. Export will use the newest audit records.</p>
            )}
          </div>
        </Card>

        <div className="grid gap-5 min-[1800px]:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="order-2 min-[1800px]:order-1">
            <TableWrap>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-[8.5rem]" />
                  <col className="w-[12rem]" />
                  <col className="w-[14rem]" />
                  <col className="w-[7rem]" />
                  <col />
                  <col className="w-[8.5rem]" data-column="inspect" />
                </colgroup>
                <thead>
                  <tr>
                    {["Date", "Event", "Target", "Actor", "Evidence", "Inspect"].map((head) => (
                      <th className={`${tableHeaderClass} sticky top-0 px-4 py-3`} key={head}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.length ? (
                    data.items.map((item) => {
                      const isSelected = item.id === filters.eventId;

                      return (
                        <tr className={`align-top hover:bg-slate-50 ${isSelected ? "bg-blue-50/60" : ""}`} key={item.id}>
                          <td className={`${tableCellClass} whitespace-nowrap font-semibold text-ink`}>{formatDateTime(item.date)}</td>
                          <td className={tableCellClass}>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={item.category.tone}>{item.category.label}</Badge>
                            </div>
                            <div className="mt-2 font-bold text-ink">{item.action}</div>
                            <code className="mt-1 block max-w-[14rem] truncate text-xs text-muted">{item.id}</code>
                          </td>
                          <td className={tableCellClass}>
                            <div className="flex flex-col gap-2">
                              <Badge tone="neutral">{item.entityType}</Badge>
                              {item.entityHref ? (
                                <Link className="inline-flex max-w-[16rem] items-center gap-1 truncate text-sm font-semibold text-primary hover:text-primary/80" href={item.entityHref}>
                                  <code className="truncate">{item.entityId}</code>
                                  <ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0" />
                                </Link>
                              ) : (
                                <code className="max-w-[16rem] truncate text-sm text-muted">{item.entityId}</code>
                              )}
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-semibold text-ink">{item.actor}</div>
                            <div className="mt-1 text-xs text-muted">{item.actorUsername || "system"}</div>
                          </td>
                          <td className={`${tableCellClass} max-w-[26rem]`}>
                            <p className="leading-6 text-ink">{item.detail}</p>
                            {item.evidencePreview.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.evidencePreview.map((evidence) => (
                                  <span className="max-w-[13rem] truncate rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted" key={evidence}>
                                    {evidence}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 max-w-[22rem] truncate text-xs font-semibold text-muted">{item.sourceSummary}</div>
                          </td>
                          <td className={tableCellClass}>
                            <Link
                              className={`inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-bold ${
                                isSelected ? "border-blue-200 bg-blue-50 text-blue-800" : "border-border bg-panel text-ink hover:bg-surface"
                              }`}
                              href={buildAuditLogInspectHref(filters, item.id)}
                            >
                              <Eye aria-hidden className="h-4 w-4" />
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="border-t border-border px-4 py-12 text-center text-sm font-semibold text-muted" colSpan={6}>
                        ไม่พบ audit log ตามเงื่อนไขที่เลือก ลองลบ Active filter หรือค้นหาด้วย PR No., action, actor, file name หรือ hash ที่กว้างขึ้น
                      </td>
                    </tr>
                  )}
                </tbody>
                </table>
              </div>
            </TableWrap>
          </div>

          <div className="order-1 min-[1800px]:order-2">
            <SelectedEventPanel closeHref={buildAuditLogCloseDetailHref(filters)} eventId={filters.eventId} item={selectedEvent} />
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
