"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Logs,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pr", label: "PR Documents", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/masters/companies", label: "Master Data", icon: Building2 },
  { href: "/masters/budgets", label: "Budget IT", icon: BarChart3 },
  { href: "/settings/users", label: "Users / Roles", icon: ShieldCheck },
  { href: "/settings/running-numbers", label: "Settings", icon: Settings },
  { href: "/audit-logs", label: "Audit Logs", icon: Logs },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/pr" && pathname.startsWith("/pr"));
}

export function AppSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/40 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-shell text-white shadow-popover transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:self-start lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link className="flex items-center gap-3" href="/dashboard" onClick={onClose}>
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10">
              <FileText aria-hidden className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold">IT PR DMS</span>
              <span className="block text-xs text-blue-100">Purchase Request</span>
            </span>
          </Link>
          <button className="rounded-md p-2 hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close navigation">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
                  active ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white",
                )}
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-4 text-xs text-blue-100">
          <div className="font-semibold text-white">Operational PR workspace</div>
          <div className="mt-1">SQL Server connected</div>
        </div>
      </aside>
    </>
  );
}
