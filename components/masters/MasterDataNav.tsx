"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const masterDataLinks = [
  { href: "/masters/companies", label: "Companies / Branches" },
  { href: "/masters/pr-categories", label: "PR Categories" },
];

export function MasterDataNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Master data" className="flex w-full flex-wrap gap-1 rounded-md border border-border bg-panel p-1">
      {masterDataLinks.map((item) => {
        const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isCurrent ? "bg-primary text-white" : "text-ink hover:bg-surface",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
