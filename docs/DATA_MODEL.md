# Data Model

This is the current domain model used by the MVP backend. Names can be adjusted in future migrations, but the domain boundaries should stay intact.

## Core Entities

### User

Represents an application user.

Suggested fields:
- `id`
- `username`
- `displayName`
- `email`
- `passwordHash`
- `authProvider`
- `externalUsername`
- `externalId`
- `lastLoginAt`
- `role`
- `isActive`
- `createdAt`
- `updatedAt`

Current rules:
- `User.role` is the RBAC source of truth.
- `authProvider` is `LOCAL` or `LDAP`; unknown stored values are treated as unsafe and fail closed for password reset.
- `passwordHash` is nullable because LDAP users authenticate against AD/LDAP and never store AD passwords in SQL Server.
- Local password hashes use the local `scrypt$1$...` format used by Auth.js credentials login.
- `externalUsername` stores the AD short username such as `veerapon.l` for LDAP users.
- `externalId` stores a stable LDAP identifier such as `objectGUID`; SQL Server also has a filtered unique index for non-null external ids.
- `lastLoginAt` is updated only after successful local or LDAP login.
- Admin Settings can create local users, create LDAP allowlist users after `Verify AD User`, update profile/role/active state, and reset local passwords.
- Username is immutable after create in the admin UI.
- Password hashes are never rendered or stored in audit metadata.

### Role / Permission

Current default roles are stored directly on `User.role`:

- `ADMIN`
- `IT_ADMIN`
- `IT_USER`
- `VIEWER`

AD/LDAP Search + Bind authenticates identity, then resolves an existing SQL Server allowlist `User` row and uses `User.role` as the permission source.

Admin-only permissions currently include:
- `TEMPLATE_MANAGE`
- `MASTER_DATA_MANAGE`
- `BUDGET_MANAGE`
- `USER_MANAGE`
- `RUNNING_NUMBER_MANAGE`
- `AUDIT_VIEW`

### Company

Represents the legal entity used on the PR document.

Suggested fields:
- `id`
- `code`
- `legalName`
- `displayName`
- `taxId`
- `isActive`

### Branch

Suggested fields:
- `id`
- `companyId`
- `code`
- `name`
- `address`
- `documentRefNo`
- `documentLegalName`
- `documentTaxId`
- `documentAddress`
- `documentDisplayName`
- `documentHeaderAssetPath`
- `documentFooterAssetPath`
- `isActive`

### Department

Suggested fields:
- `id`
- `name`
- `isActive`

### Division

Suggested fields:
- `id`
- `departmentId`
- `name`
- `isActive`

### Budget

Suggested fields:
- `id`
- `year`
- `companyId`
- `branchId`
- `departmentId`
- `budgetAmount`
- `usedAmount`
- `reservedAmount`
- `isActive`

Current rules:
- `branchId` is optional. `null` means the budget applies to all branches for the company.
- The unique scope is `year + companyId + branchId + departmentId`.
- Budget Master deactivates/reactivates rows through `isActive`; it does not hard-delete budget history.
- Dashboard and Reports read active budget rows for aggregate totals.

### PurchaseRequestCategory

Normalized master data for one primary PR category.

Suggested fields:
- `id`
- `code`
- `name`
- `description`
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

Current rules:
- The category master is administered through `/masters/pr-categories` with `MASTER_DATA_MANAGE`; create, update, activate, and deactivate actions write `AuditLog` records.
- Codes are unique and cannot change after a category is referenced. Name, description, sort order, and active state remain editable.
- Referenced categories are never hard-deleted. Deactivation removes a category from new-Draft choices but preserves the relation and historical display for existing PRs.
- The checked-in migration and development seed create the approved active categories in sort order: `HARDWARE`, `SOFTWARE_LICENSE`, `SUBSCRIPTION_RENEWAL`, `SERVICE_MAINTENANCE`, `NETWORK_INFRASTRUCTURE`, `CLOUD_HOSTING`, and `OTHER`.

### PurchaseRequest

Main document record.

Suggested fields:
- `id`
- `prNo`
- `refNo`
- `companyId`
- `branchId`
- `departmentId`
- `divisionId`
- `categoryId`
- `documentDate`
- `requiredDate`
- `purpose`
- `purchaseMethod`
- `remark`
- `subtotal`
- `vatRate`
- `vatAmount`
- `totalAmount`
- `status`
- `templateVersionId`
- `generatedSnapshotJson`
- `createdById`
- `createdAt`
- `updatedAt`
- `generatedAt`
- `printedAt`
- `signedAt`
- `cancelledAt`
- `reissuedFromId`
- `clonedFromId`

Current rules:
- `reissuedFromId` links replacement drafts created after cancelling a controlled PR.
- `clonedFromId` links a new user-reviewed draft to the source PR used for Clone as Draft.
- Clone as Draft is not a controlled-document correction. It copies business fields and line items into `/pr/new?cloneFrom=<id>`, but the new record is not created until Save Draft or Save & Preview.
- Cloned drafts do not copy `prNo`, generated/signed attachments, generated snapshots, status, or prior audit history.
- Saved cloned drafts start as `DRAFT` with `prNo = null` and write `Draft cloned` audit metadata.
- `categoryId` is nullable at the database level for legacy compatibility. A legacy controlled PR with no category remains readable and renderable as `Not categorized`.
- New Draft create and Draft edit require a selected active category on the server. The relation is intentionally not made SQL-required until legacy data is retired.
- Clone carries its source category into the form. Reissue reuses an active source category automatically; if the source relation is missing or inactive, an active category must be selected before a replacement Draft is created.

### PurchaseRequestItem

Suggested fields:
- `id`
- `purchaseRequestId`
- `lineNo`
- `rowType`
- `accountCode`
- `description`
- `quantity`
- `unitCost`
- `totalAmount`

Current rules:
- `rowType` is `ITEM`, `HEADING`, or `DETAIL`; older/missing values are treated as `ITEM` by app logic.
- `ITEM` rows are normal priced product/service rows and require Description, Qty, and Unit Cost.
- `HEADING` rows are grouping rows inside the item table. They require only Description, store `quantity = 0`, `unitCost = 0`, and `totalAmount = 0`, and are excluded from subtotal/VAT/total calculations.
- `DETAIL` rows are description-only continuation rows below an item. They require only Description, store `quantity = 0`, `unitCost = 0`, and `totalAmount = 0`, and are excluded from subtotal/VAT/total calculations.
- `lineNo` remains the physical row order. The PDF render payload numbers only `ITEM` rows so heading/detail rows do not shift visible item numbers.

### PurchaseRequestAttachment

Suggested attachment types:
- `GENERATED_PDF`
- `SIGNED_PDF`
- `SIGNED_SCAN`
- `QUOTATION`
- `OTHER`

Suggested fields:
- `id`
- `purchaseRequestId`
- `type`
- `version`
- `fileName`
- `mimeType`
- `fileSize`
- `storagePath`
- `sha256`
- `uploadedById`
- `uploadedAt`

Current rules:
- Generated PDFs are created by Issue PR and are served through `/pr/[id]/pdf`.
- Signed files and quotations/supporting files are versioned per PR and attachment type.
- `QUOTATION` attachments can be added while a PR is Draft, Generated, Printed, or Signed.
- `QUOTATION` upload does not change PR status.
- Attachment file delivery is permission guarded and storage paths must stay under `storage/`.

### DocumentTemplate

Suggested fields:
- `id`
- `name`
- `version`
- `contractName`
- `status`
- `templateType`
- `fileName`
- `storagePath`
- `validationJson`
- `createdById`
- `createdAt`
- `activatedAt`
- `archivedAt`

Current rules:
- `validationJson` stores tag validation results.
- `validationJson.preview` stores the latest template preview status, rendered timestamp, file name, storage path, content type, SHA-256 hash, or failure error.
- Preview metadata is stored in JSON instead of a separate table for the current MVP phase.

### RunningNumberSetting

Suggested fields:
- `id`
- `documentType`
- `prefix`
- `yearFormat`
- `monthFormat`
- `padding`
- `currentValue`
- `scopeCompanyId`
- `scopeBranchId`
- `updatedAt`

Current rules:
- `documentType + scopeCompanyId + scopeBranchId` is unique.
- Empty scope means global.
- Document type and scope are fixed after create in the admin UI.
- Prefix, year format, month format, padding, and current value are editable.
- Running Number Settings preview uses the same formatter used by official PR Issue.

### AuditLog

Suggested fields:
- `id`
- `entityType`
- `entityId`
- `action`
- `actorId`
- `metadataJson`
- `ipAddress`
- `userAgent`
- `createdAt`

## PR Statuses

Current UI status type:

```ts
type PRStatus = "Draft" | "Generated" | "Printed" | "Signed" | "Cancelled" | "Reissued";
```

Recommended lifecycle:

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Draft: Preview Draft PDF
  Draft --> Generated: Issue PR
  Generated --> Printed: Mark Printed
  Printed --> Signed: Upload signed document
  Generated --> Cancelled: Cancel
  Printed --> Cancelled: Cancel
  Signed --> Cancelled: Cancel
  Cancelled --> Reissued: Reissue
  Reissued --> Draft: Create replacement draft
```

Rules:
- Only `Draft` should be freely editable and previewable.
- Draft Preview must not allocate a PR number, mutate status, persist attachment metadata, or write official generation audit.
- `Issue PR` is the controlled-document boundary.
- `Generated` should have a stored data snapshot.
- `Printed` should be treated as a controlled document.
- `Signed` must keep all uploaded signed versions.
- `Cancelled` and `Reissued` must preserve lineage and audit history.

## Calculation Rules

Backend should calculate and persist:

- Line total: `quantity * unitCost` for `ITEM` rows; `HEADING` and `DETAIL` rows persist zero.
- Subtotal: sum of `ITEM` line totals only
- VAT amount: `subtotal * vatRate`
- Total: `subtotal + vatAmount`
- Remaining budget: `budgetAmount - usedAmount - reservedAmount`

Budget tracking is soft-controlled. PR actions are not blocked by missing or insufficient Budget rows; matching active budgets are adjusted during the PR lifecycle and audit metadata records `MATCHED`, `OVER_BUDGET`, or `MISSING`.

The frontend can display and preview calculations, but backend must be authoritative.

## Template And Render Notes

- `DocumentTemplate.templateType` is `DOCX` or `XLSX`.
- Uniqueness is `name + version + templateType`.
- Official PR PDF generation uses active `PR_STANDARD DOCX`.
- Template management can validate both DOCX and XLSX by extracting tags from Office XML.
- DOCX template preview PDFs are stored under `storage/template-previews` and are not `PurchaseRequestAttachment` rows.
- `PR_STANDARD DOCX` activation requires passed tag validation and passed preview render.
- XLSX activation remains validation-only.
- Branch header/footer images are stored as branch asset paths and patched into the DOCX during rendering.
- Rendered official PDFs are represented by `PurchaseRequestAttachment` with type `GENERATED_PDF`.
- Quotation/supporting uploads are represented by `PurchaseRequestAttachment` with type `QUOTATION`.
- Draft preview PDFs are transient and do not create attachment rows.
- Render payloads expose optional `categoryCode` and `categoryName` values. Existing DOCX/XLSX templates remain valid when they do not reference these fields.
