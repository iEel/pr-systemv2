# PR Item Heading Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Support non-priced heading rows inside PR line items so users can group products/services without entering quantity or unit cost.

**Architecture:** Add `PurchaseRequestItem.rowType` with `ITEM` as the default and `HEADING` for grouping rows. Keep existing numeric fields non-null; heading rows store `quantity`, `unitCost`, and `totalAmount` as zero, while form validation, totals, PR detail, clone/edit, and Carbone payload treat them as non-priced headings.

**Tech Stack:** Next.js App Router, React client form state, Prisma SQL Server, Vitest, Carbone DOCX/PDF render payload.

---

### Task 1: Draft Parsing And Totals

**Files:**
- Modify: `lib/pr-draft.ts`
- Test: `tests/pr-draft.test.ts`

- [x] Add failing tests showing `itemRowType=HEADING` accepts Description without Qty/Unit Cost and does not affect totals.
- [x] Add `rowType: "ITEM" | "HEADING"` to draft item types and default unknown/missing rows to `ITEM`.
- [x] Validate `HEADING` rows with description only; validate `ITEM` rows with description, positive quantity, and non-negative unit cost.
- [x] Calculate totals from `ITEM` rows only.

### Task 2: Database Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/000007_purchase_request_item_row_type/migration.sql`
- Modify: `lib/pr-draft.ts`
- Modify: `lib/pr-document-control.ts`

- [x] Add `rowType String @default("ITEM") @db.NVarChar(20)` to `PurchaseRequestItem`.
- [x] Create SQL Server migration adding `[rowType] NVARCHAR(20) NOT NULL CONSTRAINT ... DEFAULT 'ITEM'`.
- [x] Persist row type on create/update/clone/reissue while keeping heading numeric values zero.

### Task 3: UI

**Files:**
- Modify: `components/pr/PRForm.tsx`
- Modify: `components/pr/PRDetail.tsx`
- Modify: `lib/purchase-requests.ts`
- Test: `tests/pr-form-workflow-copy.test.ts`

- [x] Add per-row type control with `รายการ` and `หัวข้อ`.
- [x] Disable Acct/Qty/Unit Cost on heading rows and display a non-priced total placeholder.
- [x] Display heading rows as full-width group rows on PR Detail.

### Task 4: Document Generation

**Files:**
- Modify: `lib/pr-generate.ts`
- Test: `tests/pr-generate.test.ts`
- Modify: `docs/DOCUMENT_GENERATION.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [x] Add render payload fields `rowType`, `isHeading`, `itemNo`, and blank `lineNo` for heading rows.
- [x] Number only `ITEM` rows in PDF output so headings do not shift item numbering.
- [x] Document the template contract and user-facing workflow.

### Task 5: Verification

**Commands:**
- `npm test -- tests/pr-draft.test.ts tests/pr-generate.test.ts tests/pr-form-workflow-copy.test.ts tests/purchase-request-detail.test.ts`
- `npm run typecheck`
- `npx prisma validate`
- `npx prisma migrate deploy`
- `npm test`
