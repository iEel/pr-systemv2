# Phase 3.6 Template Archive/Preview/Audit Design

## Goal

Finish the operational template-management loop with original-file download, explicit archive, audit logging, and validation detail visibility.

## Policy

- Template files can be downloaded only from persisted `DocumentTemplate.storagePath`.
- Download responses use safe content types for DOCX/XLSX and `attachment` disposition.
- Archive is allowed for `DRAFT` and `ACTIVE` templates.
- Archive is blocked for templates already `ARCHIVED`.
- Upload, validate, activate, and archive write `AuditLog` records with `entityType = DocumentTemplate`.
- Validation details show found tags, missing required tags, and unknown tags.

## UI

- `/templates` keeps the existing DB-backed list.
- Each template row includes Download, Validate, Activate, and Archive actions.
- Archive is disabled for already archived templates.
- Validation detail panels appear below summary cards for the most recently updated validated template.

## Routes And Commands

- `GET /templates/[id]/file` downloads the stored original DOCX/XLSX template file.
- `POST` server actions handle upload, validate, activate, and archive.
- Audit metadata stores user-facing detail, template name/version/type, file name, and validation counts where relevant.

## Testing

- Unit tests cover download headers and archive status guards.
- Runtime verification downloads DOCX/XLSX routes, archives a template, and verifies audit rows.
