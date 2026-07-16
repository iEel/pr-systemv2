import Link from "next/link";
import { Plus } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { BudgetCards } from "@/components/dashboard/BudgetCards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { BudgetPlanningView, DashboardViewNav } from "@/components/dashboard/BudgetPlanningView";
import { PRList } from "@/components/pr/PRList";
import { SectionHeader } from "@/components/ui/Card";
import { getPurchaseRequestListItems } from "@/lib/purchase-requests";
import { getDashboardReportData } from "@/lib/reporting";
import { getBudgetPlanningPageData } from "@/lib/budget-planning.server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const view = read("view");

  if (view === "planning") {
    const data = await getBudgetPlanningPageData({
      year: read("year"),
      companyId: read("companyId"),
      categoryId: read("categoryId"),
    });

    return (
      <AppFrame>
        <BudgetPlanningView data={data} />
      </AppFrame>
    );
  }

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
        <DashboardViewNav current="overview" />
        <BudgetCards summary={report.summary} />
        <DashboardCharts report={report} />
        <section aria-label="Recent PR documents" className="pt-1">
          <PRList requests={requests} />
        </section>
      </div>
    </AppFrame>
  );
}
