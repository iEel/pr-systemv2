# Phase 4.4 Budget Master CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SQL Server-backed Budget Master CRUD console for admin budget maintenance.

**Architecture:** Add focused budget helper functions in `lib/budget-master.ts`, wire server actions through `app/masters/budgets/actions.ts`, and replace the current mock page with an admin data grid. Mutations use Prisma transactions, `BUDGET_MANAGE`, and `AuditLog`.

**Tech Stack:** Next.js App Router, Prisma SQL Server, Auth.js RBAC, Tailwind CSS, Vitest.

---

## File Map

- Create `lib/budget-master.ts` for parsing, validation, mapping, queries, and mutations.
- Create `app/masters/budgets/actions.ts` for create/update/deactivate/reactivate server actions.
- Modify `app/masters/budgets/page.tsx` to render real filters, forms, table, and summary cards.
- Modify `lib/auth/permissions.ts` to add `BUDGET_MANAGE`.
- Add `tests/budget-master.test.ts` for helper behavior.
- Add `tests/budget-master-page-copy.test.ts` for route copy and wiring.
- Modify `tests/auth-permissions.test.ts` for admin-only budget permission.
- Update `DEVELOPER_HANDOFF.md` and relevant `docs/*.md`.

## Tasks

### Task 1: Add Failing Tests

- [x] Add `tests/budget-master.test.ts` that imports `lib/budget-master.ts` and expects helper exports for money parsing, filter normalization, row mapping, create/update data, and duplicate validation.
- [x] Add `tests/budget-master-page-copy.test.ts` that asserts `/masters/budgets` contains `Budget Master`, `Create Budget`, `Update Budget`, `Deactivate`, `Reactivate`, and does not import `ModulePage`.
- [x] Update `tests/auth-permissions.test.ts` to assert `BUDGET_MANAGE` is available to `ADMIN`/`IT_ADMIN` and denied to `IT_USER`/`VIEWER`.
- [x] Run `npm test -- tests/budget-master.test.ts tests/budget-master-page-copy.test.ts tests/auth-permissions.test.ts` and confirm the new tests fail for missing implementation.

### Task 2: Implement Budget Helper And Permission

- [x] Add `BUDGET_MANAGE` to `Permission` and the admin `allPermissions` list in `lib/auth/permissions.ts`.
- [x] Create `lib/budget-master.ts` with:
  - `normalizeBudgetFilters()`
  - `parseBudgetMoneyInput()`
  - `formatBudgetMoney()`
  - `calculateRemainingBudget()`
  - `buildBudgetScopeKey()`
  - `buildBudgetCreateData()`
  - `buildBudgetUpdateData()`
  - `mapBudgetRecordToRow()`
  - `getBudgetMasterPageData()`
  - `createBudgetFromFormData()`
  - `updateBudgetFromFormData()`
  - `setBudgetActiveFromFormData()`
- [x] Run the focused test command and confirm helper/permission tests pass.

### Task 3: Wire Server Actions And Page

- [x] Create `app/masters/budgets/actions.ts` with server actions that call the helper mutations, revalidate `/masters/budgets`, and redirect back to the active filter set.
- [x] Replace `app/masters/budgets/page.tsx` with a real server component that loads page data, renders filters, create form, summary cards, budget table, inline update forms, and active-state commands.
- [x] Run `npm test -- tests/budget-master.test.ts tests/budget-master-page-copy.test.ts tests/auth-permissions.test.ts`.

### Task 4: Documentation And Verification

- [x] Update `DEVELOPER_HANDOFF.md`, `docs/FEATURES.md`, `docs/BACKEND_INTEGRATION.md`, `docs/QA_CHECKLIST.md`, `docs/ROADMAP.md`, and `docs/ARCHITECTURE.md`.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
- [x] Record the latest verification result in `DEVELOPER_HANDOFF.md`.
