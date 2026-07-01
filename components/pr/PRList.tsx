"use client";

import Link from "next/link";
import { Download, Eye, MoreHorizontal, Plus, Search } from "lucide-react";
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

export function PRList({ requests }: { requests: PurchaseRequestListItem[] }) {
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("All");
  const [branch, setBranch] = useState("All");
  const [status, setStatus] = useState<PRStatus | "All">("All");

  const companies = useMemo(() => ["All", ...Array.from(new Set(requests.map((item) => item.company)))], [requests]);
  const branches = useMemo(() => ["All", ...Array.from(new Set(requests.map((item) => item.branch)))], [requests]);
  const rows = useMemo(() => filterPurchaseRequests(requests, { search, company, branch, status }), [branch, company, requests, search, status]);

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
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(3,minmax(150px,0.5fr))]">
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
        </div>
      </Card>
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
                        <Link className="rounded-md p-2 text-muted hover:bg-surface hover:text-primary" href={actions.detailHref} aria-label={`Preview ${request.prNo}`}>
                          <Eye aria-hidden className="h-4 w-4" />
                        </Link>
                        <Link className="rounded-md p-2 text-muted hover:bg-surface hover:text-primary" href={actions.primaryDownload.href} aria-label={actions.primaryDownload.ariaLabel}>
                          <Download aria-hidden className="h-4 w-4" />
                        </Link>
                        <details className="group relative">
                          <summary className="flex cursor-pointer list-none rounded-md p-2 text-muted hover:bg-surface hover:text-primary" aria-label={`More actions for ${request.prNo}`}>
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
    </div>
  );
}
