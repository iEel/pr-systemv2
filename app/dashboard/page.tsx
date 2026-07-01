import Link from "next/link";
import { Plus } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { BudgetCards } from "@/components/dashboard/BudgetCards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { PRList } from "@/components/pr/PRList";
import { SectionHeader } from "@/components/ui/Card";
import { getPurchaseRequestListItems } from "@/lib/purchase-requests";
import { getDashboardReportData } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [requests, report] = await Promise.all([
    getPurchaseRequestListItems({ take: 6 }),
    getDashboardReportData(),
  ]);

  return (
    <AppFrame>
      <div className="space-y-6">
        <SectionHeader
          title="Dashboard งบประมาณ IT"
          description="ภาพรวมเอกสาร PR และงบประมาณจาก SQL Server สำหรับปีปัจจุบัน"
          action={
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90" href="/pr/new">
              <Plus aria-hidden className="h-4 w-4" />
              New PR
            </Link>
          }
        />
        <BudgetCards summary={report.summary} />
        <DashboardCharts report={report} />
        <section aria-label="Recent PR documents" className="pt-1">
          <PRList requests={requests} />
        </section>
      </div>
    </AppFrame>
  );
}
