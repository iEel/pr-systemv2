# Phase 2.3 Draft CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/pr/new` save a draft Purchase Request into SQL Server, calculate totals server-side, create an audit event, and redirect to the DB-backed detail page.

**Architecture:** Keep business rules in `lib/pr-draft.ts`, keep Next.js wiring in `app/pr/new/actions.ts`, and keep `components/pr/PRForm.tsx` focused on form rendering and lightweight line-item interaction. Draft save is the only command in scope; generate/print/upload remain later document-control flows.

**Tech Stack:** Next.js App Router server actions, Prisma `6.19.3`, SQL Server `IT_PR_DMS`, Vitest, TypeScript.

---

## File Map

- Create: `lib/pr-draft.ts` for master-data queries, pure parsing/validation/total helpers, and Prisma draft creation.
- Create: `tests/pr-draft.test.ts` for TDD coverage of parsing and server-side totals.
- Create: `app/pr/new/actions.ts` for the server action and redirect.
- Modify: `app/pr/new/page.tsx` to load DB options and pass the server action to the form.
- Modify: `components/pr/PRForm.tsx` to use DB options, real input names, dynamic draft rows, and a working Save Draft submit.
- Modify: `docs/PHASE_2_STATUS.md` after verification.

## Tasks

### Task 1: Pure Draft Parsing And Totals

- [x] Write `tests/pr-draft.test.ts` for parsing repeated item fields and ignoring fully blank rows.
- [x] Run the focused test and confirm it fails because `lib/pr-draft.ts` does not exist.
- [x] Implement `parseDraftPurchaseRequestForm`, `calculateDraftTotals`, and `DraftValidationError` in `lib/pr-draft.ts`.
- [x] Run the focused test and confirm it passes.

### Task 2: Database Draft Creation Boundary

- [x] Add `createDraftPurchaseRequest` and `createDraftPurchaseRequestFromFormData` in `lib/pr-draft.ts`.
- [x] Validate branch/company, department/division, and admin user lookup before create.
- [x] Create the PR and items in one Prisma transaction.
- [x] Create a `Draft created` audit event in the same transaction.
- [x] Keep `prNo` null and status `DRAFT`.

### Task 3: Next.js Form Wiring

- [x] Create `app/pr/new/actions.ts` with `createDraftPurchaseRequestAction(formData)`.
- [x] Redirect to `/pr/${id}` after save.
- [x] Modify `app/pr/new/page.tsx` to call `getDraftFormOptions()` and render `<PRForm options action />`.
- [x] Refactor `components/pr/PRForm.tsx` to render branch, department, division, purpose, purchase method, item fields, remark, totals, and submit button with real `name` attributes.

### Task 4: Verification And Docs

- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm audit`.
- [x] Run `npm run build`.
- [x] Submit a draft through `/pr/new` on localhost and verify redirect/detail content.
- [x] Update `docs/PHASE_2_STATUS.md` with Phase 2.3 results and next recommended phase.