# Recurring PR Final Fix Report

Date: 2026-07-16

## Scope

Resolved the VAT snapshot, lifecycle/reference race, duplicate annual-run audit, and catch-up documentation findings from `recurring-final-review.md` without running destructive live database setup.

## TDD Evidence

1. Added repository regressions for a 10% schedule VAT snapshot, existing-run and unique-claim duplicate audits, pause-after-outer-read, category-deactivation-after-outer-read, and invalid Retry error persistence.
2. Initial focused run: `npm test -- tests/recurring-pr-worker-repository.test.ts` failed 5 tests for the intended missing VAT, audit, and transaction-local-state behaviors.
3. After the first implementation pass, existing repository fixtures exposed the new transaction-local read boundary; fixtures were updated to model that real contract.
4. Added the Retry preservation regression. Its focused run failed because the safe failed-run error was not updated; a typed retry-validation error path restored that existing behavior.
5. Focused recurring/category verification then passed with 82 tests across 11 files.
6. A final-review regression added deterministic annual-rule edits after the outer read: one moved `nextRunDate` into the future and one remained due with different renewal/scheduled dates. The new tests initially failed because the worker created/advanced the stale outer occurrence, then passed after moving CRON due, occurrence, and duplicate lookup decisions into the serializable transaction.
7. A follow-up regression combined a moved-future annual-rule edit with category deactivation. It initially persisted a safe failed run because CRON validated references before checking due status; it passed after moving the transaction-local CRON due gate ahead of validation.

## Changes

- Recurring Draft creation supplies the schedule VAT snapshot to `buildDraftCreateData` and budget reservation totals. Ordinary draft inputs retain the existing 7% default when no VAT override is supplied.
- The worker's Draft/run transaction is serializable and re-reads the schedule plus Company/Branch, Department, Division, Category, responsible user, and item snapshot before claiming a run or creating a Draft.
- A schedule paused after the outer due read skips without a run or Draft. An inactive required reference found after that read persists one safe `FAILED` run, no Draft, schedule `lastRunAt`, and a System failure audit in the same transaction.
- Existing and contention duplicate annual-run skips record the System action `Duplicate annual run skipped`.
- Manual Retry retains its prior behavior of persisting the current sanitized validation error when refreshed references are invalid.
- CRON recomputes the due condition and annual occurrence from the transaction-local schedule. A no-longer-due edit creates no run or Draft; an edited due rule supplies the persisted run, Draft required date, audit metadata, and next-run progression.
- A transaction-local schedule moved into the future skips before validation, run, Draft, schedule update, or audit side effects. Retry validation behavior and still-due validation failures are unchanged.
- Operator/developer documentation now states one annual occurrence per due schedule per invocation and separates the earlier migration/live-smoke evidence from this code-only hardening.

## Verification

- `npm test -- tests/recurring-pr-worker-repository.test.ts tests/recurring-pr-worker.test.ts tests/pr-draft.test.ts tests/recurring-pr-date.test.ts tests/recurring-pr-cli-copy.test.ts tests/pr-category-master.test.ts tests/recurring-pr-service.test.ts` - 7 files, 78 tests passed.
- `npm run typecheck` - passed.
- `npm test` - 69 files, 403 tests passed.
- `npx prisma validate` - schema valid.
- `npm run build` - passed.
- `git diff --check` - passed.

The commands emitted the pre-existing Node `DEP0123` TLS ServerName warning. The build also reported the known multiple-lockfile workspace-root warning. No additional live database smoke was performed; the prior 2026-07-15 live evidence does not claim coverage of these fixes.
