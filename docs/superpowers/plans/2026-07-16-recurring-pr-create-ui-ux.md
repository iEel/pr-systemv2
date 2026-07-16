# Recurring PR Create UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the create-recurring-PR screen into a clear single-page review flow with source context, sticky readiness and date feedback, localized month names, and accessible item controls without changing recurring schedule behavior.

**Architecture:** Keep the existing server action and data model. Add small pure presentation helpers for readiness, Draft timing, and breadcrumbs; extend the schedule form value with a display-only source label; then compose the existing UI primitives into a two-column responsive form. Shared PR item controls gain row-specific accessible names without changing field names or submitted values.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS 3, Vitest 4, Lucide React.

## Global Constraints

- Preserve the existing `createRecurringScheduleAction`, `updateRecurringScheduleAction`, validation rules, worker behavior, and database schema.
- Reuse `SectionHeader`, `Card`, `Badge`, `Field`, `Button`, and `PRItemEditor`.
- Keep the page single-step; do not add a modal or wizard.
- Do not create a recurring schedule during browser verification.
- Preserve the user's unrelated `next-env.d.ts` working-tree change.
- Use Asia/Bangkok date-only comparisons for Draft timing copy.

---

### Task 1: Add testable readiness and Draft-timing helpers

**Files:**
- Modify: `lib/recurring-pr-form.ts`
- Modify: `tests/recurring-pr-form-behavior.test.ts`

**Interfaces:**
- Produces: `getRecurringScheduleReadiness(input): { ready: boolean; missing: string[] }`
- Produces: `getRecurringDraftTimingState(scheduledDraftDate, today): "upcoming" | "dueToday" | "overdue"`
- Produces: `thaiMonthOptions: ReadonlyArray<{ label: string; value: number }>`

- [ ] **Step 1: Write failing helper tests**

Add imports and focused tests:

```ts
import {
  getRecurringDraftTimingState,
  getRecurringScheduleReadiness,
  resetDivisionForDepartmentChange,
  thaiMonthOptions,
} from "../lib/recurring-pr-form";

test("lists incomplete schedule requirements in stable order", () => {
  expect(getRecurringScheduleReadiness({
    categoryId: "",
    name: " ",
    previewValid: false,
    responsibleUserId: "",
  })).toEqual({
    ready: false,
    missing: ["Schedule name", "Responsible user", "PR category", "Valid renewal date"],
  });
});

test("marks a complete valid schedule as ready", () => {
  expect(getRecurringScheduleReadiness({
    categoryId: "cat_1",
    name: "Annual infrastructure renewal",
    previewValid: true,
    responsibleUserId: "user_1",
  })).toEqual({ ready: true, missing: [] });
});

test("classifies Draft timing against the Bangkok date", () => {
  expect(getRecurringDraftTimingState(new Date("2026-07-17T00:00:00.000Z"), "2026-07-16")).toBe("upcoming");
  expect(getRecurringDraftTimingState(new Date("2026-07-16T00:00:00.000Z"), "2026-07-16")).toBe("dueToday");
  expect(getRecurringDraftTimingState(new Date("2026-06-16T00:00:00.000Z"), "2026-07-16")).toBe("overdue");
});

test("provides all twelve localized month options", () => {
  expect(thaiMonthOptions).toHaveLength(12);
  expect(thaiMonthOptions[0]).toEqual({ label: "มกราคม", value: 1 });
  expect(thaiMonthOptions[11]).toEqual({ label: "ธันวาคม", value: 12 });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- tests/recurring-pr-form-behavior.test.ts`

Expected: FAIL because the three new exports do not exist.

- [ ] **Step 3: Implement the pure helpers**

Add to `lib/recurring-pr-form.ts`:

```ts
export type RecurringScheduleReadinessInput = {
  categoryId: string;
  name: string;
  previewValid: boolean;
  responsibleUserId: string;
};

export const thaiMonthOptions: ReadonlyArray<{ label: string; value: number }> = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
].map((label, index) => ({ label, value: index + 1 }));

export function getRecurringScheduleReadiness(input: RecurringScheduleReadinessInput) {
  const missing = [
    !input.name.trim() ? "Schedule name" : null,
    !input.responsibleUserId ? "Responsible user" : null,
    !input.categoryId ? "PR category" : null,
    !input.previewValid ? "Valid renewal date" : null,
  ].filter((item): item is string => Boolean(item));
  return { ready: missing.length === 0, missing };
}

export function getRecurringDraftTimingState(scheduledDraftDate: Date, today: string) {
  const scheduled = scheduledDraftDate.toISOString().slice(0, 10);
  return scheduled === today ? "dueToday" : scheduled < today ? "overdue" : "upcoming";
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/recurring-pr-form-behavior.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the helper cycle**

```powershell
git add lib/recurring-pr-form.ts tests/recurring-pr-form-behavior.test.ts
git commit -m "feat: add recurring schedule UI state helpers"
```

### Task 2: Carry the source PR label into create and edit forms

**Files:**
- Modify: `lib/recurring-pr.ts`
- Modify: `tests/recurring-pr.test.ts`

**Interfaces:**
- Changes: `RecurringScheduleFormValue` gains `sourcePurchaseRequestLabel: string`
- Consumes: `PurchaseRequest.prNo` and the existing schedule `sourcePurchaseRequest` relation

- [ ] **Step 1: Update the source-mapping expectation first**

In the existing `maps only editable source PR snapshot data in item order` test, add:

```ts
sourcePurchaseRequestLabel: "PR-2026-0001",
```

Add a fallback test:

```ts
test("uses Draft pending when a source PR has no number", () => {
  const value = mapSourcePrToScheduleForm(
    {
      id: "pr_draft",
      prNo: null,
      branchId: "br_hq",
      categoryId: "cat_renewal",
      departmentId: "dep_it",
      divisionId: null,
      purpose: "Renew",
      purchaseMethod: "Procurement",
      remark: null,
      items: [],
    },
    { leadDays: 30, renewalDay: 15, renewalMonth: 1 },
  );
  expect(value.sourcePurchaseRequestLabel).toBe("Draft pending");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/recurring-pr.test.ts`

Expected: FAIL because `sourcePurchaseRequestLabel` is missing.

- [ ] **Step 3: Implement the display-only label**

Update the types and mappings:

```ts
export type RecurringScheduleFormValue = Omit<RecurringScheduleInput, "items"> & {
  sourcePurchaseRequestLabel: string;
  items: Array<{
    rowType: DraftLineItemRowType;
    accountCode: string;
    description: string;
    quantity: number;
    unitCost: number;
  }>;
};

type RecurringScheduleSourceRecord = {
  [key: string]: unknown;
  id: string;
  prNo?: string | null;
  branchId: string;
  categoryId: string | null;
  departmentId: string;
  divisionId: string | null;
  purpose: string;
  purchaseMethod: string;
  remark: string | null;
  items: Array<{
    lineNo: number;
    rowType?: string | null;
    accountCode: string;
    description: string;
    quantity: NumericValue;
    unitCost: NumericValue;
  }>;
};
```

Add `sourcePurchaseRequestLabel: record.prNo || "Draft pending"` in `mapSourcePrToScheduleForm`. In `getRecurringScheduleDetail`, add:

```ts
sourcePurchaseRequestLabel: record.sourcePurchaseRequest?.prNo || "Draft pending",
```

Keep `sourcePurchaseRequestId` unchanged.

- [ ] **Step 4: Run the focused test and typecheck**

Run: `npm test -- tests/recurring-pr.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS after all `RecurringScheduleFormValue` producers include the label.

- [ ] **Step 5: Commit the mapping cycle**

```powershell
git add lib/recurring-pr.ts tests/recurring-pr.test.ts
git commit -m "feat: expose recurring schedule source PR label"
```

### Task 3: Make breadcrumb labels route-aware

**Files:**
- Create: `lib/breadcrumbs.ts`
- Create: `tests/breadcrumbs.test.ts`
- Modify: `components/app/Breadcrumbs.tsx`

**Interfaces:**
- Produces: `getBreadcrumbLabel(segments: string[], index: number): string`
- Consumes: pathname segments from `Breadcrumbs`

- [ ] **Step 1: Write the route-label tests**

```ts
import { describe, expect, test } from "vitest";
import { getBreadcrumbLabel } from "../lib/breadcrumbs";

describe("breadcrumb labels", () => {
  test("labels recurring creation as Create Schedule", () => {
    expect(getBreadcrumbLabel(["recurring-pr", "new"], 0)).toBe("Recurring PR");
    expect(getBreadcrumbLabel(["recurring-pr", "new"], 1)).toBe("Create Schedule");
  });

  test("keeps the standard PR creation label", () => {
    expect(getBreadcrumbLabel(["pr", "new"], 1)).toBe("Create PR");
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/breadcrumbs.test.ts`

Expected: FAIL because `lib/breadcrumbs.ts` does not exist.

- [ ] **Step 3: Extract breadcrumb labeling**

Create `lib/breadcrumbs.ts` with:

```ts
const labels: Record<string, string> = {
  dashboard: "Dashboard",
  pr: "PR Documents",
  "recurring-pr": "Recurring PR",
  templates: "Templates",
  reports: "Reports",
  masters: "Master Data",
  companies: "Company / Branch Master",
  budgets: "Budget IT",
  "pr-categories": "PR Categories",
  settings: "Settings",
  users: "Users / Roles",
  "running-numbers": "Running Number Settings",
  "audit-logs": "Audit Logs",
  "upload-signed": "Upload Signed Document",
};

export function getBreadcrumbLabel(segments: string[], index: number) {
  const segment = segments[index];
  if (segment === "new") return segments[index - 1] === "recurring-pr" ? "Create Schedule" : "Create PR";
  if (segment === "edit") return segments[index - 2] === "recurring-pr" ? "Edit Schedule" : "Edit PR";
  return labels[segment] ?? (segment.startsWith("pr-") ? "PR Detail" : segment);
}
```

Import and call the helper from `Breadcrumbs.tsx` instead of indexing its local `labels` object.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- tests/breadcrumbs.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the breadcrumb cycle**

```powershell
git add lib/breadcrumbs.ts tests/breadcrumbs.test.ts components/app/Breadcrumbs.tsx
git commit -m "fix: label recurring schedule breadcrumbs clearly"
```

### Task 4: Give every PR item control a unique accessible name

**Files:**
- Modify: `components/pr/PRItemEditor.tsx`
- Modify: `tests/recurring-pr-form-behavior.test.ts`

**Interfaces:**
- Changes: all row type, account code, description, quantity, and unit-cost controls receive row-specific `aria-label` values
- Preserves: `PRItemEditorProps`, form field names, visible headers, and submitted values

- [ ] **Step 1: Add a failing source-contract test**

```ts
test("gives every editable item control a row-specific accessible name", () => {
  const source = readFileSync("components/pr/PRItemEditor.tsx", "utf8");
  for (const label of ["type", "account code", "description", "quantity", "unit cost"]) {
    expect(source).toContain(`aria-label={\`Row \${index + 1} ${label}\`}`);
  }
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/recurring-pr-form-behavior.test.ts`

Expected: FAIL because those labels are absent.

- [ ] **Step 3: Add the labels to the existing controls**

For each row control, add exactly:

```tsx
aria-label={`Row ${index + 1} type`}
aria-label={`Row ${index + 1} account code`}
aria-label={`Row ${index + 1} description`}
aria-label={`Row ${index + 1} quantity`}
aria-label={`Row ${index + 1} unit cost`}
```

Do not change field names, read-only behavior, or values.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- tests/recurring-pr-form-behavior.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the accessibility cycle**

```powershell
git add components/pr/PRItemEditor.tsx tests/recurring-pr-form-behavior.test.ts
git commit -m "fix: label editable PR item controls"
```

### Task 5: Recompose the recurring schedule form and sticky summary

**Files:**
- Modify: `components/recurring-pr/RecurringScheduleForm.tsx`
- Modify: `tests/recurring-pr-page-copy.test.ts`
- Modify: `tests/recurring-pr-form-behavior.test.ts`

**Interfaces:**
- Consumes: `getRecurringScheduleReadiness`, `getRecurringDraftTimingState`, `thaiMonthOptions`, `sourcePurchaseRequestLabel`
- Preserves: form action, field names, server errors, dependent division reset, and create/edit modes

- [ ] **Step 1: Replace old copy assertions with the approved UI contract**

Update the form source assertions to require:

```ts
for (const text of [
  "Create Recurring PR Schedule / สร้างกำหนดการ PR ประจำปี",
  "Schedule details",
  "Annual renewal rule",
  "PR snapshot",
  "Ready to create",
  "Complete",
  "Due immediately",
  "Back to source PR",
]) expect(form).toContain(text);

expect(form).toContain("SectionHeader");
expect(form).toContain("sourcePurchaseRequestLabel");
expect(form).toContain("xl:grid-cols-[minmax(0,1fr)_22rem]");
expect(form).toContain("xl:sticky xl:top-20 xl:self-start");
expect(form).toContain("disabled={!readiness.ready || isPending}");
expect(form).toContain("thaiMonthOptions.map");
```

Retain assertions for `PRItemEditor`, server errors, `aria-invalid`, and division reset.

- [ ] **Step 2: Run both form suites and verify RED**

Run: `npm test -- tests/recurring-pr-page-copy.test.ts tests/recurring-pr-form-behavior.test.ts`

Expected: FAIL on the new header, layout, readiness, and timing contracts.

- [ ] **Step 3: Add controlled readiness inputs**

In `RecurringScheduleForm`, add state for `name`, `responsibleUserId`, and `categoryId`, calculate `today`, `preview`, `timingState`, `readiness`, and the selected responsible-user label:

```ts
const today = toBangkokDateOnly(new Date());
const [name, setName] = useState(initialValue.name);
const [responsibleUserId, setResponsibleUserId] = useState(initialValue.responsibleUserId);
const [categoryId, setCategoryId] = useState(initialValue.categoryId);
const preview = getRenewalPreview({ leadDays, renewalDay, renewalMonth, today });
const readiness = getRecurringScheduleReadiness({
  categoryId,
  name,
  previewValid: preview.valid,
  responsibleUserId,
});
const timingState = preview.valid ? getRecurringDraftTimingState(preview.occurrence.scheduledDraftDate, today) : null;
const responsibleUserLabel = options.responsibleUsers.find((user) => user.id === responsibleUserId)?.label || "Not selected";
```

Use controlled `value` and `onChange` props on those three controls while preserving their names and errors.

- [ ] **Step 4: Add page header and source banner**

Import `SectionHeader`, `Badge`, `CalendarClock`, and `Save`. Render before the two-column content:

```tsx
<SectionHeader
  action={<Badge tone="neutral">{mode === "create" ? "Schedule setup" : "Editing schedule"}</Badge>}
  description="กำหนดวันต่ออายุ ผู้รับผิดชอบ และข้อมูลที่จะใช้สร้าง Draft ในแต่ละปี"
  title={mode === "create" ? "Create Recurring PR Schedule / สร้างกำหนดการ PR ประจำปี" : "Edit Recurring PR Schedule / แก้ไขกำหนดการ PR ประจำปี"}
/>
{mode === "create" ? (
  <Card className="border-blue-200 bg-blue-50/80">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-bold text-blue-950">Source PR: {initialValue.sourcePurchaseRequestLabel}</div>
        <p className="mt-1 text-sm leading-6 text-blue-800">การแก้ไข Schedule นี้ไม่เปลี่ยน PR ต้นทาง และไม่คัดลอกเลข PR, ไฟล์แนบ, PDF, signed file หรือ audit history</p>
      </div>
      <Badge tone="info">Review copied data</Badge>
    </div>
  </Card>
) : null}
```

- [ ] **Step 5: Build the responsive main/summary layout**

Open the responsive wrapper with these exact tags, then move the existing schedule-details, annual-rule, PR-snapshot, and `PRItemEditor` blocks inside the inner `div`:

```tsx
<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
  <div className="min-w-0 space-y-5">
```

After the existing `PRItemEditor` block, close the main column and open the summary column with:

```tsx
  </div>
  <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
```

Place the `Card` from Step 6 inside the `aside`, then close `aside` and the outer grid `div`.

Rename section headings to `Schedule details`, `Annual renewal rule`, and `PR snapshot`. Render month options with `thaiMonthOptions.map(({ label, value }) => ...)`.

- [ ] **Step 6: Build readiness and timing feedback in the summary card**

Use a single `Card` that renders:

```tsx
<Badge tone={readiness.ready ? "success" : "warning"}>
  {readiness.ready ? "Ready to create" : `Complete ${readiness.missing.length} required fields`}
</Badge>
{!readiness.ready ? <ul>{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul> : null}
```

For valid preview states, render Renewal plus:

```tsx
{timingState === "overdue" ? "Due immediately" : timingState === "dueToday" ? "Due today" : "Next Draft"}
```

Include explanatory catch-up copy for `overdue` and next-run copy for `dueToday`. Render the selected responsible-user label. Move the primary and secondary actions into the card; use `className="w-full"` and `disabled={!readiness.ready || isPending}` on the submit button. Use `Back to source PR` only in create mode.

- [ ] **Step 7: Run focused tests and typecheck**

Run: `npm test -- tests/recurring-pr-page-copy.test.ts tests/recurring-pr-form-behavior.test.ts tests/recurring-pr.test.ts tests/breadcrumbs.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit the form redesign**

```powershell
git add components/recurring-pr/RecurringScheduleForm.tsx tests/recurring-pr-page-copy.test.ts tests/recurring-pr-form-behavior.test.ts
git commit -m "feat: redesign recurring schedule creation flow"
```

### Task 6: Full verification and browser QA

**Files:**
- Modify only if verification exposes an in-scope defect in files from Tasks 1–5
- Save screenshots outside the Git worktree in the current Codex visualization folder

**Interfaces:**
- Verifies: all acceptance criteria from `docs/superpowers/specs/2026-07-16-recurring-pr-create-ui-ux-design.md`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all Vitest suites pass with zero failures.

- [ ] **Step 2: Run static and production verification**

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0 and a successful Next.js production build.

- [ ] **Step 3: Check the patch and unrelated changes**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: the pre-existing `next-env.d.ts` change remains untouched; only intentional task files are committed or modified.

- [ ] **Step 4: Verify the desktop flow in the user-selected Chrome tab**

Reload `http://localhost:3000/recurring-pr/new?sourcePrId=cmqza65qj001pt9pwxyp7uw96`, capture and inspect screenshots, and verify:

- one visible page title and source PR banner;
- desktop two-column layout with sticky summary;
- initial missing-field list and disabled Create button;
- Thai month label;
- `Due immediately` for the current past Draft date;
- no recurring schedule is submitted.

- [ ] **Step 5: Verify completed readiness without submitting**

Fill only the missing schedule name, responsible user, and category. Confirm the summary changes to `Ready to create` and the button becomes enabled. Do not press the submit button. Restore the tab to a safe non-submitted state if practical.

- [ ] **Step 6: Verify narrow responsive behavior and focus**

Use the browser viewport capability after reading its documentation. Verify a narrow viewport uses one column, the item table remains contained by horizontal scrolling, actions remain reachable, and keyboard Tab navigation shows a visible focus indicator on form controls and actions. Reset the viewport before finalizing the Chrome session.

- [ ] **Step 7: Final requirements check**

Re-read the design acceptance criteria and map each criterion to an automated test or inspected screenshot. If a criterion lacks evidence, gather it before reporting completion.

---

## Plan Self-Review

- Spec coverage: source context, layout, readiness, date states, localization, accessibility, responsiveness, non-goals, and verification are each assigned to a task.
- Scope: one bounded frontend workflow plus display-only data and breadcrumb helpers; no independent subsystem is included.
- Type consistency: `sourcePurchaseRequestLabel`, readiness helper names, timing-state literals, and month option shapes are consistent across producer, consumer, and tests.
- Placeholder scan: no implementation placeholders or deferred requirements remain.
