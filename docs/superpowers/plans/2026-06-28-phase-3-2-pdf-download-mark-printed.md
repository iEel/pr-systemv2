# Phase 3.2 PDF Download And Mark Printed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make generated PDFs viewable/downloadable from controlled attachment metadata and allow generated PRs to be marked as printed with audit history.

**Architecture:** Add a document-control boundary in `lib/pr-document-control.ts` for safe storage path resolution, generated PDF lookup, PDF response metadata, and printed-state transition. Add `GET /pr/[id]/pdf` for inline/download delivery and a bound server action for `Mark Printed`. Keep UI state driven by persisted PR status and attachment availability.

**Tech Stack:** Next.js App Router route handlers and server actions, Prisma `6.19.3`, SQL Server `IT_PR_DMS`, Node filesystem, Vitest, TypeScript.

---

## File Map

- Create: `lib/pr-document-control.ts` for PDF lookup/headers and mark-printed transaction.
- Create: `tests/pr-document-control.test.ts` for safe storage and header/status helpers.
- Create: `app/pr/[id]/pdf/route.ts` for preview/download.
- Create: `app/pr/[id]/mark-printed/actions.ts` for Mark Printed server action.
- Modify: `components/pr/PRDetail.tsx` to wire Preview, Download, Mark Printed, and Upload Signed state.
- Modify: `docs/PHASE_2_STATUS.md` and `docs/BACKEND_INTEGRATION.md` after verification.

## Tasks

### Task 1: TDD Pure Helpers

- [x] Add failing tests for safe storage path resolution, PDF headers, and printable status checks.
- [x] Run focused test and confirm missing functions fail.
- [x] Implement pure helpers in `lib/pr-document-control.ts`.
- [x] Run focused test and confirm pass.

### Task 2: PDF Route And DB Lookup

- [x] Add generated PDF lookup by PR id and attachment type.
- [x] Read only files under `storage/` and return 404 for missing DB/file records.
- [x] Add `GET /pr/[id]/pdf` for inline preview and `?download=1` for attachment download.

### Task 3: Mark Printed Command

- [x] Add transaction that allows only `GENERATED` PRs.
- [x] Update status to `PRINTED`, set `printedAt`, and create `Marked printed` audit event.
- [x] Add server action and bind to PR detail.

### Task 4: Verification And Docs

- [x] Run `npm test`, `npm run typecheck`, `npx prisma validate`, `npm audit`, and `npm run build`.
- [x] Verify `/pr/{id}/pdf`, `/pr/{id}/pdf?download=1`, and Mark Printed over localhost.
- [x] Update docs and mark this plan complete.