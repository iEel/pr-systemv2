# Phase 4.7 PDF Visual QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repeatable CLI-based PDF visual QA workflow for generated PR PDFs and template preview PDFs.

**Architecture:** Add pure report-building logic in `lib/pdf-visual-qa.ts`, a Node CLI wrapper in `scripts/pdf-visual-qa.mjs`, and docs/checklist updates. The CLI uses Poppler `pdftoppm` when available to render PDF pages into PNG review artifacts, then writes JSON and Markdown reports under `output/pdf-qa`.

**Tech Stack:** Node.js, TypeScript helper functions, Vitest, Poppler `pdftoppm`, existing local file storage.

---

## File Map

- Create `lib/pdf-visual-qa.ts` for page-count estimation, findings, report status, output path helpers, and Markdown report formatting.
- Create `scripts/pdf-visual-qa.mjs` for CLI argument parsing, safe path handling, optional Poppler rendering, and report writing.
- Modify `package.json` to add `pdf:qa`.
- Add `tests/pdf-visual-qa.test.ts`.
- Add `tests/pdf-visual-qa-cli-copy.test.ts`.
- Update `DEVELOPER_HANDOFF.md`.
- Update `docs/QA_CHECKLIST.md`, `docs/DOCUMENT_GENERATION.md`, `docs/FEATURES.md`, `docs/BACKEND_INTEGRATION.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, and `docs/PHASE_2_STATUS.md`.

## Tasks

### Task 1: Add Failing Tests

- [x] Add `tests/pdf-visual-qa.test.ts` for PDF signature checks, page count estimate, PASS/WARN/FAIL status, output paths, and Markdown checklist content.
- [x] Add `tests/pdf-visual-qa-cli-copy.test.ts` for package script and CLI source wiring.
- [x] Run `npm test -- tests/pdf-visual-qa.test.ts tests/pdf-visual-qa-cli-copy.test.ts` and confirm failures are missing implementation/wiring.

### Task 2: Implement PDF QA Helper

- [x] Create `lib/pdf-visual-qa.ts`.
- [x] Implement `estimatePdfPageCount`, `buildPdfVisualQaReport`, `buildPdfQaOutputPaths`, and `formatPdfVisualQaMarkdown`.
- [x] Run focused tests until helper tests pass.

### Task 3: Implement CLI

- [x] Create `scripts/pdf-visual-qa.mjs`.
- [x] Add `pdf:qa` to `package.json`.
- [x] Support `--input`, `--output-dir`, `--expected-pages`, `--min-bytes`, and `--skip-render`.
- [x] Render pages with `pdftoppm -png` when available.
- [x] Write `report.json` and `report.md`.
- [x] Run focused tests until CLI wiring tests pass.

### Task 4: Real PDF Smoke Test

- [x] Run `npm run pdf:qa -- --input storage/generated/ITPR_2606008.pdf --expected-pages 1`.
- [x] Confirm `report.json`, `report.md`, and PNG page image artifacts are created under `output/pdf-qa`.

### Task 5: Docs And Verification

- [x] Update handoff and docs for PDF QA command, output artifacts, and UAT checklist.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
- [x] Record latest verification output in `DEVELOPER_HANDOFF.md`.
