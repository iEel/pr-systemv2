# Backend Integration

## Recommended Stack

- Next.js App Router.
- Prisma ORM.
- SQL Server.
- Local or network file storage for document files.
- Private-network Carbone service for DOCX/XLSX template rendering.

## Current Implementation

As of 2026-06-30, the database-backed read path is in place for:

- `/pr` PR list.
- `/dashboard` recent PR list embed.
- PR list row actions use a client-safe URL helper for detail, clone-as-draft, draft preview download, generated PDF download, edit draft, upload quotation, upload signed, cancel, and reissue-from-detail shortcuts.
- `/pr/[id]` PR detail with header, items, attachments, audit timeline, and grouped command center actions.
- `/reports` SQL Server report workspace with active filter chips, budget health summary, strict no-budget warning state, mini-bar scan aids, status badges, and current-view XLSX export.

The authentication, RBAC, and admin-settings path is in place for:

- Auth.js JWT sessions.
- Credentials login against the existing SQL Server `User` table.
- SQL Server `User.role` as the authoritative role source.
- Auth proxy route protection for authenticated app pages before server component data loading.
- Route-level permission redirects to `/forbidden` for admin pages when a signed-in role lacks the required permission.
- Role/permission guards for PR and template commands.
- Session user id written to `createdById`, `uploadedById`, and `AuditLog.actorId`.
- AD/LDAP Search + Bind identity checks through the same Auth.js credentials boundary while keeping SQL Server role mapping.
- `/settings/users` SQL Server user create/update/password reset.
- `/settings/running-numbers` SQL Server running-number setting create/update with next-number preview.
- `USER_MANAGE` and `RUNNING_NUMBER_MANAGE` admin permissions.

The database-backed draft creation path is in place for:

- `/pr/new` master-data options from SQL Server.
- `/pr/new?cloneFrom=<id>` loads the source PR, pre-fills the New PR form, resets Document Date to the current default, clears Required Date, and waits for user Save before creating a row.
- Save Draft server action.
- Save & Preview submit intent that creates a draft and redirects to `/pr/[id]/preview-pdf`.
- Server-side line-item validation and total calculation.
- Draft PR, items, and `Draft created` audit event in one Prisma transaction.
- Saved cloned drafts store `PurchaseRequest.clonedFromId` and write `Draft cloned` audit metadata without copying PR number, generated/signed files, generated snapshot, status, or prior audit history.

The database-backed draft update path is in place for:

- `/pr/[id]/edit` for draft records only.
- Update Draft server action.
- Update & Preview submit intent that saves edited values and redirects to `/pr/[id]/preview-pdf`.
- Server-side replacement of line items and total recalculation.
- `Draft updated` audit event in the same Prisma transaction.

The Carbone-backed generation path is in place for:

- Active `PR_STANDARD` DOCX template at `storage/templates/PR_STANDARD_V1.docx`.
- Inline Carbone render call with DOCX template and normalized PR JSON payload.
- Generated PDF storage under `storage/generated`.
- `GENERATED_PDF` attachment metadata with SHA-256 hash.
- Status transition from `DRAFT` to `GENERATED`.
- `Generated PDF` audit event.

The generated-document delivery and print-control path is in place for:

- Inline PDF preview from persisted generated attachment metadata.
- Attachment PDF download from the same controlled file record.
- `Mark Printed` command for `GENERATED` records.
- Status transition from `GENERATED` to `PRINTED`.
- `printedAt` timestamp and `Marked printed` audit event.

The signed-upload path is in place for:

- Upload form at `/pr/[id]/upload-signed`.
- Server-action upload command for `PRINTED` records.
- PDF/JPG/JPEG/PNG validation with a 15 MB maximum.
- Signed file storage under `storage/signed`.
- `SIGNED_PDF` or `SIGNED_SCAN` attachment metadata with version, storage path, file size, MIME type, and SHA-256 hash.
- Status transition from `PRINTED` to `SIGNED`.
- `signedAt` timestamp and `Uploaded signed document` audit event.

The quotation/supporting-attachment path is in place for:

- Upload form at `/pr/[id]/upload-quotation`.
- Server-action upload command for `DRAFT`, `GENERATED`, `PRINTED`, and `SIGNED` records.
- PDF/JPG/JPEG/PNG/DOCX/XLSX validation with a 15 MB maximum.
- Quotation/supporting file storage under `storage/quotations`.
- `QUOTATION` attachment metadata with version, storage path, file size, MIME type, and SHA-256 hash.
- No PR status transition; quotation upload is evidence capture, not a lifecycle state.
- `Uploaded quotation` audit event with original name, stored name, version, and hash.

The cancel/reissue path is in place for:

- Cancel reason form at `/pr/[id]/cancel`.
- Server-action cancel command for `GENERATED`, `PRINTED`, or `SIGNED` records.
- Status transition to `CANCELLED`.
- `cancelledAt` timestamp and `Cancelled` audit event with reason.
- Reissue command for `CANCELLED` records.
- Replacement draft creation with copied header data and line items.
- `reissuedFromId` linkage from replacement draft to original PR.
- Original generated and signed attachments preserved.
- Original status transition to `REISSUED` after replacement draft creation.
- `Reissued` audit event on the original and `Draft created` audit event on the replacement draft.

The template-management path is in place for:

- SQL Server-backed `/templates` list.
- `DOCX` and `XLSX` template types through `DocumentTemplate.templateType`.
- Template uniqueness by `name + version + templateType`.
- DOCX/XLSX upload to `storage/templates`.
- Carbone tag extraction from Office XML inside DOCX/XLSX zip packages.
- Required-tag and unknown-tag validation summaries.
- Validation detail display for found, missing required, and unknown tags.
- DOCX preview rendering through Carbone with sample PR payload and PR number `TEMPLATE PREVIEW`.
- Preview PDF storage under `storage/template-previews`.
- Preview delivery through `/templates/[id]/preview` and `/templates/[id]/preview?download=1`.
- Preview pass/fail metadata stored inside `DocumentTemplate.validationJson`.
- `PR_STANDARD DOCX` activation guard requiring validation and passed preview.
- Activation scoped by `name + templateType`.
- Original template download from `/templates/[id]/file`.
- Explicit archive command for `DRAFT` and `ACTIVE` templates.
- Template audit events for upload, validate, preview rendered/failed, activate, and archive.
- Active `PR_STANDARD DOCX` remains the generation source for PR PDF output.

The audit-log read path is in place for:

- `/audit-logs` permission-guarded admin page.
- SQL Server `AuditLog` query with action, actor, entity, date range, and free-text filters.
- Summary cards for matched events, active filters, actors in view, and latest event.
- Active filter chips that remove one filter at a time while preserving selected event context.
- URL-driven selected-event inspection through `eventId`, backed by `getAuditLogById()`.
- Audit event taxonomy, structured metadata entries, evidence previews, and source summaries are built in `lib/audit-logs.ts` for server-rendered UI use.
- Entity links back to PR detail or template management where available.
- `/audit-logs/export` downloads the same filtered audit result as UTF-8 CSV with Excel-friendly BOM.
- Export is capped at 1,000 rows per request to keep the admin route bounded; the page copy explains whether the export is filtered and whether only the first 1,000 newest rows will download.

The reporting path is in place for:

- Shared report filters and aggregate helpers in `lib/reporting.ts`.
- Dashboard current-year aggregates from SQL Server `PurchaseRequest` and `Budget` records.
- `/reports` year/month/company/status filters.
- Monthly, company/branch, status, and PR detail report views.
- `/reports/export` XLSX workbook download preserving the current filters.
- Missing active Budget Master context is surfaced as a page warning and as a `Budget Warning` row in the XLSX Summary sheet instead of presenting negative Remaining Budget as trustworthy.
- Local workbook generation through `lib/xlsx.ts` and the existing `jszip` dependency.

The budget-master path is in place for:

- `/masters/budgets` permission-guarded admin page.
- Year, company, and include-inactive filters.
- SQL Server `Budget` create, inline update, deactivate, and reactivate commands.
- `BUDGET_MANAGE` permission for `ADMIN` and `IT_ADMIN`.
- Budget audit events with `entityType = Budget`.
- Active budget rows feeding existing Dashboard and Reports aggregates through `lib/reporting.ts`.

The admin-settings path is in place for:

- `/settings/users` permission-guarded user/role admin page.
- User search, role filter, and include-inactive controls.
- SQL Server `User` create, profile/role/active-state update, and password reset commands.
- Self-protection that blocks the current admin from deactivating their own account or changing their own role.
- `/settings/running-numbers` permission-guarded running-number admin page.
- SQL Server `RunningNumberSetting` create and update commands.
- Running-number preview using the same formatter as Issue PR generation.
- User and running-number audit events with `entityType = User` or `RunningNumberSetting`.

The draft-preview document path is in place for:

- `/pr/[id]/preview-pdf` inline draft PDF preview.
- `/pr/[id]/preview-pdf?download=1` draft PDF download.
- Rendering from the active `PR_STANDARD DOCX` template and the latest saved draft.
- Temporary PR number text `DRAFT PREVIEW`.
- No running-number allocation, status transition, attachment persistence, snapshot update, or audit event.

The PR template-rendering refinements are in place for:

- Branch header/footer images patched directly into DOCX templates before Carbone render.
- Monetary display fields with comma separators and two decimals.
- Split remark fields for fixed two-line ruled cells.
- Precomputed purpose and purchase-method checkbox mark fields.
- Optional Acct/account code in PR item rows.
- PDF Visual QA CLI for generated/template-preview PDFs with Poppler page rendering and `output/pdf-qa` reports.

The file delivery access-control boundary is in place for:

- `/pr/[id]/pdf` and `/pr/[id]/pdf?download=1`, which require `PR_GENERATE`.
- `/pr/[id]/attachments/[attachmentId]`, which requires `PR_GENERATE` and serves signed/quotation/supporting attachments.
- `/templates/[id]/file`, which requires `TEMPLATE_MANAGE`.
- Authorization failures on those routes return status-aware JSON before metadata lookup or storage reads.

## Remaining Integration Priorities

1. Add user-facing PR warning banners for missing or over-budget soft budget states if required after UAT.
2. Run the production backup/restore drill from `BACKUP_RESTORE.md`.
3. Add centralized monitoring/log aggregation and production TLS/internal CA sign-off.

## Planned API Surface

Exact routing can use API routes or server actions. The important part is the command boundary.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/pr` | List PRs with search, status, company, branch, date filters. |
| `POST` | `/api/pr` | Create draft PR. |
| `GET` | `/pr/new?cloneFrom=:id` | Server-rendered Clone as Draft prefill route; does not create a record until the normal draft save action submits. |
| `GET` | `/api/pr/:id` | Load PR detail. |
| `PATCH` | `/api/pr/:id` | Update draft PR only. |
| `GET` | `/api/pr/:id/preview-pdf` | Render a non-persisted draft preview PDF. |
| `POST` | `/api/pr/:id/generate` | Allocate PR number if needed, snapshot data, render PDF. |
| `POST` | `/api/pr/:id/mark-printed` | Mark generated document as printed. |
| `POST` | `/api/pr/:id/upload-signed` | Upload signed PDF or scan as next version. |
| `POST` | `/api/pr/:id/upload-quotation` | Upload quotation/supporting file as next version without changing PR status. |
| `GET` | `/pr/:id/attachments/:attachmentId` | Download signed/quotation/supporting attachment files. |
| `POST` | `/api/pr/:id/cancel` | Cancel controlled PR with reason. |
| `POST` | `/api/pr/:id/reissue` | Create replacement draft linked to original PR. |
| `GET` | `/api/templates` | List templates and versions. |
| `POST` | `/api/templates` | Upload template file. |
| `POST` | `/api/templates/:id/validate` | Validate required Carbone tags. |
| `POST` | `/api/templates/:id/preview` | Render sample PDF preview for a DOCX template. |
| `POST` | `/api/templates/:id/activate` | Activate approved template version. |
| `POST` | `/api/templates/:id/archive` | Archive a draft or active template version. |
| `GET` | `/templates/:id/file` | Download the stored original DOCX/XLSX template file. |
| `GET` | `/templates/:id/preview` | Preview or download the latest rendered template preview PDF. |
| `GET` | `/api/audit-logs` | Query audit events. |
| `GET` | `/audit-logs/export` | Download filtered audit events as CSV. |
| `GET` | `/reports/export` | Download filtered PR report workbook as XLSX. |
| `POST` | `/masters/budgets` server actions | Create, update, deactivate, and reactivate Budget records. |
| `POST` | `/settings/users` server actions | Create/update users and reset passwords. |
| `POST` | `/settings/running-numbers` server actions | Create/update running-number settings. |

## Command Rules

### Authentication And RBAC

- Users sign in through Auth.js Credentials provider for the MVP.
- Local credentials are verified against SQL Server `User.username`, `User.passwordHash`, and `User.isActive`.
- Role is always read from SQL Server `User.role`.
- `proxy.ts` reads the Auth.js JWT with `getToken()` so anonymous app-page requests are redirected to `/login?callbackUrl=...` before protected server components run.
- Route-level page permissions are centralized in `lib/auth/route-access.ts`; currently mapped admin routes redirect signed-in users without permission to `/forbidden`.
- `/forbidden` is an authenticated friendly 403 page that shows the missing permission and requested page.
- Server actions call `requirePermission()` before mutating business data.
- `ADMIN` and `IT_ADMIN` can manage templates.
- `ADMIN` and `IT_ADMIN` can manage budgets through `BUDGET_MANAGE`.
- `ADMIN` and `IT_ADMIN` can manage users through `USER_MANAGE`.
- `ADMIN` and `IT_ADMIN` can manage running-number settings through `RUNNING_NUMBER_MANAGE`.
- `IT_USER` can run PR document-control commands but cannot manage templates or view audit logs.
- `VIEWER` can access protected pages but cannot run document-control commands.
- AD/LDAP Search + Bind only replaces identity verification. It resolves an existing SQL Server allowlist `User` row and uses that row's `role`.
- Production environments must set a real `AUTH_SECRET` value.

### Create Draft

- Validate required fields.
- Validate active company, branch, department, category, and budget references.
- Require one active category for Draft create and Draft edit. The nullable SQL relation remains available only for readable legacy controlled PRs.
- Calculate totals server-side.
- Create audit event: `Draft created`.

### Clone As Draft

- Entry points are PR Detail `Clone as Draft` and the PR Documents row More menu.
- Route shape is `/pr/new?cloneFrom=<sourceId>`.
- The source PR is read only to prefill business fields and line items; no database row is created until Save Draft or Save & Preview.
- Document Date is reset to the current default date and Required Date is cleared.
- Clone does not copy controlled document data: `prNo`, generated PDF, signed uploads, generated snapshot, status, and prior audit history stay on the source PR.
- On save, the new row starts as `DRAFT`, has `prNo = null`, stores `clonedFromId`, reserves budget through the same soft budget helper as a normal draft, and writes `Draft cloned` metadata.
- The cloned form preserves the source category, but saving still validates that the selected category is active.

### Preview Draft PDF

- Allowed from `Draft` only.
- Uses latest saved draft data from SQL Server.
- Renders with active `PR_STANDARD DOCX`.
- Uses display PR number `DRAFT PREVIEW`.
- Does not mutate `PurchaseRequest`, `RunningNumberSetting`, `PurchaseRequestAttachment`, or `AuditLog`.
- Current UI entry points are `Preview Draft`, `Download Preview`, `Save & Preview`, and `Update & Preview`.
- `Save & Preview` and `Update & Preview` save the browser form values first, then render preview from SQL Server.

### Issue PR / Generate PDF

- UI label is `Issue PR`; older code/function names still use `generate` internally.
- Allowed from `Draft` only unless a dedicated re-generate rule is approved.
- Allocate PR number inside a database transaction.
- Store immutable `generatedSnapshotJson`.
- Call Carbone with the approved template version.
- Store generated file attachment.
- Update status to `Generated`.
- Create audit event: `Generated PDF`.

### Mark Printed

- Allowed from `Generated`.
- Store `printedAt`, actor, and audit metadata.
- Update status to `Printed`.

### Upload Signed

- Allowed from `Printed`.
- Validate PDF/JPG/JPEG/PNG file type and 15 MB maximum size.
- Store as `storage/signed/{prNo}_signed_v{n}.{ext}`.
- Create versioned attachment metadata and never overwrite generated files.
- Update status to `Signed`.
- Create audit event with version and file hash.

### Upload Quotation / Supporting Attachment

- Allowed from `Draft`, `Generated`, `Printed`, and `Signed`.
- Blocked from `Cancelled` and `Reissued`.
- Validate PDF/JPG/JPEG/PNG/DOCX/XLSX file type and 15 MB maximum size.
- Store as `storage/quotations/{prNoOrDraftId}_quotation_v{n}.{ext}`.
- Create versioned `QUOTATION` attachment metadata and never overwrite previous versions.
- Do not change PR status or signed/printed timestamps.
- Create audit event with version, original file name, stored file name, and SHA-256 hash.

### Cancel/Reissue

- Require reason.
- Preserve original generated files and snapshots.
- Cancel is allowed from `Generated`, `Printed`, or `Signed`.
- Reissue is allowed from `Cancelled`.
- Reissue creates a linked replacement draft instead of mutating generated or signed files.
- After reissue, the original PR is marked `Reissued` to prevent repeated replacement drafts.
- Reissue automatically uses the source category only when it is active. If the source category is missing or inactive, the command rejects the replacement Draft until the user selects an active category; it never creates an uncategorized new Draft.

### Template Management

- Upload accepts DOCX/XLSX only and stores originals under `storage/templates`.
- Validate extracts Carbone tags from Office XML and compares them with the required PR tag contract.
- Preview renders DOCX templates to PDF with a realistic sample PR payload and stores output under `storage/template-previews`.
- Preview metadata is stored under `DocumentTemplate.validationJson.preview`.
- Activate requires a successful validation result with no missing required tags.
- `PR_STANDARD DOCX` activation also requires preview status `PASSED`.
- XLSX activation remains validation-only.
- Activation is scoped by template name and type, so the active DOCX and active XLSX versions do not affect each other.
- Download serves only the stored original file path from template metadata with safe Office content headers.
- Archive is allowed from `Draft` or `Active`, sets `archivedAt`, and is blocked for already archived templates.
- Upload, validate, preview, activate, and archive write template-scoped audit events.

### Audit Log Export

- Requires `AUDIT_VIEW`.
- Uses the same query parameters as `/audit-logs`: `q`, `entityType`, `action`, `actorId`, `dateFrom`, and `dateTo`.
- Ignores UI-only `eventId` selection state when building the CSV query.
- Returns `text/csv; charset=utf-8` with attachment disposition.
- Prepends a UTF-8 BOM so Thai/English mixed text opens cleanly in Excel.
- Escapes commas and double quotes according to CSV rules and flattens embedded newlines to spaces.
- Exports up to 1,000 matching rows, ordered newest first.

### Reports / XLSX Export

- Requires an authenticated user.
- Uses query parameters: `year`, `month`, `companyId`, `categoryId`, and `status`.
- Default year is the current year; invalid month/status filters fall back to `All`.
- Dashboard and Reports share the same aggregate rules:
  - `Used` = `GENERATED`, `PRINTED`, `SIGNED`.
  - `Pending` = `DRAFT`.
  - Cancelled and reissued PRs remain visible in reports but do not count as used or pending budget.
- When `Used + Pending > 0` and active Budget Master total is zero for the selected view, Reports must show the no-budget warning and suppress misleading Remaining Budget confidence in the UI.
- XLSX export returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Workbook sheets are `Summary`, `By Month`, `By Company`, `By Status`, and `PR Detail`.
- The Summary sheet includes `Budget Warning` when the active Budget Master context is missing.
- Reports expose category filtering, a category summary, and category labels in PR detail. XLSX PR Detail exports `Category Code` and `Category Name`; legacy null relations remain exportable as `Not categorized`.

### PDF Visual QA

- Command: `npm run pdf:qa -- --input <pdf-path> --expected-pages <n>`.
- Pure helper: `lib/pdf-visual-qa.ts`.
- CLI wrapper: `scripts/pdf-visual-qa.mjs`.
- Uses Poppler `pdftoppm` when available.
- Writes `report.json`, `report.md`, and rendered `page-*.png` files under `output/pdf-qa/<pdf-file-base>/`.
- Intended for UAT evidence and template regression review, not as a replacement for human visual inspection.

### Budget Master

- Requires `BUDGET_MANAGE`.
- Uses `Budget.year`, `Budget.companyId`, optional `Budget.branchId`, and `Budget.departmentId` as the scope.
- Empty branch means the budget applies to all branches for the selected company.
- Create rejects duplicate budget scopes before insert.
- Create validates that company, optional branch, and department are active, and that selected branch belongs to selected company.
- Update changes budget, used, and reserved decimal values only.
- Deactivate/reactivate changes `Budget.isActive` instead of deleting budget rows.
- Budget mutations write `AuditLog` records with `entityType = Budget`.

### Users / Roles

- Requires `USER_MANAGE`.
- Creates local users with `hashPassword()` from `lib/auth/local-provider.ts`.
- Creates LDAP users only after `Verify AD User` confirms a short username such as `veerapon.l`.
- LDAP users store `authProvider = LDAP`, `externalUsername`, and stable `externalId`; `passwordHash` stays null.
- LDAP create re-verifies the same username server-side before inserting the SQL allowlist row.
- Username is immutable after create.
- Local passwords must be at least 8 characters.
- Password reset is available only for exact `LOCAL` users; LDAP and unknown-provider rows fail closed.
- Role must be one of `ADMIN`, `IT_ADMIN`, `IT_USER`, or `VIEWER`.
- The current admin cannot deactivate their own user or change their own role from the admin page.
- User mutations write `AuditLog` records with `entityType = User`.

### Running Number Settings

- Requires `RUNNING_NUMBER_MANAGE`.
- Creates `RunningNumberSetting` rows by `documentType`, optional `scopeCompanyId`, and optional `scopeBranchId`.
- Document type and scope are immutable after create.
- Duplicate `documentType + scopeCompanyId + scopeBranchId` rows are rejected before insert.
- Branch scope must belong to the selected company.
- Padding must be between 1 and 8.
- Current value must be non-negative.
- Next-number preview uses the same `formatRunningNumber()` helper as Issue PR.
- Running-number mutations write `AuditLog` records with `entityType = RunningNumberSetting`.

### PR Template Contract

- Official PR PDF generation uses active `PR_STANDARD DOCX`.
- XLSX templates are supported by template management and validation, but are not currently used for official PR PDF generation.
- Amount cells in the current Word template should use formatted payload fields:
  - `d.items[i].unitCostFormatted`
  - `d.items[i].totalAmountFormatted`
  - `d.subtotalFormatted`
  - `d.vatAmountFormatted`
  - `d.totalAmountFormatted`
- Remark ruled rows should use:
  - `d.remarkLine1`
  - `d.remarkLine2`
- Checkbox cells should use precomputed mark tags:
  - `d.purposeNewMark`
  - `d.purposeReplacementMark`
  - `d.purposeRepairMark`
  - `d.purposeRenewalMark`
  - `d.purchaseByProcurementMark`
  - `d.purchaseSelfMark`
- Header/footer image placeholders should use image alt text containing:
  - `{d.companyHeaderImage}`
  - `{d.companyFooterImage}`
- Optional category fields are available without changing existing templates:
  - `d.categoryCode`
  - `d.categoryName`

## Carbone Integration

Backend should own the Carbone payload contract.

Recommended flow:

1. Load PR, items, company, branch, budget, and template version.
2. Build a normalized render payload.
3. Validate required tags before calling Carbone.
4. Send template and payload to private Carbone service.
5. Receive output document.
6. Convert or store final PDF according to company policy.
7. Store output path, hash, template version id, and snapshot.

Do not let client-side code call Carbone directly.

Operational hardening:

- `lib/carbone-client.ts` maps render failures to typed operational errors: config, HTTP, network, and timeout.
- User-facing messages should stay short and safe; detailed Carbone response bodies should not be reflected into UI query strings or template validation copy.
- Carbone incidents are handled through `OPERATIONS_RUNBOOK.md`.
- nginx render routes use longer proxy timeouts and route-specific rate limits in `deploy/nginx/it-pr-dms.conf`.

See [DOCUMENT_GENERATION.md](DOCUMENT_GENERATION.md) for the current payload field list and template guidance.

## File Storage

Store these file categories:

- Uploaded template originals.
- Generated rendered documents.
- Signed PDFs or scans.
- Quotations and supporting attachments.
- PDF QA review artifacts under `output/pdf-qa`.

Template storage currently uses:

- `storage/templates/{name}_{version}.docx`
- `storage/templates/{name}_{version}.xlsx`
- `storage/template-previews/{name}_{version}_{type}.pdf`
- `storage/quotations/{prNoOrDraftId}_quotation_v{n}.{ext}`

Recommended metadata:

- Original file name.
- MIME type.
- File size.
- Storage path.
- SHA-256 hash.
- Version number.
- Uploaded/generated by.
- Timestamp.

## Audit Logging

Audit events should be written for:

- Draft created.
- Draft updated.
- PDF generated.
- PDF downloaded, if required by policy.
- Printed marked.
- Signed document uploaded.
- Quotation/supporting attachment uploaded.
- Template uploaded, validated, preview rendered/failed, activated, archived.
- PR cancelled.
- PR reissued.
- Permission or role changes.

Audit logs should avoid storing secrets or raw file contents.
