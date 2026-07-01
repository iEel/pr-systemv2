# Phase 4.4 Budget Master CRUD Design

Last updated: 2026-06-29

## Goal

Turn `/masters/budgets` from a static shell into a SQL Server-backed admin console for maintaining yearly IT budgets by company, optional branch, and department.

## Scope

- Replace the mock Budget page with real Budget records from SQL Server.
- Add create, edit, deactivate, and reactivate flows.
- Keep budget rows soft-controlled through `isActive`; do not hard-delete budgets.
- Add a dedicated `BUDGET_MANAGE` permission for admin budget maintenance.
- Write `AuditLog` rows for create, update, deactivate, and reactivate.
- Keep dashboard and reports consuming existing `Budget` records through `lib/reporting.ts`.
- Do not add PR budget reservation/enforcement in this phase.

## Route And UI

`/masters/budgets` will show:

- Year/company filters and an include-inactive toggle.
- Summary cards for allocated, used, reserved, remaining, and active rows.
- A create form with year, company, optional branch, department, and budget amount.
- A dense table with inline edit forms for budget, used, and reserved amounts.
- Deactivate/reactivate buttons per row.

The UI should follow the existing admin style: restrained cards, compact tables, clear status badges, and no nested decorative cards.

## Data Rules

- Budget uniqueness is the existing Prisma constraint: `year + companyId + branchId + departmentId`.
- Empty `branchId` means the budget applies to all branches under the company.
- If a branch is selected, it must belong to the selected company.
- Amounts must be numeric and non-negative.
- Remaining amount is calculated as `budgetAmount - usedAmount - reservedAmount`.
- Duplicate budget scope is rejected before insert.

## Permissions And Audit

- `ADMIN` and `IT_ADMIN` get `BUDGET_MANAGE` through the shared admin permission list.
- `IT_USER` and `VIEWER` do not get `BUDGET_MANAGE`.
- Budget mutations call `requirePermission("BUDGET_MANAGE")`.
- Audit events use `entityType = "Budget"` and include readable scope metadata.

## Testing

- Unit tests cover pure budget helpers: money parsing, filter normalization, remaining calculation, scope key, create/update data building, duplicate validation, and row mapping.
- Permission tests assert `BUDGET_MANAGE` is admin-only.
- Page-copy tests assert the budget route no longer uses `ModulePage` and includes CRUD affordances.
- Full verification runs `npm test`, `npm run typecheck`, `npx prisma validate`, and `npm run build`.

## Open Decisions

- Budget enforcement during PR Draft/Issue remains a later phase.
- User/Roles and Running Number admin screens remain separate follow-up work.
