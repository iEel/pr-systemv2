# PR Category Master And Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auditable PR Category Master and require one active primary category for every new or edited Draft while preserving legacy controlled PR compatibility.

**Architecture:** Add a normalized `PurchaseRequestCategory` table related to `PurchaseRequest` through a nullable legacy-compatible foreign key. Keep category CRUD in a focused master-data service, thread `categoryId` through the existing draft domain, then expose category labels and filters to PR views, reports, XLSX, and the Carbone payload.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.7, TypeScript 5.7, Prisma 6.19.3 with SQL Server, Vitest 4.1.9, existing Tailwind/UI primitives.

## Global Constraints

- One PR has exactly one primary category in the new workflow; do not add per-line categories or multi-tag support.
- Keep `PurchaseRequest.categoryId` nullable in SQL Server so legacy controlled PRs remain readable and renderable.
- Require an active category for new Draft create and Draft edit on the server, not only in the browser.
- Display a missing legacy category as `Not categorized`.
- Preserve category through Clone and Reissue.
- Referenced categories are deactivated, never physically deleted.
- Category code becomes immutable after the category is referenced; name, description, sort order, and active state remain editable.
- Reuse `MASTER_DATA_MANAGE`; do not add another category permission.
- Do not rewrite existing DOCX/XLSX templates. Only add optional `categoryCode` and `categoryName` payload fields.
- Do not change Budget matching or amount calculations.
- Update `DEVELOPER_HANDOFF.md` and relevant `docs/*.md` in the same implementation phase.

---

## File Map

### New Files

- `prisma/migrations/000009_pr_category_master/migration.sql` - SQL Server table, nullable PR foreign key, indexes, and production seed rows.
- `lib/pr-category-master.ts` - category parsing, validation, query mapping, CRUD, and audit writes.
- `app/masters/pr-categories/page.tsx` - category administration page.
- `app/masters/pr-categories/actions.ts` - category server actions and redirects.
- `components/masters/MasterDataNav.tsx` - shared Companies/PR Categories navigation.
- `tests/pr-category-schema.test.ts` - schema and migration contract.
- `tests/pr-category-master.test.ts` - pure category parsing and validation tests.
- `tests/pr-category-page-copy.test.ts` - admin page and master navigation contract.

### Modified Files

- `prisma/schema.prisma` - category model and Purchase Request relation.
- `prisma/seed.mjs` - development category upserts and sample PR category assignments.
- `lib/auth/route-access.ts` - protect `/masters/pr-categories` with `MASTER_DATA_MANAGE`.
- `app/masters/companies/page.tsx` - render shared Master Data navigation.
- `lib/pr-draft.ts` - category input, options, validation, create/update/clone mapping.
- `components/pr/PRForm.tsx` - required category select.
- `lib/pr-document-control.ts` - preserve category during Reissue.
- `lib/pr-filters.ts` - category search/filter.
- `lib/purchase-requests.ts` - category list/detail mapping.
- `components/pr/PRList.tsx` - category filter, table secondary label, and board badge.
- `components/pr/PRDetail.tsx` - category metadata.
- `lib/reporting.ts` - category filter, summary, detail, options, and workbook rows.
- `app/reports/page.tsx` - category filter and category summary.
- `app/reports/export/route.ts` - read category filter.
- `lib/pr-generate.ts` - optional category render fields.
- relevant existing tests and project documentation.

---

### Task 1: Add Category Schema, Migration, And Seed Data

**Files:**
- Create: `tests/pr-category-schema.test.ts`
- Create: `prisma/migrations/000009_pr_category_master/migration.sql`
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.mjs`
- Modify: `tests/seed-data.test.ts`

**Interfaces:**
- Produces Prisma model `PurchaseRequestCategory`.
- Produces nullable `PurchaseRequest.categoryId: string | null` and relation `PurchaseRequest.category`.
- Produces stable seed ids such as `cat_hardware` and `cat_subscription_renewal`.

- [ ] **Step 1: Write the failing schema contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("PR category SQL Server schema", () => {
  test("adds category master and a nullable legacy-compatible PR relation", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync("prisma/migrations/000009_pr_category_master/migration.sql", "utf8");

    expect(schema).toContain("model PurchaseRequestCategory");
    expect(schema).toMatch(/categoryId\s+String\?/);
    expect(schema).toContain("category PurchaseRequestCategory?");
    expect(migration).toContain("CREATE TABLE [dbo].[PurchaseRequestCategory]");
    expect(migration).toContain("PurchaseRequest_categoryId_fkey");
    expect(migration).toContain("cat_subscription_renewal");
  });
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `npm test -- tests/pr-category-schema.test.ts`

Expected: FAIL because the migration file and Prisma model do not exist.

- [ ] **Step 3: Add the Prisma model and relations**

Add this model and matching relation fields:

```prisma
model PurchaseRequestCategory {
  id          String   @id @default(cuid()) @db.NVarChar(30)
  code        String   @unique @db.NVarChar(60)
  name        String   @db.NVarChar(160)
  description String?  @db.NVarChar(500)
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  purchaseRequests PurchaseRequest[]

  @@index([isActive, sortOrder, name])
}
```

Add `categoryId String? @db.NVarChar(30)` and:

```prisma
category PurchaseRequestCategory? @relation(fields: [categoryId], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

to `PurchaseRequest`.

- [ ] **Step 4: Create the idempotent SQL Server migration**

The migration must create the table and index only when absent, add the nullable column, add the foreign key, and insert these rows with `IF NOT EXISTS` guards:

```sql
INSERT INTO [dbo].[PurchaseRequestCategory]
    ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
VALUES
    (N'cat_hardware', N'HARDWARE', N'Hardware & Equipment', NULL, 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (N'cat_software_license', N'SOFTWARE_LICENSE', N'Software & Licenses', NULL, 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (N'cat_subscription_renewal', N'SUBSCRIPTION_RENEWAL', N'Subscription & Renewal', NULL, 30, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (N'cat_service_maintenance', N'SERVICE_MAINTENANCE', N'Service & Maintenance', NULL, 40, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (N'cat_network_infra', N'NETWORK_INFRASTRUCTURE', N'Network & Infrastructure', NULL, 50, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (N'cat_cloud_hosting', N'CLOUD_HOSTING', N'Cloud & Hosting', NULL, 60, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (N'cat_other', N'OTHER', N'Other', NULL, 70, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

Wrap the migration in the repository's existing `BEGIN TRY / BEGIN TRAN / COMMIT / CATCH` pattern.

- [ ] **Step 5: Mirror the production seed in the development seed script**

Add a `prCategories` array, upsert each category by `code` inside `seedMasters()`, and assign representative category ids to seeded PR create/update data. Extend `tests/seed-data.test.ts` with:

```ts
test("seeds the approved PR category codes", () => {
  const source = readFileSync("prisma/seed.mjs", "utf8");

  for (const code of ["HARDWARE", "SOFTWARE_LICENSE", "SUBSCRIPTION_RENEWAL", "SERVICE_MAINTENANCE", "NETWORK_INFRASTRUCTURE", "CLOUD_HOSTING", "OTHER"]) {
    expect(source).toContain(code);
  }
});
```

- [ ] **Step 6: Validate schema and focused tests**

Run: `npx prisma validate`

Expected: `The schema at prisma/schema.prisma is valid`.

Run: `npm run prisma:generate`

Expected: Prisma Client generated successfully.

Run: `npm test -- tests/pr-category-schema.test.ts tests/seed-data.test.ts tests/prisma-schema.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 7: Commit the schema unit**

```bash
git add prisma/schema.prisma prisma/migrations/000009_pr_category_master/migration.sql prisma/seed.mjs tests/pr-category-schema.test.ts tests/seed-data.test.ts
git commit -m "Add PR category data model"
```

### Task 2: Build Category Master Domain And Server Actions

**Files:**
- Create: `tests/pr-category-master.test.ts`
- Create: `lib/pr-category-master.ts`
- Create: `app/masters/pr-categories/actions.ts`

**Interfaces:**
- Produces `PrCategoryFilters`, `PrCategoryInput`, `PrCategoryOption`, and `PrCategoryRow`.
- Produces `normalizePrCategoryFilters(params)`, `parsePrCategoryInput(values)`, `validateCategoryCodeMutation(args)`, and `mapPrCategoryRecordToRow(record)`.
- Produces `getPrCategoryPageData(params)`, `createPrCategoryFromFormData(formData)`, `updatePrCategoryFromFormData(formData)`, and `setPrCategoryActiveFromFormData(formData, isActive)`.

- [ ] **Step 1: Write failing pure-domain tests**

```ts
import { describe, expect, test } from "vitest";
import { normalizePrCategoryFilters, parsePrCategoryInput, validateCategoryCodeMutation } from "../lib/pr-category-master";

describe("PR category master", () => {
  test("normalizes filters and category input", () => {
    expect(normalizePrCategoryFilters({ includeInactive: "1", q: " license " })).toEqual({ includeInactive: true, q: "license" });
    expect(parsePrCategoryInput({ code: " software license ", description: " Annual tools ", name: " Software ", sortOrder: "20" })).toEqual({
      code: "SOFTWARE_LICENSE",
      description: "Annual tools",
      name: "Software",
      sortOrder: 20,
    });
  });

  test("locks a referenced category code", () => {
    expect(() => validateCategoryCodeMutation({ currentCode: "HARDWARE", nextCode: "DEVICE", referenceCount: 1 })).toThrow(
      "Category code cannot change after it is used",
    );
    expect(() => validateCategoryCodeMutation({ currentCode: "HARDWARE", nextCode: "HARDWARE", referenceCount: 8 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/pr-category-master.test.ts`

Expected: FAIL because `lib/pr-category-master.ts` does not exist.

- [ ] **Step 3: Implement the pure category contract**

Use these exact parsing rules:

```ts
export function parsePrCategoryInput(values: Partial<Record<string, unknown>>): PrCategoryInput {
  const code = String(values.code || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const name = String(values.name || "").trim();
  const description = String(values.description || "").trim() || null;
  const sortOrder = Number(values.sortOrder);

  if (!code) throw new Error("Category code is required");
  if (!name) throw new Error("Category name is required");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) throw new Error("Sort order must be between 0 and 9999");

  return { code, description, name, sortOrder };
}
```

`normalizePrCategoryFilters` trims `q` and reads `includeInactive === "1"`. `mapPrCategoryRecordToRow` returns reference count, affected active-schedule count (zero until Plan 2 adds schedules), status label, and ISO update date.

- [ ] **Step 4: Implement permission-guarded CRUD and audits**

All mutations call `requirePermission("MASTER_DATA_MANAGE")`. Use Prisma transactions and these audit actions:

```ts
type CategoryAuditAction = "PR category created" | "PR category updated" | "PR category activated" | "PR category deactivated";
```

Use `entityType: "PurchaseRequestCategory"`, category id as `entityId`, and metadata containing `code`, `name`, `detail`, and `affectedScheduleIds: []` in this plan. Catch Prisma unique errors and return a readable `Category code already exists` error without exposing Prisma internals.

- [ ] **Step 5: Add thin server actions**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPrCategoryFromFormData, setPrCategoryActiveFromFormData, updatePrCategoryFromFormData } from "@/lib/pr-category-master";

export async function createPrCategoryAction(formData: FormData) {
  await createPrCategoryFromFormData(formData);
  revalidatePath("/masters/pr-categories");
  redirect("/masters/pr-categories");
}

export async function updatePrCategoryAction(formData: FormData) {
  await updatePrCategoryFromFormData(formData);
  revalidatePath("/masters/pr-categories");
  redirect("/masters/pr-categories");
}

export async function setPrCategoryActiveAction(isActive: boolean, formData: FormData) {
  await setPrCategoryActiveFromFormData(formData, isActive);
  revalidatePath("/masters/pr-categories");
  redirect("/masters/pr-categories");
}
```

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm test -- tests/pr-category-master.test.ts tests/auth-permissions.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 7: Commit the domain unit**

```bash
git add lib/pr-category-master.ts app/masters/pr-categories/actions.ts tests/pr-category-master.test.ts
git commit -m "Add PR category master service"
```

### Task 3: Build Category Master UI And Master Navigation

**Files:**
- Create: `tests/pr-category-page-copy.test.ts`
- Create: `components/masters/MasterDataNav.tsx`
- Create: `app/masters/pr-categories/page.tsx`
- Modify: `app/masters/companies/page.tsx`
- Modify: `lib/auth/route-access.ts`
- Modify: `tests/auth-route-access.test.ts`

**Interfaces:**
- Consumes category rows and filters from Task 2.
- Produces admin route `/masters/pr-categories` and shared `MasterDataNav`.

- [ ] **Step 1: Write failing page and route tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("PR category admin page", () => {
  test("provides focused category CRUD and shared master navigation", () => {
    const page = readFileSync("app/masters/pr-categories/page.tsx", "utf8");
    const nav = readFileSync("components/masters/MasterDataNav.tsx", "utf8");

    expect(page).toContain("PR Categories");
    expect(page).toContain("Create Category");
    expect(page).toContain("Include inactive");
    expect(page).toContain("Deactivate");
    expect(nav).toContain("/masters/companies");
    expect(nav).toContain("/masters/pr-categories");
  });
});
```

Add to `tests/auth-route-access.test.ts`:

```ts
expect(requiredPermissionForPath("/masters/pr-categories")).toBe("MASTER_DATA_MANAGE");
expect(canRoleAccessPath("IT_USER", "/masters/pr-categories")).toBe(false);
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/pr-category-page-copy.test.ts tests/auth-route-access.test.ts`

Expected: FAIL because the page/nav do not exist and the route is not mapped.

- [ ] **Step 3: Add shared Master Data navigation**

Create a compact two-link navigation using `usePathname()` with links `Companies / Branches` and `PR Categories`. Reuse the existing rounded-md, border, selected-primary vocabulary; do not create nested cards or another sidebar item. Render it below the SectionHeader on both master pages.

- [ ] **Step 4: Build the category page**

The page must include:

- search and Include inactive filters
- one compact create form for Code, Name, Description, and Sort Order
- a table with Category, Description, Usage, Updated, State, and Actions
- inline edit forms
- activate/deactivate confirmation copy
- an empty state that points to Create Category

Use stable `row.id` keys and existing `Card`, `TableWrap`, `Badge`, `Button`, `inputClass`, and table classes.

- [ ] **Step 5: Protect the route**

Add:

```ts
{ permission: "MASTER_DATA_MANAGE", prefix: "/masters/pr-categories" },
```

to `permissionRoutes` before broader route matches.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm test -- tests/pr-category-page-copy.test.ts tests/auth-route-access.test.ts tests/company-master-page-copy.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 7: Commit the UI unit**

```bash
git add components/masters/MasterDataNav.tsx app/masters/pr-categories/page.tsx app/masters/companies/page.tsx lib/auth/route-access.ts tests/pr-category-page-copy.test.ts tests/auth-route-access.test.ts
git commit -m "Add PR category admin console"
```

### Task 4: Require Category In Draft, Clone, And Reissue Workflows

**Files:**
- Modify: `tests/pr-draft.test.ts`
- Modify: `tests/pr-document-control.test.ts`
- Modify: `tests/pr-form-workflow-copy.test.ts`
- Modify: `lib/pr-draft.ts`
- Modify: `components/pr/PRForm.tsx`
- Modify: `lib/pr-document-control.ts`

**Interfaces:**
- Consumes `PurchaseRequestCategory` from Task 1.
- Extends `DraftPurchaseRequestInput` and `DraftFormInitialValue` with `categoryId: string`.
- Extends `DraftFormOptions` with `categories: Array<{ id: string; label: string }>`.

- [ ] **Step 1: Add failing draft parsing and mapping tests**

Add `categoryId: "cat_hardware"` to valid form fixtures and assert:

```ts
expect(draft.categoryId).toBe("cat_hardware");
expect(data.categoryId).toBe("cat_hardware");
expect(initial.categoryId).toBe("cat_hardware");
```

Add a missing-category case:

```ts
expect(() => parseDraftPurchaseRequestForm(formData({
  branchId: "br_sonic04",
  departmentId: "dep_it",
  documentDate: "2026-07-15",
  purpose: "ซื้อใหม่",
  purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
  description: ["Server"],
  quantity: ["1"],
  unitCost: ["100"],
}))).toThrow(DraftValidationError);
```

Add a Reissue source assertion that the create payload contains `categoryId: original.categoryId`.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/pr-draft.test.ts tests/pr-document-control.test.ts tests/pr-form-workflow-copy.test.ts`

Expected: FAIL because category is not parsed, mapped, or rendered.

- [ ] **Step 3: Thread category through pure draft data**

Add `categoryId` to input, edit-record, initial-value, clone mapping, create data, and update data. In `parseDraftPurchaseRequestForm`, add:

```ts
const categoryId = getText(formData, "categoryId");
if (!categoryId) fieldErrors.categoryId = "กรุณาเลือกหมวดหมู่ PR";
```

Return `categoryId` and include it in Purchase Request create/update data.

- [ ] **Step 4: Validate active category inside create/edit transactions**

Query:

```ts
const category = await tx.purchaseRequestCategory.findFirst({
  select: { id: true },
  where: { id: input.categoryId, isActive: true },
});

if (!category) throw new DraftValidationError({ categoryId: "หมวดหมู่ PR ไม่พร้อมใช้งาน" });
```

Do this on both create and edit before writing the PR. Load categories in `getDraftFormOptions()` ordered by `sortOrder`, then `name`.

- [ ] **Step 5: Add the required category select to PRForm**

Place it in Document Information before the purpose/purchase-method fieldsets:

```tsx
<Field label="PR Category / หมวดหมู่ PR *">
  <select className={inputClass()} defaultValue={initialDraft?.categoryId || ""} name="categoryId" required>
    <option value="">Select category</option>
    {options.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
  </select>
</Field>
```

- [ ] **Step 6: Preserve category during Reissue**

Add `categoryId: original.categoryId` to the replacement Draft create data. Clone already preserves it through `mapCloneSourceRecordToInitialValue`.

- [ ] **Step 7: Run regression tests and typecheck**

Run: `npm test -- tests/pr-draft.test.ts tests/pr-document-control.test.ts tests/pr-form-workflow-copy.test.ts tests/pr-submit-intent.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 8: Commit the workflow unit**

```bash
git add lib/pr-draft.ts components/pr/PRForm.tsx lib/pr-document-control.ts tests/pr-draft.test.ts tests/pr-document-control.test.ts tests/pr-form-workflow-copy.test.ts
git commit -m "Require PR category on drafts"
```

### Task 5: Show And Filter Category In PR List, Board, And Detail

**Files:**
- Modify: `tests/pr-filters.test.ts`
- Modify: `tests/purchase-request-list.test.ts`
- Modify: `tests/purchase-request-detail.test.ts`
- Modify: `tests/pr-detail-command-center.test.ts`
- Modify: `lib/pr-filters.ts`
- Modify: `lib/purchase-requests.ts`
- Modify: `components/pr/PRList.tsx`
- Modify: `components/pr/PRDetail.tsx`

**Interfaces:**
- Extends `PurchaseRequestListItem` with `category: string` and `categoryId: string | null`.
- Extends `PurchaseRequestDetail.header` with the same fields.
- Extends `PurchaseRequestFilters` with `category?: string`.

- [ ] **Step 1: Write failing mapping and filter assertions**

Use records containing `category: { id: "cat_hardware", name: "Hardware & Equipment" }` and assert mapped rows include:

```ts
category: "Hardware & Equipment",
categoryId: "cat_hardware",
```

For a null category, assert `category === "Not categorized"`. Extend filter tests:

```ts
const result = filterPurchaseRequests(requests, { category: "Hardware & Equipment" });
expect(result.every((request) => request.category === "Hardware & Equipment")).toBe(true);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/pr-filters.test.ts tests/purchase-request-list.test.ts tests/purchase-request-detail.test.ts`

Expected: FAIL because category fields and filtering do not exist.

- [ ] **Step 3: Extend Prisma includes and view-model mapping**

Include `category: { select: { id: true, name: true } }` in list/detail queries. Map null as:

```ts
category: record.category?.name || "Not categorized",
categoryId: record.category?.id || null,
```

Add category text to the search haystack and exact category filter in `filterPurchaseRequests`.

- [ ] **Step 4: Add category filter and compact display**

In `PRList`:

- derive category options from rows
- add one category select to the filter grid
- show category as secondary text beneath Company in the table, avoiding another wide column
- add a compact neutral/info Badge inside board cards
- keep table action width and archive behavior unchanged

In `PRDetail`, add Category to Document information and show `Not categorized` explicitly for legacy records.

- [ ] **Step 5: Run focused UI and mapping tests**

Run: `npm test -- tests/pr-filters.test.ts tests/purchase-request-list.test.ts tests/purchase-request-detail.test.ts tests/pr-detail-command-center.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 6: Commit the document-view unit**

```bash
git add lib/pr-filters.ts lib/purchase-requests.ts components/pr/PRList.tsx components/pr/PRDetail.tsx tests/pr-filters.test.ts tests/purchase-request-list.test.ts tests/purchase-request-detail.test.ts tests/pr-detail-command-center.test.ts
git commit -m "Show PR categories in document views"
```

### Task 6: Integrate Category With Reports, XLSX, And Carbone Payload

**Files:**
- Modify: `tests/reporting.test.ts`
- Modify: `tests/reports-page.test.ts`
- Modify: `tests/pr-generate.test.ts`
- Modify: `lib/reporting.ts`
- Modify: `app/reports/page.tsx`
- Modify: `app/reports/export/route.ts`
- Modify: `lib/pr-generate.ts`

**Interfaces:**
- Extends `ReportFiltersInput` and `NormalizedReportFilters` with `categoryId`.
- Adds `CategorySummaryRow`, `ReportViewModel.categorySummary`, and `ReportPageData.categories`.
- Extends the Carbone payload with `categoryCode` and `categoryName`.

- [ ] **Step 1: Add failing reporting tests**

Add category data to `ReportingPrRecord` fixtures and assert:

```ts
expect(normalizeReportFilters({ categoryId: "cat_hardware", year: 2026 })).toMatchObject({ categoryId: "cat_hardware" });
expect(view.categorySummary).toEqual([{ category: "Hardware & Equipment", categoryId: "cat_hardware", count: 1, totalAmount: 1000 }]);
expect(buildReportWorkbookSheets(view).find((sheet) => sheet.name === "By Category")?.rows[0]).toEqual(["Category", "PR Count", "Total Amount"]);
```

In `tests/pr-generate.test.ts`, include a category record and assert:

```ts
expect(payload).toMatchObject({ categoryCode: "HARDWARE", categoryName: "Hardware & Equipment" });
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/reporting.test.ts tests/reports-page.test.ts tests/pr-generate.test.ts`

Expected: FAIL because category report and render fields do not exist.

- [ ] **Step 3: Extend reporting filters and view model**

Add category to the normalized filter, export href, filter chips, Prisma where clause, and reporting record include. Group filtered records with null mapped to `Not categorized` and sort category summary by amount descending, then name.

Add `By Category` workbook sheet and a Category column to `PR Detail` rows. Add `Category` to the Summary filter rows.

- [ ] **Step 4: Add report UI and export query support**

Add Category select to `FilterPanel`, update its responsive grid, add a compact `Category Summary` table, and adjust empty-state colSpans. Read `categoryId` in `app/reports/export/route.ts` so UI and XLSX use identical filters.

- [ ] **Step 5: Add optional render payload fields**

Extend the render-record type with nullable category and map:

```ts
categoryCode: record.category?.code || "",
categoryName: record.category?.name || "",
```

Include category in every Prisma query that feeds `buildPurchaseRequestRenderPayload`. Do not add the tags to required template-tag validation.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm test -- tests/reporting.test.ts tests/reports-page.test.ts tests/pr-generate.test.ts tests/xlsx.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 7: Commit the reporting/render unit**

```bash
git add lib/reporting.ts app/reports/page.tsx app/reports/export/route.ts lib/pr-generate.ts tests/reporting.test.ts tests/reports-page.test.ts tests/pr-generate.test.ts
git commit -m "Integrate PR categories with reports and rendering"
```

### Task 7: Apply Migration, Update Documentation, And Verify Category Phase

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/README.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/BACKEND_INTEGRATION.md`
- Modify: `docs/DOCUMENT_GENERATION.md`
- Modify: `docs/QA_CHECKLIST.md`
- Modify: `tests/prisma-client.test.ts` - assert the generated Prisma client exposes the Category model and PR relation.

**Interfaces:**
- Produces a migrated development database with initial categories.
- Produces documented category behavior consumed by the Annual Recurring PR plan.

- [ ] **Step 1: Apply the checked-in migration to the configured development instance**

Run: `npx prisma migrate deploy`

Expected: migration `000009_pr_category_master` applied successfully to the configured SQL Server database.

Run: `npm run db:seed`

Expected: JSON success output and category upserts without duplicate errors.

- [ ] **Step 2: Run a database smoke query through Prisma**

Run:

```powershell
@'
import "dotenv/config";
import { prisma } from "./lib/prisma.ts";
const rows = await prisma.purchaseRequestCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
console.log(rows.map(({ code, isActive, name }) => ({ code, isActive, name })));
await prisma.$disconnect();
'@ | npx tsx -
```

Expected: seven active seeded category rows in the approved order. If `tsx` is not installed yet, use `npx tsx` for this one-off smoke only; Plan 2 adds it as a project runtime dependency for the worker.

- [ ] **Step 3: Update documentation sources of truth**

Document:

- nullable legacy schema versus required new Draft behavior
- category CRUD and deactivate-not-delete policy
- Clone/Reissue preservation
- list/board/detail/report/XLSX behavior
- optional Carbone fields `{d.categoryCode}` and `{d.categoryName}`
- QA cases for active, inactive, and missing legacy categories
- Category phase completion and the dependency for Recurring PR

- [ ] **Step 4: Run full verification**

Run: `npm test`

Expected: all tests PASS with zero failures.

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npx prisma validate`

Expected: schema valid.

Run: `npm run build`

Expected: production build completes successfully.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 5: Perform manual browser smoke tests**

Verify:

1. Admin can create/edit/deactivate/reactivate a category.
2. IT_USER cannot open `/masters/pr-categories`.
3. New PR cannot save without category.
4. Clone and Reissue retain category.
5. Legacy uncategorized controlled PR opens and previews.
6. List, Board, Detail, Report filter, XLSX, and preview payload show category correctly.
7. Desktop and mobile layouts have no category-label overlap or unwanted horizontal overflow beyond existing tables.

- [ ] **Step 6: Commit documentation and final verification changes**

```bash
git add DEVELOPER_HANDOFF.md docs/README.md docs/FEATURES.md docs/DATA_MODEL.md docs/BACKEND_INTEGRATION.md docs/DOCUMENT_GENERATION.md docs/QA_CHECKLIST.md tests/prisma-client.test.ts
git commit -m "Document PR category workflow"
```
