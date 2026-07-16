# Dashboard Budget Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auditable Dashboard Budget Planning view and six-sheet Excel export that combine qualifying actual PR spend with next-year Active Recurring PR commitments without double-counting recurring-origin actuals.

**Architecture:** Keep planning rules in a pure `lib/budget-planning.ts` domain module, Prisma loading in `lib/budget-planning.server.ts`, workbook mapping in `lib/budget-planning-workbook.ts`, and presentation in a focused Dashboard component. The page and export route consume the same server view model, so filters, totals, category rows, and detail rows reconcile exactly.

**Tech Stack:** Next.js 16 App Router, React 19 server components, TypeScript 5.7 strict mode, Prisma 6 with SQL Server, Tailwind CSS, Vitest 4, JSZip-backed XLSX builder.

## Global Constraints

- Actual Spend includes only `GENERATED`, `PRINTED`, and `SIGNED` Purchase Requests in the selected base year.
- Active Recurring Forecast includes only schedules with status `ACTIVE` and uses current item totals with no uplift percentage.
- `Planning Baseline = Non-recurring Actual + Active Recurring Forecast`.
- Recurring-origin actuals remain visible but are subtracted before forecast commitments are added.
- Base Year defaults to the current year; Forecast Year is always Base Year + 1.
- Filters are limited to Base Year, Company, and PR Category and remain encoded in the URL.
- UI and export must use one shared normalized view model and must not silently truncate records.
- Excel contains exactly six sheets: `Budget Plan Summary`, `By Category`, `Actual PR`, `Actual PR Items`, `Active Recurring`, and `Recurring Items`.
- No schema migration, editable planning scenarios, uplift configuration, or Recurring PR worker changes.
- Preserve the existing navy enterprise visual system, WCAG 2.2 AA contrast, keyboard-visible focus, and intentional horizontal table scrolling on narrow screens.

---

## File Structure

- Create `lib/budget-planning.ts`: input types, normalized filters, record contracts, aggregation, category grouping, URL builders, and forecast-date validation.
- Create `lib/budget-planning.server.ts`: complete Prisma queries, filter options, and the shared page/export data loader.
- Create `lib/budget-planning-workbook.ts`: deterministic six-sheet workbook mapping.
- Create `components/dashboard/BudgetPlanningView.tsx`: filters, summary strip, category table, methodology, empty states, and export action.
- Modify `app/dashboard/page.tsx`: URL-selected Overview/Budget Planning views and conditional data loading.
- Create `app/dashboard/budget-planning/export/route.ts`: authenticated XLSX response.
- Create `tests/budget-planning.test.ts`: pure rules and regression coverage.
- Create `tests/budget-planning-server.test.ts`: Prisma query scope and complete-loading coverage.
- Create `tests/budget-planning-workbook.test.ts`: workbook sheet/row reconciliation.
- Create `tests/budget-planning-page.test.ts`: Dashboard navigation and required UX copy.
- Create `tests/budget-planning-export-route.test.ts`: authentication, shared loader input, and response headers.

---

### Task 1: Pure Budget Planning Domain and Double-counting Rules

**Files:**
- Create: `lib/budget-planning.ts`
- Create: `tests/budget-planning.test.ts`

**Interfaces:**
- Consumes: database-like numeric values shaped as `string | number | { toString(): string }`.
- Produces: `normalizeBudgetPlanningFilters(input, now)`, `buildBudgetPlanningViewModel({ actualRecords, filters, recurringRecords })`, `buildBudgetPlanningHref(filters)`, `buildBudgetPlanningExportHref(filters)`, and `BudgetPlanningViewModel`.

- [ ] **Step 1: Write failing filter and URL tests**

```ts
import { describe, expect, test } from "vitest";
import {
  buildBudgetPlanningExportHref,
  buildBudgetPlanningHref,
  normalizeBudgetPlanningFilters,
} from "../lib/budget-planning";

describe("budget planning filters", () => {
  test("defaults invalid inputs and derives forecast year", () => {
    expect(normalizeBudgetPlanningFilters({ year: "broken" }, new Date("2026-07-16T00:00:00.000Z"))).toEqual({
      baseYear: 2026,
      forecastYear: 2027,
      companyId: "All",
      categoryId: "All",
    });
  });

  test("builds linkable planning and export URLs", () => {
    const filters = { baseYear: 2026, forecastYear: 2027, companyId: "co_1", categoryId: "cat_1" };
    expect(buildBudgetPlanningHref(filters)).toBe("/dashboard?view=planning&year=2026&companyId=co_1&categoryId=cat_1");
    expect(buildBudgetPlanningExportHref(filters)).toBe("/dashboard/budget-planning/export?year=2026&companyId=co_1&categoryId=cat_1");
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `npm test -- tests/budget-planning.test.ts`

Expected: FAIL because `../lib/budget-planning` does not exist.

- [ ] **Step 3: Add filter types, normalization, date range, and URL builders**

```ts
export type BudgetPlanningFiltersInput = {
  year?: string | number | null;
  companyId?: string | null;
  categoryId?: string | null;
};

export type NormalizedBudgetPlanningFilters = {
  baseYear: number;
  forecastYear: number;
  companyId: string;
  categoryId: string;
};

export function normalizeBudgetPlanningFilters(input: BudgetPlanningFiltersInput = {}, now = new Date()): NormalizedBudgetPlanningFilters {
  const candidate = Number(input.year);
  const baseYear = Number.isInteger(candidate) && candidate >= 2000 && candidate <= 2100 ? candidate : now.getFullYear();
  return {
    baseYear,
    forecastYear: baseYear + 1,
    companyId: input.companyId?.trim() || "All",
    categoryId: input.categoryId?.trim() || "All",
  };
}

export function buildBudgetPlanningDateRange(baseYear: number) {
  return { gte: new Date(Date.UTC(baseYear, 0, 1)), lt: new Date(Date.UTC(baseYear + 1, 0, 1)) };
}

function planningParams(filters: NormalizedBudgetPlanningFilters) {
  const params = new URLSearchParams({ view: "planning", year: String(filters.baseYear) });
  if (filters.companyId !== "All") params.set("companyId", filters.companyId);
  if (filters.categoryId !== "All") params.set("categoryId", filters.categoryId);
  return params;
}

export function buildBudgetPlanningHref(filters: NormalizedBudgetPlanningFilters) {
  return `/dashboard?${planningParams(filters).toString()}`;
}

export function buildBudgetPlanningExportHref(filters: NormalizedBudgetPlanningFilters) {
  const params = planningParams(filters);
  params.delete("view");
  return `/dashboard/budget-planning/export?${params.toString()}`;
}
```

- [ ] **Step 4: Run filter tests and verify they pass**

Run: `npm test -- tests/budget-planning.test.ts`

Expected: PASS for both filter tests.

- [ ] **Step 5: Add failing aggregation fixtures and assertions**

Add record contracts for category, organization, item, actual PR, and recurring schedule to the test fixture, then assert this regression case:

```ts
test("excludes invalid statuses and avoids double-counting recurring-origin actuals", () => {
  const view = buildBudgetPlanningViewModel({
    filters: normalizeBudgetPlanningFilters({ year: 2026 }, new Date("2026-07-16T00:00:00.000Z")),
    actualRecords: [
      actual({ id: "pr_once", status: "GENERATED", totalAmount: "100", recurringRun: null }),
      actual({ id: "pr_recurring", status: "SIGNED", totalAmount: "40", recurringRun: { schedule: { id: "sch_1", name: "Annual license" } } }),
      actual({ id: "pr_draft", status: "DRAFT", totalAmount: "900", recurringRun: null }),
      actual({ id: "pr_cancelled", status: "CANCELLED", totalAmount: "800", recurringRun: null }),
    ],
    recurringRecords: [
      schedule({ id: "sch_1", status: "ACTIVE", items: [item({ totalAmount: "60" })] }),
      schedule({ id: "sch_paused", status: "PAUSED", items: [item({ totalAmount: "700" })] }),
    ],
  });

  expect(view.summary).toMatchObject({
    actualSpend: 140,
    recurringIncludedInActual: 40,
    nonRecurringActual: 100,
    activeRecurringForecast: 60,
    planningBaseline: 160,
    actualPrCount: 2,
    activeScheduleCount: 1,
  });
  expect(view.categoryRows[0]).toMatchObject({ planningBaseline: 160, actualPrCount: 2, activeScheduleCount: 1 });
});
```

The fixture helpers must return complete records with Category `SUBSCRIPTION / Subscription`, active Category state, Sonic company/branch, IT department, one priced item, and 2026 document dates. Add tests for Company/Category filtering, inactive Category retention, `Not categorized`, zero-value items, invalid renewal day, and category totals reconciling with Summary.

- [ ] **Step 6: Run the aggregation test and verify it fails**

Run: `npm test -- tests/budget-planning.test.ts`

Expected: FAIL because `buildBudgetPlanningViewModel` and record types are not implemented.

- [ ] **Step 7: Implement the view model**

Implement exported contracts and these stable output shapes:

```ts
export type BudgetPlanningSummary = {
  actualSpend: number;
  recurringIncludedInActual: number;
  nonRecurringActual: number;
  activeRecurringForecast: number;
  planningBaseline: number;
  actualPrCount: number;
  activeScheduleCount: number;
};

export type BudgetPlanningCategoryRow = BudgetPlanningSummary & {
  categoryId: string | null;
  categoryCode: string;
  categoryName: string;
  categoryIsActive: boolean;
};

export type BudgetPlanningViewModel = {
  filters: NormalizedBudgetPlanningFilters;
  summary: BudgetPlanningSummary;
  categoryRows: BudgetPlanningCategoryRow[];
  actualPrRows: BudgetPlanningActualPrRow[];
  actualItemRows: BudgetPlanningActualItemRow[];
  recurringScheduleRows: BudgetPlanningRecurringScheduleRow[];
  recurringItemRows: BudgetPlanningRecurringItemRow[];
};
```

Inside `buildBudgetPlanningViewModel`, independently enforce the approved status sets, base-year range, Company filter, and Category filter. For each qualifying actual PR, add its amount to Actual Spend and add it to Recurring Included in Actual only when `recurringRun` is non-null. For each Active schedule, sum current `items[].totalAmount` once. Calculate the baseline after both passes and sort Category rows by baseline descending, then Category name.

Use `Number(value)` with a finite-number guard and round every monetary accumulation to two decimals. Derive forecast renewal dates with `Date.UTC(forecastYear, renewalMonth - 1, renewalDay)` and retain a `renewalIssue` when the resulting month/day does not round-trip.

- [ ] **Step 8: Run the domain tests and verify all cases pass**

Run: `npm test -- tests/budget-planning.test.ts`

Expected: PASS for normalization, URLs, status rules, double-counting, filters, Category grouping, zero values, and forecast-date validation.

- [ ] **Step 9: Commit the domain layer**

```powershell
git add -- lib/budget-planning.ts tests/budget-planning.test.ts
git commit -m "feat: add budget planning calculations"
```

---

### Task 2: Complete Prisma Loader and Filter Options

**Files:**
- Create: `lib/budget-planning.server.ts`
- Create: `tests/budget-planning-server.test.ts`

**Interfaces:**
- Consumes: `BudgetPlanningFiltersInput`, `normalizeBudgetPlanningFilters`, and `buildBudgetPlanningViewModel` from Task 1.
- Produces: `getBudgetPlanningPageData(input): Promise<BudgetPlanningPageData>` where `BudgetPlanningPageData` extends the view model with `companies` and `categories` filter options.

- [ ] **Step 1: Write failing mocked-Prisma loader tests**

```ts
const mocks = vi.hoisted(() => ({
  purchaseRequestFindMany: vi.fn(),
  recurringScheduleFindMany: vi.fn(),
  companyFindMany: vi.fn(),
  categoryFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseRequest: { findMany: mocks.purchaseRequestFindMany },
    recurringPurchaseRequestSchedule: { findMany: mocks.recurringScheduleFindMany },
    company: { findMany: mocks.companyFindMany },
    purchaseRequestCategory: { findMany: mocks.categoryFindMany },
  },
}));

test("loads complete actual and active recurring detail without a take limit", async () => {
  await getBudgetPlanningPageData({ year: 2026, companyId: "co_1", categoryId: "cat_1" });
  expect(mocks.purchaseRequestFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ status: { in: ["GENERATED", "PRINTED", "SIGNED"] }, companyId: "co_1", categoryId: "cat_1" }),
    include: expect.objectContaining({ items: expect.anything(), recurringRun: expect.anything() }),
  }));
  expect(mocks.purchaseRequestFindMany.mock.calls[0][0]).not.toHaveProperty("take");
  expect(mocks.recurringScheduleFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ status: "ACTIVE", companyId: "co_1", categoryId: "cat_1" }),
    include: expect.objectContaining({ items: expect.anything(), responsibleUser: expect.anything() }),
  }));
  expect(mocks.recurringScheduleFindMany.mock.calls[0][0]).not.toHaveProperty("take");
});
```

Also test that inactive Categories returned from the option query are labeled `(Inactive)` and retained.

- [ ] **Step 2: Run the server test and verify the missing-module failure**

Run: `npm test -- tests/budget-planning-server.test.ts`

Expected: FAIL because `lib/budget-planning.server.ts` does not exist.

- [ ] **Step 3: Implement complete queries and shared loader**

Use Prisma `findMany` with no `take` property. Actual PR includes Category fields (`id`, `code`, `name`, `isActive`), Company, Branch, Department, Division, ordered Items, and recurring run Schedule identity. Active recurring includes the same organization fields, Category, responsible user, and ordered Items. Query all filter options in parallel.

```ts
export async function getBudgetPlanningPageData(input: BudgetPlanningFiltersInput = {}): Promise<BudgetPlanningPageData> {
  const filters = normalizeBudgetPlanningFilters(input);
  const range = buildBudgetPlanningDateRange(filters.baseYear);
  const [actualRecords, recurringRecords, companies, categories] = await Promise.all([
    prisma.purchaseRequest.findMany({
      include: actualInclude,
      orderBy: [{ categoryId: "asc" }, { documentDate: "asc" }, { createdAt: "asc" }],
      where: {
        documentDate: range,
        status: { in: ["GENERATED", "PRINTED", "SIGNED"] },
        ...(filters.companyId !== "All" ? { companyId: filters.companyId } : {}),
        ...(filters.categoryId !== "All" ? { categoryId: filters.categoryId } : {}),
      },
    }),
    prisma.recurringPurchaseRequestSchedule.findMany({
      include: recurringInclude,
      orderBy: [{ categoryId: "asc" }, { renewalMonth: "asc" }, { renewalDay: "asc" }, { name: "asc" }],
      where: {
        status: "ACTIVE",
        ...(filters.companyId !== "All" ? { companyId: filters.companyId } : {}),
        ...(filters.categoryId !== "All" ? { categoryId: filters.categoryId } : {}),
      },
    }),
    prisma.company.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true }, where: { isActive: true } }),
    prisma.purchaseRequestCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, code: true, name: true, isActive: true } }),
  ]);

  return {
    ...buildBudgetPlanningViewModel({ actualRecords, filters, recurringRecords }),
    companies: [{ label: "ทุกบริษัท", value: "All" }, ...companies.map(({ id, displayName }) => ({ label: displayName, value: id }))],
    categories: [{ label: "ทุกหมวดหมู่", value: "All" }, ...categories.map((category) => ({
      label: category.isActive ? `${category.code} - ${category.name}` : `${category.code} - ${category.name} (Inactive)`,
      value: category.id,
    }))],
  };
}
```

- [ ] **Step 4: Run domain and server tests**

Run: `npm test -- tests/budget-planning.test.ts tests/budget-planning-server.test.ts`

Expected: both files PASS; query arguments contain no `take` limit.

- [ ] **Step 5: Run typecheck and correct Prisma shape mismatches**

Run: `npm run typecheck`

Expected: exit 0 with no TypeScript errors.

- [ ] **Step 6: Commit the server loader**

```powershell
git add -- lib/budget-planning.server.ts tests/budget-planning-server.test.ts
git commit -m "feat: load budget planning data"
```

---

### Task 3: Deterministic Six-sheet Workbook Mapping

**Files:**
- Create: `lib/budget-planning-workbook.ts`
- Create: `tests/budget-planning-workbook.test.ts`

**Interfaces:**
- Consumes: `BudgetPlanningPageData` from Task 2 and `XlsxSheet` from `lib/xlsx.ts`.
- Produces: `buildBudgetPlanningWorkbookSheets(data, exportedAt): XlsxSheet[]`.

- [ ] **Step 1: Write the failing workbook structure test**

```ts
test("builds six auditable sheets with document and item joins", () => {
  const sheets = buildBudgetPlanningWorkbookSheets(pageData, new Date("2026-07-16T03:00:00.000Z"));
  expect(sheets.map((sheet) => sheet.name)).toEqual([
    "Budget Plan Summary",
    "By Category",
    "Actual PR",
    "Actual PR Items",
    "Active Recurring",
    "Recurring Items",
  ]);
  expect(sheets[0].rows).toContainEqual(["Planning Baseline Formula", "Non-recurring Actual + Active Recurring Forecast"]);
  expect(sheets[2].rows[1]).toContain("pr_1");
  expect(sheets[3].rows[1]).toContain("pr_1");
  expect(sheets[4].rows[1]).toContain("sch_1");
  expect(sheets[5].rows[1]).toContain("sch_1");
});

test("retains headers and an explanatory row for empty detail sheets", () => {
  const sheets = buildBudgetPlanningWorkbookSheets(emptyPageData, new Date("2026-07-16T03:00:00.000Z"));
  expect(sheets[2].rows).toEqual([actualPrHeaders, ["No qualifying Actual PRs for the selected filters"]]);
  expect(sheets[4].rows).toEqual([activeRecurringHeaders, ["No Active Recurring schedules for the selected filters"]]);
});
```

- [ ] **Step 2: Run the workbook test and verify the missing-module failure**

Run: `npm test -- tests/budget-planning-workbook.test.ts`

Expected: FAIL because the workbook mapper does not exist.

- [ ] **Step 3: Implement all six sheets in the approved order**

Define exported header arrays for stable tests. Summary begins with export metadata and includes all five amounts, status rules, and formula. Detail rows use Category-first sorting and preserve PR ID or Schedule ID as stable join keys.

```ts
function rowsOrMessage(headers: XlsxCell[], rows: XlsxCell[][], message: string): XlsxCell[][] {
  return [headers, ...(rows.length ? rows : [[message]])];
}

export function buildBudgetPlanningWorkbookSheets(data: BudgetPlanningPageData, exportedAt = new Date()): XlsxSheet[] {
  return [
    { name: "Budget Plan Summary", rows: buildSummaryRows(data, exportedAt) },
    { name: "By Category", rows: rowsOrMessage(categoryHeaders, data.categoryRows.map(mapCategoryRow), "No Category totals for the selected filters") },
    { name: "Actual PR", rows: rowsOrMessage(actualPrHeaders, data.actualPrRows.map(mapActualPrRow), "No qualifying Actual PRs for the selected filters") },
    { name: "Actual PR Items", rows: rowsOrMessage(actualItemHeaders, data.actualItemRows.map(mapActualItemRow), "No qualifying Actual PR Items for the selected filters") },
    { name: "Active Recurring", rows: rowsOrMessage(activeRecurringHeaders, data.recurringScheduleRows.map(mapRecurringRow), "No Active Recurring schedules for the selected filters") },
    { name: "Recurring Items", rows: rowsOrMessage(recurringItemHeaders, data.recurringItemRows.map(mapRecurringItemRow), "No Active Recurring Items for the selected filters") },
  ];
}
```

- [ ] **Step 4: Run workbook and XLSX builder tests**

Run: `npm test -- tests/budget-planning-workbook.test.ts tests/xlsx.test.ts`

Expected: both test files PASS and the workbook contains six valid worksheet names.

- [ ] **Step 5: Commit workbook mapping**

```powershell
git add -- lib/budget-planning-workbook.ts tests/budget-planning-workbook.test.ts
git commit -m "feat: export budget planning workbook data"
```

---

### Task 4: Dashboard Budget Planning View

**Files:**
- Create: `components/dashboard/BudgetPlanningView.tsx`
- Modify: `app/dashboard/page.tsx`
- Create: `tests/budget-planning-page.test.ts`
- Modify: `tests/dashboard-copy.test.ts`

**Interfaces:**
- Consumes: `BudgetPlanningPageData`, `buildBudgetPlanningHref`, `buildBudgetPlanningExportHref`, existing `Card`, `SectionHeader`, `inputClass`, `TableWrap`, and formatting helpers.
- Produces: URL-addressable `Overview` and `Budget Planning` views under `/dashboard`.

- [ ] **Step 1: Write failing page-source and helper tests**

```ts
test("dashboard exposes overview and budget planning navigation", () => {
  const page = readFileSync("app/dashboard/page.tsx", "utf8");
  const planning = readFileSync("components/dashboard/BudgetPlanningView.tsx", "utf8");
  expect(page).toContain("getBudgetPlanningPageData");
  expect(page).toContain('view === "planning"');
  expect(planning).toContain("Budget Planning");
  expect(planning).toContain("Actual Spend");
  expect(planning).toContain("Recurring Included in Actual");
  expect(planning).toContain("Non-recurring Actual");
  expect(planning).toContain("Active Recurring Forecast");
  expect(planning).toContain("Planning Baseline");
  expect(planning).toContain("Export Budget Plan");
  expect(planning).toContain("Generated, Printed และ Signed");
  expect(planning).toContain("Non-recurring Actual + Active Recurring Forecast");
});
```

Add a pure URL test proving a Category row link retains Base Year and Company while replacing Category.

- [ ] **Step 2: Run page tests and verify failure**

Run: `npm test -- tests/budget-planning-page.test.ts tests/dashboard-copy.test.ts`

Expected: FAIL because the planning component and loader usage do not exist.

- [ ] **Step 3: Implement the focused planning component**

`BudgetPlanningView` renders:

```tsx
<SectionHeader
  title={`Budget Planning ${data.filters.baseYear} → ${data.filters.forecastYear}`}
  description="วิเคราะห์ยอดใช้จริงและภาระผูกพัน Recurring PR เพื่อเตรียมฐานงบประมาณปีถัดไป"
  action={<Link href={buildBudgetPlanningExportHref(data.filters)}>Export Budget Plan</Link>}
/>
```

Follow it with an accessible view-navigation row, a GET filter form with hidden `view=planning`, a five-cell summary strip, and the semantic Category table. Use `formatTHB` for summary values and `formatAmount` for compact table values. Category links call `buildBudgetPlanningHref({ ...data.filters, categoryId: row.categoryId || "All" })`.

Render differentiated empty copy:

- `ยังไม่มี Actual PR สถานะ Generated, Printed หรือ Signed ในปีที่เลือก`
- `ยังไม่มี Active Recurring PR สำหรับปี Forecast`
- `ไม่พบข้อมูลวางแผนงบตาม filter ที่เลือก`

Render the methodology copy exactly: `Planning Baseline = Non-recurring Actual + Active Recurring Forecast` and explain that Actual statuses are Generated, Printed, and Signed while only Active schedules contribute to forecast.

- [ ] **Step 4: Modify Dashboard page to load only the selected view**

```tsx
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const read = (key: string) => Array.isArray(params[key]) ? params[key][0] || "" : params[key] || "";
  const view = read("view") === "planning" ? "planning" : "overview";

  if (view === "planning") {
    const planning = await getBudgetPlanningPageData({
      year: read("year"), companyId: read("companyId"), categoryId: read("categoryId"),
    });
    return <AppFrame><BudgetPlanningView data={planning} /></AppFrame>;
  }

  const [requests, report] = await Promise.all([
    getPurchaseRequestListItems({ take: 6 }),
    getDashboardReportData(),
  ]);
  return (
    <AppFrame>
      <div className="space-y-6">
        <SectionHeader
          title="Dashboard งบประมาณ IT"
          description="ภาพรวมเอกสาร PR และงบประมาณจาก SQL Server สำหรับปีปัจจุบัน"
          action={
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90" href="/pr/new">
              <Plus aria-hidden className="h-4 w-4" />
              New PR
            </Link>
          }
        />
        <DashboardViewNav current="overview" />
        <BudgetCards summary={report.summary} />
        <DashboardCharts report={report} />
        <section aria-label="Recent PR documents" className="pt-1">
          <PRList requests={requests} />
        </section>
      </div>
    </AppFrame>
  );
}
```

Export `DashboardViewNav` from `BudgetPlanningView.tsx`; it accepts `current: "overview" | "planning"`, renders links to `/dashboard` and `/dashboard?view=planning`, and uses `aria-current="page"` on the selected link.

- [ ] **Step 5: Run page/domain tests and typecheck**

Run: `npm test -- tests/budget-planning-page.test.ts tests/dashboard-copy.test.ts tests/budget-planning.test.ts`

Expected: all selected tests PASS.

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 6: Commit the Dashboard view**

```powershell
git add -- app/dashboard/page.tsx components/dashboard/BudgetPlanningView.tsx tests/budget-planning-page.test.ts tests/dashboard-copy.test.ts
git commit -m "feat: add dashboard budget planning view"
```

---

### Task 5: Authenticated Excel Export Route

**Files:**
- Create: `app/dashboard/budget-planning/export/route.ts`
- Create: `tests/budget-planning-export-route.test.ts`

**Interfaces:**
- Consumes: `requireCurrentUser`, `getBudgetPlanningPageData`, `buildBudgetPlanningWorkbookSheets`, and `buildXlsxWorkbook`.
- Produces: authenticated GET download with filename `budget-planning-<base>-to-<forecast>.xlsx`.

- [ ] **Step 1: Write a failing route test with module mocks**

```ts
test("authenticates, shares raw filters, and returns an auditable xlsx", async () => {
  const response = await GET(new Request("http://localhost/dashboard/budget-planning/export?year=2026&companyId=co_1&categoryId=cat_1"));
  expect(mocks.requireCurrentUser).toHaveBeenCalledOnce();
  expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledWith({ year: "2026", companyId: "co_1", categoryId: "cat_1" });
  expect(mocks.buildBudgetPlanningWorkbookSheets).toHaveBeenCalledWith(pageData);
  expect(response.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  expect(response.headers.get("content-disposition")).toBe('attachment; filename="budget-planning-2026-to-2027.xlsx"');
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
});
```

Use `vi.hoisted` mocks following `tests/reports-export-route.test.ts`.

- [ ] **Step 2: Run the route test and verify the missing-route failure**

Run: `npm test -- tests/budget-planning-export-route.test.ts`

Expected: FAIL because the export route does not exist.

- [ ] **Step 3: Implement the route**

```ts
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireCurrentUser();
  const params = new URL(request.url).searchParams;
  const data = await getBudgetPlanningPageData({
    year: params.get("year") || "",
    companyId: params.get("companyId") || "",
    categoryId: params.get("categoryId") || "",
  });
  const workbook = await buildXlsxWorkbook({ sheets: buildBudgetPlanningWorkbookSheets(data) });
  const arrayBuffer = new ArrayBuffer(workbook.byteLength);
  new Uint8Array(arrayBuffer).set(workbook);
  return new NextResponse(new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="budget-planning-${data.filters.baseYear}-to-${data.filters.forecastYear}.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 4: Run route, workbook, and existing report export tests**

Run: `npm test -- tests/budget-planning-export-route.test.ts tests/budget-planning-workbook.test.ts tests/reports-export-route.test.ts tests/xlsx.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 5: Commit the export route**

```powershell
git add -- app/dashboard/budget-planning/export/route.ts tests/budget-planning-export-route.test.ts
git commit -m "feat: export dashboard budget plan"
```

---

### Task 6: Full Verification, Accessibility, and Browser QA

**Files:**
- Modify only files already introduced when a verification failure requires a focused correction.

**Interfaces:**
- Consumes: the complete feature from Tasks 1–5.
- Produces: verified Dashboard Overview, Budget Planning view, filters, responsive table, and real XLSX download.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`

Expected: all test files and tests PASS with zero failures.

- [ ] **Step 2: Run strict TypeScript verification**

Run: `npm run typecheck`

Expected: exit 0 with no TypeScript errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Next.js production build completes successfully and lists `/dashboard` plus `/dashboard/budget-planning/export`.

- [ ] **Step 4: Run the design detector on changed UI files**

Run: `node C:\Users\Eltross\.agents\skills\impeccable\scripts\detect.mjs --json app/dashboard/page.tsx components/dashboard/BudgetPlanningView.tsx`

Expected: no high-confidence violations; correct any contrast, overflow, inaccessible-name, or banned-pattern finding and rerun.

- [ ] **Step 5: Verify desktop behavior in Chrome**

Open `/dashboard?view=planning&year=2026`, then verify:

- Overview and Budget Planning navigation has a visible current state.
- The title identifies `2026 → 2027`.
- Summary values reconcile with the Category table.
- Clicking a Category retains Base Year and Company filters.
- Methodology and inactive labels are readable without relying on color.
- Export downloads a workbook whose six sheet names and detail joins match the screen filters.
- Browser console has no errors or warnings introduced by this feature.

- [ ] **Step 6: Verify narrow responsive behavior and keyboard access**

At a 390 × 844 viewport, verify filters stack, the summary remains readable, the Category table scrolls only inside its wrapper, no page-level horizontal overflow exists, and Tab focus is visible on view navigation, filters, Category links, and Export.

- [ ] **Step 7: Commit any verification corrections**

If corrections were required:

```powershell
git add -- app/dashboard/page.tsx components/dashboard/BudgetPlanningView.tsx lib/budget-planning.ts lib/budget-planning.server.ts lib/budget-planning-workbook.ts tests
git commit -m "fix: polish dashboard budget planning"
```

If no correction was required, do not create an empty commit.

- [ ] **Step 8: Confirm final repository state**

Run: `git status -sb`

Expected: a clean working tree with the completed commits ahead of or synchronized with the intended remote branch.
