# Audit Log Investigation Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Audit Logs with investigation detail, filter/export confidence, and event taxonomy/layout polish.

**Architecture:** Keep the page server-rendered. Add pure view-model helpers to `lib/audit-logs.ts`, then render them in `app/audit-logs/page.tsx`. Preserve route security and existing CSV route behavior while improving copy and URL state.

**Tech Stack:** Next.js App Router, React Server Components, Prisma, SQL Server, Tailwind, lucide-react, Vitest.

---

## Files

- Modify: `lib/audit-logs.ts` for metadata entries, taxonomy, active filter chips, inspect hrefs, close hrefs, and export labels.
- Modify: `app/audit-logs/page.tsx` for detail panel, active filter chips, export trust copy, taxonomy badges, table layout, and empty state.
- Modify: `tests/audit-logs.test.ts` for pure helper coverage.
- Modify: `tests/audit-logs-page-export.test.ts` for source-contract UI coverage.
- Modify: `DEVELOPER_HANDOFF.md`, `docs/FEATURES.md`, `docs/BACKEND_INTEGRATION.md`, `docs/QA_CHECKLIST.md`, and `docs/ROADMAP.md` after implementation.

## Task 1: Helper Tests For Audit View Models

- [ ] Add tests in `tests/audit-logs.test.ts` before production code.
- [ ] Cover `metadataEntries`, `category`, `evidencePreview`, `active chips`, `remove href`, `inspect href`, `close href`, and `export label`.
- [ ] Run `npm test -- tests/audit-logs.test.ts`.
- [ ] Verify the new tests fail because helpers are missing.

## Task 2: Implement Audit View Helpers

- [ ] Extend `AuditLogFilters` with optional `eventId`.
- [ ] Add `AUDIT_LOG_EXPORT_LIMIT` export or helper access where needed.
- [ ] Extend `AuditLogListItem` with category, category tone, metadata entries, evidence preview, and source summary.
- [ ] Implement pure helper functions:
  - `getAuditLogCategory(action, entityType)`
  - `buildAuditFilterChips(filters)`
  - `buildAuditLogPageHref(filters)`
  - `buildAuditLogInspectHref(filters, eventId)`
  - `buildAuditLogCloseDetailHref(filters)`
  - `buildAuditLogExportLabel(total, filters)`
- [ ] Add `getAuditLogById(id)`.
- [ ] Run `npm test -- tests/audit-logs.test.ts` and keep existing tests green.

## Task 3: Page Source Contract Tests

- [ ] Update `tests/audit-logs-page-export.test.ts` so it requires:
  - `Inspect`
  - `Selected Event`
  - `Active filter`
  - `Export filtered CSV`
  - `exports up to 1,000 rows`
  - category badge usage
- [ ] Run `npm test -- tests/audit-logs-page-export.test.ts`.
- [ ] Verify it fails before page changes.

## Task 4: Render Investigation Detail And Trust UI

- [ ] Modify `app/audit-logs/page.tsx`.
- [ ] Read selected `eventId` from search params.
- [ ] Fetch selected event with `getAuditLogById()` when present.
- [ ] Add export label/note next to the page action.
- [ ] Add active filter chips below the filter card.
- [ ] Replace raw metadata-heavy table with Date/Event/Target/Actor/Evidence/Inspect columns.
- [ ] Add right-side selected-event detail panel on large screens and below table on smaller screens.
- [ ] Add a useful no-selection guidance panel and no-results recovery copy.
- [ ] Run targeted tests.

## Task 5: Documentation

- [ ] Update handoff/docs with the new Audit Logs investigation console behavior.
- [ ] Include QA steps for filtering, chip removal, inspect panel, close panel, and export scope.

## Task 6: Verification

- [ ] Run `npm test -- tests/audit-logs.test.ts tests/audit-logs-page-export.test.ts`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Browser-check `/audit-logs`, filtered state, and selected event state.
- [ ] Report any residual warnings separately.
