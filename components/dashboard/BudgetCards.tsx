import { Clock, FileCheck2, FileText, Landmark, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ReportSummary } from "@/lib/reporting";
import { formatTHB } from "@/lib/utils";

function percent(value: number, total: number) {
  if (total <= 0) return "0.00%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function buildCards(summary: ReportSummary) {
  return [
    { label: "Budget ทั้งหมด", value: formatTHB(summary.totalBudget), helper: "บาท", icon: Landmark, color: "text-blue-700 bg-blue-50" },
    { label: "Used Budget", value: formatTHB(summary.usedAmount), helper: percent(summary.usedAmount, summary.totalBudget), icon: WalletCards, color: "text-emerald-700 bg-emerald-50" },
    { label: "Pending Budget", value: formatTHB(summary.pendingAmount), helper: percent(summary.pendingAmount, summary.totalBudget), icon: Clock, color: "text-amber-700 bg-amber-50" },
    { label: "Remaining Budget", value: formatTHB(summary.remainingBudget), helper: percent(summary.remainingBudget, summary.totalBudget), icon: FileCheck2, color: "text-cyan-700 bg-cyan-50" },
    { label: "Total PR", value: String(summary.totalPr), helper: "รายการ", icon: FileText, color: "text-violet-700 bg-violet-50" },
  ];
}

export function BudgetCards({ summary }: { summary: ReportSummary }) {
  const cards = buildCards(summary);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card className="p-4" key={card.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-ink">{card.value}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{card.helper}</p>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${card.color}`}>
                <Icon aria-hidden className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
