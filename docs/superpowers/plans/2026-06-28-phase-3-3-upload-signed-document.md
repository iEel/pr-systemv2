# Phase 3.3 Upload Signed Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the controlled signed-document upload flow after a PR has been printed.

**Architecture:** Keep file validation, storage naming, versioning, and status transitions in `lib/pr-document-control.ts`. Use a route-level server action for the form submission, and update the existing `SignedUpload` component from simulated client state to a real multipart form.

**Tech Stack:** Next.js App Router, React server actions, Prisma SQL Server, Node `fs/promises`, Vitest.

---

### Task 1: Signed Upload Helpers

**Files:**
- Modify: `lib/pr-document-control.ts`
- Modify: `tests/pr-document-control.test.ts`

- [x] **Step 1: Write failing tests for signed upload validation and versioned names**

Run: `npm.cmd test -- tests/pr-document-control.test.ts`
Expected: FAIL because signed upload helpers do not exist yet.

- [x] **Step 2: Implement minimal helper code**

Add allowed MIME/type checks, max upload size, signed storage path generation, status guard, and attachment type mapping.

- [x] **Step 3: Verify helper tests pass**

Run: `npm.cmd test -- tests/pr-document-control.test.ts`
Expected: PASS.

### Task 2: Upload Server Action

**Files:**
- Create: `app/pr/[id]/upload-signed/actions.ts`
- Modify: `lib/pr-document-control.ts`

- [x] **Step 1: Implement `uploadSignedDocumentForPurchaseRequest`**

Load the printed PR, validate uploaded file, compute next version, write to `storage/signed`, create attachment, set status `SIGNED`, set `signedAt`, and audit `Uploaded signed document` in a transaction.

- [x] **Step 2: Wire server action**

Create `uploadSignedPurchaseRequestAction(id, formData)` and redirect to `/pr/${id}`.

### Task 3: Upload Page UI

**Files:**
- Modify: `app/pr/[id]/upload-signed/page.tsx`
- Modify: `components/pr/SignedUpload.tsx`

- [x] **Step 1: Pass PR id into the upload component**

Read route params, pass `purchaseRequestId`, and render a real form.

- [x] **Step 2: Replace simulated upload with real submit**

Keep drag/drop selection feedback, use `name="signedFile"`, show allowed file guidance, and link back to PR detail.

### Task 4: Docs And Verification

**Files:**
- Modify: `docs/PHASE_2_STATUS.md`
- Modify: `docs/BACKEND_INTEGRATION.md`

- [x] **Step 1: Document Phase 3.3 completion**

Record upload validation, status transition, storage location, and routes.

- [x] **Step 2: Run full verification**

Run focused tests, full tests, typecheck, Prisma validate, audit, build, and one real upload check against the local app.
