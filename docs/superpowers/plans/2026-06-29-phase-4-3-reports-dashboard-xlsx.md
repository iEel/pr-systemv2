# Phase 4.3 Reports Dashboard XLSX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SQL Server-backed dashboard/report aggregates and export filtered reports as `.xlsx`.

**Architecture:** Add a server-side reporting boundary in `lib/reporting.ts`, a small local XLSX writer in `lib/xlsx.ts`, and route-level export at `/reports/export`. Dashboard and Reports consume the same report view model so calculations stay consistent.

**Tech Stack:** Next.js App Router, Prisma SQL Server, React server components, JSZip-generated Office Open XML, Vitest.

---

### Task 1: Reporting Helpers

**Files:**
- Create: `lib/reporting.ts`
- Test: `tests/reporting.test.ts`

- [x] Write failing tests for report filter normalization, date range construction, and aggregate calculations.
- [x] Implement pure helpers for filters, year/month ranges, status classification, summary cards, monthly/company/status groups, and export hrefs.
- [x] Add Prisma-backed functions for dashboard data, report data, and filter options.
- [x] Run focused reporting tests.

### Task 2: XLSX Writer

**Files:**
- Create: `lib/xlsx.ts`
- Test: `tests/xlsx.test.ts`

- [x] Write failing tests that open the generated XLSX zip and inspect workbook/worksheet XML.
- [x] Implement minimal XLSX package generation with inline strings and numeric cells.
- [x] Verify Thai/English strings are XML-escaped and included.
- [x] Run focused XLSX tests.

### Task 3: Reports UI And Export Route

**Files:**
- Modify: `app/reports/page.tsx`
- Create: `app/reports/export/route.ts`
- Test: `tests/reports-page.test.ts`

- [x] Write failing static test that Reports page no longer uses `ModulePage` and exposes `Export XLSX`.
- [x] Build the Reports page filter form, summary cards, tables, and export link.
- [x] Add `/reports/export` route requiring an authenticated user.
- [x] Generate workbook sheets from the current filters.
- [x] Run focused reports tests.

### Task 4: Dashboard Aggregates

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `components/dashboard/BudgetCards.tsx`
- Modify: `components/dashboard/DashboardCharts.tsx`
- Test: `tests/dashboard-copy.test.ts`

- [x] Update dashboard data loading to call reporting aggregates.
- [x] Make BudgetCards and DashboardCharts accept real data props.
- [x] Remove remaining static hardcoded budget/chart arrays.
- [x] Run focused dashboard tests.

### Task 5: Docs And Verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/BACKEND_INTEGRATION.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/QA_CHECKLIST.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PHASE_2_STATUS.md`

- [x] Update docs for Reports, Dashboard aggregates, and XLSX export.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
