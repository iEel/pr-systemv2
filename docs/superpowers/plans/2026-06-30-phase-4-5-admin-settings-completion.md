# Phase 4.5 Admin Settings Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining Users/Roles and Running Number Settings shells with SQL Server-backed admin consoles.

**Architecture:** Add focused server-side helpers in `lib/user-management.ts` and `lib/running-number-settings.ts`, wire each page through colocated server actions, and keep UI as server-rendered admin tables/forms. Mutations use Prisma transactions, new admin permissions, and `AuditLog`.

**Tech Stack:** Next.js App Router, Prisma SQL Server, Auth.js RBAC, Tailwind CSS, Vitest.

---

## File Map

- Create `lib/user-management.ts` for user filters, role validation, row mapping, create/update/password reset, and audit events.
- Create `app/settings/users/actions.ts` for user server actions.
- Modify `app/settings/users/page.tsx` to render the SQL Server-backed user admin console.
- Create `lib/running-number-settings.ts` for setting validation, scope validation, preview formatting, row mapping, create/update, and audit events.
- Create `app/settings/running-numbers/actions.ts` for running-number server actions.
- Modify `app/settings/running-numbers/page.tsx` to render the SQL Server-backed running-number admin console.
- Modify `lib/auth/permissions.ts` to add `USER_MANAGE` and `RUNNING_NUMBER_MANAGE`.
- Add `tests/user-management.test.ts`.
- Add `tests/running-number-settings.test.ts`.
- Add `tests/admin-settings-page-copy.test.ts`.
- Update `tests/auth-permissions.test.ts`.
- Update handoff and docs.

## Tasks

### Task 1: Add Failing Tests

- [x] Add `tests/user-management.test.ts` for user helper behavior.
- [x] Add `tests/running-number-settings.test.ts` for running-number helper behavior.
- [x] Add `tests/admin-settings-page-copy.test.ts` for both settings pages and action files.
- [x] Update `tests/auth-permissions.test.ts` for `USER_MANAGE` and `RUNNING_NUMBER_MANAGE`.
- [x] Run `npm test -- tests/user-management.test.ts tests/running-number-settings.test.ts tests/admin-settings-page-copy.test.ts tests/auth-permissions.test.ts` and confirm failures are for missing implementation.

### Task 2: Implement Permissions And Helpers

- [x] Add `USER_MANAGE` and `RUNNING_NUMBER_MANAGE` to `lib/auth/permissions.ts`.
- [x] Create `lib/user-management.ts`.
- [x] Create `lib/running-number-settings.ts`.
- [x] Run the focused test command and fix helper behavior until it passes.

### Task 3: Wire Server Actions And Pages

- [x] Create `app/settings/users/actions.ts`.
- [x] Replace `app/settings/users/page.tsx` with a SQL Server-backed admin console.
- [x] Create `app/settings/running-numbers/actions.ts`.
- [x] Replace `app/settings/running-numbers/page.tsx` with a SQL Server-backed admin console.
- [x] Run the focused test command again.

### Task 4: Documentation And Verification

- [x] Update `DEVELOPER_HANDOFF.md`.
- [x] Update `docs/FEATURES.md`, `docs/BACKEND_INTEGRATION.md`, `docs/QA_CHECKLIST.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and `docs/PHASE_2_STATUS.md`.
- [x] Add focused docs for admin settings if needed.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
- [x] Record the latest verification result in `DEVELOPER_HANDOFF.md`.
