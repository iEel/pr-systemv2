# Phase 2.4 Draft Edit Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Allow existing draft PRs to be edited from `/pr/[id]/edit`, update line items transactionally, recalculate totals server-side, and record `Draft updated` audit history.

**Architecture:** Extend the existing draft boundary in `lib/pr-draft.ts` with pure edit mapping/update-data helpers plus Prisma transaction commands. Keep route-specific server action wiring in `app/pr/[id]/edit/actions.ts`, reuse the existing `PRForm` with an optional initial draft value, and add an Edit Draft entry point on PR detail only for `DRAFT` records.

**Tech Stack:** Next.js App Router server actions, Prisma `6.19.3`, SQL Server `IT_PR_DMS`, Vitest, TypeScript.

---

## File Map

- Modify: `lib/pr-draft.ts` to add draft edit value mapping, draft loading, update payload, and transaction update.
- Modify: `tests/pr-draft.test.ts` to cover edit mapping and update payload totals.
- Create: `app/pr/[id]/edit/actions.ts` for the update server action.
- Modify: `app/pr/[id]/edit/page.tsx` to load the draft and bind the server action.
- Modify: `components/pr/PRForm.tsx` to accept `initialDraft` and enable save in edit mode.
- Modify: `components/pr/PRDetail.tsx` to show Edit Draft only for draft records.
- Modify: `docs/PHASE_2_STATUS.md` after verification.

## Tasks

### Task 1: TDD Edit Mapping And Update Payload

- [x] Add failing tests for `mapDraftEditRecordToInitialValue` and `buildDraftUpdateData`.
- [x] Run focused test and confirm failure because functions are missing.
- [x] Implement the pure helpers in `lib/pr-draft.ts`.
- [x] Run focused test and confirm it passes.

### Task 2: Prisma Draft Update Command

- [x] Add `getEditableDraftPurchaseRequest(id)` that returns only status `DRAFT` records mapped for the form.
- [x] Add `updateDraftPurchaseRequest(id, input)` that validates active branch/department/division and admin user.
- [x] In one transaction: update PR header/totals, delete old items, recreate submitted items, add `Draft updated` audit event.
- [x] Keep PR number unchanged and never allocate a PR number here.

### Task 3: Route And UI Wiring

- [x] Add `app/pr/[id]/edit/actions.ts` with `updateDraftPurchaseRequestAction(id, formData)`.
- [x] Bind the update action in `app/pr/[id]/edit/page.tsx`; call `notFound()` when the PR is missing or not `DRAFT`.
- [x] Update `PRForm` to use `initialDraft` for select/radio/date/item defaults and enable Save Draft for edit mode.
- [x] Add Edit Draft button on `PRDetail` only when `header.status === "Draft"`.

### Task 4: Verification

- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm audit`.
- [x] Run `npm run build`.
- [x] Create or locate a draft, submit `/pr/[id]/edit`, verify DB totals/items/audit, and verify detail page reflects the update.
- [x] Update docs with Phase 2.4 completion and next recommended Carbone Generate PDF phase.