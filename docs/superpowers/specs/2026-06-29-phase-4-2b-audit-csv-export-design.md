# Phase 4.2B Audit CSV Export Design

## Goal

Allow admins and auditors to export the currently filtered Audit Logs list to CSV for Excel review.

## Decisions

- Add `GET /audit-logs/export` instead of an API route so the route lives beside the admin page and can be linked directly from the UI.
- Reuse the same filter keys as `/audit-logs`: `q`, `entityType`, `action`, `actorId`, `dateFrom`, and `dateTo`.
- Require `AUDIT_VIEW` on the export route.
- Keep export bounded at 1,000 newest matching rows to avoid accidental large downloads.
- Use UTF-8 BOM CSV because the app contains Thai and English text and auditors are likely to open the file in Excel.
- Serialize only display-safe audit columns and never include raw secrets or file contents.

## CSV Columns

Date, Action, Entity Type, Entity ID, Actor, Actor Username, Detail, Metadata, IP Address, User Agent.

## Testing

- Unit-test CSV escaping for commas, quotes, and embedded newlines.
- Unit-test filter-preserving export href generation.
- Static-test the Audit Logs page so the export action is linked instead of disabled.
- Run full tests, typecheck, Prisma validate, and production build before handoff.
