# MVP Phase 1 App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Next.js UI shell for the IT PR Document Management System MVP Phase 1.

**Architecture:** Scaffold a single Next.js App Router project in the workspace root, preserve `PRODUCT.md` and `DESIGN.md`, and keep the shell frontend-only with local sample data. The app uses a persistent authenticated frame, route-specific pages, focused component primitives, and client-side simulated interactions for filters, workflow actions, and upload states.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, lucide-react, local component primitives, local sample data.

---

## Preflight: Required Visual Gates

Before writing application code, complete the remaining `$impeccable craft` gates:

- [ ] Ask Step A visual direction questions about final palette, atmosphere, and reference emphasis.
- [ ] Generate one palette artifact and get explicit palette confirmation.
- [ ] Generate 1-3 high-fidelity app-shell mock directions against the confirmed palette.
- [ ] Get one mock direction approved or delegated.
- [ ] Inventory mock ingredients and map each one to semantic UI, CSS, SVG, icon library, or accepted omission.

## File Structure

Create this structure:

```text
D:\Antigravity\pr-systemv2
├── app
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── pr/page.tsx
│   ├── pr/new/page.tsx
│   ├── pr/[id]/page.tsx
│   ├── pr/[id]/edit/page.tsx
│   ├── pr/[id]/upload-signed/page.tsx
│   ├── templates/page.tsx
│   ├── masters/companies/page.tsx
│   ├── masters/budgets/page.tsx
│   ├── settings/users/page.tsx
│   ├── settings/running-numbers/page.tsx
│   └── audit-logs/page.tsx
├── components
│   ├── app
│   │   ├── AppFrame.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── Breadcrumbs.tsx
│   ├── dashboard
│   │   ├── BudgetCards.tsx
│   │   └── DashboardCharts.tsx
│   ├── pr
│   │   ├── PRDetail.tsx
│   │   ├── PRForm.tsx
│   │   ├── PRList.tsx
│   │   ├── PRTimeline.tsx
│   │   └── SignedUpload.tsx
│   └── ui
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Field.tsx
│       ├── Skeleton.tsx
│       └── Table.tsx
├── lib
│   ├── sample-data.ts
│   ├── status.ts
│   └── utils.ts
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

## Task 1: Scaffold The Next.js Project

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Write project manifest**

Create `package.json` with:

```json
{
  "name": "it-pr-document-management-system",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@next/font": "latest",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Write config files**

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

Create `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        shell: "oklch(var(--shell))",
        panel: "oklch(var(--panel))",
        surface: "oklch(var(--surface))",
        ink: "oklch(var(--ink))",
        muted: "oklch(var(--muted))",
        border: "oklch(var(--border))",
        primary: "oklch(var(--primary))",
        info: "oklch(var(--info))",
        success: "oklch(var(--success))",
        warning: "oklch(var(--warning))",
        danger: "oklch(var(--danger))",
      },
      boxShadow: {
        panel: "0 8px 18px rgb(15 38 80 / 0.08)",
        popover: "0 14px 30px rgb(15 38 80 / 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create root app files**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT PR Document Management System",
  description: "Internal IT Purchase Request document shell",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
```

Create `app/globals.css` with the confirmed palette after the palette gate. The default structure is:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: "Segoe UI", "Noto Sans Thai", system-ui, sans-serif;
  --shell: 0.27 0.104 257;
  --panel: 1 0 0;
  --surface: 0.972 0.006 247;
  --ink: 0.24 0.06 255;
  --muted: 0.47 0.035 250;
  --border: 0.89 0.018 248;
  --primary: 0.46 0.14 255;
  --info: 0.58 0.14 250;
  --success: 0.56 0.13 158;
  --warning: 0.72 0.16 72;
  --danger: 0.58 0.17 25;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  color: oklch(var(--ink));
  background: oklch(var(--surface));
}

body {
  min-height: 100vh;
  margin: 0;
  font-family: var(--font-sans);
  background: oklch(var(--surface));
}

:focus-visible {
  outline: 2px solid oklch(var(--primary));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

## Task 2: Add Shared Types, Utilities, And Sample Data

**Files:**
- Create: `lib/utils.ts`
- Create: `lib/status.ts`
- Create: `lib/sample-data.ts`

- [ ] **Step 1: Create utility helpers**

Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTHB(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}
```

- [ ] **Step 2: Create workflow status map**

Create `lib/status.ts`:

```ts
export type PRStatus = "Draft" | "Generated" | "Printed" | "Signed" | "Cancelled" | "Reissued";

export const statusConfig: Record<PRStatus, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" | "purple" }> = {
  Draft: { label: "Draft", tone: "neutral" },
  Generated: { label: "Generated", tone: "info" },
  Printed: { label: "Printed", tone: "warning" },
  Signed: { label: "Signed", tone: "success" },
  Cancelled: { label: "Cancelled", tone: "danger" },
  Reissued: { label: "Reissued", tone: "purple" },
};
```

- [ ] **Step 3: Create realistic sample data**

Create `lib/sample-data.ts` with exported arrays:

```ts
import type { PRStatus } from "./status";

export type PurchaseRequest = {
  id: string;
  prNo: string;
  date: string;
  company: string;
  branch: string;
  department: string;
  createdBy: string;
  total: number;
  status: PRStatus;
};

export const purchaseRequests: PurchaseRequest[] = [
  { id: "pr-2606001", prNo: "ITPR_2606001", date: "2026-06-20", company: "Grandlink", branch: "HQ", department: "IT Operation", createdBy: "Admin User", total: 116255.5, status: "Printed" },
  { id: "pr-2606002", prNo: "ITPR_2606002", date: "2026-06-21", company: "Sonic_04", branch: "Sonic_04", department: "Infrastructure", createdBy: "Somchai S.", total: 78950, status: "Generated" },
  { id: "pr-2606003", prNo: "ITPR_2606003", date: "2026-06-22", company: "IT City", branch: "IT City", department: "Helpdesk", createdBy: "Natcha P.", total: 24500, status: "Draft" },
  { id: "pr-2606004", prNo: "ITPR_2606004", date: "2026-06-23", company: "Sonic_HQ", branch: "HQ", department: "Infrastructure", createdBy: "Admin User", total: 324210.35, status: "Signed" },
  { id: "pr-2606005", prNo: "ITPR_2606005", date: "2026-06-24", company: "Sonic_04", branch: "Sonic_04", department: "IT Operation", createdBy: "Piyawat K.", total: 12500, status: "Cancelled" },
];

export const prItems = [
  { lineNo: 1, accountCode: "51510101", description: "Dell PowerEdge R750 Server", quantity: 1, unitCost: 78500, total: 78500 },
  { lineNo: 2, accountCode: "51520101", description: "Samsung SSD 1.92TB SATA", quantity: 2, unitCost: 12450, total: 24900 },
  { lineNo: 3, accountCode: "51530101", description: "UPS Battery Replacement Pack", quantity: 1, unitCost: 5250.5, total: 5250.5 },
];

export const templates = [
  { name: "PR_STANDARD", version: "V1", contract: "IT PR Contract", status: "Active", updatedAt: "2026-06-25 10:20" },
  { name: "PR_STANDARD", version: "V2", contract: "IT PR Contract", status: "Draft", updatedAt: "2026-06-24 16:45" },
  { name: "PR_GRANDLINK", version: "V1", contract: "Grandlink Contract", status: "Archived", updatedAt: "2026-06-10 14:30" },
  { name: "PR_SONIC", version: "V1", contract: "Sonic Contract", status: "Active", updatedAt: "2026-06-05 09:12" },
];
```

## Task 3: Build UI Primitives

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Field.tsx`
- Create: `components/ui/Table.tsx`
- Create: `components/ui/Skeleton.tsx`

- [ ] **Step 1: Create Button primitive**

Create `components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 active:bg-primary/80",
  secondary: "border border-border bg-panel text-ink hover:bg-surface",
  ghost: "text-ink hover:bg-surface",
  danger: "bg-danger text-white hover:bg-danger/90",
};

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create Card, Badge, Field, Table, Skeleton primitives**

Create the remaining primitives with these exports:

```tsx
// components/ui/Card.tsx
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-lg border border-border bg-panel p-5 shadow-panel", className)} {...props} />;
}
```

```tsx
// components/ui/Badge.tsx
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone], className)} {...props} />;
}
```

```tsx
// components/ui/Field.tsx
import { cn } from "@/lib/utils";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-red-700">{error}</span> : null}
    </label>
  );
}

export function inputClass(className?: string) {
  return cn("min-h-10 rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary", className);
}
```

```tsx
// components/ui/Table.tsx
import { cn } from "@/lib/utils";

export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-lg border border-border bg-panel", className)} {...props} />;
}
```

```tsx
// components/ui/Skeleton.tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}
```

## Task 4: Build The Persistent App Frame

**Files:**
- Create: `components/app/AppFrame.tsx`
- Create: `components/app/AppSidebar.tsx`
- Create: `components/app/Topbar.tsx`
- Create: `components/app/Breadcrumbs.tsx`

- [ ] **Step 1: Implement sidebar navigation**

Use `lucide-react` icons for Dashboard, PR Documents, Reports, Templates, Master Data, Settings, and Audit Logs. Active navigation is based on `usePathname()`. Mobile uses a menu button that toggles a fixed drawer.

- [ ] **Step 2: Implement topbar and breadcrumbs**

Breadcrumb labels map path segments to user-facing names: `dashboard` -> `Dashboard`, `pr` -> `PR Documents`, `new` -> `Create PR`, `upload-signed` -> `Upload Signed Document`.

- [ ] **Step 3: Compose AppFrame**

`AppFrame` renders sidebar, topbar, and `<main id="main-content">`. Include a skip link before navigation.

## Task 5: Build Dashboard And PR List

**Files:**
- Create: `components/dashboard/BudgetCards.tsx`
- Create: `components/dashboard/DashboardCharts.tsx`
- Create: `components/pr/PRList.tsx`
- Create: `app/dashboard/page.tsx`
- Create: `app/pr/page.tsx`

- [ ] **Step 1: Dashboard**

Dashboard shows budget cards for total, used, pending, remaining, and total PR count. Use semantic chart-like CSS bars and rings instead of external chart dependencies.

- [ ] **Step 2: PR List**

PR list is a client component with search, company filter, branch filter, status filter, date range controls, visible filtered count, table rows, row action buttons, and an empty state when filters return zero rows.

## Task 6: Build PR Form, Detail, Timeline, And Upload

**Files:**
- Create: `components/pr/PRForm.tsx`
- Create: `components/pr/PRDetail.tsx`
- Create: `components/pr/PRTimeline.tsx`
- Create: `components/pr/SignedUpload.tsx`
- Create: `app/pr/new/page.tsx`
- Create: `app/pr/[id]/page.tsx`
- Create: `app/pr/[id]/edit/page.tsx`
- Create: `app/pr/[id]/upload-signed/page.tsx`

- [ ] **Step 1: PR form shell**

Create a form with company/branch/date/ref no/department/division/purpose/purchase method/item rows/remark/summary panel/actions. Use visible labels, disabled generated fields, and validation helper text.

- [ ] **Step 2: PR detail shell**

Create a detail page with PR title, status chip, company link styling, action bar, document information, item table, attachment cards, and timeline. Generated/Printed/Signed sample states disable direct edit affordances.

- [ ] **Step 3: Upload signed shell**

Create a drag-and-drop upload panel using local component state for idle, dragging, selected, uploading, success, and error. Include accepted file types and versioning copy.

## Task 7: Build Placeholder Modules

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/templates/page.tsx`
- Create: `app/masters/companies/page.tsx`
- Create: `app/masters/budgets/page.tsx`
- Create: `app/settings/users/page.tsx`
- Create: `app/settings/running-numbers/page.tsx`
- Create: `app/audit-logs/page.tsx`

- [ ] **Step 1: Login**

Login screen uses the same navy/white visual system, local username/password fields, role hint, and a "Sign in to dashboard" link-like button that navigates to `/dashboard`.

- [ ] **Step 2: Template Management**

Template page shows sample templates, validation result summary cards, and actions for upload, validate all, download tag sheet, and re-upload template.

- [ ] **Step 3: Master/settings pages**

Placeholder pages use real module names, realistic tables, and next-action empty states. Avoid blank "Coming soon" pages.

## Task 8: Responsive, Accessibility, And Verification

**Files:**
- Modify: all app and component files created above.

- [ ] **Step 1: Install and typecheck**

Run:

```powershell
npm install
npm run typecheck
```

Expected: typecheck passes.

- [ ] **Step 2: Build**

Run:

```powershell
npm run build
```

Expected: production build succeeds.

- [ ] **Step 3: Start dev server**

Run:

```powershell
npm run dev
```

Expected: app serves locally, usually at `http://localhost:3000`.

- [ ] **Step 4: Browser QA**

Inspect desktop and mobile widths:

- Desktop: 1440x900.
- Tablet: 1024x768.
- Mobile: 390x844.

Check:

- Sidebar collapses cleanly.
- No Thai/English labels clip.
- Tables remain usable on mobile.
- Primary actions have visible focus states.
- Status chips include readable labels.
- Drag-and-drop upload states are visible.
- Reduced motion setting does not hide content.

- [ ] **Step 5: Final report**

Report changed files, commands run, URL, viewports checked, and remaining limitations.
