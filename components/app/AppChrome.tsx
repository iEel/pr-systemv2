"use client";

import { useState } from "react";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

export function AppChrome({ children, user }: { children: React.ReactNode; user: AuthenticatedUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} user={user} />
        <main id="main-content" className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
