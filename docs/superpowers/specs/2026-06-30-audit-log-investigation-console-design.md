# Audit Log Investigation Console Design

## Goal

Upgrade Audit Logs from a dense raw event table into an investigation-ready admin surface while preserving the current SQL Server audit data, route security, filters, and CSV export.

## Approved Scope

The work follows the user-approved sequence from the critique:

1. **A - Investigation-first:** Add a selected-event detail panel so admins can inspect one event without decoding the whole row.
2. **B - Export trust:** Make active filters and export scope explicit before the user downloads CSV.
3. **C - Visual polish:** Add audit event taxonomy, clearer metadata previews, and a calmer table layout.

## UX Model

Audit Logs should answer four questions quickly:

- **Who** performed the action.
- **What** happened.
- **Where** it happened: PR, template, branch, setting, user, or budget context.
- **What evidence** exists: event id, metadata fields, file names, hashes, IP, user agent, and source details.

The table remains the scanning surface. The detail panel becomes the evidence surface.

## Feature Design

### A. Investigation Detail Panel

- Each row gets a clear `Inspect` affordance.
- Selecting a row preserves active filters in the URL and adds `eventId`.
- The right-side detail panel shows:
  - action, category, date/time, actor
  - entity type and entity id/link
  - human-readable detail
  - structured metadata key/value list
  - source information: IP address and user agent
  - copy-friendly technical identifiers displayed in monospace
- Closing the panel removes only `eventId`, preserving the current search/filter context.
- If no event is selected, show an investigation guidance panel that explains what to inspect.

### B. Filter And Export Trust

- Active filters render as chips below the filter form.
- Each chip links to the same page with that filter removed.
- Export button copy changes from generic `Export CSV` to scoped copy:
  - `Export CSV`
  - `Export filtered CSV (N rows)`
  - `Export CSV (first 1,000 rows)` when the result set exceeds the export limit.
- Export helper text states that CSV follows the current filters and exports up to 1,000 rows.
- Search placeholder mentions PR No., action, actor, metadata, file name, and hash.
- Empty state tells the user how to recover: clear filters or broaden search.

### C. Taxonomy And Layout Polish

- Audit actions map to categories:
  - `Document`: draft, generated PDF, printed, signed, cancelled, reissued
  - `Template`: template validation/activation/archive/preview
  - `Master Data`: company/branch/header/footer/profile events
  - `Users / Roles`: user and RBAC activity
  - `Settings`: running number and configuration activity
  - `Budget`: budget reservation/enforcement events
  - `System`: fallback
- Category badges use the existing `Badge` component tones.
- Table columns become more investigation-focused:
  - Date
  - Event
  - Target
  - Actor
  - Evidence
  - Inspect
- Metadata in table rows becomes a compact preview instead of a long paragraph.
- Full metadata stays available in the detail panel.

## Data / Code Approach

- Keep `AuditLogFilters` as the public filter type and add `eventId` only for page selection URL state, not for Prisma list filtering.
- Add pure helpers in `lib/audit-logs.ts` for:
  - parsing metadata into entries
  - categorizing actions
  - building filter chips
  - building remove-filter and inspect/close hrefs
  - computing export labels and notes
- Keep rendering server-side in `app/audit-logs/page.tsx` to avoid unnecessary client state.
- Add `getAuditLogById()` so selected events can be shown even when the event is outside the current first 100 rows.

## Non-Goals

- Do not change how audit logs are written.
- Do not add mutation, delete, or edit behavior to Audit Logs.
- Do not add external dependencies.
- Do not change permission rules beyond preserving `AUDIT_VIEW`.

## Testing

- Add/extend Vitest coverage for:
  - metadata parsing into structured entries
  - action taxonomy
  - active filter chips and remove links
  - inspect/close hrefs preserving filters
  - export label behavior at 0, filtered, and over-limit result counts
  - source contract checks for the page using new helper names and UI copy

## Documentation Updates

After implementation, update:

- `DEVELOPER_HANDOFF.md`
- `docs/FEATURES.md`
- `docs/BACKEND_INTEGRATION.md`
- `docs/QA_CHECKLIST.md`
- `docs/ROADMAP.md`
