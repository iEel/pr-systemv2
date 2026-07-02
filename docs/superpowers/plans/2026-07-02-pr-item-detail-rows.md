# PR Item Detail Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add non-priced detail rows that can sit under PR item rows and carry extended item specifications without forcing quantity or unit cost.

**Architecture:** Extend the existing `PurchaseRequestItem.rowType` model from `ITEM` / `HEADING` to include `DETAIL`. `DETAIL` rows use the same storage strategy as headings: numeric values persist as zero and do not affect totals, while UI and document payload render them as indented description-only rows.

**Tech Stack:** Next.js App Router, React client form state, Prisma SQL Server, Vitest, Carbone DOCX/PDF render payload.

---

### Task 1: Draft Parsing And Totals

**Files:**
- Modify: `lib/pr-draft.ts`
- Test: `tests/pr-draft.test.ts`

- [x] Add failing tests showing `itemRowType=DETAIL` accepts Description without Qty/Unit Cost and does not affect totals.
- [x] Extend draft row type normalization to `ITEM | HEADING | DETAIL`.
- [x] Validate `DETAIL` rows with description only and require at least one priced `ITEM` row.

### Task 2: Database Constraint

**Files:**
- Create: `prisma/migrations/000008_purchase_request_item_detail_row_type/migration.sql`

- [x] Drop and recreate the `PurchaseRequestItem_rowType_check` constraint with `ITEM`, `HEADING`, and `DETAIL`.

### Task 3: UI And Detail Views

**Files:**
- Modify: `components/pr/PRForm.tsx`
- Modify: `components/pr/PRDetail.tsx`
- Modify: `lib/purchase-requests.ts`
- Test: `tests/pr-form-workflow-copy.test.ts`
- Test: `tests/purchase-request-detail.test.ts`

- [x] Add `เพิ่มรายละเอียด` and `รายละเอียด` row mode in the PR item table.
- [x] Make detail rows description-only with blank non-priced cells.
- [x] Display detail rows as indented description rows below the current item group on PR Detail.

### Task 4: Document Generation

**Files:**
- Modify: `lib/pr-generate.ts`
- Test: `tests/pr-generate.test.ts`

- [x] Add `isDetail` to render payload rows.
- [x] Render detail rows with blank item number/amount fields and a prefixed description for the current Word template.

### Task 5: Documentation And Verification

**Files:**
- Modify: `docs/DOCUMENT_GENERATION.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/DATABASE.md`
- Modify: `docs/QA_CHECKLIST.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [x] Document the three row modes and update verification notes.
- [x] Run focused tests, full tests, typecheck, Prisma validate, migration deploy/status, and production build.
