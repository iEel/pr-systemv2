# Company Master Console UX Design

## Goal

Improve `/masters/companies` from a read/upload-only table into an operational master-data console for branch document profiles. IT admins must be able to edit branch profile data, remove or deactivate records safely, and preview uploaded header/footer images without leaving the workflow.

## UX Direction

Use a dense premium enterprise console, not modal-heavy CRUD. Keep the table as the primary work surface, with row-level actions:

- `View` opens a same-page asset/profile section through anchor navigation.
- `Edit` reveals an inline edit panel directly under the branch row.
- `Deactivate` is used when a branch is referenced by PRs or budgets.
- `Delete` is only used when the branch has no dependent records.

## Data Editing

Editable branch document profile fields:

- Display name
- Ref No.
- Legal name
- Tax ID
- Address
- Active status

The edit form submits to a server action, updates SQL Server, writes an audit log, revalidates `/masters/companies`, and returns to the same page.

## Asset Preview

Header/footer assets are shown as table badges plus image previews. Uploaded images are served through authenticated preview routes:

- `/masters/companies/assets/[branchId]/header`
- `/masters/companies/assets/[branchId]/footer`

The preview route reads the stored path from SQL Server, resolves it inside `storage/`, returns the image with no-store headers, and blocks missing/unsafe paths.

## Safe Remove

Branch removal uses dependency-aware behavior:

- If purchase requests or budgets reference the branch, the action deactivates the branch and keeps history intact.
- If no dependencies exist, the branch can be deleted.
- All remove/deactivate operations require `MASTER_DATA_MANAGE` and write audit logs.

Company deletion is not included in this phase because existing PR records are keyed through branches and company cleanup needs separate ownership rules.

## Tests

Add helper tests for:

- Document profile update data parsing.
- Asset delivery headers.
- Dependency count to removal mode mapping.

Existing integration-level verification remains through `npm test`, `npm run typecheck`, `npx prisma validate`, and `npm run build`.
