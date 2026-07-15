# Annual Recurring PR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators create annual renewal schedules from existing PRs and have an idempotent Ubuntu cron worker create one reviewable Draft per schedule year before the renewal date.

**Architecture:** Store an editable normalized PR snapshot in schedule and schedule-item tables, with a separate annual run ledger enforcing `scheduleId + occurrenceYear` uniqueness. Keep date math pure and Asia/Bangkok-aware, keep UI CRUD behind `PR_RECURRING_MANAGE`, and invoke a server-side worker through a local CLI command rather than a public HTTP route.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.7, TypeScript 5.7, Prisma 6.19.3 with SQL Server, Vitest 4.1.9, `tsx` runtime for the worker CLI, Ubuntu cron, PM2 deployment.

## Global Constraints

- Complete `docs/superpowers/plans/2026-07-15-pr-category-master-integration.md` first.
- Annual recurrence only; do not add monthly, quarterly, weekly, or custom cron rules.
- Store renewal month/day and an integer lead time from 1 through 365 days; default is 30.
- Create Draft only. Never call Carbone, allocate a PR number, create an official snapshot, or invoke `Issue PR` from the worker.
- Use Asia/Bangkok for schedule calendar decisions and UTC-midnight `DateTime` values for stored date-only fields, matching existing PR date storage.
- February 29 becomes February 28 in non-leap years.
- Each schedule has one active responsible user; the created Draft uses that user as `createdById`.
- Automated Audit Log entries use `actorId = null` and display as `System`.
- Persist one annual run per `scheduleId + occurrenceYear`; database uniqueness is authoritative.
- The daily worker catches up missed due schedules after downtime.
- A persisted `FAILED` run requires an authorized manual Retry; cron does not repeat the same validation failure daily.
- Existing soft Budget reservation behavior applies to recurring Drafts and never blocks Draft creation for missing/insufficient Budget.
- External notifications and attachment copying are out of scope.
- Update `DEVELOPER_HANDOFF.md` and relevant `docs/*.md` with every implemented workflow change.

---

## File Map

### New Files

- `prisma/migrations/000010_annual_recurring_pr/migration.sql` - schedule, item, and run tables with SQL Server constraints/indexes.
- `lib/recurring-pr-date.ts` - pure Bangkok date-only and annual occurrence calculations.
- `lib/recurring-pr.ts` - schedule form parsing, snapshot mapping, CRUD queries/mutations, filters, and audit helpers.
- `lib/recurring-pr-worker.ts` - due-schedule processing, idempotent run claiming, Draft creation, Retry, and worker summary.
- `components/pr/PRItemEditor.tsx` - shared Heading/Item/Detail editor extracted from PRForm.
- `components/recurring-pr/RecurringScheduleForm.tsx` - dedicated schedule editor.
- `components/recurring-pr/RecurringScheduleList.tsx` - search/filter/list states and compact actions.
- `app/recurring-pr/page.tsx` - schedule list.
- `app/recurring-pr/new/page.tsx` - create-from-PR page.
- `app/recurring-pr/[id]/page.tsx` - schedule detail and run history.
- `app/recurring-pr/[id]/edit/page.tsx` - schedule edit page.
- `app/recurring-pr/actions.ts` - create/update/pause/resume/retry server actions.
- `scripts/process-recurring-pr.ts` - cron-safe CLI entrypoint.
- `docs/RECURRING_PR.md` - functional and operational source of truth.
- recurring-specific test files described by each task.

### Modified Files

- `prisma/schema.prisma` - recurring models and relations.
- `lib/auth/permissions.ts` - `PR_RECURRING_MANAGE`.
- `lib/auth/route-access.ts` - protect `/recurring-pr` while leaving list/detail readable by every authenticated role.
- `lib/pr-category-master.ts` and `app/masters/pr-categories/*` - deactivation impact query, affected-schedule audit metadata, and named confirmation UI.
- `components/app/AppSidebar.tsx` - separate Recurring PR navigation.
- `app/pr/[id]/page.tsx` and `components/pr/PRDetail.tsx` - Create Schedule action and recurring origin link.
- `components/pr/PRForm.tsx` - consume shared PRItemEditor without behavior changes.
- `lib/purchase-requests.ts` - recurring origin in PR detail/list view models.
- `package.json` and `package-lock.json` - `tsx` and worker command.
- deployment, operations, QA, architecture, data model, features, backend, docs index, and handoff documents.

---

### Task 1: Add Recurring Schema And RBAC Contract

**Files:**
- Create: `tests/recurring-pr-schema.test.ts`
- Create: `prisma/migrations/000010_annual_recurring_pr/migration.sql`
- Modify: `prisma/schema.prisma`
- Modify: `lib/auth/permissions.ts`
- Modify: `lib/auth/route-access.ts`
- Modify: `tests/auth-permissions.test.ts`
- Modify: `tests/auth-route-access.test.ts`

**Interfaces:**
- Produces Prisma models `RecurringPurchaseRequestSchedule`, `RecurringPurchaseRequestScheduleItem`, and `RecurringPurchaseRequestRun`.
- Produces permission `PR_RECURRING_MANAGE` granted to `ADMIN` and `IT_ADMIN` only.
- Makes `/recurring-pr` an authenticated route without applying `PR_RECURRING_MANAGE` to read-only list/detail URLs.
- Produces one-to-one `PurchaseRequest.recurringRun` relation and category/schedule ownership relations.

- [ ] **Step 1: Write failing schema and permission tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("annual recurring PR schema", () => {
  test("stores normalized schedules and one run per occurrence year", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync("prisma/migrations/000010_annual_recurring_pr/migration.sql", "utf8");

    expect(schema).toContain("model RecurringPurchaseRequestSchedule");
    expect(schema).toContain("model RecurringPurchaseRequestScheduleItem");
    expect(schema).toContain("model RecurringPurchaseRequestRun");
    expect(schema).toContain("@@unique([scheduleId, occurrenceYear])");
    expect(migration).toContain("RecurringPurchaseRequestRun_scheduleId_occurrenceYear_key");
    expect(migration).toContain("RecurringSchedule_status_check");
  });
});
```

Add to `tests/auth-permissions.test.ts`:

```ts
expect(hasPermission("ADMIN", "PR_RECURRING_MANAGE")).toBe(true);
expect(hasPermission("IT_ADMIN", "PR_RECURRING_MANAGE")).toBe(true);
expect(hasPermission("IT_USER", "PR_RECURRING_MANAGE")).toBe(false);
expect(hasPermission("VIEWER", "PR_RECURRING_MANAGE")).toBe(false);
```

Add to `tests/auth-route-access.test.ts`:

```ts
expect(isProtectedAppPath("/recurring-pr")).toBe(true);
expect(requiredPermissionForPath("/recurring-pr")).toBeNull();
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/recurring-pr-schema.test.ts tests/auth-permissions.test.ts tests/auth-route-access.test.ts`

Expected: FAIL because models, migration, permission, and route boundary do not exist.

- [ ] **Step 3: Add the Prisma schedule model**

```prisma
model RecurringPurchaseRequestSchedule {
  id                      String   @id @default(cuid()) @db.NVarChar(30)
  name                    String   @db.NVarChar(160)
  sourcePurchaseRequestId String?  @db.NVarChar(30)
  companyId               String   @db.NVarChar(30)
  branchId                String   @db.NVarChar(30)
  departmentId            String   @db.NVarChar(30)
  divisionId              String?  @db.NVarChar(30)
  categoryId              String   @db.NVarChar(30)
  purpose                 String   @db.NVarChar(120)
  purchaseMethod          String   @db.NVarChar(120)
  remark                  String?  @db.NVarChar(1000)
  vatRate                 Decimal  @default(7) @db.Decimal(5, 2)
  renewalMonth            Int
  renewalDay              Int
  leadDays                Int      @default(30)
  responsibleUserId       String   @db.NVarChar(30)
  createdById             String   @db.NVarChar(30)
  status                  String   @default("ACTIVE") @db.NVarChar(20)
  nextRunDate             DateTime
  lastRunAt               DateTime?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  sourcePurchaseRequest PurchaseRequest?                 @relation("RecurringScheduleSource", fields: [sourcePurchaseRequestId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  company              Company                          @relation(fields: [companyId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  branch               Branch                           @relation(fields: [branchId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  department           Department                       @relation(fields: [departmentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  division             Division?                        @relation(fields: [divisionId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  category             PurchaseRequestCategory          @relation(fields: [categoryId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  responsibleUser      User                             @relation("RecurringScheduleResponsible", fields: [responsibleUserId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  createdBy            User                             @relation("RecurringScheduleCreator", fields: [createdById], references: [id], onDelete: NoAction, onUpdate: NoAction)
  items                RecurringPurchaseRequestScheduleItem[]
  runs                 RecurringPurchaseRequestRun[]

  @@index([status, nextRunDate])
  @@index([responsibleUserId])
}
```

- [ ] **Step 4: Add schedule-item and run models**

```prisma
model RecurringPurchaseRequestScheduleItem {
  id          String  @id @default(cuid()) @db.NVarChar(30)
  scheduleId  String  @db.NVarChar(30)
  lineNo      Int
  rowType     String  @default("ITEM") @db.NVarChar(20)
  accountCode String  @db.NVarChar(80)
  description String  @db.NVarChar(500)
  quantity    Decimal @db.Decimal(18, 4)
  unitCost    Decimal @db.Decimal(18, 2)
  totalAmount Decimal @db.Decimal(18, 2)

  schedule RecurringPurchaseRequestSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([scheduleId, lineNo])
}

model RecurringPurchaseRequestRun {
  id                 String   @id @default(cuid()) @db.NVarChar(30)
  scheduleId         String   @db.NVarChar(30)
  occurrenceYear     Int
  renewalDate        DateTime
  scheduledDraftDate DateTime
  status             String   @default("PROCESSING") @db.NVarChar(20)
  purchaseRequestId  String?  @unique @db.NVarChar(30)
  errorMessage       String?  @db.NVarChar(1000)
  startedAt          DateTime @default(now())
  finishedAt         DateTime?

  schedule       RecurringPurchaseRequestSchedule @relation(fields: [scheduleId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  purchaseRequest PurchaseRequest?                 @relation("RecurringRunDraft", fields: [purchaseRequestId], references: [id], onDelete: SetNull, onUpdate: NoAction)

  @@unique([scheduleId, occurrenceYear])
  @@index([status, startedAt])
}
```

Add named relation arrays to User, Company, Branch, Department, Division, PurchaseRequestCategory, and PurchaseRequest. Use `sourceRecurringSchedules` for the source relation and `recurringRun` for the generated Draft relation.

- [ ] **Step 5: Create the SQL Server migration with integrity checks**

Follow the repository's idempotent transaction pattern. Add check constraints:

```sql
CHECK ([status] IN (N'ACTIVE', N'PAUSED'))
CHECK ([renewalMonth] BETWEEN 1 AND 12)
CHECK ([renewalDay] BETWEEN 1 AND 31)
CHECK ([leadDays] BETWEEN 1 AND 365)
CHECK ([rowType] IN (N'ITEM', N'HEADING', N'DETAIL'))
CHECK ([status] IN (N'PROCESSING', N'SUCCEEDED', N'FAILED'))
```

Create the unique annual-run constraint and all foreign keys with the delete behavior defined in the Prisma schema.

- [ ] **Step 6: Add permission and authenticated-route boundary**

Add `PR_RECURRING_MANAGE` to the `Permission` union and `allPermissions`. Because `IT_ADMIN` references `allPermissions`, it receives the permission with ADMIN. Do not add it to `IT_USER` or `VIEWER`.

Add `/recurring-pr` to `protectedPrefixes` in `lib/auth/route-access.ts`. Do not add it to `permissionRoutes`: list/detail are readable by authenticated roles, while page loaders and mutations enforce `PR_RECURRING_MANAGE` only for create/edit/pause/resume/retry.

Run: `npx prisma validate`

Expected: schema valid.

Run: `npm run prisma:generate`

Expected: client generated.

Run: `npm test -- tests/recurring-pr-schema.test.ts tests/auth-permissions.test.ts tests/auth-route-access.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 7: Commit the schema and permission unit**

```bash
git add prisma/schema.prisma prisma/migrations/000010_annual_recurring_pr/migration.sql lib/auth/permissions.ts lib/auth/route-access.ts tests/recurring-pr-schema.test.ts tests/auth-permissions.test.ts tests/auth-route-access.test.ts
git commit -m "Add annual recurring PR data model"
```

### Task 2: Implement Bangkok Annual Date Rules

**Files:**
- Create: `tests/recurring-pr-date.test.ts`
- Create: `lib/recurring-pr-date.ts`

**Interfaces:**
- Produces `AnnualOccurrence`.
- Produces `toBangkokDateOnly(now)`, `buildAnnualOccurrence(args)`, `chooseInitialOccurrenceYear(args)`, and `calculateNextAnnualOccurrence(args)`.

- [ ] **Step 1: Write failing date tests**

```ts
import { describe, expect, test } from "vitest";
import { buildAnnualOccurrence, chooseInitialOccurrenceYear, toBangkokDateOnly } from "../lib/recurring-pr-date";

describe("annual recurring PR dates", () => {
  test("uses Asia/Bangkok for today's date", () => {
    expect(toBangkokDateOnly(new Date("2026-07-14T17:30:00.000Z"))).toBe("2026-07-15");
  });

  test("subtracts lead days across year boundaries", () => {
    const occurrence = buildAnnualOccurrence({ leadDays: 30, renewalDay: 15, renewalMonth: 1, year: 2026 });
    expect(occurrence.renewalDate.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(occurrence.scheduledDraftDate.toISOString()).toBe("2025-12-16T00:00:00.000Z");
  });

  test("clamps February 29 in non-leap years", () => {
    expect(buildAnnualOccurrence({ leadDays: 30, renewalDay: 29, renewalMonth: 2, year: 2027 }).renewalDate.toISOString()).toBe(
      "2027-02-28T00:00:00.000Z",
    );
    expect(buildAnnualOccurrence({ leadDays: 30, renewalDay: 29, renewalMonth: 2, year: 2028 }).renewalDate.toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });

  test("starts next year only after this year's renewal has passed", () => {
    expect(chooseInitialOccurrenceYear({ renewalDay: 1, renewalMonth: 9, today: "2026-07-15" })).toBe(2026);
    expect(chooseInitialOccurrenceYear({ renewalDay: 1, renewalMonth: 6, today: "2026-07-15" })).toBe(2027);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/recurring-pr-date.test.ts`

Expected: FAIL because the date module does not exist.

- [ ] **Step 3: Implement pure date-only helpers**

Use UTC arithmetic for stored dates and `Intl.DateTimeFormat` only to derive today's Bangkok date:

```ts
export type AnnualOccurrence = { occurrenceYear: number; renewalDate: Date; scheduledDraftDate: Date };

export function buildAnnualOccurrence({ leadDays, renewalDay, renewalMonth, year }: {
  leadDays: number;
  renewalDay: number;
  renewalMonth: number;
  year: number;
}): AnnualOccurrence {
  const lastDay = new Date(Date.UTC(year, renewalMonth, 0)).getUTCDate();
  const day = renewalMonth === 2 && renewalDay === 29 ? Math.min(renewalDay, lastDay) : renewalDay;
  const renewalDate = new Date(Date.UTC(year, renewalMonth - 1, day));
  const scheduledDraftDate = new Date(renewalDate);
  scheduledDraftDate.setUTCDate(scheduledDraftDate.getUTCDate() - leadDays);
  return { occurrenceYear: year, renewalDate, scheduledDraftDate };
}
```

Reject invalid non-February dates before calling this function from schedule parsing. `calculateNextAnnualOccurrence` calls `buildAnnualOccurrence` with `occurrenceYear + 1`.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- tests/recurring-pr-date.test.ts`

Expected: all tests PASS.

```bash
git add lib/recurring-pr-date.ts tests/recurring-pr-date.test.ts
git commit -m "Add annual recurring date rules"
```

### Task 3: Extract Shared Item Editor And Parse Schedule Snapshots

**Files:**
- Create: `tests/recurring-pr.test.ts`
- Create: `tests/pr-item-editor-copy.test.ts`
- Create: `lib/recurring-pr.ts`
- Create: `components/pr/PRItemEditor.tsx`
- Modify: `components/pr/PRForm.tsx`
- Modify: `tests/pr-form-workflow-copy.test.ts`

**Interfaces:**
- Produces `RecurringScheduleInput`, `RecurringScheduleItemInput`, and `RecurringScheduleFormValue`.
- Produces `parseRecurringScheduleForm(formData)`, `mapSourcePrToScheduleForm(record, dates)`, and `validateRecurringScheduleReferences(lookup)`.
- Produces reusable `PRItemEditor` that submits the existing repeated field names: `rowType`, `accountCode`, `description`, `quantity`, and `unitCost`.

- [ ] **Step 1: Write failing schedule parser tests**

```ts
import { describe, expect, test } from "vitest";
import { parseRecurringScheduleForm } from "../lib/recurring-pr";

test("parses annual settings and preserves heading/item/detail order", () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: "Microsoft 365 Renewal",
    sourcePurchaseRequestId: "pr_source",
    branchId: "br_hq",
    categoryId: "cat_subscription_renewal",
    departmentId: "dep_it",
    divisionId: "div_it",
    purpose: "ต่ออายุ",
    purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
    renewalMonth: "9",
    renewalDay: "1",
    leadDays: "30",
    responsibleUserId: "user_it",
  })) form.set(key, value);
  for (const value of ["HEADING", "ITEM", "DETAIL"]) form.append("rowType", value);
  for (const value of ["License", "Microsoft 365", "100 seats"]) form.append("description", value);
  for (const value of ["", "", ""]) form.append("accountCode", value);
  for (const value of ["", "100", ""]) form.append("quantity", value);
  for (const value of ["", "3500", ""]) form.append("unitCost", value);

  const input = parseRecurringScheduleForm(form);
  expect(input).toMatchObject({ leadDays: 30, renewalDay: 1, renewalMonth: 9, responsibleUserId: "user_it" });
  expect(input.items.map((item) => item.rowType)).toEqual(["HEADING", "ITEM", "DETAIL"]);
  expect(input.items[1].totalAmount).toBe(350000);
});
```

Add invalid tests for lead days 0/366, April 31, missing category, inactive responsible lookup, and no priced ITEM row.

- [ ] **Step 2: Write the failing item-editor source contract**

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("shares one item editor between PR and recurring schedule forms", () => {
  const editor = readFileSync("components/pr/PRItemEditor.tsx", "utf8");
  const prForm = readFileSync("components/pr/PRForm.tsx", "utf8");
  expect(editor).toContain('name="rowType"');
  expect(editor).toContain('name="description"');
  expect(editor).toContain("เพิ่มหัวข้อ");
  expect(editor).toContain("เพิ่มรายละเอียด");
  expect(prForm).toContain("<PRItemEditor");
});
```

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- tests/recurring-pr.test.ts tests/pr-item-editor-copy.test.ts tests/pr-form-workflow-copy.test.ts`

Expected: FAIL because parser/editor do not exist.

- [ ] **Step 4: Implement schedule parsing and source mapping**

Reuse `DraftValidationError`, `DraftLineItemRowType`, and `calculateDraftTotals` from `lib/pr-draft.ts`. Enforce:

- trimmed name, ids, purpose, purchase method, remark
- integer month 1-12, day valid for selected month with February 29 allowed, lead 1-365
- one active category and responsible user at database validation time
- at least one priced ITEM
- HEADING/DETAIL numeric values normalized to zero

`mapSourcePrToScheduleForm` copies header/items but excludes PR number, ref number, status, attachments, template, audit, clone/reissue ids, and generated snapshot.

- [ ] **Step 5: Extract PRItemEditor without changing PR behavior**

Move row state, row-type switching, add/remove controls, repeated hidden/input field names, quantity/unit-cost input behavior, and calculated row totals from `PRForm` into `PRItemEditor`. Give it this interface:

```ts
export type PRItemEditorValue = Array<{
  accountCode: string;
  description: string;
  quantity: number;
  rowType: DraftLineItemRowType;
  unitCost: number;
}>;

export type PRItemEditorTotals = {
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
};

export type PRItemEditorProps = {
  initialItems: PRItemEditorValue;
  onTotalsChange?: (totals: PRItemEditorTotals) => void;
};

```

Export a named `PRItemEditor` function component that accepts `PRItemEditorProps`. Keep the totals summary in `PRForm` through the declared `onTotalsChange` callback. Use the same contract in `RecurringScheduleForm`; do not duplicate the table markup.

- [ ] **Step 6: Run regression tests and commit**

Run: `npm test -- tests/recurring-pr.test.ts tests/pr-item-editor-copy.test.ts tests/pr-form-workflow-copy.test.ts tests/pr-draft.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

```bash
git add lib/recurring-pr.ts components/pr/PRItemEditor.tsx components/pr/PRForm.tsx tests/recurring-pr.test.ts tests/pr-item-editor-copy.test.ts tests/pr-form-workflow-copy.test.ts
git commit -m "Add recurring schedule snapshot form model"
```

### Task 4: Implement Schedule CRUD, Queries, And Audit

**Files:**
- Modify: `tests/recurring-pr.test.ts`
- Modify: `tests/pr-category-master.test.ts`
- Modify: `lib/recurring-pr.ts`
- Modify: `lib/pr-category-master.ts`
- Create: `app/recurring-pr/actions.ts`
- Modify: `app/masters/pr-categories/actions.ts`

**Interfaces:**
- Produces `RecurringScheduleFilters`, `RecurringScheduleRow`, `RecurringScheduleDetail`, and `RecurringScheduleOptions`.
- Produces `getRecurringSchedulePageData(filters, viewerId)`, `getRecurringScheduleDetail(id)`, `getRecurringScheduleSource(sourcePrId)`, `createRecurringScheduleFromFormData(sourcePrId, formData)`, `updateRecurringScheduleFromFormData(id, formData)`, and `setRecurringScheduleStatus(id, status)`.
- Extends Category Master with `getPrCategoryDeactivationImpact(categoryId)` and schedule-aware deactivation audit metadata.
- Later worker task consumes normalized schedule records and item order.

- [ ] **Step 1: Add failing filter/status/source mapping tests**

Test these pure helpers:

```ts
expect(normalizeRecurringScheduleFilters({ categoryId: "cat_hardware", q: " renewal ", status: "paused" })).toEqual({
  categoryId: "cat_hardware",
  q: "renewal",
  responsibleUserId: "ALL",
  status: "PAUSED",
  upcoming: "ALL",
});

expect(deriveRecurringScheduleUiStatus({ persistedStatus: "ACTIVE", latestRunStatus: "FAILED", referencesActive: true })).toBe("NEEDS_ATTENTION");
expect(deriveRecurringScheduleUiStatus({ persistedStatus: "ACTIVE", latestRunStatus: null, referencesActive: false })).toBe("NEEDS_ATTENTION");
```

Add a Category Master service test proving that deactivation impact returns active schedules only, ordered by schedule name, and that deactivation audit metadata contains their ids.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/recurring-pr.test.ts`

Expected: FAIL because CRUD/filter helpers are incomplete.

- [ ] **Step 3: Implement read models and filters**

List rows include name, category, renewal month/day, lead days, responsible user, next run date, last run result, source PR label, active/paused state, derived Needs attention, and latest generated Draft link. Filters support q, status, category, responsible user, and upcoming 30/60/90 days.

Load only active users for schedule options, but include the currently selected inactive user as a disabled display value when reading an existing schedule that needs attention.

Implement `getPrCategoryDeactivationImpact(categoryId)` in `lib/pr-category-master.ts`. It returns `{ category, activeSchedules }`, where each schedule includes `id`, `name`, `responsibleUserName`, and `nextRunDate`; use stable name/id ordering.

- [ ] **Step 4: Implement create-from-PR transaction**

`createRecurringScheduleFromFormData` must:

1. call `requirePermission("PR_RECURRING_MANAGE")`
2. load the source PR and item rows
3. parse submitted snapshot values
4. validate active Company/Branch/Department/Division/Category/User relations and branch/company plus division/department ownership
5. calculate initial occurrence year with `chooseInitialOccurrenceYear`
6. calculate `nextRunDate` with `buildAnnualOccurrence`
7. create schedule and items in one transaction
8. write `Recurring schedule created` with source PR id and next run date

Do not copy attachments, `prNo`, `refNo`, template version, generated snapshot, status timestamps, or document lineage.

- [ ] **Step 5: Implement update and pause/resume**

Update replaces schedule item rows in one transaction, recalculates next run for the next not-yet-succeeded occurrence, and does not alter historical runs or created Drafts. Status mutation accepts only `ACTIVE` or `PAUSED`. Write explicit audit events for update, pause, and resume.

Update Category Master deactivation so the transaction re-queries active schedules referencing the category and writes their ids to `affectedScheduleIds`. Category deactivation remains allowed; those schedules derive Needs attention immediately and cannot create a Draft until edited to use an active category.

- [ ] **Step 6: Add thin server actions**

```ts
"use server";

export async function createRecurringScheduleAction(sourcePrId: string, formData: FormData) {
  const created = await createRecurringScheduleFromFormData(sourcePrId, formData);
  revalidatePath("/recurring-pr");
  redirect(`/recurring-pr/${created.id}`);
}
```

Add create, update, pause, and resume wrappers in this task. Add the Retry wrapper in Task 6 after the worker function exists so every intermediate commit typechecks.

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- tests/recurring-pr.test.ts tests/pr-category-master.test.ts tests/auth-permissions.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

```bash
git add lib/recurring-pr.ts lib/pr-category-master.ts app/recurring-pr/actions.ts app/masters/pr-categories/actions.ts tests/recurring-pr.test.ts tests/pr-category-master.test.ts
git commit -m "Add recurring PR schedule service"
```

### Task 5: Build Separate Recurring PR UI And PR Connections

**Files:**
- Create: `tests/recurring-pr-page-copy.test.ts`
- Create: `components/recurring-pr/RecurringScheduleForm.tsx`
- Create: `components/recurring-pr/RecurringScheduleList.tsx`
- Create: `app/recurring-pr/page.tsx`
- Create: `app/recurring-pr/new/page.tsx`
- Create: `app/recurring-pr/[id]/page.tsx`
- Create: `app/recurring-pr/[id]/edit/page.tsx`
- Modify: `components/app/AppSidebar.tsx`
- Modify: `tests/app-sidebar-copy.test.ts`
- Modify: `app/pr/[id]/page.tsx`
- Modify: `components/pr/PRDetail.tsx`
- Modify: `lib/purchase-requests.ts`
- Modify: `tests/purchase-request-detail.test.ts`
- Modify: `tests/pr-detail-command-center.test.ts`
- Modify: `app/masters/pr-categories/page.tsx`
- Modify: `tests/pr-category-page-copy.test.ts`

**Interfaces:**
- Consumes schedule service/read models from Task 4 and `PRItemEditor` from Task 3.
- Produces `/recurring-pr`, `/recurring-pr/new?sourcePrId=...`, detail, and edit routes.
- Extends PR detail with recurring origin data and `canManageRecurring` UI capability.

- [ ] **Step 1: Write failing page/navigation source tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Recurring PR pages", () => {
  test("uses a separate operational module instead of a PR Documents tab", () => {
    const sidebar = readFileSync("components/app/AppSidebar.tsx", "utf8");
    const list = readFileSync("app/recurring-pr/page.tsx", "utf8");
    const prList = readFileSync("components/pr/PRList.tsx", "utf8");
    expect(sidebar).toContain('href: "/recurring-pr"');
    expect(list).toContain("Recurring PR");
    expect(list).toContain("Needs attention");
    expect(prList).not.toContain("Recurring Schedules");
  });
});
```

Extend PR detail source tests to require `Create Recurring Schedule` and recurring-origin copy. Extend Category Master page tests to require a named deactivation-impact confirmation state and affected schedule links.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/recurring-pr-page-copy.test.ts tests/app-sidebar-copy.test.ts tests/pr-detail-command-center.test.ts`

Expected: FAIL because routes/components/navigation do not exist.

- [ ] **Step 3: Build RecurringScheduleForm**

Use a dedicated page form with five sections:

1. Schedule name and responsible user
2. Renewal month/day and lead days
3. Company/Branch/Department/Division/Category/Purpose/Purchase Method/Remark snapshot
4. shared `PRItemEditor`
5. computed next-renewal and next-Draft preview

Use existing `Card`, `Field`, `Button`, and input classes. Do not use a modal. The form accepts `mode`, options, initial value, and server action.

- [ ] **Step 4: Build list and detail surfaces**

List summary counts: Active, Upcoming, Needs attention, Paused. Filters: q, status, category, responsible user, upcoming range. Table columns: Schedule, Category, Renewal, Lead, Responsible, Next Draft, Last Run, Status, Actions. Keep actions compact and preserve a desktop-safe action column.

Detail shows configuration, source PR, next action, generated Draft link, and run history. Failed runs show sanitized error and Retry only when `canManage` is true.

When `/masters/pr-categories?deactivate={categoryId}` is present, show an inline confirmation panel that names every affected active schedule and links to each detail page. If none are affected, state that explicitly. The confirm form posts the category id and intended inactive state; Cancel removes the query parameter without changing data.

- [ ] **Step 5: Guard create/edit pages and actions**

Call `requirePermission("PR_RECURRING_MANAGE")` in the new/edit page loaders as well as mutations. The list/detail pages require only authentication. Direct URLs must not reveal an editable form to IT_USER or VIEWER.

- [ ] **Step 6: Add sidebar and PR Detail links**

Add `CalendarClock` Recurring PR immediately after PR Documents. `/recurring-pr` must not mark PR Documents active.

In `app/pr/[id]/page.tsx`, obtain current user and compute:

```ts
const canManageRecurring = hasPermission(user.role, "PR_RECURRING_MANAGE");
```

Pass it to PRDetail. Add `Create Recurring Schedule` to Review & files when allowed. If the PR came from a recurring run, show a `Recurring` badge and link to `/recurring-pr/{scheduleId}`.

- [ ] **Step 7: Run focused tests and typecheck**

Run: `npm test -- tests/recurring-pr-page-copy.test.ts tests/pr-category-page-copy.test.ts tests/app-sidebar-copy.test.ts tests/purchase-request-detail.test.ts tests/pr-detail-command-center.test.ts tests/auth-route-access.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 8: Commit the UI unit**

```bash
git add components/recurring-pr app/recurring-pr components/app/AppSidebar.tsx app/pr/[id]/page.tsx components/pr/PRDetail.tsx lib/purchase-requests.ts app/masters/pr-categories/page.tsx tests/recurring-pr-page-copy.test.ts tests/pr-category-page-copy.test.ts tests/app-sidebar-copy.test.ts tests/purchase-request-detail.test.ts tests/pr-detail-command-center.test.ts
git commit -m "Add recurring PR schedule workspace"
```

### Task 6: Implement Idempotent Worker And Manual Retry

**Files:**
- Create: `tests/recurring-pr-worker.test.ts`
- Create: `lib/recurring-pr-worker.ts`
- Modify: `app/recurring-pr/actions.ts`
- Modify: `lib/recurring-pr.ts`

**Interfaces:**
- Produces `RecurringWorkerResult`, `RecurringWorkerSummary`, `RecurringWorkerRepository`, `processRecurringPrSchedules(args)`, `processRecurringScheduleOccurrence(scheduleId, today, mode)`, and `retryRecurringPurchaseRequestRun(runId)`.
- Consumes `buildDraftCreateData`/`calculateDraftTotals` from `lib/pr-draft.ts` and `reserveDraftBudget`/`buildBudgetReference` from Budget tracking.

- [ ] **Step 1: Write failing pure worker orchestration tests**

```ts
import { expect, test } from "vitest";
import { processRecurringPrSchedules } from "../lib/recurring-pr-worker";

test("continues after a failed schedule and returns an auditable summary", async () => {
  const outcomes = new Map([["sched_1", "CREATED"], ["sched_2", "FAILED"], ["sched_3", "SKIPPED"]] as const);
  const summary = await processRecurringPrSchedules({
    now: new Date("2026-07-15T01:00:00.000Z"),
    repository: {
      findDueScheduleIds: async () => [...outcomes.keys()],
      processOccurrence: async (id) => ({ outcome: outcomes.get(id)!, scheduleId: id }),
    },
  });

  expect(summary).toMatchObject({ created: 1, failed: 1, skipped: 1, total: 3 });
});
```

Add tests that `buildRecurringDraftInput` preserves HEADING/ITEM/DETAIL, assigns responsible user through context, uses today for document date, renewal date for required date, and carries category.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/recurring-pr-worker.test.ts`

Expected: FAIL because worker module does not exist.

- [ ] **Step 3: Implement injectable worker orchestration**

```ts
export type RecurringWorkerOutcome = "CREATED" | "FAILED" | "SKIPPED";
export type RecurringWorkerResult = { outcome: RecurringWorkerOutcome; scheduleId: string; runId?: string; draftId?: string; error?: string };
export type RecurringWorkerRepository = {
  findDueScheduleIds(today: Date): Promise<string[]>;
  processOccurrence(scheduleId: string, today: Date): Promise<RecurringWorkerResult>;
};

export async function processRecurringPrSchedules({ now = new Date(), repository = prismaRecurringWorkerRepository }: {
  now?: Date;
  repository?: RecurringWorkerRepository;
} = {}) {
  const today = bangkokDateOnlyToUtcDate(toBangkokDateOnly(now));
  const ids = await repository.findDueScheduleIds(today);
  const results: RecurringWorkerResult[] = [];
  for (const id of ids) {
    try {
      results.push(await repository.processOccurrence(id, today));
    } catch (error) {
      results.push({ outcome: "FAILED", scheduleId: id, error: sanitizeRecurringError(error) });
    }
  }
  return summarizeRecurringWorkerResults(results);
}
```

The default repository queries active schedules with `nextRunDate <= today` in stable nextRunDate/id order.

- [ ] **Step 4: Implement occurrence processing and idempotency**

For cron mode:

1. Load schedule/items/references and occurrence year from `nextRunDate` plus annual rules.
2. If an annual run already exists in any status, return `SKIPPED`. A FAILED run waits for manual Retry.
3. Validate active references and item snapshot. If invalid, create one FAILED run, set `lastRunAt`, write System audit, and return `FAILED`.
4. In one Prisma transaction, create PROCESSING run, create DRAFT using `buildDraftCreateData`, reserve soft Budget, update run SUCCEEDED with Draft id, update schedule `lastRunAt` and next annual date, and write System audits.
5. Catch Prisma `P2002` on annual run creation and return `SKIPPED`.
6. Let unexpected transaction errors roll back so a future cron invocation can retry.

The Draft audit uses `actorId: null`, while the Draft `createdById` is `schedule.responsibleUserId`.

- [ ] **Step 5: Implement safe validation failure persistence**

`sanitizeRecurringError(error)` returns known validation messages and otherwise `Recurring PR processing failed`. It must never include SQL connection values, stack traces, Prisma query text, or environment variables.

Write failed-run metadata with schedule id, occurrence year, renewal date, scheduled Draft date, responsible user id, and safe error only.

- [ ] **Step 6: Implement manual Retry**

`retryRecurringPurchaseRequestRun(runId)`:

- calls `requirePermission("PR_RECURRING_MANAGE")`
- accepts only a FAILED run without a linked Draft
- revalidates the current schedule snapshot/references
- changes the same run to PROCESSING inside the Draft transaction
- creates at most one Draft and then marks the same run SUCCEEDED
- writes `Recurring run retried` plus automated Draft audit metadata
- returns the Draft id for redirect

Wire `retryRecurringRunAction` into `app/recurring-pr/actions.ts` and revalidate schedule/list/PR paths.

- [ ] **Step 7: Assert the worker does not render or issue**

Add a source contract test:

```ts
const source = readFileSync("lib/recurring-pr-worker.ts", "utf8");
expect(source).not.toContain("renderTemplateWithCarbone");
expect(source).not.toContain("generatePurchaseRequestPdf");
expect(source).not.toContain("allocateRunningNumber");
expect(source).toContain('status: "DRAFT"');
```

- [ ] **Step 8: Run focused tests and commit**

Run: `npm test -- tests/recurring-pr-worker.test.ts tests/budget-tracking.test.ts tests/pr-draft.test.ts tests/auth-permissions.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit code 0.

```bash
git add lib/recurring-pr-worker.ts lib/recurring-pr.ts app/recurring-pr/actions.ts tests/recurring-pr-worker.test.ts
git commit -m "Add idempotent recurring PR worker"
```

### Task 7: Add Worker CLI, Ubuntu Cron, And Operational Logging

**Files:**
- Create: `tests/recurring-pr-cli-copy.test.ts`
- Create: `scripts/process-recurring-pr.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md`
- Modify: `docs/OPERATIONS_RUNBOOK.md`
- Modify: `docs/RETENTION_POLICY.md`

**Interfaces:**
- Produces `npm run recurring-pr:process`.
- Produces a cron command that runs from `/var/www/it-pr-dms/current` and logs to `/var/log/it-pr-dms/recurring-pr.log`.

- [ ] **Step 1: Write failing CLI/deployment source tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("recurring PR CLI deployment", () => {
  test("provides a private local worker command and Ubuntu cron runbook", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const cli = readFileSync("scripts/process-recurring-pr.ts", "utf8");
    const deployment = readFileSync("docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md", "utf8");
    expect(pkg.scripts["recurring-pr:process"]).toBe("tsx scripts/process-recurring-pr.ts");
    expect(cli).toContain("processRecurringPrSchedules");
    expect(cli).toContain("prisma.$disconnect");
    expect(deployment).toContain("CRON_TZ=Asia/Bangkok");
    expect(deployment).toContain("recurring-pr:process");
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/recurring-pr-cli-copy.test.ts`

Expected: FAIL because CLI/script/docs do not exist.

- [ ] **Step 3: Install the runtime and add package command**

Run: `npm install tsx`

Expected: `tsx` added to dependencies and lockfile updated.

Add:

```json
"recurring-pr:process": "tsx scripts/process-recurring-pr.ts"
```

to package scripts.

- [ ] **Step 4: Implement the CLI entrypoint**

```ts
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { processRecurringPrSchedules } from "../lib/recurring-pr-worker";

try {
  const summary = await processRecurringPrSchedules();
  console.log(JSON.stringify({ ok: summary.failed === 0, ...summary }));
  if (summary.failed > 0) process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: "Recurring PR worker failed" }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
```

Do not print raw error objects or environment values.

- [ ] **Step 5: Document Ubuntu cron and log rotation**

Add an example owned by the application service user:

```cron
CRON_TZ=Asia/Bangkok
0 1 * * * cd /var/www/it-pr-dms/current && /usr/bin/flock -n /var/lock/it-pr-dms-recurring.lock /usr/bin/npm run recurring-pr:process >> /var/log/it-pr-dms/recurring-pr.log 2>&1
```

Document manual run, lock behavior, expected JSON summary, exit codes 0/1/2, disabling during maintenance, catch-up after downtime, and logrotate retention. Add no new public nginx route.

- [ ] **Step 6: Run focused tests and a dry manual command**

Run: `npm test -- tests/recurring-pr-cli-copy.test.ts tests/phase5-hardening-docs.test.ts`

Expected: all selected tests PASS.

Run: `npm run recurring-pr:process`

Expected: JSON summary. With no due schedules, `total`, `created`, `failed`, and `skipped` are zero and exit code is 0.

- [ ] **Step 7: Commit the worker operations unit**

```bash
git add package.json package-lock.json scripts/process-recurring-pr.ts .env.example docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md docs/OPERATIONS_RUNBOOK.md docs/RETENTION_POLICY.md tests/recurring-pr-cli-copy.test.ts
git commit -m "Add recurring PR cron worker command"
```

### Task 8: Apply Migration, Complete Documentation, And Verify End To End

**Files:**
- Create: `docs/RECURRING_PR.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/README.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/BACKEND_INTEGRATION.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/QA_CHECKLIST.md`
- Modify: `docs/PHASE_2_STATUS.md` only if it remains the repository's active implementation ledger.

**Interfaces:**
- Produces migrated schedule tables and an operator-ready annual recurring workflow.
- Produces final user/developer/operations documentation.

- [ ] **Step 1: Apply migration to the configured development SQL Server instance**

Run: `npx prisma migrate deploy`

Expected: migration `000010_annual_recurring_pr` applied successfully.

Run: `npm run prisma:generate`

Expected: Prisma Client generated successfully.

- [ ] **Step 2: Write the focused recurring documentation**

`docs/RECURRING_PR.md` must document:

- annual-only rule and lead-day calculation
- create-from-PR snapshot inclusions/exclusions
- responsible user behavior
- Active/Paused/Needs attention states
- Draft-only worker boundary
- unique schedule/year idempotency
- catch-up, validation failure, and manual Retry
- System audit actor
- Ubuntu cron command, logs, and safe manual execution
- no external notifications in this phase

Link it from `docs/README.md` and summarize ownership/file paths in `DEVELOPER_HANDOFF.md`.

- [ ] **Step 3: Update all behavior documentation**

Update schema relations in DATA_MODEL, worker flow in ARCHITECTURE/BACKEND_INTEGRATION, feature status in FEATURES, and executable acceptance cases in QA_CHECKLIST. Ensure deployment/operations edits from Task 7 agree with the final CLI behavior and exit codes.

- [ ] **Step 4: Run the full automated verification suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npx prisma validate`

Expected: schema valid.

Run: `npm run build`

Expected: production build succeeds.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 5: Run concurrency and catch-up integration smoke tests**

Against the development database:

1. Create an active schedule due today.
2. Run two `npm run recurring-pr:process` commands concurrently.
3. Confirm exactly one run row and one Draft exist for the schedule/year.
4. Create a due schedule with an inactive responsible user and run the worker.
5. Confirm one FAILED run, no Draft, Needs attention UI, and System audit.
6. Reactivate/change the user, click Retry, and confirm the same run becomes SUCCEEDED with one Draft.
7. Set a schedule due yesterday, run the worker, and confirm catch-up creates the Draft.

- [ ] **Step 6: Run manual browser QA**

Verify desktop and mobile:

- Recurring PR is a separate sidebar item and does not activate PR Documents.
- Schedule can be created only from a source PR by ADMIN/IT_ADMIN.
- IT_USER can view but cannot edit/pause/retry.
- Form shows exact next Draft and renewal dates before Save.
- Heading/Item/Detail rows survive schedule save and generated Draft creation.
- Active, Upcoming, Paused, Needs attention, empty, and run-history states are readable.
- Generated Draft shows Recurring badge and links to schedule; schedule links back to Draft.
- Category deactivation names affected active schedules before confirmation; confirming makes those schedules show Needs attention.
- No overlapping labels, clipped mixed Thai/English text, or unexpected page-level horizontal scroll.

- [ ] **Step 7: Commit final documentation and QA evidence**

```bash
git add docs/RECURRING_PR.md DEVELOPER_HANDOFF.md docs/README.md docs/FEATURES.md docs/DATA_MODEL.md docs/BACKEND_INTEGRATION.md docs/ARCHITECTURE.md docs/QA_CHECKLIST.md docs/PHASE_2_STATUS.md
git commit -m "Document annual recurring PR operations"
```
