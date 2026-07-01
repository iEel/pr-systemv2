import { cn } from "@/lib/utils";

export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-lg border border-border bg-panel", className)} {...props} />;
}

export const tableHeaderClass = "bg-slate-50 text-left text-xs font-bold text-slate-600";
export const tableCellClass = "border-t border-border px-4 py-3 text-sm";
