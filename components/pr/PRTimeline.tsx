import { CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export type PRTimelineItem = {
  id: string;
  action: string;
  actor: string;
  date: string;
  detail: string;
};

export function PRTimeline({ items }: { items: PRTimelineItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted">ยังไม่มี timeline สำหรับเอกสารนี้</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div className="flex gap-3" key={item.id}>
          <div className="flex flex-col items-center">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-success" />
            {index < items.length - 1 ? <div className="mt-1 h-12 w-px bg-border" /> : null}
          </div>
          <div className="min-w-0 pb-3">
            <div className="text-sm font-bold text-ink">{item.action}</div>
            <div className="text-xs font-semibold text-muted">{formatDateTime(item.date)} โดย {item.actor}</div>
            <div className="mt-1 text-xs leading-5 text-muted">{item.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}