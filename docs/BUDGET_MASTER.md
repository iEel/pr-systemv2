# Budget Master

Last updated: 2026-06-30

Budget Master is the admin source for yearly IT budget rows used by Dashboard and Reports.

## Route

```text
/masters/budgets
```

The page is SQL Server-backed and requires `BUDGET_MANAGE`.

## Budget Scope

Each budget row is scoped by:

- `year`
- `companyId`
- optional `branchId`
- `departmentId`

An empty branch means the budget applies to all branches under the selected company. The existing Prisma uniqueness rule is:

```text
year + companyId + branchId + departmentId
```

## Admin Actions

Admins can:

- create a budget row
- update budget, used, and reserved amounts
- deactivate a budget row
- reactivate a budget row

Budgets are not hard-deleted. Deactivation sets `Budget.isActive = false` so historical records and audit trails remain intact.

UI note:

- Budget table rows use `Budget.id` as the React key, so rendering the `<tbody>` does not emit duplicate/missing key console warnings.

## Amount Rules

- Amount inputs accept comma separators.
- Stored values are normalized to two decimal places.
- Amounts cannot be negative.
- Remaining budget is calculated as:

```text
budgetAmount - usedAmount - reservedAmount
```

Negative remaining budget is allowed as a visible over-budget signal; it is not blocked in this phase.

## Soft PR Budget Tracking

Budget Master now receives non-blocking PR lifecycle adjustments:

- Draft create adds the PR total to `reservedAmount` when an active budget row matches.
- Draft edit adjusts the previous reservation out and the updated reservation in.
- Issue PR subtracts the PR total from `reservedAmount` and adds it to `usedAmount`.
- Cancel subtracts the PR total from `usedAmount`.
- Reissue creates a replacement draft and adds its total to `reservedAmount`.

Budget matching priority:

1. Active exact branch budget for `year + company + branch + department`.
2. Active all-branches budget for `year + company + department`.
3. Missing budget.

Missing or insufficient budget does not block PR actions. Audit metadata stores `budgetStatus` as `MATCHED`, `OVER_BUDGET`, or `MISSING` so admins can review budget warnings later.

## Permissions And Audit

- `ADMIN` and `IT_ADMIN` have `BUDGET_MANAGE`.
- `IT_USER` and `VIEWER` do not have `BUDGET_MANAGE`.
- Mutations write `AuditLog` records with `entityType = Budget`.
- Audit actions are:
  - `Budget created`
  - `Budget updated`
  - `Budget deactivated`
  - `Budget reactivated`

## Reporting Impact

Dashboard and Reports read active `Budget` rows through `lib/reporting.ts`. Budget Master changes and PR lifecycle soft tracking therefore affect aggregate budget cards and report tables immediately after save.

## Main Files

- `app/masters/budgets/page.tsx`
- `app/masters/budgets/actions.ts`
- `lib/budget-master.ts`
- `lib/budget-tracking.ts`
- `lib/auth/permissions.ts`
- `tests/budget-master.test.ts`
- `tests/budget-master-page-copy.test.ts`
