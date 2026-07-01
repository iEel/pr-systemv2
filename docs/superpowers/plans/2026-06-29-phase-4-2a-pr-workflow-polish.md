# Phase 4.2A PR Workflow Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Save/Update & Preview for draft PRs, remove stale sample-shell copy from connected UI surfaces, and update docs.

**Architecture:** Add a tiny submit-intent helper used by create and edit server actions. Keep PR filtering in a client-safe helper outside sample data. Use static copy tests for UI wording that is otherwise hard to cover without a browser harness.

**Tech Stack:** Next.js App Router server actions, React client components, Vitest, Prisma SQL Server app.

---

### Task 1: Draft Submit Intent

**Files:**
- Create: `lib/pr-submit-intent.ts`
- Test: `tests/pr-submit-intent.test.ts`
- Modify: `app/pr/new/actions.ts`
- Modify: `app/pr/[id]/edit/actions.ts`
- Modify: `components/pr/PRForm.tsx`

- [x] Write failing tests for `save` vs `preview` intent parsing and redirect paths.
- [x] Add `readDraftSubmissionIntent()` and `getDraftSubmissionRedirectPath()`.
- [x] Wire create/edit server actions to redirect to either detail or draft preview.
- [x] Add Save Draft, Save & Preview, Update Draft, and Update & Preview submit buttons.
- [x] Verify focused tests pass.

### Task 2: Sample-Data Cleanup

**Files:**
- Create: `lib/pr-filters.ts`
- Modify: `components/pr/PRList.tsx`
- Modify: `lib/sample-data.ts`
- Test: `tests/pr-filters.test.ts`

- [x] Move `filterPurchaseRequests()` to `lib/pr-filters.ts`.
- [x] Update PRList to import the new helper.
- [x] Remove the filter helper from `lib/sample-data.ts`.
- [x] Verify focused filter tests pass.

### Task 3: Connected UI Copy

**Files:**
- Modify: `components/app/AppSidebar.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `components/dashboard/DashboardCharts.tsx`
- Test: `tests/app-sidebar-copy.test.ts`
- Test: `tests/dashboard-copy.test.ts`

- [x] Replace Phase 1 sample shell sidebar copy with connected workspace copy.
- [x] Remove DashboardCharts dependency on sample PR data.
- [x] Mark static dashboard charts as awaiting Dashboard/Reports phase without calling them sample PR data.
- [x] Verify focused copy tests pass.

### Task 4: Documentation And Verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/BACKEND_INTEGRATION.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/QA_CHECKLIST.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/SETUP.md`

- [x] Update docs for Save/Update & Preview.
- [x] Update docs that still described `/audit-logs` as a shell.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
