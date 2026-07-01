# Features

Last updated: 2026-07-01

## Implemented Features

### Application Shell And Login

- Deep navy operational shell with responsive sidebar and topbar.
- Desktop sidebar stays pinned while page content scrolls; mobile navigation remains a fixed drawer.
- Protected app pages with Auth.js credentials login.
- Hybrid Local + LDAP Search + Bind authentication on the same login form.
- Login form starts blank and does not show unsupported language switching or password recovery controls.
- SQL Server-backed users and roles.
- SQL Server remains the allowlist, role, and active/inactive source for LDAP users.
- Topbar shows authenticated display name and role.
- Logout support.
- Keyboard focus and readable Thai/English mixed labels.

### Dashboard

- Budget metric cards and PR overview layout.
- DB-backed recent PR embed.
- SQL Server-backed current-year budget totals, used amount, pending amount, remaining amount, total PR count, monthly trend, company/branch ranking, and status snapshot.

### PR Documents

- SQL Server-backed PR list.
- Search by PR number, company, branch, department, division, or creator.
- Filters by company, branch, and status.
- Responsive table wrapper for dense columns.
- Detail route loads by real PR id.
- Row actions and status badges follow the PR lifecycle.
- Row Download opens the correct draft-preview or generated-PDF download route based on PR status.
- Row More menu exposes detail, clone-as-draft, preview/download, edit draft, upload quotation, upload signed, cancel, and reissue-from-detail shortcuts where relevant.

### PR Create And Edit

- DB-backed company/branch and department/division options.
- Default IT department/division behavior in the PR form.
- Acct field is optional and can be blank.
- Server-side validation and total calculation.
- Draft create persists header, line items, totals, and audit event in one transaction.
- Clone PR opens `/pr/new?cloneFrom=<id>` as a prefilled New PR form and only creates a new draft after the user saves.
- Cloned drafts copy business fields and line items, reset document date to today, clear required date, avoid copying PR number/PDF/signed files/audit history, and store `clonedFromId` plus `Draft cloned` audit metadata.
- Draft edit is allowed only for `DRAFT` records.
- Draft update replaces line items, recalculates totals, and writes `Draft updated`.
- `Save & Preview` and `Update & Preview` persist the current form values and redirect directly to the temporary PDF preview.
- Live client-side total preview for user feedback.
- New PR item rows start blank instead of prefilled sample product data.
- New PR Remark starts blank instead of prefilled sample text.
- PR item entry table gives Description the primary width, keeps Acct/Qty/Unit Cost readable for typical values like `1000` or `100000.00`, and keeps Total Amount compact enough to avoid unnecessary desktop horizontal scroll.
- PR item table columns `Unit Cost` and `Total Amount` display plain numeric amounts without a currency prefix.

### Draft Preview And Issue PR

- Drafts can render `Preview Draft` PDF before official issuance.
- Draft preview uses active `PR_STANDARD DOCX` and Carbone but does not allocate PR number, change status, persist attachment, or write audit.
- Draft preview download uses `PR_DRAFT_PREVIEW_<draftId>.pdf`.
- Official action is labeled `Issue PR`.
- Issue PR allocates the running number, stores snapshot JSON, renders PDF, writes `GENERATED_PDF` attachment metadata and SHA-256 hash, and moves the PR to `GENERATED`.
- PR Detail acts as a command center with compact `Next action`, `Review & files`, and `Danger zone` sections so the current lifecycle step is not mixed with secondary file review actions or oversized callouts.

### PDF And Document Control

- Generated PDFs can be previewed inline through `/pr/[id]/pdf`.
- Generated PDFs can be downloaded through `/pr/[id]/pdf?download=1`.
- PDF Visual QA can render generated/template-preview PDFs into PNG page images and Markdown QA reports through `npm run pdf:qa`.
- Mark Printed moves `GENERATED` to `PRINTED` and writes audit history.
- Upload Signed accepts PDF/JPG/JPEG/PNG up to 15 MB for `PRINTED` PRs.
- Signed uploads are versioned and never overwrite generated files.
- Upload Quotation accepts PDF/JPG/JPEG/PNG/DOCX/XLSX up to 15 MB for Draft/Generated/Printed/Signed PRs.
- Quotation/supporting files are stored as versioned `QUOTATION` attachments under `storage/quotations`, keep SHA-256 hashes, write audit history, and do not change PR status.
- Signed and quotation/supporting attachments can be downloaded through a permission-guarded PR attachment route.
- Cancel is available for generated/printed/signed records.
- Reissue creates a replacement draft linked to the cancelled original.

### Word / Excel Template Management

- Template management supports DOCX and XLSX uploads.
- Template type is stored as `DOCX` or `XLSX`.
- Uniqueness is `name + version + templateType`.
- Carbone tags are extracted from Office XML inside uploaded files.
- Validation shows found, missing required, and unknown tags.
- DOCX templates can be rendered as sample PDF previews before activation.
- Preview PDFs are served from `/templates/[id]/preview` and stored under `storage/template-previews`.
- `PR_STANDARD DOCX` activation requires both successful tag validation and successful preview render.
- Activation is scoped by template name and type.
- Original templates can be downloaded.
- Draft/active templates can be archived.
- Template upload, validate, preview, activate, and archive write audit events.

### PR Template Rendering

- Active `PR_STANDARD DOCX` is used for official PR PDF generation.
- Branch-specific header/footer images are patched into the DOCX before Carbone render.
- Monetary fields support comma separators and exactly two decimals through `...Formatted` payload fields.
- Remark text is split into `remarkLine1` and `remarkLine2` for the two ruled rows in the current Word template.
- Purpose and purchase method checkboxes use precomputed `X` mark fields.

### Company / Branch Master

- Company and branch master data is backed by SQL Server.
- Branch document profile includes Ref No., legal name, tax ID, address, display name, active state, and header/footer asset paths.
- Admins can edit branch document profiles.
- Admins can upload, preview, replace, and remove header/footer images.
- Remove behavior deactivates branches that are already referenced by PRs or budgets.

### Budget Master

- Budget Master is backed by SQL Server at `/masters/budgets`.
- Admins can filter by year, company, and active/inactive state.
- Admins can create budget rows by year, company, optional branch, and department.
- Admins can update budget, used, and reserved amounts inline.
- Admins can deactivate and reactivate budget rows without deleting history.
- Budget changes write audit events and immediately affect Dashboard/Reports aggregates that read active `Budget` records.

### Admin Settings

- Users/Roles is backed by SQL Server at `/settings/users`.
- Admins can search users, filter by role, include inactive users, create local users from an optional `New User` panel, verify and create AD/LDAP allowlisted users, open row-expanded profile edits, and open row-expanded local password resets.
- Users/Roles uses a table-first layout with a compact role guide, inline action feedback, and a `Current session` badge with locked role/active controls for the signed-in account.
- Password reset shows the target account, requires password confirmation, and uses a deliberate danger action.
- LDAP users show an `AD/LDAP` provider badge and do not expose local password reset because their passwords are managed by AD.
- User password hashes use the same `scrypt` format as Auth.js credentials login and are never rendered in the UI.
- The current admin cannot deactivate their own account or change their own role from the user admin screen.
- Running Number Settings is backed by SQL Server at `/settings/running-numbers`.
- Admins can create global or scoped running-number settings and update prefix, year/month format, padding, and current value.
- Running-number rows show `Next Preview` using the same formatter as the Issue PR flow.
- User and running-number admin actions write audit events.

### Audit And RBAC

- Auth proxy redirects anonymous protected-page requests to `/login` with a preserved `callbackUrl`.
- Route-level admin permission checks redirect signed-in users without access to `/forbidden` instead of surfacing raw server errors.
- Server commands use `requirePermission()`.
- Audit records are written for document-critical actions.
- Audit Logs page is DB-backed with search, entity/action/actor/date filters, summary cards, active filter chips, category badges, and links back to PR/template records where available.
- Audit Logs include an `Inspect` flow that keeps the current filters in the URL and opens a selected-event panel with action, category, actor, target, structured metadata, IP address, user agent, and copy-friendly event/entity ids.
- Audit Logs keep the selected-event panel above the table on normal desktop widths so the `Inspect` action stays visible without horizontal scrolling; long metadata values such as SHA-256 hashes wrap inside the detail panel.
- Audit Logs can export the current filter result as UTF-8 CSV for Excel review; the page labels filtered export scope and explains the 1,000-row cap.
- SQL Server `User.role` remains the source of truth for permissions.
- `BUDGET_MANAGE` is admin-only for Budget Master maintenance.
- `USER_MANAGE` and `RUNNING_NUMBER_MANAGE` are admin-only for Admin Settings maintenance.
- `/forbidden` explains the missing permission and provides a Back to Dashboard action.
- Issued generated PDF delivery requires `PR_GENERATE` before attachment lookup or storage read.
- Signed/quotation/supporting attachment delivery requires `PR_GENERATE` before attachment lookup or storage read.
- `PR_UPLOAD_ATTACHMENT` allows IT users to upload quotation/support files without giving template/admin permissions.
- Original template file download requires `TEMPLATE_MANAGE` before template lookup or storage read.
- PDF/template file routes convert authorization failures into status-aware JSON responses.
- AD/LDAP Search + Bind verifies identity only; role mapping still comes from SQL Server.

### Phase 5 Hardening Baseline

- Ubuntu + nginx + PM2 deployment runbook is available.
- PM2 production process scaffold is available in `ecosystem.config.cjs`.
- nginx reverse proxy scaffold is available in `deploy/nginx/it-pr-dms.conf` with upload size limits, route-specific rate limits, and render timeouts.
- Backup/restore runbook covers SQL Server and persistent local `storage/`.
- Operations runbook covers daily checks, monitoring signals, rate limits, deployment guardrails, and Carbone incident handling.
- Retention policy baseline covers controlled PR documents, audit logs, backups, template previews, PDF QA artifacts, and logs.
- Carbone client errors are classified into config, HTTP, network, and timeout failures with safer messages.

### Reports And XLSX Export

- Reports page is backed by SQL Server PR and Budget records.
- Filters support year, month, company, and PR status.
- Reports are framed as a filter-driven export workspace rather than a duplicate Dashboard.
- Reports show active filter chips, reset filters, compact budget health, monthly summary, company/branch summary, status summary, and PR detail rows.
- Monthly Summary uses a compact table and Status Summary uses a distribution panel so desktop users can scan both summaries without the wide detail-table horizontal scroll.
- Monthly Summary and Company / Branch Summary use explicit column widths and aligned numeric headers/cells to prevent amount columns from being misread.
- Reports show a strict no-budget warning with a Budget Master link when PR used/pending amounts exist but no active Budget Master row matches the current filters.
- Summary tables use lightweight mini bars for scanability, and PR detail status values use the same status badge language as the rest of the app.
- `/reports/export` downloads the same filtered report as an `.xlsx` workbook.
- XLSX workbook contains Summary, By Month, By Company, By Status, and PR Detail sheets.
- XLSX Summary includes a `Budget Warning` row when Remaining Budget is not reliable because Budget Master is missing for the view.
- Soft Budget tracking updates Budget Master through the PR lifecycle without blocking users: draft totals reserve budget, Issue PR moves reserved to used, Cancel reverses used, and Reissue reserves the replacement draft when a matching active budget exists.
- Missing or insufficient budget is captured as audit warning metadata instead of stopping PR creation or issuance.

## Current Limitations

- Budget is intentionally soft-controlled; user-facing PR warning banners for missing/over-budget states are not implemented yet.
- AD/LDAP requires real environment values and SQL allowlisted users before directory users can log in.
- Production hardening has baseline runbooks/config, but still needs a real restore drill, TLS setup, centralized monitoring/log aggregation, and UAT sign-off.

## Feature Principles

- Keep official document actions explicit and auditable.
- Let users preview drafts repeatedly before issuing a controlled PR.
- Do not silently mutate generated, printed, or signed documents.
- Prefer Cancel/Reissue for controlled-document corrections.
- Keep templates flexible, but keep the render payload contract documented and tested.
- Keep Thai and English labels readable without clipping.
