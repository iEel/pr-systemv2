import { cn } from "@/lib/utils";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}

export function inputClass(className?: string) {
  return cn(
    "min-h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary",
    className,
  );
}
