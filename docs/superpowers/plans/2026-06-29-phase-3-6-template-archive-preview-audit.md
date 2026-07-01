# Phase 3.6 Template Archive/Preview/Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add template original-file download, explicit archive, audit logging, and validation detail display.

**Architecture:** Extend `lib/template-management.ts` with delivery headers, archive guards, download lookup, archive command, and audit writes. Add a route handler for original template file download and wire archive/download/detail controls into `/templates`.

**Tech Stack:** Next.js App Router, Prisma SQL Server, local storage, Vitest.

---

### Task 1: Helper Tests And Implementation

**Files:**
- Modify: `tests/template-management.test.ts`
- Modify: `lib/template-management.ts`

- [x] **Step 1: Write failing tests**

Cover template delivery headers and archive status guard.

- [x] **Step 2: Implement helper code**

Add `buildTemplateDeliveryHeaders` and `assertArchivableTemplateStatus`.

### Task 2: Download And Archive Commands

**Files:**
- Modify: `lib/template-management.ts`
- Create: `app/templates/[id]/file/route.ts`
- Modify: `app/templates/actions.ts`

- [x] **Step 1: Add file download lookup**

Read stored template file through safe storage resolution and return file metadata.

- [x] **Step 2: Add archive command**

Allow archive from `DRAFT`/`ACTIVE`, set `status = ARCHIVED`, set `archivedAt`, and audit.

- [x] **Step 3: Add audit logging to upload/validate/activate/archive**

Write `AuditLog` records for template-critical commands.

### Task 3: UI

**Files:**
- Modify: `app/templates/page.tsx`

- [x] **Step 1: Add row actions**

Add Download and Archive controls alongside Validate/Activate.

- [x] **Step 2: Add validation detail panels**

Show found, missing, and unknown tag lists for the latest validated template.

### Task 4: Docs And Verification

**Files:**
- Modify: `docs/PHASE_2_STATUS.md`
- Modify: `docs/BACKEND_INTEGRATION.md`

- [x] **Step 1: Document Phase 3.6 completion**

Record routes, archive policy, and audit behavior.

- [x] **Step 2: Run verification**

Run focused tests, full tests, typecheck, Prisma validate, audit, build, and runtime checks.
