# Annual Recurring PR

Last updated: 2026-07-15

Annual Recurring PR creates a reviewable Draft for a renewal. It is a schedule feature, not an automatic controlled-document or notification workflow.

## Scope And Permissions

- Schedules are annual only. The recurrence rule is `renewalMonth`, `renewalDay`, and `leadDays` (1 through 365).
- `scheduledDraftDate` is `renewalDate - leadDays` using Asia/Bangkok calendar dates. A February 29 rule uses February 28 in a non-leap year.
- A new schedule starts in the current occurrence year only when its renewal date has not passed in Bangkok; otherwise it starts next year.
- `ADMIN` and `IT_ADMIN` receive `PR_RECURRING_MANAGE`, which is required to create from a PR, edit, pause, resume, and Retry. Authenticated users without that permission can view schedules and open Drafts they are otherwise allowed to access, but cannot change schedule configuration.
- A responsible user must be active when selected. Generated Drafts use that user as `createdById`; the worker never substitutes another user. If the user later becomes inactive, the due run fails validation.

## Create From PR Snapshot

Use `Create Recurring Schedule` from a source PR. The form snapshots Company, Branch, Department, Division, Category, Purpose, Purchase Method, Remark, VAT rate, and ordered Heading/Item/Detail rows including item quantity, unit cost, and row total. The schedule owns this normalized snapshot; editing it affects future Drafts only and does not change the source PR, historical runs, or previously generated Drafts.

The snapshot deliberately excludes PR/reference numbers, status and status timestamps, generated snapshot JSON, template selection, attachments (PDF, quotation, signed scan, or otherwise), audit history, and cancellation/clone/reissue lineage.

## Schedule And Run Status

- `ACTIVE` and `PAUSED` are the only persisted schedule statuses. Only active schedules are due for cron processing.
- `Needs attention` is a derived UI state, not a third persisted value. It appears when the latest run is `FAILED` or any required referenced Company/Branch, Department, Division, Category, or responsible user is inactive.
- Run statuses are `PROCESSING`, `SUCCEEDED`, and `FAILED`. A successful run links exactly one generated Draft; a failed run retains a safe error message for correction and Retry.

## Worker Contract

`npm run recurring-pr:process` resolves today's Asia/Bangkok date and processes active schedules whose `nextRunDate` is on or before that date. It validates active references and the item snapshot, records the annual run, creates the Draft, reserves soft budget through the existing draft rules, links the run, and advances `nextRunDate` to the next annual occurrence.

The worker creates only a `DRAFT`: `documentDate` is the worker's Bangkok date, `requiredDate` is the renewal date, and `createdById` is the responsible user. It does not render with Carbone, allocate a PR number, create a controlled snapshot or attachment, issue the document, or send external notifications. A user must review and manually issue the Draft through the ordinary PR flow.

`RecurringPurchaseRequestRun` has a unique `scheduleId + occurrenceYear` key. This is the database-level idempotency boundary for overlapping cron/manual processes and retries. A competing process that loses the unique-key race skips the occurrence; the run-to-Draft relation also allows at most one Draft per run.

If a server outage leaves an active schedule overdue, the next worker invocation catches it up because it selects `nextRunDate <= today`. After a persisted validation failure, the daily worker does not retry the same occurrence automatically. Correct the invalid schedule reference or item data, then use the authorized `Retry` action; Retry claims and completes the same failed run, never creates another run for that schedule/year. A transaction failure that rolls back before a failed run is persisted remains eligible on a later cron invocation.

Automated run and Draft audit events use `AuditLog.actorId = null`, displayed as `System`; they are not attributed to the responsible user or schedule creator. A manual Retry audit records the authorized human actor. Safe metadata includes schedule, occurrence, responsible-user, renewal/scheduled dates, and relevant Draft/error identifiers without exposing infrastructure secrets.

## Ubuntu Operation

The deployed command is private to the server: cron runs it once daily at 01:00 Asia/Bangkok from `/var/www/it-pr-dms/current`, protected by `/usr/bin/flock -n /var/lib/it-pr-dms/locks/recurring-pr.lock`, and appends output to `/var/log/it-pr-dms/recurring-pr.log`. The authoritative cron entry, minimal-environment manual command, lock setup, and logrotate policy are in [DEPLOYMENT_UBUNTU_NGINX_PM2.md](DEPLOYMENT_UBUNTU_NGINX_PM2.md); recovery steps are in [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md).

The CLI prints one safe JSON result. Exit code `0` means all due schedules completed or were skipped, `2` means one or more schedules failed after the worker continued with the rest, and `1` means the worker could not start or complete. It has no public HTTP/nginx route and does not require an interactive Auth.js session.

Run the documented minimal-environment command from the operations guide for a safe manual execution. Do not delete the persistent lock while a process is active; `flock` releases it when that process exits.

## Development Verification Evidence

On 2026-07-15, migration `000010_annual_recurring_pr` was applied to the configured development SQL Server and `npx prisma migrate status` reported all 10 migrations up to date. A zero-due-run CLI smoke returned one safe JSON line with exit code `0`.

The live worker smoke created three due schedules and started two worker commands concurrently. One command claimed all three occurrences while the competing command skipped all three: two valid schedules produced exactly one unnumbered Draft each, the overdue schedule exercised catch-up, and an inactive responsible user produced one safe `FAILED` run with no Draft. After reactivating the user, the authorized UI Retry reused that same run and created one Draft. System audit rows used a null actor.

Authenticated browser QA on port `3002` verified create-from-PR, exact renewal/next-Draft preview, Heading/Item/Detail persistence through schedule save and generated Draft creation, Active/Paused/Needs attention/run-history states, source/Draft cross-links, category-deactivation impact preview, and an `IT_USER` read-only view without create/edit/pause/retry controls. Desktop and 390px mobile checks keep wide tables in internal scroll containers without page-level horizontal overflow. These are development checks, not business UAT or production cron evidence.
