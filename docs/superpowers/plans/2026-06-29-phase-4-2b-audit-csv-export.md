# Phase 4.2B Audit CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export filtered Audit Logs as an Excel-friendly CSV.

**Architecture:** Extend `lib/audit-logs.ts` with pure CSV serialization and export href helpers, add a route handler at `/audit-logs/export`, and wire the existing Audit Logs action button to that route.

**Tech Stack:** Next.js App Router route handlers, Prisma SQL Server queries, Auth/RBAC helpers, Vitest.

---

### Task 1: CSV Helper Tests And Implementation

**Files:**
- Modify: `tests/audit-logs.test.ts`
- Modify: `lib/audit-logs.ts`

- [x] Add failing tests for CSV escaping and filter-preserving export href.
- [x] Implement `serializeAuditLogsToCsv()`.
- [x] Implement `buildAuditLogExportHref()`.
- [x] Implement `readAuditLogFiltersFromSearchParams()`.
- [x] Add bounded `getAuditLogCsv()`.
- [x] Run focused audit-log tests.

### Task 2: Export Route And UI

**Files:**
- Create: `app/audit-logs/export/route.ts`
- Modify: `app/audit-logs/page.tsx`
- Create: `tests/audit-logs-page-export.test.ts`

- [x] Add route handler requiring `AUDIT_VIEW`.
- [x] Return UTF-8 BOM CSV with attachment disposition and no-store headers.
- [x] Replace disabled Export CSV button with a filter-preserving link.
- [x] Run focused page export test.

### Task 3: Documentation And Verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/BACKEND_INTEGRATION.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/QA_CHECKLIST.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PHASE_2_STATUS.md`

- [x] Update docs for Audit CSV export behavior and remaining work.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
