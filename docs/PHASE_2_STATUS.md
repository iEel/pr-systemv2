# Phase 2 Status

Last updated: 2026-07-01

## Completed In Phase 2.1

- SQL Server database `IT_PR_DMS` is created on the `ALPHA` named instance.
- Initial Prisma migration `000001_init` is applied on `WIN-I284TKLAMMD\ALPHA`.
- Prisma Client is generated with Prisma `6.19.3`.
- Seed script added at `prisma/seed.mjs`.
- Seed command added:

```bash
npm run db:seed
```

- `/pr` renders PR rows from SQL Server through Prisma.
- `/dashboard` passes recent DB-backed PR rows into the embedded PR list.

## Completed In Phase 2.2

- `/pr/[id]` loads PR detail from SQL Server through Prisma.
- PR detail renders persisted header data, line items, attachments, and audit timeline.
- Missing PR ids use the Next.js not-found flow.
- Detail mapper added in `lib/purchase-requests.ts` with unit coverage.
- Seed data expanded idempotently:
  - 1 admin user.
  - 4 companies.
  - 4 branches.
  - 3 departments.
  - 5 divisions.
  - 1 active `PR_STANDARD` template record.
  - 1 running-number setting.
  - 6 sample PR records.
  - 8 PR line items.
  - 12 attachment records.
  - 16 purchase-request audit events.

## Completed In Phase 2.3

- `/pr/new` loads Company / Branch and Department / Division options from SQL Server.
- New PR form now submits through a Next.js server action.
- Draft creation persists `PurchaseRequest`, line items, totals, and a `Draft created` audit event in one Prisma transaction.
- Draft PRs are created with `prNo = null` and `status = DRAFT`; PR number allocation remains reserved for the official Issue PR flow.
- Totals are calculated server-side from submitted line items:
  - subtotal.
  - VAT 7%.
  - total amount.
- Form has interactive add/remove item rows and live subtotal display.
- Focused tests added for draft form parsing, validation, and create payload totals.

## Completed In Phase 2.4

- `/pr/[id]/edit` loads existing draft PR data from SQL Server.
- Non-draft PR edit routes return the Next.js not-found flow.
- Draft update submits through a bound Next.js server action.
- Draft update persists header fields, replaces line items, recalculates totals, and writes `Draft updated` audit history in one Prisma transaction.
- PR number allocation remains untouched; draft updates keep `prNo = null`.
- PR detail shows an `Edit Draft` action only for `Draft` records.
- Focused tests added for draft edit mapping and update payload totals.

## Completed In Phase 3.1

- Created a real Word template at `storage/templates/PR_STANDARD_V1.docx`.
- Added Carbone inline template rendering through `POST /render/template?download=true`.
- Added normalized PR render payload generation for Carbone.
- Added controlled Generate PDF command for draft PRs. The current UI labels this official action as `Issue PR`.
- Official generation flow now:
  - Allocates the next `ITPR_YYMMNNN` number.
  - Stores immutable `generatedSnapshotJson`.
  - Sends the DOCX template and PR JSON payload to Carbone.
  - Writes the generated PDF to `storage/generated/{prNo}.pdf`.
  - Stores `GENERATED_PDF` attachment metadata, file size, and SHA-256 hash.
  - Updates status to `GENERATED`.
  - Writes `Generated PDF` audit history.
- PR detail now runs official generation for draft records and shows Mark Printed after generation.

## Completed In Phase 3.2

- Added generated PDF delivery route at `/pr/[id]/pdf`.
- Preview PDF uses inline `Content-Disposition`.
- Download PDF uses attachment `Content-Disposition` through `/pr/[id]/pdf?download=1`.
- PDF delivery reads from persisted `GENERATED_PDF` attachment metadata and local storage.
- Storage paths are constrained to the local `storage/` directory.
- Added Mark Printed command for `GENERATED` PRs.
- Mark Printed updates status to `PRINTED`, sets `printedAt`, and writes `Marked printed` audit history.
- PR detail action states now follow the document lifecycle:
  - Draft: Edit Draft, Issue PR.
  - Generated: Preview PDF, Download PDF, Mark Printed.
  - Printed: Preview PDF, Download PDF, Upload Signed.

## Completed In Phase 3.3

- Added signed-document upload command for `PRINTED` PR records.
- Upload accepts PDF, JPG, JPEG, and PNG files up to 15 MB.
- Signed files are stored under `storage/signed`.
- Signed uploads create `SIGNED_PDF` or `SIGNED_SCAN` attachment metadata with version, file size, MIME type, storage path, and SHA-256 hash.
- Upload Signed updates status to `SIGNED`, sets `signedAt`, and writes `Uploaded signed document` audit history.
- `/pr/[id]/upload-signed` now submits a real multipart form instead of simulated client state.

## Completed In Phase 3.4

- Added cancel command for controlled PR records in `GENERATED`, `PRINTED`, or `SIGNED`.
- Added cancel reason form at `/pr/[id]/cancel`.
- Cancel updates status to `CANCELLED`, sets `cancelledAt`, and writes `Cancelled` audit history with the reason.
- Generated and signed attachments are preserved when cancelling.
- Added reissue command for `CANCELLED` PR records.
- Reissue creates a replacement `DRAFT` with copied header data and line items.
- Replacement drafts keep `reissuedFromId` linked to the original PR and start with no PR number or attachments.
- Reissue updates the original PR status to `REISSUED` and writes `Reissued` audit history.
- PR detail now shows lifecycle actions:
  - Generated / Printed / Signed: Cancel.
  - Cancelled: Reissue.

## Completed In Phase 3.5

- Added `templateType` to `DocumentTemplate` with support for `DOCX` and `XLSX`.
- Changed template uniqueness to `name + version + templateType`.
- Existing templates default to `DOCX`.
- `/templates` now renders SQL Server-backed template records instead of sample data.
- Added template upload form for DOCX/XLSX files.
- Uploaded templates are stored under `storage/templates`.
- Added Carbone tag extraction from DOCX and XLSX Office XML files.
- Added validation summary for found tags, missing required tags, and unknown tags.
- Added activation flow scoped by `name + templateType`; activating an XLSX version does not archive the active DOCX version.
- Generate PDF now explicitly uses active `PR_STANDARD` `DOCX`.

## Completed In Phase 3.6

- Added original template download route at `/templates/[id]/file`.
- Template downloads return safe DOCX/XLSX content types, attachment disposition, and `X-Content-Type-Options: nosniff`.
- Added explicit Archive action for template records.
- Archive is allowed for `DRAFT` and `ACTIVE` templates and disabled for already archived templates.
- Archive sets `status = ARCHIVED`, records `archivedAt`, and writes `Template archived` audit history.
- Upload, validate, activate, and archive template commands now write `AuditLog` records with `entityType = DocumentTemplate`.
- `/templates` now shows validation detail panels for found tags, missing required tags, and unknown tags.
- Template row actions now include Download, Validate, Activate, and Archive state guards.

## Completed In Phase 4.1

- Added Auth.js session handling with a Credentials provider.
- Credentials login validates against the SQL Server `User` table.
- SQL Server `User.role` is the authoritative role source for RBAC.
- Added role/permission helpers for `ADMIN`, `IT_ADMIN`, `IT_USER`, and `VIEWER`.
- Added server-side `requirePermission()` guards for PR and template commands.
- Replaced seeded `admin` command lookups with the authenticated session user id.
- Draft create/update, generate PDF, mark printed, upload signed, cancel/reissue, and template commands now write actor ids from the logged-in user.
- `/login` is now a real sign-in form and protected app pages redirect anonymous users to login through `AppFrame`.
- Topbar displays the authenticated user's display name and role, with logout.
- AD/LDAP path is provider-based: directory services authenticate identity, while SQL Server `User.role` remains authoritative.

## Completed In Document Template / PDF Refinement

- Updated active `storage/templates/PR_STANDARD_V1.docx` to better match the real PR template structure.
- Kept item loop markers inside the item table to avoid layout spillover.
- Added branch-specific header/footer image replacement before Carbone PDF rendering.
- Added payload fields for formatted monetary output with comma separators and two decimals:
  - `unitCostFormatted`
  - `totalAmountFormatted`
  - `subtotalFormatted`
  - `vatAmountFormatted`
  - `totalAmountFormatted`
- Added split remark fields:
  - `remarkLine1`
  - `remarkLine2`
- Added precomputed checkbox mark fields for purpose and purchase method:
  - `purposeNewMark`
  - `purposeReplacementMark`
  - `purposeRepairMark`
  - `purposeRenewalMark`
  - `purchaseByProcurementMark`
  - `purchaseSelfMark`
- Updated template validation so formatted amount tags, remark-line tags, and checkbox mark tags are recognized.
- Updated PR form rules so Acct can be blank.
- Department and division default to IT choices where available.
- Regenerated and verified the previously problematic PR PDF layout as a one-page output after template formatting fixes.

## Completed In Draft Preview / Issue PR Workflow

- Split temporary Draft Preview from official Issue PR.
- Added `/pr/[id]/preview-pdf` for inline draft preview.
- Added `/pr/[id]/preview-pdf?download=1` for draft preview download.
- Draft Preview uses active `PR_STANDARD DOCX`, branch header/footer images, and Carbone rendering.
- Draft Preview uses `DRAFT PREVIEW` as document number text and file name pattern `PR_DRAFT_PREVIEW_<draftId>.pdf`.
- Draft Preview does not allocate PR number, update status, create attachment metadata, write snapshot JSON, or write audit history.
- PR detail now shows `Preview Draft` and `Download Preview` for draft records before issue.
- PR create/edit forms now show `Save & Preview` and `Update & Preview`, which persist the draft first and then redirect to `/pr/[id]/preview-pdf`.
- Official document generation button label changed from `Generate PDF` to `Issue PR`.
- Existing official generation command still writes `Generated PDF` audit history and moves status to `GENERATED`.
- Added tests for draft preview file metadata and kept the PR generation helper tests updated.

## Completed In PR Form Cleanup

- Removed sample product data from new PR item defaults.
- New PR item rows now start with blank Acct, Description, Quantity, and Unit Cost fields.
- Removed sample text from new PR Remark defaults.
- New PR Remark now starts blank while edit draft still shows the saved remark.
- Added `buildDefaultDraftItems()` regression coverage so sample descriptions do not return to the create form.
- Added `buildDefaultDraftRemark()` regression coverage so sample remarks do not return to the create form.

## Completed In Phase 4.2A Workflow Polish

- Added draft submit intent helper in `lib/pr-submit-intent.ts`.
- `Save Draft` and `Update Draft` keep redirecting to `/pr/[id]`.
- `Save & Preview` and `Update & Preview` save the submitted form values first, then redirect to `/pr/[id]/preview-pdf`.
- Moved client-side PR filtering from `lib/sample-data.ts` to `lib/pr-filters.ts`.
- Removed Phase 1/sample shell wording from connected production UI surfaces.
- Dashboard chart panels remain static until real Dashboard/Reports aggregates are implemented, but the UI now labels that as future scope instead of sample PR data.
- Documented that `/audit-logs` is now SQL Server-backed with filters.

## Completed In Phase 4.2B Audit CSV Export

- Added `/audit-logs/export`.
- Export route requires `AUDIT_VIEW`.
- Export route uses the same `q`, `entityType`, `action`, `actorId`, `dateFrom`, and `dateTo` filters as `/audit-logs`.
- Export returns UTF-8 BOM CSV with attachment disposition for Excel compatibility.
- CSV output includes Date, Action, Entity Type, Entity ID, Actor, Actor Username, Detail, Metadata, IP Address, and User Agent.
- CSV export is capped at 1,000 rows per request, newest first.
- `/audit-logs` now links the Export CSV action to the current filter result.

## Completed In Audit Log Investigation Console Polish

- `/audit-logs` now presents audit rows as an investigation console instead of a raw metadata table.
- Added active filter chips that remove one filter at a time and preserve selected event context.
- Added audit event category mapping for Document, Template, Master Data, Users / Roles, Settings, Budget, and System events.
- Added `Inspect` links that preserve filters and open a selected-event panel through URL `eventId`.
- Selected event panel shows action, category, date, actor, target, structured metadata, IP address, user agent, and copy-friendly ids.
- Export copy now explains filtered scope and the 1,000-row CSV cap; CSV export ignores UI-only `eventId`.
- Selected event layout stays above the table until `1800px+`, keeping the `Inspect` column visible on normal desktop widths.
- Long metadata values such as SHA-256 hashes wrap inside the selected-event panel instead of causing page-level horizontal overflow.

## Completed In Phase 4.3 Reports / Dashboard XLSX

- Added `lib/reporting.ts` for shared dashboard/report filters and aggregate rules.
- Dashboard budget cards and charts now read SQL Server `PurchaseRequest` and `Budget` records instead of static arrays.
- Reports page no longer uses the `ModulePage` shell.
- `/reports` supports year, month, company, and status filters.
- Reports show summary cards, monthly summary, company/branch summary, status summary, and PR detail rows.
- Added `lib/xlsx.ts`, a minimal Office Open XML workbook writer backed by `jszip`.
- Added `/reports/export` for filter-preserving `.xlsx` downloads.
- XLSX workbook includes Summary, By Month, By Company, By Status, and PR Detail sheets.

## Completed In Phase 4.4 Budget Master CRUD

- Replaced `/masters/budgets` placeholder shell with a SQL Server-backed admin console.
- Added `lib/budget-master.ts` for filter parsing, amount normalization, scope validation, row mapping, CRUD transactions, and audit logging.
- Added `BUDGET_MANAGE` permission for `ADMIN` and `IT_ADMIN`.
- Added budget server actions for create, update, deactivate, and reactivate.
- Budget rows can be filtered by year, company, and active/inactive state.
- Budget create validates active company, optional branch, department, and duplicate scope.
- Budget update stores budget, used, and reserved amounts with two decimals.
- Budget deactivate/reactivate uses `Budget.isActive` instead of deleting rows.
- Budget mutations write `AuditLog` rows with `entityType = Budget`.
- Added focused tests for budget helpers, page wiring, and permission coverage.

## Completed In Phase 4.5 Admin Settings Completion

- Replaced `/settings/users` placeholder shell with a SQL Server-backed admin console.
- Added `lib/user-management.ts` for filters, role validation, create/update, password reset, self-protection, and audit logging.
- Added `USER_MANAGE` permission for `ADMIN` and `IT_ADMIN`.
- Users can be searched, filtered by role, shown with inactive records, created, updated, and password-reset from the UI.
- User passwords are hashed with the existing `hashPassword()` helper and password hashes are never rendered.
- The current admin cannot deactivate their own account or change their own role from the admin page.
- Replaced `/settings/running-numbers` placeholder shell with a SQL Server-backed admin console.
- Added `lib/running-number-settings.ts` for validation, scope checks, duplicate checks, next-number preview, create/update, and audit logging.
- Added `RUNNING_NUMBER_MANAGE` permission for `ADMIN` and `IT_ADMIN`.
- Running-number settings can be created and updated, with next preview matching the PR Issue formatter.
- User and running-number mutations write audit logs with `entityType = User` or `RunningNumberSetting`.
- Added focused tests for user helpers, running-number helpers, page wiring, and permission coverage.

## Completed In AD/LDAP Search + Bind

- Added `authProvider`, nullable `passwordHash`, `externalUsername`, `externalId`, and `lastLoginAt` to the SQL Server `User` model.
- Added AD/LDAP Search + Bind helpers with strict short-username validation, LDAP filter escaping, service-account search, user-password bind, and safe error handling.
- Auth.js Credentials login now supports `AUTH_MODE=LOCAL`, `LDAP`, or `HYBRID`.
- Local admin remains a `LOCAL` fallback account with password `admin123`.
- LDAP users must already be allowlisted in SQL Server, active, and linked to a stable `externalId`; AD only proves identity.
- `/settings/users` can verify a short AD username such as `veerapon.l` and create an LDAP-backed SQL allowlist user.
- LDAP users show an `AD/LDAP` provider badge and do not expose local password reset.
- SQL Server `User.role` remains authoritative for permissions.

## Completed In Phase 5 Baseline Hardening

- Added Ubuntu + nginx + PM2 deployment runbook.
- Added PM2 production scaffold in `ecosystem.config.cjs`.
- Added nginx reverse proxy scaffold in `deploy/nginx/it-pr-dms.conf` with upload size, rate limits, and render timeouts.
- Added operations runbook for logs, monitoring signals, rate limits, deployment guardrails, and Carbone incident handling.
- Added backup/restore runbook covering SQL Server plus persistent `storage/`.
- Added retention policy baseline for controlled PR records, logs, backups, template previews, and PDF QA artifacts.
- Hardened Carbone client errors into config, HTTP, network, and timeout categories with safer user-facing messages.

## Completed In Phase 4.6 Template Visual QA

- Added DOCX template preview rendering before activation.
- Added `Preview Template`, `Open Preview`, and `Download Preview` controls on `/templates`.
- Preview renders selected DOCX templates through Carbone with sample PR payload and document number `TEMPLATE PREVIEW`.
- Preview PDFs are stored under `storage/template-previews`.
- Preview pass/fail metadata is stored inside `DocumentTemplate.validationJson.preview`.
- Added `/templates/[id]/preview` and `/templates/[id]/preview?download=1`.
- Added activation guard so `PR_STANDARD DOCX` requires both validation and passed preview before activation.
- XLSX templates remain validation-only because official PR PDF generation currently uses DOCX.
- Preview rendered/failed actions write template audit records.
- Added focused tests for preview metadata helpers, activation guard, sample payload, page wiring, and route wiring.

## Completed In Phase 4.7 PDF Visual QA

- Added `lib/pdf-visual-qa.ts` for PDF signature, EOF, size, page-count, rendered-page, SHA-256, status, and Markdown report helpers.
- Added `scripts/pdf-visual-qa.mjs` and `npm run pdf:qa`.
- PDF QA command renders page PNGs through Poppler `pdftoppm` when available.
- PDF QA writes `report.json`, `report.md`, and `page-*.png` artifacts under `output/pdf-qa/<pdf-file-base>/`.
- Added human visual checklist for header/footer, PR fields, table alignment, amount formatting, remark overflow, unexpected extra pages, and Thai/English clipping.
- Smoke-tested `storage/generated/ITPR_2606008.pdf` with `--expected-pages 1`; result was `PASS` with one rendered page image.
- Added focused tests for PDF QA helper behavior and CLI wiring.

## Verified Routes

`http://localhost:3000/pr`

- Returns HTTP 200.
- Contains seeded PR rows such as `ITPR_2606006`.
- Shows DB-backed description copy.

`http://localhost:3000/dashboard`

- Returns HTTP 200.
- Contains seeded PR rows.
- Shows SQL Server recent PR rows, budget cards, monthly trend, company/branch ranking, and status snapshot from shared reporting aggregates.

`http://localhost:3000/pr/pr_seed_2606001`

- Loads from SQL Server.
- Shows persisted PR header, items, attachments, and timeline records.

`http://localhost:3000/pr/new`

- Returns HTTP 200.
- Renders DB-backed master-data options.
- HTTP server-action submit creates a draft PR and redirects to DB-backed detail.

`http://localhost:3000/pr/cmqxzrtv80001t9iovcocpyum/edit`

- Returns HTTP 200 for a draft PR.
- Renders persisted draft data for editing.
- HTTP server-action submit updates items, totals, and audit history.

`http://localhost:3000/pr/cmqxzrtv80001t9iovcocpyum`

- Generated `ITPR_2606007` through Carbone.
- Shows generated PDF attachment `ITPR_2606007.pdf`.
- Shows `Generated PDF` audit history.
- Marked printed through the PR detail action.
- Shows `Marked printed` audit history.
- Uploaded signed PDF through `/pr/cmqxzrtv80001t9iovcocpyum/upload-signed`.
- Shows signed attachment `ITPR_2606007_signed_v1.pdf`.
- Shows `Uploaded signed document` audit history.
- Cancelled with reason `Phase 3.4 verification cancel reason`.
- Reissued into replacement draft `cmqy1qw7v000mt9io091jnnvb`.
- Original generated and signed attachments remain available.
- Current status is `REISSUED`.

`http://localhost:3000/pr/cmqy1qw7v000mt9io091jnnvb`

- Created as the replacement draft from `ITPR_2606007`.
- Has `prNo = null` and status `DRAFT`.
- Has `reissuedFromId = cmqxzrtv80001t9iovcocpyum`.
- Contains copied line items and no attachments.
- Shows `Draft created` audit history with `Reissued from ITPR_2606007`.

`http://localhost:3000/pr/cmqxzrtv80001t9iovcocpyum/cancel`

- Returned HTTP 200 while the PR was `SIGNED`.
- Required a cancel reason.
- Submitted to a server action and redirected back to PR detail.
- After reissue, the original PR is no longer cancellable or reissuable.

`http://localhost:3000/pr/cmqxzrtv80001t9iovcocpyum/upload-signed`

- Returned HTTP 200 for the signed upload form while the PR was `PRINTED`.
- Accepts `.pdf`, `.jpg`, `.jpeg`, and `.png` files.
- Submits to a server action and redirects back to PR detail after upload.
- After upload, direct access is blocked because the PR is now `SIGNED`.

`http://localhost:3000/pr/cmqxzrtv80001t9iovcocpyum/pdf`

- Returns HTTP 200.
- Returns `application/pdf`.
- Returns inline disposition for preview.

`http://localhost:3000/pr/cmqxzrtv80001t9iovcocpyum/pdf?download=1`

- Returns HTTP 200.
- Returns `application/pdf`.
- Returns attachment disposition for download.

`http://localhost:3000/pr/pr_seed_2606001/edit`

- Returns HTTP 404 because `pr_seed_2606001` is not a draft.

`http://localhost:3000/templates`

- Returns HTTP 200.
- Lists templates from SQL Server.
- Shows `PR_STANDARD V1 DOCX` as `ACTIVE`.
- Uploaded `PR_STANDARD VXLSX XLSX`.
- Validated XLSX template with 13 tags, 0 missing required tags, and 0 unknown tags.
- Activated XLSX template without changing the active DOCX template.
- Stored uploaded file at `storage/templates/PR_STANDARD_VXLSX.xlsx`.
- Shows Download, Validate, Activate, and Archive controls.
- Shows Preview Template, Open Preview, and Download Preview controls for DOCX rows.
- Shows validation detail panels with found, missing required, and unknown tags.
- Archived and re-activated the XLSX template through the UI.
- Wrote `Template archived` and `Template activated` audit records for `PR_STANDARD VXLSX XLSX`.

`http://localhost:3000/templates/cmqy29koy0001t9qsxqm7r1ct/file`

- Returns HTTP 200.
- Returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Returns attachment disposition for original XLSX download.
- Returned the stored `PR_STANDARD_VXLSX.xlsx` file bytes.

`http://localhost:3000/login`

- Renders the Auth.js credentials sign-in form.
- Uses SQL Server user `admin` for MVP local login.
- Redirects authenticated users to `/dashboard`.

`http://localhost:3000/pr/<draftId>/preview-pdf`

- Renders a temporary draft PDF for authenticated users with permission.
- Uses active `PR_STANDARD DOCX`.
- Does not create an official PR number.
- Does not change draft status.

`http://localhost:3000/pr/<draftId>/preview-pdf?download=1`

- Returns the same temporary PDF with attachment disposition.
- Uses file name pattern `PR_DRAFT_PREVIEW_<draftId>.pdf`.

`http://localhost:3000/dashboard`

- Redirects anonymous users to `/login`.
- Loads after signing in as `admin`.
- Topbar shows `Admin User` and `Administrator`.

## Not Done Yet

- Budget is soft-controlled through the PR lifecycle, but user-facing warning banners for missing or over-budget states are not yet shown on PR screens.
- Production deployments must set a real `AUTH_SECRET`; the current code includes a dev-only fallback.

## Recommended Next Phase

Next phase should finish the remaining operational screens:

1. Add user-facing warning banners for missing or over-budget soft budget states if required after UAT.
2. Add automated pixel/baseline comparison on top of PDF QA rendered PNGs.
3. Run a real backup/restore drill before production.
4. Add production AD/LDAP runbook after real directory UAT.
