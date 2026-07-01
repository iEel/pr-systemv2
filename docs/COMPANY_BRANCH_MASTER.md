# Company / Branch Master

Company and branch data is the source of truth for PR document headers, legal names, tax IDs, addresses, and branch-specific header/footer images.

## Data Source

The initial Phase data was mapped from `ตัวอย่าง PR.xlsm`, sheet `Header-Footer`.

Supported rows:
- Grandlink
- Sonic HQ, Sonic 00001, Sonic 00002, Sonic 00003, Sonic 00004, Sonic 00006
- Sonic Autologis HQ, Sonic Autologis 00001, Sonic Autologis 00002, Sonic Autologis 00003
- SONIC INSURANCE as inactive/incomplete because the workbook row has no legal name, tax ID, or address
- IT City is kept from the app seed data because existing sample PR records reference it

## Branch Document Profile Fields

The document-specific values are stored on `Branch`:

- `documentRefNo`
- `documentLegalName`
- `documentTaxId`
- `documentAddress`
- `documentDisplayName`
- `documentHeaderAssetPath`
- `documentFooterAssetPath`

Branch-level storage is intentional because legal name and address can vary by branch even under the same company tax ID.

## Header / Footer Uploads

Admins can upload header/footer images from `/masters/companies`.

Accepted formats:
- PNG
- JPG / JPEG

Max size:
- 5 MB per image

Storage location:
- `storage/company-assets/<branchId>/header.png`
- `storage/company-assets/<branchId>/footer.png`

The app keeps only the storage path in SQL Server. At PR generation time it reads the file, builds a Base64 Data URI for payload compatibility, and also patches the DOCX package directly so the placeholder header/footer images are replaced before Carbone renders the PDF.

The current branch header/footer baseline image files are kept in source control under `storage/company-assets/<branchId>/header|footer` so a fresh checkout can render the known document profiles. Production replacements remain operational data and should be covered by the storage backup process.

## Editing And Preview

Admins can edit a branch document profile inline from `/masters/companies`:

- display name
- Ref No.
- legal name
- tax ID
- address
- active status

Uploaded images are previewed through authenticated routes:

- `/masters/companies/assets/<branchId>/header`
- `/masters/companies/assets/<branchId>/footer`

The preview route resolves files only inside `storage/` and returns `private, no-store` image responses.

## Remove Behavior

The remove action is dependency-aware:

- branches with no PR or budget references are deleted
- branches with PR or budget references are deactivated instead

This keeps historical PR records intact while allowing admins to hide unused branches from active workflows.

## Carbone Tags

Use these values in DOCX/XLSX templates:

- `{d.companyDisplayName}`
- `{d.companyLegalName}`
- `{d.companyTaxId}`
- `{d.branchAddress}`
- `{d.refNo}`

For dynamic header/footer pictures, place image placeholders in the template and set their alt text to:

- `{d.companyHeaderImage:imageFit(contain)}`
- `{d.companyFooterImage:imageFit(contain)}`

Carbone dynamic pictures require a public URL or a Base64 Data URI. The app provides Data URIs through the payload fields above, and the current renderer also replaces related DOCX image binaries when a header/footer part contains those tags in image alt text.
