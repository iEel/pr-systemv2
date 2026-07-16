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

## Changes

- Recurring Draft creation supplies the schedule VAT snapshot to `buildDraftCreateData` and budget reservation totals. Ordinary draft inputs retain the existing 7% default when no VAT override is supplied.
- The worker's Draft/run transaction is serializable and re-reads the schedule plus Company/Branch, Department, Division, Category, responsible user, and item snapshot before claiming a run or creating a Draft.
- A schedule paused after the outer due read skips without a run or Draft. An inactive required reference found after that read persists one safe `FAILED` run, no Draft, schedule `lastRunAt`, and a System failure audit in the same transaction.
- Existing and contention duplicate annual-run skips record the System action `Duplicate annual run skipped`.
- Manual Retry retains its prior behavior of persisting the current sanitized validation error when refreshed references are invalid.
- Operator/developer documentation now states one annual occurrence per due schedule per invocation and separates the earlier migration/live-smoke evidence from this code-only hardening.

## Verification

- `npm test -- tests/recurring-pr-date.test.ts tests/recurring-pr-worker.test.ts tests/recurring-pr-worker-repository.test.ts tests/recurring-pr-service.test.ts tests/pr-category-master.test.ts tests/recurring-pr-cli-copy.test.ts tests/recurring-pr-schema.test.ts tests/recurring-pr-actions.test.ts tests/recurring-pr-form-behavior.test.ts tests/recurring-pr-page-copy.test.ts tests/category-deactivation-confirmation.test.ts` - 11 files, 82 tests passed.
- `npm run typecheck` - passed.
- `npm test` - 69 files, 400 tests passed.
- `npx prisma validate` - schema valid.
- `npm run build` - passed.
- `git diff --check` - passed.

The commands emitted the pre-existing Node `DEP0123` TLS ServerName warning. The build also reported the known multiple-lockfile workspace-root warning. No additional live database smoke was performed; the prior 2026-07-15 live evidence does not claim coverage of these fixes.
