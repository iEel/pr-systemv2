# Phase 3.5 Template Management Design

## Goal

Add database-backed template management for Carbone templates with support for both DOCX and XLSX files.

## Policy

- Template uploads support only `.docx` and `.xlsx`.
- Each template record stores `templateType` as `DOCX` or `XLSX`.
- Template uniqueness is `name + version + templateType`.
- Existing templates default to `DOCX`.
- Uploaded templates are stored under `storage/templates`.
- Validation reads Carbone tags from the zipped Office XML files.
- Validation compares found tags with the PR render payload contract.
- Activation is scoped by `name + templateType`; activating one version archives other active versions with the same name/type.
- Generated PR PDF continues to use the active `PR_STANDARD` `DOCX` template.

## UI

- `/templates` lists templates from SQL Server instead of sample data.
- The page includes an upload form for template name, version, contract, type, and file.
- Each draft/archived template can be validated.
- Each template with no missing required tags can be activated.
- Validation summary cards show unknown tags, missing required tags, and total tags found for the most recently validated template.

## Validation

Required PR tags:

- `d.prNo`
- `d.documentDate`
- `d.companyName`
- `d.branchName`
- `d.department`
- `d.purpose`
- `d.purchaseMethod`
- `d.totalAmount`
- `d.items[i].description`
- `d.items[i].quantity`
- `d.items[i].unitCost`
- `d.items[i].totalAmount`

Known tags also include optional payload fields and the Carbone loop end marker `d.items[i+1]`.

## Error Handling

- Invalid extensions throw `Template file must be a DOCX or XLSX file`.
- Empty files throw `Template file is required`.
- Files larger than 10 MB throw `Template file must be 10 MB or smaller`.
- Activating a template with missing required tags throws `Template must pass validation before activation`.

## Testing

- Unit tests cover upload validation, storage naming, tag extraction from DOCX and XLSX zip XML, and validation summaries.
- Runtime verification covers upload, validate, activate, DB state, and page rendering.
