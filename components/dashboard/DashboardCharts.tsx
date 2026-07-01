import { Card } from "@/components/ui/Card";
import type { ReportPageData } from "@/lib/reporting";
import { formatCompact, formatTHB } from "@/lib/utils";

export function DashboardCharts({ report }: { report: ReportPageData }) {
  const monthlySpend = report.monthlySummary;
  const companySpend = report.companySummary.slice(0, 5);
  const statusSnapshot = report.statusSummary.slice(0, 6);
  const maxMonth = Math.max(1, ...monthlySpend.map((item) => item.totalAmount));
  const maxCompany = Math.max(1, ...companySpend.map((item) => item.totalAmount));

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">แนวโน้มการใช้งบประมาณ</h2>
            <p className="text-sm text-muted">ยอด PR รายเดือนจาก SQL Server</p>
          </div>
          <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{report.filters.year}</span>
        </div>
        <div className="mt-6 flex h-56 items-end gap-3">
          {monthlySpend.map((item) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={item.month}>
              <div className="flex h-44 w-full items-end rounded-md bg-slate-100 px-2">
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${item.totalAmount > 0 ? Math.max(18, (item.totalAmount / maxMonth) * 100) : 0}%` }}
                  title={`${item.label} ${formatTHB(item.totalAmount)}`}
                />
              </div>
              <span className="text-xs font-semibold text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-bold text-ink">Top Company / Branch</h2>
        <p className="text-sm text-muted">แสดงยอดใช้จ่ายสูงสุดตามบริษัท/สาขาจาก PR จริง</p>
        <div className="mt-6 space-y-4">
          {companySpend.length ? companySpend.map((item) => (
            <div key={`${item.company}-${item.branch}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">{item.company} / {item.branch}</span>
                <span className="font-bold text-primary">{formatCompact(item.totalAmount)}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-primary" style={{ width: `${(item.totalAmount / maxCompany) * 100}%` }} />
              </div>
            </div>
          )) : (
            <div className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-muted">ยังไม่มีข้อมูล PR ในปีที่เลือก</div>
          )}
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <div className="text-sm font-bold text-ink">PR Status Snapshot</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold text-muted sm:grid-cols-3">
            {statusSnapshot.length ? statusSnapshot.map((item) => (
              <div className="rounded-md bg-blue-50 p-2 text-blue-700" key={item.status}>{item.status} {item.count}</div>
            )) : (
              <div className="col-span-full rounded-md bg-slate-100 p-2 text-slate-600">No PR</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
