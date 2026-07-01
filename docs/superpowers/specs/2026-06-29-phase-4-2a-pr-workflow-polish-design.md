# Phase 4.2A PR Workflow Polish Design

## Goal

Make the draft editing loop faster and make the product surface stop presenting connected SQL Server flows as Phase 1 sample UI.

## Decisions

- Keep Draft Preview temporary and non-mutating. It still renders from the latest saved SQL Server draft and does not allocate a PR number, create attachments, update status, or write audit logs.
- Add submit intents to the PR form:
  - `save` redirects to `/pr/[id]`.
  - `preview` saves the draft first, then redirects to `/pr/[id]/preview-pdf`.
- Use the same intent helper for create and edit actions so new and existing drafts behave consistently.
- Move PR list filtering out of `lib/sample-data.ts` into `lib/pr-filters.ts`; sample data remains only for historical/demo tests.
- Update visible UI copy where it incorrectly labels connected app surfaces as sample shell.
- Keep dashboard budget cards/charts static for now, but label them as awaiting the real Dashboard/Reports aggregate phase.
- Update docs in the same change because workflow and status changed.

## Testing

- Add unit tests for draft submit intent parsing and redirect paths.
- Move PR filter tests to the new helper module.
- Add static copy tests for PR form workflow labels, sidebar connected-state copy, and dashboard placeholder wording.
- Run focused tests, full Vitest, typecheck, Prisma validate, and build before handoff.
