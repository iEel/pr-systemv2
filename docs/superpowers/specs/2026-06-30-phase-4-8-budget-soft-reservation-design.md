# Phase 4.8 Budget Soft Reservation Design

Last updated: 2026-06-30

## Goal

Make Budget Master reflect real PR activity without blocking users from creating or issuing PRs when budget is missing or over-spent.

## User Decision

The user selected **Soft Reservation + Warning**.

Budget shortages must not stop the PR workflow. The system should create, edit, issue, cancel, and reissue PRs normally while updating Budget Master amounts where possible and recording warnings when the budget context is missing or insufficient.

## Scope

- Add a focused budget tracking helper that can be reused by draft, issue, cancel, and reissue flows.
- On Draft create, reserve the PR `totalAmount` against the best matching active Budget row.
- On Draft edit, adjust the previous reservation out and the updated reservation in.
- On Issue PR, move the draft reservation from `reservedAmount` to `usedAmount`.
- On Cancel PR, reverse used budget for generated, printed, or signed PRs.
- On Reissue PR, create a replacement draft and reserve it as a new draft.
- Do not block when:
  - no active Budget row matches
  - remaining budget is negative
  - the PR amount exceeds available budget
- Write audit metadata so admins can see whether a budget was matched, over budget, or missing.
- Update Dashboard/Reports docs to explain that negative remaining budget is an allowed warning state.

## Budget Matching

Budget matching uses fields already present on `PurchaseRequest`:

- `year`: `PurchaseRequest.documentDate.getUTCFullYear()`
- `companyId`
- `departmentId`
- `branchId`

Match priority:

1. Active exact branch budget:
   `year + companyId + branchId + departmentId`
2. Active all-branches budget:
   `year + companyId + null branchId + departmentId`
3. No match:
   PR action continues, and audit metadata records `budgetStatus = "MISSING"`.

## Amount Rules

- Draft create:
  - add `totalAmount` to `Budget.reservedAmount`
- Draft edit:
  - subtract the previous draft `totalAmount` from the previous matched budget
  - add the new draft `totalAmount` to the new matched budget
  - if the budget match is unchanged, apply only the delta
- Issue PR:
  - subtract `totalAmount` from `reservedAmount`
  - add `totalAmount` to `usedAmount`
- Cancel PR:
  - subtract `totalAmount` from `usedAmount`
- Reissue PR:
  - create replacement draft using existing reissue behavior
  - add replacement `totalAmount` to `reservedAmount`

All adjustments are rounded to two decimals and clamped at zero when subtracting from stored budget values. This prevents negative reserved/used buckets if historical data was changed manually.

## Warning Rules

The budget helper returns a result for audit/UI consumers:

- `MATCHED`: budget row found and remaining budget after the adjustment is non-negative
- `OVER_BUDGET`: budget row found but remaining budget after the adjustment is negative
- `MISSING`: no active budget row matched

These statuses do not block PR actions.

For this phase, warnings are stored in `AuditLog.metadataJson`; user-facing warning banners can be added in a later UI polish pass if needed.

## Transactions

Budget adjustments must run inside the same Prisma transaction as the PR status or draft mutation:

- Draft create/update in `lib/pr-draft.ts`
- Issue PR allocation/status transition in `lib/pr-generate.ts`
- Cancel/reissue in `lib/pr-document-control.ts`

This keeps PR state and budget buckets aligned if the database write fails.

## Error Handling

- Missing Budget Master is not an exception.
- Over budget is not an exception.
- A database write failure remains an exception and should roll back the whole PR action.
- Existing PR validation errors remain unchanged.

## Testing

- Unit tests for budget matching priority:
  - exact branch wins over all-branches
  - all-branches fallback is used when exact branch is absent
  - missing budget returns `MISSING`
- Unit tests for adjustment math:
  - reserve draft
  - update draft with same budget and changed amount
  - update draft with changed budget scope
  - issue draft moves reserved to used
  - cancel reverses used
  - subtract operations clamp at zero
- Source/page tests to ensure docs and handoff mention soft budget behavior.
- Full verification:
  - `npm test`
  - `npm run typecheck`
  - `npx prisma validate`
  - `npm run build`

## Out Of Scope

- Blocking PR creation or Issue PR because budget is missing or insufficient.
- New database columns.
- User-facing budget warning banners on PR forms/detail pages.
- Approval workflows.
- Budget approval requests.
- AD/LDAP changes.
