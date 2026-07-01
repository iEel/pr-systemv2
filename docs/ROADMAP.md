# Roadmap

Last updated: 2026-07-01

## Phase 1: App Shell

Status: complete.

Delivered:
- Modern premium shell.
- Dashboard.
- PR list, form, detail, and upload shells.
- Template, master data, reports, settings, audit log shells.
- Login visual direction.
- Local sample data and focused unit tests.

## Phase 2: Backend Foundation

Status: complete for MVP core.

Delivered:
- Prisma and SQL Server connection.
- Database `IT_PR_DMS` on the `ALPHA` instance.
- Initial schema, migration, seed script, and Prisma Client.
- DB-backed PR list, PR detail, draft create, and draft update.
- Server-side total calculation.
- Auth.js credentials login.
- SQL Server-backed role source and permission helpers.

Remaining hardening:
- Production-grade secret handling and deployment runbook.
- Backup/restore procedure.
- Monitoring and structured logging.

## Phase 3: Document Control

Status: complete for MVP document lifecycle.

Delivered:
- Running-number allocation for official Issue PR.
- Active `PR_STANDARD DOCX` rendering through Carbone.
- Generated PDF storage, attachment metadata, SHA-256 hash, and immutable snapshot JSON.
- Draft Preview PDF before issuance.
- Generated PDF inline preview and download.
- Mark Printed workflow.
- Signed PDF/scan upload with versioned metadata.
- Cancel/Reissue workflow.
- Template upload, validation, activation, download, and archive for DOCX/XLSX.
- Branch-specific header/footer images in generated PR documents.
- Amount formatting with comma separators and two decimals.
- Remark splitting for fixed Word template rows.

Remaining hardening:
- Automated pixel/baseline comparison for rendered PDF output.
- Concurrency stress test for simultaneous Issue PR actions.

## Phase 4: Operational Maturity

Status: in progress.

Delivered:
- Local credentials auth and RBAC.
- Company/branch master document-profile editing.
- Header/footer upload, preview, replacement, and removal.
- DB-backed Audit Logs investigation console with filters, active filter chips, category badges, entity links, and selected-event detail inspection.
- Audit Log CSV export from the current filter result with explicit filtered-scope copy and a visible 1,000-row cap note.
- Save & Preview / Update & Preview draft workflow.
- SQL Server-backed Dashboard aggregates and Reports console.
- Filter-preserving PR report XLSX export.
- SQL Server-backed Budget Master CRUD with admin permission and audit events.
- Soft Budget tracking through PR lifecycle: Draft reserves, Issue moves reserved to used, Cancel reverses used, and Reissue reserves the replacement draft without blocking missing or over-budget PRs.
- SQL Server-backed Users/Roles admin with create, update, password reset, self-protection, and audit events.
- SQL Server-backed Running Number Settings admin with create, update, next-number preview, and audit events.
- Template visual QA with DOCX preview render before `PR_STANDARD DOCX` activation.
- PDF Visual QA CLI that renders PR PDFs into PNG evidence and Markdown checklist reports.
- AD/LDAP Search + Bind authentication for SQL Server allowlisted users, while local admin remains a fallback account and SQL Server roles stay authoritative.

Recommended next scope:
- User-facing PR warning banners for missing or over-budget soft budget states.
- Automated pixel/baseline comparison on top of PDF QA rendered PNGs.
- Notification rules.
- Production AD/LDAP UAT and operations runbook, including service-account rotation and lockout monitoring.

Exit criteria:
- IT staff can run the full PR lifecycle without manual spreadsheets.
- Admins can manage templates, companies, users, and running numbers.
- Auditors can trace document history from UI.

## Phase 5: Hardening

Status: started with baseline runbooks and deployment scaffolds.

Delivered baseline:
- Ubuntu + nginx + PM2 deployment runbook.
- PM2 `ecosystem.config.cjs` scaffold for one production instance.
- nginx reverse proxy scaffold with upload size, render timeouts, and baseline rate limits.
- Backup/restore runbook covering SQL Server plus persistent `storage/`.
- Operations runbook covering daily checks, monitoring signals, logs, rate limits, deploy guardrails, and Carbone incident handling.
- Retention policy baseline for controlled PR records, logs, backups, template previews, and PDF QA artifacts.
- Safer Carbone client errors for config, HTTP, network, and timeout failures.

Remaining scope:
- Security review.
- Centralized error monitoring and log aggregation.
- Real backup/restore drill.
- Production TLS and internal CA setup, including AD/LDAP certificate validation.
- UAT with real PR templates and representative branches.

Exit criteria:
- Production deployment checklist is complete.
- UAT sign-off is captured.
- Rollback and backup plans are tested.
