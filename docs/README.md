# Documentation

This folder contains developer-facing documentation for the IT PR Document Management System.

Start here:

- [../DEVELOPER_HANDOFF.md](../DEVELOPER_HANDOFF.md) - current status, route map, and next priorities.
- [SETUP.md](SETUP.md) - local setup, commands, and troubleshooting.
- [ARCHITECTURE.md](ARCHITECTURE.md) - current Next.js, SQL Server, storage, auth, and Carbone architecture.
- [FEATURES.md](FEATURES.md) - current implemented feature inventory.
- [RECURRING_PR.md](RECURRING_PR.md) - annual schedule snapshot, worker, retry, RBAC, and Ubuntu operation contract.
- [DOCUMENT_GENERATION.md](DOCUMENT_GENERATION.md) - Word template, Carbone payload, PDF preview, Issue PR, and formatting contract.
- [DATA_MODEL.md](DATA_MODEL.md) - current domain model, PR Category Master, legacy-compatible category relation, and PR lifecycle.
- [DATABASE.md](DATABASE.md) - selected SQL Server database name and environment configuration.
- [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) - implemented and remaining backend, Carbone, and file integration notes.
- [COMPANY_BRANCH_MASTER.md](COMPANY_BRANCH_MASTER.md) - company/branch document profiles and header/footer asset handling.
- [CARBONE_HEADER_FOOTER_GUIDE.md](CARBONE_HEADER_FOOTER_GUIDE.md) - reusable Carbone header/footer image workflow and DOCX patching guide.
- [BUDGET_MASTER.md](BUDGET_MASTER.md) - SQL Server budget CRUD, permissions, audit, and reporting impact.
- [ADMIN_SETTINGS.md](ADMIN_SETTINGS.md) - SQL Server users/roles and running-number settings management.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - implemented design tokens and UI rules.
- [QA_CHECKLIST.md](QA_CHECKLIST.md) - verification checklist before handoff or release.
- [DEPLOYMENT_UBUNTU_NGINX_PM2.md](DEPLOYMENT_UBUNTU_NGINX_PM2.md) - UAT/production deployment baseline for Ubuntu, nginx, and PM2.
- [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) - daily checks, monitoring, rate limits, deploy guardrails, and Carbone incident handling.
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md) - SQL Server and storage backup/restore procedure.
- [RETENTION_POLICY.md](RETENTION_POLICY.md) - baseline retention rules for PR documents, logs, backups, and transient artifacts.
- [ROADMAP.md](ROADMAP.md) - current phase status and next recommended work.
- [PHASE_2_STATUS.md](PHASE_2_STATUS.md) - chronological backend, document-control, auth, template, and PDF progress log.

Related source-of-truth docs:

- [../PRODUCT.md](../PRODUCT.md) - product purpose, users, principles, accessibility baseline.
- [../DESIGN.md](../DESIGN.md) - seed visual direction from the design exploration.
- [superpowers/specs/2026-06-28-mvp-phase-1-app-shell-design.md](superpowers/specs/2026-06-28-mvp-phase-1-app-shell-design.md) - original Phase 1 design spec.
- [superpowers/plans/2026-06-28-mvp-phase-1-app-shell.md](superpowers/plans/2026-06-28-mvp-phase-1-app-shell.md) - original Phase 1 implementation plan.
- [superpowers/plans/2026-07-15-pr-category-master-integration.md](superpowers/plans/2026-07-15-pr-category-master-integration.md) - completed Category phase and the dependency for Annual Recurring PR work.
