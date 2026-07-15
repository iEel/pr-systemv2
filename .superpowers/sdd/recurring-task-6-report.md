# Recurring Task 6 Report

## Delivered

- Added `lib/recurring-pr-worker.ts` with injectable Bangkok date-only orchestration, stable due selection, isolated per-schedule outcomes, and auditable summaries.
- Added atomic cron processing: annual run claim, DRAFT creation, soft budget reservation, run success, annual next-run update, and System audits execute in one transaction.
- Persisted sanitized validation failures as FAILED runs; duplicate annual claims (`P2002`) skip safely, while unexpected transaction errors roll back and remain eligible for a later cron retry.
- Added permission-guarded retry for the same FAILED run, including the PROCESSING claim, automated Draft and retry audits, and schedule/list/PR cache invalidation.
- Added scoped worker and action tests covering row-type preservation, responsible creator, Bangkok/renewal dates, validation persistence, P2002, rollback propagation, and retry behavior.

## TDD Evidence

- RED: `npm test -- tests/recurring-pr-worker.test.ts` failed because `../lib/recurring-pr-worker` did not exist.
- GREEN: the initial worker suite then passed with 4 tests.
- Focused verification: 42 tests across worker, retry action, budget, draft, and permission suites passed.

## Verification

- `npm test`: 68 files passed, 384 tests passed.
- `npm run typecheck`: passed.
- `npx prisma validate`: schema valid; no migration was applied.
- `npm run build`: passed.
- `git diff --check`: passed.

## Commit

- `Add idempotent recurring PR worker`

## Limitations

- This task does not add the cron CLI or Ubuntu operational documentation; those are Task 7 scope.
- No database migration was applied, per task instruction.
- Build output contains environment warnings about TLS SNI IP usage and multiple lockfile root inference; neither blocked the successful build.

## Review Fix Addendum

- Added an accessible, compact `Retry` action in schedule run history only when the signed-in user has `PR_RECURRING_MANAGE` and the run is `FAILED` with no generated Draft. Viewers and non-eligible runs receive no retry control.
- Corrected retry cache invalidation and redirect paths to `/pr` and `/pr/<draftId>`, while retaining recurring list and schedule-detail invalidation.
- Added transaction-faithful repository tests that discard a cloned run/Draft/budget/audit state on a late audit failure and race a cron skip with a manual retry claim against the same FAILED annual run.
- Added Task 8 QA follow-up for true SQL Server transactional and concurrency integration coverage after migration `000010_annual_recurring_pr` is applied; no migration was applied here.

### Review Fix Verification

- RED: page/action tests failed before the UI action and `/pr` route corrections.
- Focused: 47 tests passed.
- Full: 68 files and 386 tests passed.
- `npm run typecheck`, `npx prisma validate`, `npm run build`, and `git diff --check` passed.
