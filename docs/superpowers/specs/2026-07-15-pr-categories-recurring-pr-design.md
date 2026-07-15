# PR Categories And Annual Recurring PR Design

Last updated: 2026-07-15

## Goal

Add one primary category to each new Purchase Request and allow IT administrators to create annual recurring PR schedules for renewals. A schedule creates a reviewable Draft before the renewal date; it never allocates a PR number or issues a controlled document automatically.

## Approved Decisions

- Each PR has one primary category.
- Categories are maintained as Master Data.
- Existing PR records may have no category, but every newly created PR must select an active category.
- Recurring schedules are annual only in the first release.
- A schedule stores a separate snapshot copied from an existing PR.
- The user configures a renewal month/day and how many days in advance the Draft should be created.
- The default lead time is 30 days, and other positive lead times are allowed.
- Each schedule has one responsible active IT user.
- The scheduled process creates a Draft only. A user must review it and choose `Issue PR` manually.
- Recurring PR is a separate navigation destination, not a third view on the PR Documents page.
- Ubuntu cron invokes a server-side worker command once per day.
- In-app status is included in the first release; email, Teams, and other external notifications are not.

## Scope And Delivery Order

The work is delivered in two dependent stages:

1. PR Category Master and category integration across PR create/edit/detail/list/board/report/export/template payloads.
2. Annual Recurring PR schedules, schedule-run history, the daily worker, and Ubuntu cron documentation.

Category support is implemented first because every recurring schedule snapshot carries one PR category.

## Information Architecture

### PR Documents

`PR Documents` keeps the existing List and Board views. These are two views of the same Purchase Request records.

### Recurring PR

Add a separate `Recurring PR` navigation item immediately below `PR Documents`. This page owns schedule search, filtering, upcoming renewals, run status, editing, pause/resume, and retry actions.

### Master Data

Add `PR Categories` within the existing Master Data area. It is not a separate top-level sidebar item.

### Connections Between Modules

- PR Detail provides `Create Recurring Schedule` when the user has recurring-management permission.
- A Draft created by a schedule shows a `Recurring` badge and links to its schedule/run.
- A successful schedule run links to the generated Draft.
- PR Detail, List, Board, Reports, and XLSX exports show or filter by category where appropriate.

## PR Category Data Model

Add `PurchaseRequestCategory` with:

- `id`
- `code`, unique and stable
- `name`
- `description`, optional
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

Add nullable `PurchaseRequest.categoryId` and a relation to `PurchaseRequestCategory`.

The database field remains nullable for legacy compatibility. Server validation requires an active category for every new PR and for edits to a Draft once the category feature is deployed. Controlled historical PRs without a category remain readable and renderable.

Clone and Reissue reuse the source category automatically only while it remains active. If a Reissue source has no category or its category is inactive, the Reissue command requires the user to select an active category before creating the replacement Draft. The server validates the final category inside the Reissue transaction and never creates a replacement Draft with a null or inactive category.

Initial editable seed categories:

- `HARDWARE` - Hardware & Equipment
- `SOFTWARE_LICENSE` - Software & Licenses
- `SUBSCRIPTION_RENEWAL` - Subscription & Renewal
- `SERVICE_MAINTENANCE` - Service & Maintenance
- `NETWORK_INFRASTRUCTURE` - Network & Infrastructure
- `CLOUD_HOSTING` - Cloud & Hosting
- `OTHER` - Other

A category referenced by any PR or recurring schedule cannot be physically deleted. Administrators deactivate it instead. Deactivation is allowed after a confirmation that names affected active schedules; those schedules immediately derive `Needs attention` and cannot run until assigned an active category. Inactive categories remain visible on historical records but are unavailable for new PRs and new/edited schedules. A category code is editable only before the category is referenced; its display name and description remain editable.

## Recurring Schedule Data Model

### RecurringPurchaseRequestSchedule

Store schedule configuration and a normalized PR header snapshot:

- identity: `id`, `name`
- source traceability: nullable `sourcePurchaseRequestId` with `onDelete: SetNull`, so removing an eligible source Draft never removes the schedule
- document snapshot: `companyId`, `branchId`, `departmentId`, `divisionId`, `categoryId`, `purpose`, `purchaseMethod`, `remark`, `vatRate`
- annual rule: `renewalMonth`, `renewalDay`, `leadDays`
- ownership: `responsibleUserId`, `createdById`
- execution: `status` (`ACTIVE` or `PAUSED`), `nextRunDate`, `lastRunAt`
- timestamps: `createdAt`, `updatedAt`

`Needs attention` is a derived UI state when the latest run failed or a required referenced record is inactive. It is not a third persisted schedule status.

### RecurringPurchaseRequestScheduleItem

Store the copied line-item snapshot separately so it can be edited and validated without parsing JSON:

- `id`
- `scheduleId`
- `lineNo`
- `rowType` (`HEADING`, `ITEM`, or `DETAIL`)
- `accountCode`
- `description`
- `quantity`
- `unitCost`
- `totalAmount`

Use the same numeric precision and row validation rules as `PurchaseRequestItem`.

### RecurringPurchaseRequestRun

Record each annual occurrence and enforce idempotency:

- `id`
- `scheduleId`
- `occurrenceYear`
- `renewalDate`
- `scheduledDraftDate`
- `status` (`PROCESSING`, `SUCCEEDED`, or `FAILED`)
- `purchaseRequestId`, nullable until success and unique when present
- `errorMessage`, nullable and sanitized for UI display
- `startedAt`
- `finishedAt`, nullable

Add a unique constraint on `scheduleId + occurrenceYear`. This is the database-level guarantee that retries, overlapping cron calls, or multiple application processes cannot create two Drafts for the same annual occurrence.

The one-to-one relation between a run and its generated Purchase Request is used to show the `Recurring` origin badge and trace links.

## Creating A Schedule From A PR

The PR Detail action opens a dedicated schedule form prefilled from the selected PR. The snapshot copies:

- Company, Branch, Department, and Division
- Category
- Purpose, Purchase Method, and Remark
- Heading, Item, and Detail rows in their existing order
- Quantity, unit cost, row total, and VAT rate

The snapshot does not copy:

- PR number or reference number generated for the controlled document
- status or status timestamps
- generated snapshot JSON
- PDF, quotation, signed scan, or any other attachment
- template-version selection
- audit history
- cancellation, clone, or reissue lineage

Editing a schedule changes only future Drafts. It does not mutate the source PR, previous runs, or Drafts already created by the schedule.

## Annual Date Rules

- `renewalDate` is the configured month/day in the occurrence year.
- `scheduledDraftDate` is `renewalDate - leadDays` using Asia/Bangkok calendar dates.
- The worker treats a schedule as due when `nextRunDate` is on or before the worker's current Asia/Bangkok date.
- February 29 becomes February 28 in a non-leap year.
- When a new schedule is created, select the current-year occurrence only when that renewal date has not passed. Otherwise, start with the next year.
- If an already-active schedule was due while the server was unavailable, the next worker run catches it up even when the scheduled Draft date has passed.
- After a successful run, calculate and persist the next annual run date.
- Changing month, day, or lead time recalculates the next run date without changing historical runs.

## Daily Worker

Add a package command named `recurring-pr:process`. Ubuntu cron runs it once daily, recommended at 01:00 Asia/Bangkok.

The command calls a shared server-side recurring service. It must not call a public HTTP route and must not require an interactive Auth.js session.

For every due active schedule, the worker:

1. validates the schedule, active category, active company/branch/department/division, active responsible user, and item snapshot
2. claims or creates the annual run using the unique schedule/year key
3. creates a new `DRAFT` Purchase Request inside a database transaction
4. assigns the responsible user as `createdById`
5. uses the worker date as `documentDate`
6. uses the annual renewal date as `requiredDate`
7. copies the normalized schedule header and items
8. calculates totals through the existing PR draft calculation rules
9. applies the existing soft Budget reservation behavior
10. links the run and Draft, marks the run successful, and updates the schedule's next run date
11. writes Audit Log records for the automated action

The worker never calls Carbone, allocates a running number, creates a controlled snapshot, or changes the Draft to `GENERATED`.

## Worker Idempotency And Concurrency

- The unique schedule/year constraint is authoritative.
- Draft creation, Budget reservation, run success, and schedule next-run updates occur in one Prisma transaction.
- A competing worker that loses the unique-key race reads the existing run and skips it without creating another Draft.
- A failed validation creates or updates a `FAILED` run and leaves the schedule in the derived `Needs attention` state.
- A transient transaction failure rolls back Draft creation. A later cron run may retry safely.
- Manual `Retry` reuses the same annual run and cannot create a second Draft after a successful run.
- The daily worker does not repeatedly retry a persisted `FAILED` run. An administrator fixes the schedule and uses `Retry`; transaction failures that roll back before a failed run is persisted remain eligible for automatic retry on the next cron invocation.

## Permissions

Reuse `MASTER_DATA_MANAGE` for PR Category CRUD.

Add `PR_RECURRING_MANAGE` for:

- creating a schedule from a PR
- editing schedule data and items
- pausing and resuming a schedule
- retrying a failed annual run

Grant `PR_RECURRING_MANAGE` to `ADMIN` and `IT_ADMIN`. Other authenticated IT users can view recurring schedules and open Drafts they are otherwise authorized to access, but cannot change schedule configuration.

Only active users may be selected as responsible users. Deactivating the responsible user later causes the next due run to fail validation and show `Needs attention`; the worker must not silently assign another user.

## Audit Logging

Automated worker events use `AuditLog.actorId = null`, which represents `System`. Do not attribute an automated action to the responsible user or schedule creator.

Audit events cover:

- category created, updated, activated, and deactivated
- schedule created from a PR
- schedule edited, paused, and resumed
- automated recurring Draft created
- duplicate annual run skipped
- annual run failed
- failed run retried

Metadata includes schedule id, occurrence year, source PR id when available, generated Draft id when available, responsible user id, scheduled Draft date, renewal date, and a safe error summary.

## Category UI

### Create And Edit PR

Add a required `PR Category` select in Document Information before the item table. The select contains active categories in `sortOrder`, then name order.

For legacy Drafts with no category, editing requires the user to select one before Save Draft or Issue PR. Controlled legacy documents remain view-only without forced backfill.

### Detail, List, And Board

- Detail shows the category near Company/Department metadata.
- List supports category search/filter and a compact category column or secondary label without widening the action area.
- Board shows a compact category badge on each PR card.
- Missing legacy category is displayed as `Not categorized`, never as an empty field.

### Master Data

The PR Categories page supports create, edit, sort order, activate, and deactivate. Before deactivation, it lists affected active schedules and explains that they will enter `Needs attention` until assigned another active category.

## Recurring PR UI

### List Page

The separate Recurring PR page includes:

- summary counts: Active, Upcoming, Needs attention, and Paused
- search by schedule name, source PR, category, or responsible user
- filters for status, category, responsible user, and upcoming renewal period
- columns for schedule name, category, renewal date, lead days, responsible user, next Draft date, last run, and status
- row actions for View, Edit, Pause/Resume, Retry when failed, and Open Draft when available

Keep row actions compact and do not place schedule forms or full run history in the list table.

### Create/Edit Page

Use a dedicated page rather than a modal because the schedule includes document metadata, annual settings, ownership, and an editable item table.

The page groups fields into:

1. Schedule identity and responsible user
2. Annual renewal date and lead time
3. PR header snapshot and category
4. Item snapshot
5. Next-run preview

The next-run preview shows the renewal date and expected Draft creation date before Save.

### Detail Page

Show current configuration, next action, source PR, generated Draft links, and annual run history. A failed run displays an actionable safe error message and `Retry` only to authorized users.

## Reports, XLSX, And Carbone Payload

- Add Category filtering and grouping to Reports without changing Budget calculations.
- Add Category columns/labels to the existing XLSX export where PR dimensions are listed.
- Expose `categoryCode` and `categoryName` in the Carbone render payload.
- Existing templates remain valid because the new fields are optional template inputs; no existing Word or Excel template is rewritten automatically.
- Recurring schedule operational data is not mixed into the current PR financial report in the first release.

## Error Handling

- Inactive or missing category/reference/user: do not create a Draft; record a failed run and show `Needs attention`.
- Missing or insufficient Budget: preserve the current soft-warning behavior and allow Draft creation.
- Worker invoked repeatedly: return a successful summary with skipped duplicates.
- Worker partially fails: continue processing other schedules and return non-zero only for unexpected worker-level failures; per-schedule validation failures are recorded in run history.
- Error messages shown in UI must omit database credentials, connection strings, stack traces, and raw Prisma query details.
- Paused schedules are never processed and retain their history.

## Deployment And Operations

Document an Ubuntu cron entry using the deployed `current` directory and the same environment configuration as the PM2 application. Cron output should append to a dedicated recurring-worker log managed by the server's normal log rotation policy.

Operations documentation must include:

- how to run the worker manually
- how to confirm the most recent successful run
- how to inspect failed schedules in the application
- how to retry safely
- how to disable the cron entry during maintenance
- how catch-up behaves after downtime

## Testing

### Category Tests

- create/update/activate/deactivate category behavior
- unique category code validation
- deletion prevention for referenced categories
- active-category filtering and ordering
- new PR category requirement
- legacy PR read/render compatibility
- Draft edit requiring category before Save/Issue
- active-category preservation through clone and reissue, including explicit Reissue selection for legacy or inactive source categories
- category filters, Reports, XLSX, and Carbone payload mapping

### Schedule Date Tests

- same-year annual occurrence
- lead time crossing a month boundary
- lead time crossing a year boundary
- February 29 in leap and non-leap years
- new schedule created after this year's renewal date
- catch-up after a missed scheduled date
- recalculation after schedule edit

### Worker Tests

- successful Draft creation with heading/item/detail order preserved
- responsible user assignment
- current document date and annual required date
- totals and soft Budget reservation
- duplicate sequential invocation
- concurrent annual-run claim
- failed validation and manual retry
- no Carbone call and no PR number allocation
- System audit actor and safe metadata
- one failure does not block other due schedules

### Authorization And UI Tests

- Category management permission guard
- Recurring management permission guard
- non-manager read-only schedule behavior
- inactive responsible user cannot be selected
- separate Recurring PR sidebar state and mobile navigation
- empty, upcoming, paused, failed, and successful list/detail states
- keyboard-accessible controls and explicit status labels

### Full Verification

- `npm test`
- `npm run typecheck`
- `npx prisma validate`
- `npm run build`
- migration applied against the development SQL Server instance
- manual cron-command smoke test

## Documentation Updates During Implementation

Update these sources of truth with the implemented behavior:

- `DEVELOPER_HANDOFF.md`
- `docs/README.md`
- `docs/FEATURES.md`
- `docs/DATA_MODEL.md`
- `docs/BACKEND_INTEGRATION.md`
- `docs/DOCUMENT_GENERATION.md`
- `docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/QA_CHECKLIST.md`

## Out Of Scope

- monthly, quarterly, weekly, or custom cron recurrence
- automatic `Issue PR`, running-number allocation, Carbone render, or PDF generation
- email, Teams, Slack, or SMS notifications
- multiple categories or free-form tags on one PR
- category assignment per line item
- recurring approval workflows
- copying quotations, generated PDFs, signed scans, or other attachments into recurring Drafts
- a general-purpose job queue or distributed scheduler

## Success Criteria

- Every new PR has one active primary category while legacy controlled PRs remain usable.
- Administrators can create an annual schedule from an existing PR without re-entering the PR body.
- The system creates one and only one Draft for each schedule occurrence year.
- Drafts are created early enough according to the configured lead time and assigned to the selected responsible user.
- Users must review and manually issue every recurring Draft.
- Server downtime, repeated cron invocation, and concurrent execution do not create duplicate Drafts.
- Category and recurring activity are searchable, auditable, permission-controlled, and documented for Ubuntu operations.
