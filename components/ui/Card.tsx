import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-lg border border-border bg-panel p-5 shadow-panel", className)} {...props} />;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
