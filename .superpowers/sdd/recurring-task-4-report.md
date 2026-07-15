# Recurring PR Task 4 Report

## Delivered

- Added recurring schedule filters, list/detail/options/source read models, derived status, and active-reference projection.
- Added permission-guarded create, update, pause, and resume mutations using serializable Prisma transactions and explicit audit events.
- Create validates the source PR and active Company/Branch, Department, Division ownership, Category, and responsible User before creating the normalized schedule/item snapshot.
- Update replaces only editable schedule items and preserves schedule source and run history.
- Added category deactivation impact reads and transactional `affectedScheduleIds` audit metadata. Category actions revalidate the recurring schedule route.

## TDD Evidence

- RED: `npm test -- tests/recurring-pr.test.ts` failed with missing filter/status helper exports.
- RED: `npm test -- tests/pr-category-master.test.ts` failed with the missing deactivation-impact service and schedule re-query.
- RED: `npm test -- tests/recurring-pr-actions.test.ts` failed because `app/recurring-pr/actions.ts` did not exist.
- GREEN: `npm test -- tests/recurring-pr.test.ts tests/pr-category-master.test.ts tests/recurring-pr-actions.test.ts tests/auth-permissions.test.ts` passed: 4 files, 29 tests.

## Verification

- `npm test` passed: 60 files, 324 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed; Git emitted only CRLF normalization notices.

## Commit

- `Add recurring PR schedule service`

## Limitations

- The requested Prisma migration was intentionally not applied.
- Recurring pages/components and worker/retry behavior remain in their dedicated later tasks.
- Full-test/build output retains existing environment warnings about TLS ServerName IP use and Next.js workspace-root inference.

## Review Fixes (Follow-up)

- Resolved the four findings from `recurring-task-4-review.md`.
- Status filtering now maps every record first and applies every non-`ALL` status against the derived UI status; persisted status remains only a safe query optimization.
- List rows independently load the latest run that generated a Draft, while detail rows derive the link from full run history. A later failed run therefore retains the earlier Draft link.
- Upcoming 30/60/90-day filtering now derives the UTC-midnight cutoff from the Bangkok calendar date and accepts an injectable read-time context for deterministic boundary tests.
- Create and update audit metadata now records `responsibleUserId`, `renewalDate`, `scheduledDraftDate`, and `nextRunDate` when available.

### Follow-up Evidence

- RED: `npm test -- tests/recurring-pr-service.test.ts` reproduced incorrect derived active/paused filters, wall-clock cutoff, missing earlier Draft links, and incomplete update audit metadata.
- GREEN: `npm test -- tests/recurring-pr.test.ts tests/recurring-pr-service.test.ts` passed: 25 tests.
- Focused: `npm test -- tests/recurring-pr.test.ts tests/recurring-pr-service.test.ts tests/recurring-pr-actions.test.ts tests/pr-category-master.test.ts tests/auth-permissions.test.ts` passed: 38 tests.
- Full: `npm test` passed: 61 files, 333 tests.
- `npm run typecheck`, `npx prisma validate`, `npm run build`, and `git diff --check` passed.
