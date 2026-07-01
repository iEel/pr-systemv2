# Phase 4.7 PDF Visual QA Design

Last updated: 2026-06-30

## Goal

Add a repeatable PDF QA utility that turns generated PR PDFs or template preview PDFs into reviewable evidence before UAT.

## Scope

- Add a pure PDF QA helper for file signature, byte size, page count estimate, SHA-256 hash, render status, and findings.
- Add a CLI command that accepts a PDF path and writes a QA folder with:
  - rendered PNG page images when `pdftoppm` is available
  - `report.json`
  - `report.md`
- Add a human visual checklist to the generated Markdown report.
- Add docs and QA checklist updates.
- Keep database schema unchanged.
- Keep browser automation and automated pixel comparison out of this phase.

## Command

```bash
npm run pdf:qa -- --input storage/generated/ITPR_2606008.pdf --expected-pages 1
```

Default output:

```text
output/pdf-qa/<pdf-file-base>/
```

Artifacts:

- `report.json`
- `report.md`
- `page-1.png`, `page-2.png`, ... when Poppler rendering succeeds

## Checks

Automated checks:

- input file exists
- PDF starts with `%PDF`
- PDF includes an EOF marker
- file size is above the configured minimum
- estimated page count is above zero
- estimated page count matches `--expected-pages` when supplied
- rendered PNG page count matches estimated page count when Poppler is available
- rendered PNG files are non-empty

Human checklist:

- header and footer appear in the right place
- PR number/date/company/branch are readable
- item table stays aligned
- amounts show comma separators and two decimals
- remark lines do not overflow
- no unexpected second page
- no clipped Thai/English text

## Result Rules

- `PASS`: no failed automated checks.
- `WARN`: automated checks pass but rendering was skipped or warning findings exist.
- `FAIL`: any required automated check fails.

The utility does not replace human visual review. It packages the images and checklist so UAT can review consistently.
