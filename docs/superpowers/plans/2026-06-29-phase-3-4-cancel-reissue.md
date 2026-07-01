# Phase 3.4 Cancel/Reissue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled cancel and reissue commands for generated PR documents.

**Architecture:** Keep document lifecycle rules in `lib/pr-document-control.ts`, expose them through route-level server actions, and update PR detail with status-specific actions. Cancel uses a dedicated reason form; reissue creates a linked replacement draft and redirects to it.

**Tech Stack:** Next.js App Router, React server actions, Prisma SQL Server, Vitest.

---

### Task 1: Lifecycle Helper Tests

**Files:**
- Modify: `tests/pr-document-control.test.ts`
- Modify: `lib/pr-document-control.ts`

- [x] **Step 1: Write failing tests**

Add tests for `assertCancellableStatus`, `assertReissuableStatus`, and `normalizeCancelReason`.

- [x] **Step 2: Run focused test**

Run: `npm.cmd test -- tests/pr-document-control.test.ts`
Expected: FAIL because the helpers do not exist.

- [x] **Step 3: Implement helpers**

Add minimal helper code to pass the focused tests.

- [x] **Step 4: Run focused test again**

Run: `npm.cmd test -- tests/pr-document-control.test.ts`
Expected: PASS.

### Task 2: Cancel Command

**Files:**
- Modify: `lib/pr-document-control.ts`
- Create: `app/pr/[id]/cancel/actions.ts`
- Create: `app/pr/[id]/cancel/page.tsx`
- Create: `components/pr/CancelPRForm.tsx`

- [x] **Step 1: Implement `cancelPurchaseRequest`**

Validate status/reason, update status to `CANCELLED`, set `cancelledAt`, and write `Cancelled` audit history in one transaction.

- [x] **Step 2: Wire cancel action and page**

Create route-level server action and a guarded cancel reason form.

### Task 3: Reissue Command

**Files:**
- Modify: `lib/pr-document-control.ts`
- Create: `app/pr/[id]/reissue/actions.ts`
- Modify: `components/pr/PRDetail.tsx`

- [x] **Step 1: Implement `reissuePurchaseRequest`**

Validate the original is `CANCELLED`, copy header and items into a new `DRAFT`, set `reissuedFromId`, write audit logs, and return the new PR id.

- [x] **Step 2: Wire PR detail actions**

Show `Cancel` for `Generated`, `Printed`, and `Signed`; show `Reissue` for `Cancelled`.

### Task 4: Docs And Verification

**Files:**
- Modify: `docs/PHASE_2_STATUS.md`
- Modify: `docs/BACKEND_INTEGRATION.md`

- [x] **Step 1: Document Phase 3.4 completion**

Record cancel/reissue policy, routes, and verified status transitions.

- [x] **Step 2: Run full verification**

Run focused tests, full tests, typecheck, Prisma validate, audit, build, and real app checks for cancel and reissue.
