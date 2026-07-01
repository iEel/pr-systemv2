# Phase 3.5 Template Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SQL Server-backed DOCX/XLSX template upload, validation, and activation.

**Architecture:** Add `templateType` to `DocumentTemplate`, implement template file validation and Carbone tag extraction in `lib/template-management.ts`, expose upload/validate/activate through server actions, and replace `/templates` sample UI with DB-backed management controls.

**Tech Stack:** Next.js App Router, React server actions, Prisma SQL Server, JSZip, Vitest, local file storage.

---

### Task 1: Template Helper Tests And Implementation

**Files:**
- Create: `tests/template-management.test.ts`
- Create: `lib/template-management.ts`

- [x] **Step 1: Write failing helper tests**

Cover file type validation, storage path building, DOCX/XLSX tag extraction, and validation summary.

- [x] **Step 2: Run focused test**

Run: `npm.cmd test -- tests/template-management.test.ts`
Expected: FAIL because helper module does not exist.

- [x] **Step 3: Implement helper module**

Add validation, JSZip XML extraction, tag parsing, and required/unknown tag comparison.

- [x] **Step 4: Run focused test again**

Run: `npm.cmd test -- tests/template-management.test.ts`
Expected: PASS.

### Task 2: Database Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/000002_template_type/migration.sql`
- Modify: `prisma/seed.mjs`

- [x] **Step 1: Add `templateType`**

Default existing records to `DOCX` and change uniqueness to `[name, version, templateType]`.

- [x] **Step 2: Apply migration and regenerate Prisma client**

Run: `npx.cmd prisma migrate deploy` and `npx.cmd prisma generate`.

### Task 3: Commands And UI

**Files:**
- Modify: `lib/template-management.ts`
- Create: `app/templates/actions.ts`
- Modify: `app/templates/page.tsx`

- [x] **Step 1: Add upload command**

Persist uploaded template files under `storage/templates` and create `DocumentTemplate`.

- [x] **Step 2: Add validate command**

Read stored file, write validation JSON.

- [x] **Step 3: Add activate command**

Require validation with no missing required tags, archive active siblings of same name/type, activate selected template.

- [x] **Step 4: Replace sample UI**

Render DB-backed list, upload form, validation result cards, and row actions.

### Task 4: Docs And Verification

**Files:**
- Modify: `docs/PHASE_2_STATUS.md`
- Modify: `docs/BACKEND_INTEGRATION.md`

- [x] **Step 1: Document Phase 3.5 completion**

Record DOCX/XLSX support, validation, activation, and verified routes.

- [x] **Step 2: Run full verification**

Run focused tests, full tests, typecheck, Prisma validate, audit, build, and real app checks.
