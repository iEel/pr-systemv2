# Phase 4.6 Template Visual QA Design

Last updated: 2026-06-30

## Goal

Add a safe visual QA step for uploaded PR templates so admins can render a sample PDF before activating a DOCX template.

## Scope

- Add a `Preview Template` command on `/templates`.
- Render selected DOCX template versions with a realistic sample PR payload.
- Store preview metadata inside `DocumentTemplate.validationJson` to avoid a schema migration.
- Serve the latest preview PDF through `/templates/[id]/preview`.
- Require successful tag validation and successful preview before activating a `PR_STANDARD` DOCX template.
- Keep XLSX template validation and activation available without PDF preview enforcement.
- Keep budget reservation/enforcement out of this phase.

## Preview Contract

Preview output:

- source template: selected `DocumentTemplate.storagePath`
- supported render preview: `DOCX` to PDF
- sample PR number: `TEMPLATE PREVIEW`
- storage path: `storage/template-previews/<template-name>_<version>_<type>.pdf`
- file name: `TEMPLATE_PREVIEW_<template-name>_<version>_<type>.pdf`
- permission: `TEMPLATE_MANAGE`
- route: `/templates/[id]/preview`
- download route: `/templates/[id]/preview?download=1`

Preview metadata is embedded into existing validation JSON:

```json
{
  "foundTags": [],
  "missingRequiredTags": [],
  "totalTagsFound": 0,
  "unknownTags": [],
  "preview": {
    "status": "PASSED",
    "renderedAt": "2026-06-30T00:00:00.000Z",
    "fileName": "TEMPLATE_PREVIEW_PR_STANDARD_V2_DOCX.pdf",
    "storagePath": "template-previews/PR_STANDARD_V2_DOCX.pdf",
    "contentType": "application/pdf",
    "sha256": "..."
  }
}
```

If preview fails, metadata should keep validation results and store:

```json
{
  "preview": {
    "status": "FAILED",
    "renderedAt": "2026-06-30T00:00:00.000Z",
    "error": "..."
  }
}
```

## Activation Rules

- Missing required tags still block activation for all template types.
- `PR_STANDARD` `DOCX` activation requires `preview.status = PASSED`.
- Other `DOCX` template names can still be validated and stored, but this system currently uses only active `PR_STANDARD DOCX` for PR PDFs.
- `XLSX` activation remains validation-only because PDF generation does not use XLSX templates yet.

## UI

The `/templates` table should show:

- validation summary
- preview status
- `Preview Template` button for DOCX rows
- `Open Preview` and `Download Preview` links after a successful preview
- disabled activation with a readable hint when DOCX preview has not passed

## Testing

- Unit tests cover preview metadata normalization and merge behavior.
- Unit tests cover deterministic preview file metadata.
- Unit tests cover activation guard rules for validation and preview state.
- Unit tests cover the sample PR payload shape.
- Page-copy tests cover the new preview action, route, and UI labels.
- Existing template validation tests must remain green.
