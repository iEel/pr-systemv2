"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  pr: "PR Documents",
  new: "Create PR",
  edit: "Edit PR",
  templates: "Templates",
  reports: "Reports",
  masters: "Master Data",
  companies: "Company / Branch Master",
  budgets: "Budget IT",
  settings: "Settings",
  users: "Users / Roles",
  "running-numbers": "Running Number Settings",
  "audit-logs": "Audit Logs",
  "upload-signed": "Upload Signed Document",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted">
      <Link className="font-semibold text-ink hover:text-primary" href="/dashboard">
        IT PR DMS
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const label = segment.startsWith("pr-") ? "PR Detail" : labels[segment] ?? segment;
        const current = index === segments.length - 1;

        return (
          <span className="flex min-w-0 items-center gap-1" key={href}>
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0" />
            {current ? (
              <span className="truncate font-semibold text-ink">{label}</span>
            ) : (
              <Link className="truncate hover:text-primary" href={href}>
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
