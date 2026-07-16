# Carbone Header/Footer Image Guide

Last updated: 2026-07-04

This guide explains how this project uses Carbone with branch-specific header/footer images, and how to reuse the same pattern in another project.

## Short Version

The project uses a hybrid render approach:

1. Store uploaded header/footer images as files.
2. Store only relative storage paths in SQL Server.
3. Read the images on the server at render time.
4. Convert images to Base64 Data URI fields for the Carbone payload.
5. Patch the DOCX package directly so placeholder images in Word header/footer parts are replaced before Carbone renders.
6. Send the patched DOCX template and normalized JSON payload to Carbone.

This keeps the template flexible while making PDF output more stable than relying only on dynamic image Data URIs.

## Why Hybrid Instead Of Carbone Images Only

Carbone supports dynamic pictures when a placeholder image has a tag in its alt text, for example:

```text
{d.companyHeaderImage:imageFit(contain)}
{d.companyFooterImage:imageFit(contain)}
```

That works well in many templates, but DOCX header/footer rendering can be sensitive to the converter, placeholder sizing, and how embedded images are resolved. This project therefore does two things:

- It still sends `d.companyHeaderImage` and `d.companyFooterImage` as Data URIs for payload compatibility.
- It also replaces the actual related image binary inside the DOCX header/footer before calling Carbone.

In practice, Word controls the placeholder position and dimensions, while the server controls the actual image bytes.

## Storage Model

Header/footer files are uploaded from `/masters/companies`.

Accepted formats:

- PNG
- JPG / JPEG

Maximum file size:

- 5 MB per image

Runtime storage path pattern:

```text
storage/company-assets/<branchId>/header.png
storage/company-assets/<branchId>/footer.png
```

The database stores only relative paths:

```text
Branch.documentHeaderAssetPath
Branch.documentFooterAssetPath
```

The implementation validates uploads in [lib/company-master.ts](../lib/company-master.ts):

- `validateCompanyAssetUploadFile()`
- `buildCompanyAssetStoragePath()`
- `uploadCompanyAssetFromFormData()`

## Render Flow

The render flow is implemented in [lib/pr-generate.ts](../lib/pr-generate.ts).

1. Load the active DOCX template.
2. Load the PR record, including branch/company/profile fields.
3. Read branch header/footer files from safe storage paths.
4. Build Data URI values:

```ts
{
  companyHeaderImage: "data:image/png;base64,...",
  companyFooterImage: "data:image/png;base64,..."
}
```

5. Build the full Carbone payload with business fields, item rows, totals, formatted values, checkbox marks, and image fields.
6. Patch the DOCX package with `applyBranchImagesToDocxTemplate()`.
7. Call Carbone with:

```ts
renderCarboneTemplate({
  data: payload,
  template: patchedTemplateBuffer,
  convertTo: "pdf",
});
```

8. Store the rendered PDF and attachment metadata.

## Carbone Payload Fields

The header/footer image fields are:

```text
d.companyHeaderImage
d.companyFooterImage
```

Related document profile fields include:

```text
d.companyDisplayName
d.companyLegalName
d.companyTaxId
d.branchAddress
d.refNo
```

The payload builder is:

```text
buildPurchaseRequestRenderPayload(record, prNo, assetDataUris)
```

Key source:

- [lib/pr-generate.ts](../lib/pr-generate.ts)

## Word Template Setup

In the DOCX template:

1. Insert a real placeholder image in the Word header.
2. Set the placeholder image size and position exactly as desired.
3. Add this tag to the image alt text:

```text
{d.companyHeaderImage}
```

4. Insert a real placeholder image in the Word footer.
5. Add this tag to the image alt text:

```text
{d.companyFooterImage}
```

For normal Carbone-only dynamic image usage, this form is also valid:

```text
{d.companyHeaderImage:imageFit(contain)}
{d.companyFooterImage:imageFit(contain)}
```

Current project note: the direct DOCX patcher currently searches for the plain tag text:

```text
{d.companyHeaderImage}
{d.companyFooterImage}
```

If another project wants to support `:imageFit(contain)` in the alt text and still use DOCX patching, update the matcher to detect both plain and formatter variants.

## How DOCX Patching Works

A DOCX file is a zip package. Header and footer content lives in files like:

```text
word/header1.xml
word/footer1.xml
```

Images are linked through relationship files like:

```text
word/_rels/header1.xml.rels
word/_rels/footer1.xml.rels
```

The patcher:

1. Opens the DOCX with `JSZip`.
2. Searches `word/header*.xml` for `{d.companyHeaderImage}`.
3. Searches `word/footer*.xml` for `{d.companyFooterImage}`.
4. Finds the embedded relationship id, such as `rId1`.
5. Reads the matching `.rels` file.
6. Resolves the target file, such as `media/image1.png`.
7. Replaces that image binary with the uploaded branch image.
8. If the uploaded image type differs, updates the target extension and `[Content_Types].xml`.
9. Re-zips the DOCX and sends it to Carbone.

Main functions:

- `applyBranchImagesToDocxTemplate()`
- `replaceDocxImagesForTag()`
- `replaceDocxRelatedImage()`
- `ensureDocxImageContentType()`

## Carbone Client Pattern

The Carbone client is intentionally server-side only.

Endpoint:

```text
POST /render/template?download=true
```

Request body:

```json
{
  "convertTo": "pdf",
  "data": {},
  "template": "<base64-docx-template>"
}
```

Important behavior:

- The client sends the `carbone-version` header.
- Template bytes are sent as Base64.
- Render output is returned as a binary buffer.
- Errors are categorized as config, HTTP, network, or timeout failures.
- Client-side/browser code should never call Carbone directly.

Key source:

- [lib/carbone-client.ts](../lib/carbone-client.ts)

## Portable Implementation Checklist

Use this checklist when copying the pattern to another project:

- Keep uploaded files outside the public web root.
- Store only relative storage paths in the database.
- Validate file extension, MIME expectation, and size before writing.
- Resolve storage paths through a safe helper so users cannot escape the storage directory.
- Convert image files to Data URIs for payload compatibility.
- Patch the DOCX package before render when header/footer output must be stable.
- Keep render commands on the server.
- Add a template preview step before activation.
- Log render errors safely without exposing long Carbone response bodies to users.
- Back up both database rows and storage files.

## Minimal Pseudocode

```ts
async function renderDocument(record, templateBuffer) {
  const header = await readImage(record.headerPath);
  const footer = await readImage(record.footerPath);

  const payload = {
    ...buildBusinessPayload(record),
    companyHeaderImage: toDataUri(header),
    companyFooterImage: toDataUri(footer),
  };

  const patchedTemplate = await patchDocxImages(templateBuffer, {
    header: header?.buffer,
    footer: footer?.buffer,
  });

  return renderCarboneTemplate({
    data: payload,
    template: patchedTemplate,
    convertTo: "pdf",
  });
}
```

## Common Pitfalls

- Putting the image tag as visible text instead of the image alt text.
- Changing the alt text to `{d.companyHeaderImage:imageFit(contain)}` while the patcher only searches for `{d.companyHeaderImage}`.
- Storing absolute paths in the database.
- Allowing public unauthenticated access to branch image files.
- Forgetting to back up runtime `storage/company-assets`.
- Changing the image format without updating DOCX content types.
- Calling Carbone from client-side code.
- Activating a DOCX template without rendering a preview PDF first.

## Related Docs

- [DOCUMENT_GENERATION.md](DOCUMENT_GENERATION.md)
- [COMPANY_BRANCH_MASTER.md](COMPANY_BRANCH_MASTER.md)
- [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md)
- [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md)
