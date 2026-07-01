# Phase 4.3 Reports Dashboard XLSX Design

## Goal

Replace the Reports shell and static Dashboard aggregates with SQL Server-backed reporting data, then export the current report view as an `.xlsx` workbook.

## Scope

- Dashboard uses real current-year aggregates from `PurchaseRequest` and `Budget`.
- Reports page becomes a working PR reporting console with filters for year, month, company, and status.
- Reports export downloads `.xlsx`, not CSV.
- Budget enforcement and budget master CRUD remain out of scope for this phase.

## Reporting Semantics

- Default reporting year is the current year.
- `Used Budget` is the total of PRs in `GENERATED`, `PRINTED`, and `SIGNED`.
- `Pending Budget` is the total of PRs in `DRAFT`.
- `Remaining Budget` is `Budget.budgetAmount - used - pending`.
- Cancelled and reissued PRs remain visible in reports, but are excluded from used/pending budget calculations.
- Dashboard and Reports use the same aggregate helpers so numbers match.

## Reports Page

The page shows:

- Filter form: year, month, company, status.
- Summary cards: total PR, total amount, issued/used amount, draft/pending amount.
- Monthly summary table.
- Company/branch summary table.
- Status summary table.
- Recent/detail PR rows.
- `Export XLSX` link preserving the current filters.

## XLSX Workbook

The export route is `GET /reports/export` and requires an authenticated user. The workbook contains:

- `Summary`
- `By Month`
- `By Company`
- `By Status`
- `PR Detail`

The workbook is generated locally with the existing `jszip` dependency and minimal Office Open XML files. No new large reporting dependency is added.

## Testing

- Unit-test report filter normalization and date range generation.
- Unit-test aggregate calculations from Prisma-like records.
- Unit-test `.xlsx` generation by opening the zip package and checking workbook/worksheet XML.
- Static-test Reports page no longer uses `ModulePage` shell and exposes `Export XLSX`.
- Run full tests, typecheck, Prisma validate, and production build.
