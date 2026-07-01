# Phase 4.6 Template Visual QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rendered PDF preview QA for uploaded DOCX templates before activation.

**Architecture:** Extend `lib/template-management.ts` with preview metadata helpers, sample PR payload creation, render/storage commands, preview file delivery, and activation guard rules. Wire `/templates` through server actions and a PDF route, storing preview state in `DocumentTemplate.validationJson` to avoid a data migration.

**Tech Stack:** Next.js App Router, Prisma SQL Server, Auth.js RBAC, Carbone, DOCX templates, local storage, Vitest.

---

## File Map

- Modify `lib/template-management.ts` for preview metadata, sample payload, rendering, PDF file lookup, and activation guard helpers.
- Modify `app/templates/actions.ts` to add `previewTemplateAction`.
- Modify `app/templates/page.tsx` to show preview status, preview actions, and activate hints.
- Create `app/templates/[id]/preview/route.ts` for inline/download preview PDF delivery.
- Modify `tests/template-management.test.ts` with helper tests.
- Add `tests/template-management-page-copy.test.ts` for UI/action/route wiring.
- Add `docs/superpowers/specs/2026-06-30-phase-4-6-template-visual-qa-design.md`.
- Update `DEVELOPER_HANDOFF.md`, `docs/DOCUMENT_GENERATION.md`, `docs/QA_CHECKLIST.md`, `docs/FEATURES.md`, `docs/BACKEND_INTEGRATION.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and `docs/PHASE_2_STATUS.md`.

## Tasks

### Task 1: Add Failing Tests

- [x] Add helper tests in `tests/template-management.test.ts` for `buildTemplatePreviewFileInfo`, `normalizeTemplatePreview`, `mergeTemplatePreviewResult`, `canActivateTemplateVersion`, and `buildTemplatePreviewPayload`.
- [x] Add `tests/template-management-page-copy.test.ts` that checks `/templates` includes `Preview Template`, `Open Preview`, `Download Preview`, `previewTemplateAction`, and `/templates/[id]/preview`.
- [x] Run `npm test -- tests/template-management.test.ts tests/template-management-page-copy.test.ts` and confirm failures are missing preview implementation/wiring.

### Task 2: Implement Template Preview Helpers

- [x] Add preview metadata types and normalizers in `lib/template-management.ts`.
- [x] Add deterministic PDF file info under `template-previews/`.
- [x] Add sample PR render payload using existing `buildPurchaseRequestRenderPayload`.
- [x] Add activation guard helper that blocks `PR_STANDARD DOCX` without passed preview.
- [x] Run focused tests and confirm helper coverage passes.

### Task 3: Implement Render Command And Route

- [x] Add `previewTemplate(id)` in `lib/template-management.ts` with `TEMPLATE_MANAGE`, DOCX-only PDF render through Carbone, safe storage write, metadata update, and audit event.
- [x] Add `getTemplatePreviewPdf(id)` for safe PDF delivery.
- [x] Add `previewTemplateAction` in `app/templates/actions.ts`.
- [x] Create `app/templates/[id]/preview/route.ts` with inline/download PDF delivery.
- [x] Run focused tests again.

### Task 4: Update Template UI

- [x] Update `/templates` table to show preview status.
- [x] Add `Preview Template`, `Open Preview`, and `Download Preview` controls.
- [x] Disable activation when validation or required DOCX preview is missing.
- [x] Keep XLSX activation validation-only and show `N/A` preview state.
- [x] Run focused tests again.

### Task 5: Docs And Verification

- [x] Update handoff and docs for the new route, workflow, activation guard, storage path, and QA checklist.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
- [x] Record latest verification output in `DEVELOPER_HANDOFF.md`.
