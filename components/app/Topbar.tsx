"use client";

import { Bell, CircleHelp, LogOut, Menu, UserRound } from "lucide-react";
import { logoutAction } from "@/app/logout/actions";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { Breadcrumbs } from "./Breadcrumbs";

const roleLabels: Record<AuthenticatedUser["role"], string> = {
  ADMIN: "Administrator",
  IT_ADMIN: "IT Administrator",
  IT_USER: "IT User",
  VIEWER: "Viewer",
};

export function Topbar({ onMenuClick, user }: { onMenuClick: () => void; user: AuthenticatedUser }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button className="rounded-md p-2 text-ink hover:bg-surface lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
          <Menu aria-hidden className="h-5 w-5" />
        </button>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-2">
        <button className="relative rounded-md p-2 text-muted hover:bg-surface hover:text-ink" aria-label="Notifications">
          <Bell aria-hidden className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        </button>
        <button className="rounded-md p-2 text-muted hover:bg-surface hover:text-ink" aria-label="Help">
          <CircleHelp aria-hidden className="h-5 w-5" />
        </button>
        <div className="ml-1 hidden items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-sm sm:flex">
          <UserRound aria-hidden className="h-4 w-4 text-primary" />
          <div className="leading-tight">
            <div className="font-bold text-ink">{user.displayName}</div>
            <div className="text-xs text-muted">{roleLabels[user.role]}</div>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="rounded-md p-2 text-muted hover:bg-surface hover:text-ink" aria-label="Sign out" type="submit">
            <LogOut aria-hidden className="h-5 w-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
