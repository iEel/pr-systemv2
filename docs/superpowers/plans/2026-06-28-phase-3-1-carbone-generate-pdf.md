# Phase 3.1 Carbone Generate PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Generate a controlled PDF from a draft PR by sending a real DOCX template and normalized PR JSON payload to Carbone, storing the output file metadata, and moving the PR to `GENERATED`.

**Architecture:** Add a small Carbone HTTP client using the configured `CARBONE_URL`, a document-generation command boundary in `lib/pr-generate.ts`, and a server action invoked from PR detail. Use inline template rendering (`POST /render/template?download=true`) until template upload/version management is implemented. Store local files under `storage/templates` and `storage/generated` while keeping DB attachment metadata in SQL Server.

**Tech Stack:** Next.js App Router server actions, Prisma `6.19.3`, SQL Server `IT_PR_DMS`, Carbone HTTP API v5, DOCX template, Node filesystem/crypto, Vitest, TypeScript.

---

## File Map

- Create: `storage/templates/PR_STANDARD_V1.docx` real Carbone DOCX template.
- Create: `lib/carbone-client.ts` for render-template HTTP calls.
- Create/modify: `lib/pr-generate.ts` for payload mapping, running number allocation, file storage, DB update, and audit.
- Create/modify: `tests/pr-generate.test.ts` for payload, file naming, running number formatting, and snapshot shape.
- Create: `app/pr/[id]/generate/actions.ts` for Generate PDF server action.
- Modify: `components/pr/PRDetail.tsx` to enable Generate PDF form action for draft PRs.
- Modify: `docs/PHASE_2_STATUS.md` and `docs/BACKEND_INTEGRATION.md` after verification.

## Tasks

### Task 1: Template And Pure Payload Tests

- [x] Create focused tests for PR render payload shape, running number formatting, generated file paths, and SHA-256 hashing.
- [x] Run focused tests and confirm missing functions fail.
- [x] Implement pure helpers in `lib/pr-generate.ts`.
- [x] Run focused tests and confirm pass.

### Task 2: Carbone Client And Template Asset

- [x] Create a minimal DOCX template with Carbone tags for header, totals, item loop, and status metadata.
- [x] Implement `renderCarboneTemplate` with `POST /render/template?download=true` and `carbone-version` header.
- [x] Add small coverage for render request body construction where practical.

### Task 3: Generate Command

- [x] Load only draft PRs with relations and active template.
- [x] Allocate `ITPR_YYMMNNN` from `RunningNumberSetting` inside a Prisma transaction.
- [x] Build immutable snapshot JSON with the allocated PR number.
- [x] Call Carbone and store output file under `storage/generated/{prNo}.pdf`.
- [x] Store `GENERATED_PDF` attachment metadata, hash, snapshot, template version, `generatedAt`, status `GENERATED`, and audit `Generated PDF`.

### Task 4: UI Wiring And Verification

- [x] Add generate server action and detail-page form button for draft records.
- [x] Run `npm test`, `npm run typecheck`, `npx prisma validate`, `npm audit`, and `npm run build`.
- [x] Generate a PDF from a draft on localhost and verify DB status, attachment metadata, file exists, and detail page timeline.
- [x] Update docs with Phase 3.1 result and next recommended Mark Printed / Download flow.