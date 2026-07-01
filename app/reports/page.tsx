import Link from "next/link";
import { AlertTriangle, Download, Filter, RotateCcw } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import {
  buildReportFilterChips,
  buildReportExportHref,
  calculateReportBarPercent,
  getReportPageData,
  type NormalizedReportFilters,
  type ReportFiltersInput,
  type ReportPageData,
} from "@/lib/reporting";
import type { PRStatus } from "@/lib/status";
import { getStatusConfig } from "@/lib/status";
import { formatAmount, formatDate, formatTHB } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type TableAlign = "center" | "left" | "right";
type ReportTableColumn = {
  align?: TableAlign;
  label: string;
  width?: string;
};

function readParam(params: Awaited<SearchParams>, key: keyof ReportFiltersInput) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function readFilters(params: Awaited<SearchParams>): ReportFiltersInput {
  return {
    companyId: readParam(params, "companyId"),
    month: readParam(params, "month"),
    status: readParam(params, "status"),
    year: readParam(params, "year"),
  };
}

const monthFilterOptions = [
  { label: "ทุกเดือน", value: "All" },
  ...["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((label, index) => ({
    label,
    value: String(index + 1),
  })),
];

const reportStatusLabels: PRStatus[] = ["Draft", "Generated", "Printed", "Signed", "Cancelled", "Reissued"];
const allCompanyFilterLabel = "ทุกบริษัท";
const allStatusFilterLabel = "ทุกสถานะ";
const noBudgetWarningTitleFallback = "ยังไม่มี Budget สำหรับมุมมองนี้";
const monthlySummaryColumns: ReportTableColumn[] = [
  { label: "Month", width: "18%" },
  { align: "right", label: "PR", width: "12%" },
  { align: "right", label: "Total", width: "28%" },
  { align: "right", label: "Used", width: "21%" },
  { align: "right", label: "Pending", width: "21%" },
];
const companySummaryColumns: ReportTableColumn[] = [
  { label: "Company", width: "22%" },
  { label: "Branch", width: "18%" },
  { align: "right", label: "PR Count", width: "12%" },
  { align: "right", label: "Total Amount", width: "20%" },
  { align: "right", label: "Used", width: "16%" },
  { align: "center", label: "Latest Date", width: "12%" },
];

function getReportStatusConfig(status: string) {
  return reportStatusLabels.includes(status as PRStatus) ? getStatusConfig(status as PRStatus) : { label: status, tone: "neutral" as const };
}

function readCompanyFilterLabel(company: ReportPageData["companies"][number]) {
  return company.value === "All" ? allCompanyFilterLabel : company.label;
}

function readStatusFilterLabel(status: ReportPageData["statusOptions"][number]) {
  return status.value === "All" ? allStatusFilterLabel : status.label;
}

function buildReportFilterChipOptions(data: ReportPageData) {
  return {
    companies: data.companies.map((company) => ({ ...company, label: readCompanyFilterLabel(company) })),
    statusOptions: data.statusOptions.map((status) => ({ ...status, label: readStatusFilterLabel(status) })),
  };
}

function normalizeReportTableColumn(column: ReportTableColumn | string): ReportTableColumn {
  return typeof column === "string" ? { label: column } : column;
}

function readTableAlignClass(align: TableAlign = "left") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function MiniBar({ maxValue, tone = "blue", value }: { maxValue: number; tone?: "blue" | "green" | "amber" | "slate"; value: number }) {
  const width = calculateReportBarPercent(value, maxValue);
  const toneClass = {
    amber: "bg-amber-500",
    blue: "bg-primary",
    green: "bg-emerald-500",
    slate: "bg-slate-500",
  }[tone];

  return (
    <div aria-label={`${width}%`} className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function ReportHealthStrip({ data }: { data: ReportPageData }) {
  const committedAmount = data.summary.usedAmount + data.summary.pendingAmount;
  const items = [
    { helper: "ตาม filter", label: "PR Count", value: String(data.summary.totalPr) },
    { helper: "Generated / Printed / Signed", label: "Used", value: formatTHB(data.summary.usedAmount) },
    { helper: "Draft", label: "Pending", value: formatTHB(data.summary.pendingAmount) },
    {
      helper: data.budgetWarning ? "ตั้งค่า Budget Master ก่อนใช้" : "Budget - used - pending",
      label: "Remaining",
      value: data.budgetWarning ? "-" : formatTHB(data.summary.remainingBudget),
    },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
        {items.map((item) => (
          <div className="px-4 py-3" key={item.label}>
            <div className="text-xs font-semibold text-muted">{item.label}</div>
            <div className="mt-1 text-lg font-bold text-ink">{item.value}</div>
            <div className="mt-0.5 text-xs font-semibold text-muted">{item.helper}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3">
        {data.budgetWarning ? (
          <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <div className="text-sm font-bold">{data.budgetWarning.title || noBudgetWarningTitleFallback}</div>
                <p className="mt-0.5 max-w-3xl text-sm leading-6">{data.budgetWarning.message}</p>
              </div>
            </div>
            <Link className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-950 hover:bg-amber-100" href="/masters/budgets">
              เปิด Budget Master
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold tracking-normal text-muted">ตรวจสุขภาพ Budget ตาม filter ปัจจุบัน</div>
              <div className="mt-0.5 text-sm font-semibold text-ink">
                {formatTHB(committedAmount)} committed from {formatTHB(data.summary.totalBudget)}
              </div>
            </div>
            <div className="min-w-[220px] sm:w-80">
              <MiniBar maxValue={data.summary.totalBudget} tone="green" value={committedAmount} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function FilterPanel({ data, filters }: { data: ReportPageData; filters: NormalizedReportFilters }) {
  return (
    <Card>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[0.7fr_0.8fr_1.2fr_1fr_auto] xl:items-end">
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          ปี
          <input className={inputClass()} defaultValue={filters.year} min="2000" name="year" type="number" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          เดือน
          <select className={inputClass()} defaultValue={filters.month} name="month">
            {monthFilterOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          บริษัท
          <select className={inputClass()} defaultValue={filters.companyId} name="companyId">
            {data.companies.map((company) => (
              <option key={company.value} value={company.value}>
                {readCompanyFilterLabel(company)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          สถานะ
          <select className={inputClass()} defaultValue={filters.status} name="status">
            {data.statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {readStatusFilterLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">
          <Filter aria-hidden className="h-4 w-4" />
          Apply
        </Button>
      </form>
    </Card>
  );
}

function FilterSummary({ data }: { data: ReportPageData }) {
  const chips = buildReportFilterChips(data.filters, buildReportFilterChipOptions(data));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink">Current export view</span>
        {chips.map((chip) => (
          <Badge key={chip} tone="info">
            {chip}
          </Badge>
        ))}
      </div>
      <Link className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-sm font-semibold text-ink hover:bg-surface" href="/reports">
        <RotateCcw aria-hidden className="h-4 w-4" />
        Reset filters
      </Link>
    </div>
  );
}

function ReportTable({
  columns,
  title,
  children,
}: {
  children: React.ReactNode;
  columns: Array<ReportTableColumn | string>;
  title: string;
}) {
  const normalizedColumns = columns.map(normalizeReportTableColumn);

  return (
    <TableWrap>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-bold text-ink">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full border-collapse">
          <colgroup>
            {normalizedColumns.map((column) => (
              <col key={column.label} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {normalizedColumns.map((column) => (
                <th className={`${tableHeaderClass} px-4 py-3 ${readTableAlignClass(column.align)}`} key={column.label}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </TableWrap>
  );
}

function MonthlySummaryTable({ maxValue, rows }: { maxValue: number; rows: ReportPageData["monthlySummary"] }) {
  return (
    <TableWrap>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-bold text-ink">Monthly Summary</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[560px] w-full border-collapse">
          <colgroup>
            {monthlySummaryColumns.map((column) => (
              <col key={column.label} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {monthlySummaryColumns.map((column) => (
                <th className={`${tableHeaderClass} px-3 py-2 ${readTableAlignClass(column.align)}`} key={column.label}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <td className="border-t border-border px-3 py-2.5 text-sm font-bold text-ink">{row.label}</td>
                <td className={`border-t border-border px-3 py-2.5 text-sm tabular-nums ${readTableAlignClass(monthlySummaryColumns[1].align)}`}>{row.count}</td>
                <td className={`border-t border-border px-3 py-2.5 text-sm font-semibold tabular-nums ${readTableAlignClass(monthlySummaryColumns[2].align)}`}>
                  {formatAmount(row.totalAmount)}
                  <MiniBar maxValue={maxValue} value={row.totalAmount} />
                </td>
                <td className={`border-t border-border px-3 py-2.5 text-sm tabular-nums ${readTableAlignClass(monthlySummaryColumns[3].align)}`}>{formatAmount(row.usedAmount)}</td>
                <td className={`border-t border-border px-3 py-2.5 text-sm tabular-nums ${readTableAlignClass(monthlySummaryColumns[4].align)}`}>{formatAmount(row.pendingAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );
}

function StatusDistributionPanel({ maxValue, rows }: { maxValue: number; rows: ReportPageData["statusSummary"] }) {
  return (
    <Card className="p-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-bold text-ink">Status Summary</h2>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div className="px-4 py-3" key={row.status}>
            <div className="flex items-center justify-between gap-3">
              <Badge tone={getReportStatusConfig(row.status).tone}>{row.status}</Badge>
              <div className="text-right">
                <div className="text-sm font-bold text-ink">{formatAmount(row.totalAmount)}</div>
                <div className="text-xs font-semibold text-muted">{row.count} PR</div>
              </div>
            </div>
            <MiniBar maxValue={maxValue} tone={row.status === "Draft" ? "slate" : row.status === "Cancelled" ? "amber" : "blue"} value={row.totalAmount} />
          </div>
        ))}
        {rows.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted">ไม่พบข้อมูลตาม filter ที่เลือก</div> : null}
      </div>
    </Card>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const data = await getReportPageData(readFilters(params));
  const exportHref = buildReportExportHref(data.filters);
  const maxMonthlyTotal = Math.max(...data.monthlySummary.map((row) => row.totalAmount), 0);
  const maxStatusTotal = Math.max(...data.statusSummary.map((row) => row.totalAmount), 0);
  const maxCompanyTotal = Math.max(...data.companySummary.map((row) => row.totalAmount), 0);

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="Reports / Export"
          description="พื้นที่วิเคราะห์ตาม filter ปัจจุบันสำหรับตรวจย้อนหลังและ export Excel โดยไม่ซ้ำกับ snapshot บน Dashboard"
          action={
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90" href={exportHref}>
              <Download aria-hidden className="h-4 w-4" />
              Export Current View
            </Link>
          }
        />

        <FilterPanel data={data} filters={data.filters} />
        <FilterSummary data={data} />
        <ReportHealthStrip data={data} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
          <MonthlySummaryTable maxValue={maxMonthlyTotal} rows={data.monthlySummary} />
          <StatusDistributionPanel maxValue={maxStatusTotal} rows={data.statusSummary} />
        </div>

        <ReportTable columns={companySummaryColumns} title="Company / Branch Summary">
          {data.companySummary.map((row) => (
            <tr key={`${row.company}-${row.branch}`}>
              <td className={`${tableCellClass} ${readTableAlignClass(companySummaryColumns[0].align)} font-bold text-ink`}>{row.company}</td>
              <td className={`${tableCellClass} ${readTableAlignClass(companySummaryColumns[1].align)}`}>{row.branch}</td>
              <td className={`${tableCellClass} ${readTableAlignClass(companySummaryColumns[2].align)} tabular-nums`}>{row.count}</td>
              <td className={`${tableCellClass} ${readTableAlignClass(companySummaryColumns[3].align)} font-semibold tabular-nums`}>
                {formatAmount(row.totalAmount)}
                <MiniBar maxValue={maxCompanyTotal} value={row.totalAmount} />
              </td>
              <td className={`${tableCellClass} ${readTableAlignClass(companySummaryColumns[4].align)} tabular-nums`}>{formatAmount(row.usedAmount)}</td>
              <td className={`${tableCellClass} ${readTableAlignClass(companySummaryColumns[5].align)} tabular-nums`}>{formatDate(row.latestDate)}</td>
            </tr>
          ))}
          {data.companySummary.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-muted" colSpan={6}>ไม่พบข้อมูลตาม filter ที่เลือก</td>
            </tr>
          ) : null}
        </ReportTable>

        <ReportTable columns={["Date", "PR No.", "Company", "Branch", "Department", "Status", "Created By", "Total Amount"]} title="PR Detail">
          {data.detailRows.map((row) => (
            <tr key={row.id}>
              <td className={tableCellClass}>{formatDate(row.date)}</td>
              <td className={`${tableCellClass} font-bold text-primary`}>
                <Link href={`/pr/${row.id}`}>{row.prNo}</Link>
              </td>
              <td className={`${tableCellClass} font-semibold text-ink`}>{row.company}</td>
              <td className={tableCellClass}>{row.branch}</td>
              <td className={tableCellClass}>{row.department}</td>
              <td className={tableCellClass}>
                <Badge tone={getReportStatusConfig(row.status).tone}>{row.status}</Badge>
              </td>
              <td className={tableCellClass}>{row.createdBy}</td>
              <td className={`${tableCellClass} text-right font-semibold`}>{formatAmount(row.totalAmount)}</td>
            </tr>
          ))}
          {data.detailRows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-muted" colSpan={8}>ไม่พบข้อมูลตาม filter ที่เลือก</td>
            </tr>
          ) : null}
        </ReportTable>
      </div>
    </AppFrame>
  );
}
