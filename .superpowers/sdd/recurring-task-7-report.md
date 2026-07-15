# Recurring PR Task 7 Report

## Scope

- Added the private `npm run recurring-pr:process` command using the local runtime `./node_modules/.bin/tsx`.
- Hardened the cron-safe worker CLI: dotenv, Prisma, and worker imports now occur inside guarded runtime initialization; worker and disconnect failures emit exactly one safe JSON result; exit codes are `0` for success, `2` for per-schedule failures, and `1` for initialization, worker, or cleanup failures.
- Added subprocess coverage using a test-only dependency fixture for success, partial failure, initialization rejection, worker rejection, and disconnect rejection. Each case asserts the exit code, a single stdout JSON line, empty stderr, and no secret leakage.
- Documented a system-wide `/usr/local/bin/node` runtime, explicit cron-like `PATH`, the matching absolute local `tsx` executable in cron/manual commands, a persistent app-owned `/var/lib/it-pr-dms/locks/recurring-pr.lock`, minimal-environment smoke check, and lock-concurrency check. The worker has no public nginx route.

## TDD Evidence

1. RED: `npm test -- tests/recurring-pr-cli-copy.test.ts` exited `1` before the review fix. The direct `tsx` subprocess could not execute the top-level-await CommonJS entrypoint, and the CLI had no dependency seam or direct-runtime/persistent-lock documentation.
2. GREEN: `npm test -- tests/recurring-pr-cli-copy.test.ts tests/phase5-hardening-docs.test.ts` exited `0` with 2 test files and 10 tests passing after the guarded lifecycle, fixture seam, and operational documentation were added.

## Verification Evidence

- `npm test -- tests/recurring-pr-cli-copy.test.ts tests/phase5-hardening-docs.test.ts`: exit `0`; 2 test files and 10 tests passed.
- `npm test`: exit `0`; 69 test files and 392 tests passed.
- `npm run typecheck`: exit `0`.
- `npx prisma validate`: exit `0`; Prisma schema valid.
- `npm run build`: exit `0`; production build completed.
- `git diff --check`: exit `0` with no whitespace errors.
- Final diff inspection performed before commit.

## Commit

`fix: harden recurring PR worker CLI` (this Task 7 review-fix commit)

## Limitations

- Migration `000010_annual_recurring_pr` was intentionally not applied in this task. Therefore, no live `npm run recurring-pr:process` zero-row run was claimed or recorded: a database missing the recurring tables cannot provide that verification. Execute the manual worker command after Task 8 applies and verifies the migration.
- The full test/build runs emitted pre-existing environment warnings about an IP TLS ServerName deprecation and Next.js selecting the parent workspace lockfile. Both commands still exited successfully.
