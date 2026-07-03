"use client";

import Link from "next/link";
import { ArrowRight, Download, Eye, FileText, LayoutGrid, List, MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { filterPurchaseRequests } from "@/lib/pr-filters";
import { buildPurchaseRequestRowActions } from "@/lib/pr-list-actions";
import type { PurchaseRequestListItem } from "@/lib/purchase-requests";
import type { PRStatus } from "@/lib/status";
import { getStatusConfig } from "@/lib/status";
import { formatDate, formatTHB } from "@/lib/utils";

const statuses: Array<PRStatus | "All"> = ["All", "Draft", "Generated", "Printed", "Signed", "Cancelled", "Reissued"];
const activeBoardColumns: PRStatus[] = ["Draft", "Generated", "Printed"];
type ArchiveStatus = Extract<PRStatus, "Signed" | "Cancelled" | "Reissued">;
const completedArchiveStatuses: ArchiveStatus[] = ["Signed", "Cancelled", "Reissued"];
const archivePanelLabels: Record<ArchiveStatus, string> = {
  Signed: "Latest Signed",
  Cancelled: "Latest Cancelled",
  Reissued: "Latest Reissued",
};
type ViewMode = "table" | "board";

function nextBoardAction(request: PurchaseRequestListItem) {
  const actions = buildPurchaseRequestRowActions(request);

  if (request.status === "Draft") return { href: actions.detailHref, label: "Issue PR" };
  if (request.status === "Generated") return { href: actions.detailHref, label: "Mark Printed" };
  if (request.status === "Printed") return { href: `/pr/${request.id}/upload-signed`, label: "Upload Signed" };
  if (request.status === "Signed") return { href: actions.detailHref, label: "Open Detail" };
  if (request.status === "Cancelled") return { href: actions.detailHref, label: "Reissue from Detail" };

  return { href: `/pr/new?cloneFrom=${encodeURIComponent(request.id)}`, label: "Clone as Draft" };
}

export function PRList({ requests }: { requests: PurchaseRequestListItem[] }) {
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("All");
  const [branch, setBranch] = useState("All");
  const [status, setStatus] = useState<PRStatus | "All">("All");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>("Signed");

  const companies = useMemo(() => ["All", ...Array.from(new Set(requests.map((item) => item.company)))], [requests]);
  const branches = useMemo(() => ["All", ...Array.from(new Set(requests.map((item) => item.branch)))], [requests]);
  const rows = useMemo(() => filterPurchaseRequests(requests, { search, company, branch, status }), [branch, company, requests, search, status]);
  const workflowRows = useMemo(() => rows.filter((item) => activeBoardColumns.includes(item.status)), [rows]);
  const archiveRows = useMemo(() => rows.filter((item) => completedArchiveStatuses.includes(item.status as ArchiveStatus)), [rows]);
  const visibleArchiveRows = useMemo(() => archiveRows.filter((item) => item.status === archiveStatus), [archiveRows, archiveStatus]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="PR Documents / รายการ PR ทั้งหมด"
        description="ค้นหาและติดตามสถานะเอกสาร Purchase Request ของแผนก IT จากฐานข้อมูล SQL Server"
        action={
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
            href="/pr/new"
          >
            <Plus aria-hidden className="h-4 w-4" />
            New PR
          </Link>
        }
      />
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(3,minmax(150px,0.5fr))_auto]">
          <label className="relative">
            <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={inputClass("pl-9")}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหา PR No., Company, Created By..."
              type="search"
              value={search}
            />
          </label>
          <select className={inputClass()} onChange={(event) => setCompany(event.target.value)} value={company}>
            {companies.map((item) => (
              <option key={item}>{item === "All" ? "Company ทั้งหมด" : item}</option>
            ))}
          </select>
          <select className={inputClass()} onChange={(event) => setBranch(event.target.value)} value={branch}>
            {branches.map((item) => (
              <option key={item}>{item === "All" ? "Branch ทั้งหมด" : item}</option>
            ))}
          </select>
          <select className={inputClass()} onChange={(event) => setStatus(event.target.value as PRStatus | "All")} value={status}>
            {statuses.map((item) => (
              <option key={item}>{item === "All" ? "Status ทั้งหมด" : item}</option>
            ))}
          </select>
          <div className="inline-flex min-h-10 rounded-md border border-border bg-slate-50 p-1">
            {([
              { icon: List, label: "Table", value: "table" },
              { icon: LayoutGrid, label: "Board", value: "board" },
            ] satisfies Array<{ icon: typeof List; label: string; value: ViewMode }>).map((item) => {
              const Icon = item.icon;
              const isActive = viewMode === item.value;

              return (
                <button
                  aria-pressed={isActive}
                  className={`inline-flex items-center justify-center gap-2 rounded px-3 py-1.5 text-sm font-bold transition-colors ${
                    isActive ? "bg-panel text-primary shadow-sm" : "text-muted hover:bg-panel hover:text-ink"
                  }`}
                  key={item.value}
                  onClick={() => setViewMode(item.value)}
                  type="button"
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>
      {viewMode === "table" ? (
        <PRTable requests={requests} rows={rows} />
      ) : (
        <PRBoard
          archiveRows={archiveRows}
          archiveStatus={archiveStatus}
          requests={requests}
          setArchiveStatus={setArchiveStatus}
          visibleArchiveRows={visibleArchiveRows}
          workflowRows={workflowRows}
        />
      )}
    </div>
  );
}

function PRTable({ requests, rows }: { requests: PurchaseRequestListItem[]; rows: PurchaseRequestListItem[] }) {
  return (
    <TableWrap>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-muted">แสดง {rows.length} รายการ จาก {requests.length} รายการ</p>
        <Button variant="secondary">Export view</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse">
          <thead>
            <tr>
              {["PR No.", "Date", "Company", "Branch", "Total (บาท)", "Status", "Created By", "Action"].map((head) => (
                <th className={`${tableHeaderClass} px-4 py-3`} key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((request) => {
              const statusInfo = getStatusConfig(request.status);
              const actions = buildPurchaseRequestRowActions(request);
              return (
                <tr className="hover:bg-slate-50" key={request.id}>
                  <td className={`${tableCellClass} font-bold text-primary`}>
                    <Link href={actions.detailHref}>{request.prNo}</Link>
                  </td>
                  <td className={tableCellClass}>{formatDate(request.date)}</td>
                  <td className={`${tableCellClass} font-semibold text-ink`}>{request.company}</td>
                  <td className={tableCellClass}>{request.branch}</td>
                  <td className={`${tableCellClass} text-right font-semibold`}>{formatTHB(request.total)}</td>
                  <td className={tableCellClass}><Badge tone={statusInfo.tone}>{statusInfo.label}</Badge></td>
                  <td className={tableCellClass}>{request.createdBy}</td>
                  <td className={tableCellClass}>
                    <div className="flex items-center gap-1">
                      <Link aria-label={`Preview ${request.prNo}`} className="rounded-md p-2 text-muted hover:bg-surface hover:text-primary" href={actions.detailHref}>
                        <Eye aria-hidden className="h-4 w-4" />
                      </Link>
                      <Link aria-label={actions.primaryDownload.ariaLabel} className="rounded-md p-2 text-muted hover:bg-surface hover:text-primary" href={actions.primaryDownload.href}>
                        <Download aria-hidden className="h-4 w-4" />
                      </Link>
                      <details className="group relative">
                        <summary aria-label={`More actions for ${request.prNo}`} className="flex cursor-pointer list-none rounded-md p-2 text-muted hover:bg-surface hover:text-primary">
                          <MoreHorizontal aria-hidden className="h-4 w-4" />
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-border bg-panel py-1 text-left shadow-lg">
                          {actions.menuActions.map((action) => (
                            <Link
                              className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-surface hover:text-primary"
                              href={action.href}
                              key={`${request.id}-${action.label}`}
                              target={action.target}
                            >
                              {action.label}
                            </Link>
                          ))}
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-sm text-muted" colSpan={8}>
                  ไม่พบเอกสารตามเงื่อนไขที่เลือก ปรับ filter หรือสร้าง PR ใหม่
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );
}

function PRBoard({
  archiveRows,
  archiveStatus,
  requests,
  setArchiveStatus,
  visibleArchiveRows,
  workflowRows,
}: {
  archiveRows: PurchaseRequestListItem[];
  archiveStatus: ArchiveStatus;
  requests: PurchaseRequestListItem[];
  setArchiveStatus: (status: ArchiveStatus) => void;
  visibleArchiveRows: PurchaseRequestListItem[];
  workflowRows: PurchaseRequestListItem[];
}) {
  const archivePreviewLimit = 10;
  const archivePreviewRows = visibleArchiveRows.slice(0, archivePreviewLimit);
  const hiddenArchiveCount = Math.max(visibleArchiveRows.length - archivePreviewLimit, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-muted">Board view แสดง {workflowRows.length + archiveRows.length} รายการ จาก {requests.length} รายการ</p>
        <div className="text-xs font-semibold text-muted">Read-only workflow view • ใช้คำสั่งเอกสารจากหน้า Detail</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {activeBoardColumns.map((columnStatus) => {
          const statusInfo = getStatusConfig(columnStatus);
          const columnRows = workflowRows.filter((item) => item.status === columnStatus);

          return (
            <section className="min-h-72 rounded-lg border border-border bg-slate-50/70" key={columnStatus}>
              <div className="flex items-center justify-between border-b border-border px-3 py-3">
                <div className="flex items-center gap-2">
                  <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                  <span className="text-xs font-bold text-muted">{columnRows.length}</span>
                </div>
                <FileText aria-hidden className="h-4 w-4 text-muted" />
              </div>
              <div className="space-y-3 p-3">
                {columnRows.length > 0 ? (
                  columnRows.map((request) => <PRBoardCard key={request.id} request={request} />)
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-panel px-3 py-8 text-center text-sm font-semibold text-muted">
                    ไม่มี PR ในสถานะนี้
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <section className="rounded-lg border border-border bg-panel">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-bold text-ink">Completed / Archived</div>
            <div className="mt-1 text-xs font-semibold text-muted">
              งานที่จบแล้วหรือพักไว้ แยกจาก workflow หลักเพื่อไม่ให้คอลัมน์ Signed ยาวเกินไป
            </div>
          </div>
          <Badge tone="neutral">{archiveRows.length} รายการ</Badge>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          {completedArchiveStatuses.map((item) => {
            const statusInfo = getStatusConfig(item);
            const isActive = archiveStatus === item;
            const count = archiveRows.filter((request) => request.status === item).length;

            return (
              <button
                aria-pressed={isActive}
                className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-bold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-panel text-muted hover:bg-surface hover:text-ink"
                }`}
                key={item}
                onClick={() => setArchiveStatus(item)}
                type="button"
              >
                {statusInfo.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="p-3">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-sm font-bold text-ink">{archivePanelLabels[archiveStatus]}</div>
            <div className="text-xs font-semibold text-muted">
              แสดง {archivePreviewRows.length} จาก {visibleArchiveRows.length} รายการ
            </div>
          </div>
          {archivePreviewRows.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {archivePreviewRows.map((request) => <PRBoardCard compact key={request.id} request={request} />)}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-slate-50 px-3 py-8 text-center text-sm font-semibold text-muted">
              ไม่มี PR ในสถานะนี้
            </div>
          )}
          {hiddenArchiveCount > 0 ? (
            <div className="mt-3 rounded-md border border-border bg-slate-50 px-3 py-2 text-xs font-semibold text-muted">
              ยังมีอีก {hiddenArchiveCount} รายการในสถานะนี้ ใช้ Table view หรือ Status filter เพื่อดูรายการทั้งหมดแบบเต็มตาราง
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PRBoardCard({ compact = false, request }: { compact?: boolean; request: PurchaseRequestListItem }) {
  const actions = buildPurchaseRequestRowActions(request);
  const nextAction = nextBoardAction(request);
  const statusInfo = getStatusConfig(request.status);
  const previewAction = actions.menuActions.find((action) => action.label === "Preview Draft" || action.label === "Preview PDF");

  return (
    <article className="rounded-md border border-border bg-panel p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link className="block truncate text-sm font-extrabold text-primary" href={actions.detailHref}>
            {request.prNo}
          </Link>
          <div className="mt-1 truncate text-sm font-bold text-ink">{request.company}</div>
          <div className="truncate text-xs font-semibold text-muted">{request.branch}</div>
        </div>
        {compact ? <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="font-bold text-muted">Date</div>
          <div className="mt-0.5 font-semibold text-ink">{formatDate(request.date)}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-muted">Total</div>
          <div className="mt-0.5 font-bold text-ink">{formatTHB(request.total)}</div>
        </div>
      </div>
      <div className="mt-2 text-xs font-semibold text-muted">Created by {request.createdBy}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-white hover:bg-primary/90" href={nextAction.href}>
          {nextAction.label}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
        {previewAction ? (
          <Link className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-surface" href={previewAction.href} target={previewAction.target}>
            {previewAction.label}
          </Link>
        ) : null}
        <Link className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-surface" href={`/pr/new?cloneFrom=${encodeURIComponent(request.id)}`}>
          Clone as Draft
        </Link>
      </div>
    </article>
  );
}
