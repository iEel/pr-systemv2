# Budget Planning Category Chart and Base Year Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Actual Spend versus Planning Baseline chart by PR Category and replace free-form Base Year entry with a selector containing qualifying Actual PR years plus the current year.

**Architecture:** Extend the existing budget-planning domain with one pure year-option builder and one pure chart-row builder. The server loads distinct qualifying years once, merges them into the existing page view model, and the Dashboard renders a native select plus a dependency-free semantic CSS bar chart from the already-filtered `categoryRows`.

**Tech Stack:** Next.js 16 App Router, React 19 server components, TypeScript 5.7, Prisma 6 with SQL Server, Tailwind CSS 3.4, Vitest 4.

## Global Constraints

- Available Base Years are qualifying `GENERATED`, `PRINTED`, or `SIGNED` Purchase Request years plus the current calendar year.
- Draft, Cancelled, and Reissued Purchase Requests do not create Base Year options.
- Forecast Year remains `Base Year + 1`.
- A valid selected URL year absent from the query remains representable as a selected fallback.
- The chart uses the current Base Year, Company, and Category filters and reconciles with `categoryRows`.
- The detailed Category table remains the authoritative auditable detail.
- Add no charting dependency and make no Excel workbook changes.
- Zero values display exactly and do not receive a misleading minimum-width bar.
- Desktop and 390px layouts must not require horizontal scrolling for the chart.
- Follow test-first red-green-refactor development and commit after each independently testable task.

---

## File Structure

- Modify `lib/budget-planning.ts`: export the Actual status list and add the pure Base Year option builder.
- Modify `lib/budget-planning.server.ts`: load distinct qualifying PR years and expose `baseYears` in `BudgetPlanningPageData`.
- Create `lib/budget-planning-chart.ts`: convert category totals into safe, shared-scale chart rows.
- Create `components/dashboard/BudgetPlanningCategoryChart.tsx`: render the accessible responsive comparison chart.
- Modify `components/dashboard/BudgetPlanningView.tsx`: render the Base Year select and insert the chart.
- Modify `tests/budget-planning.test.ts`: cover pure Base Year option behavior.
- Modify `tests/budget-planning-server.test.ts`: cover distinct-year loading and page-data integration.
- Create `tests/budget-planning-chart.test.ts`: cover chart scaling, zero values, and non-finite safety.
- Modify `tests/budget-planning-page.test.ts`: cover selector and chart integration contracts.

### Task 1: Data-Grounded Base Year Options

**Files:**
- Modify: `lib/budget-planning.ts`
- Modify: `lib/budget-planning.server.ts`
- Modify: `tests/budget-planning.test.ts`
- Modify: `tests/budget-planning-server.test.ts`

**Interfaces:**
- Produces: `INCLUDED_ACTUAL_STATUSES: readonly ["GENERATED", "PRINTED", "SIGNED"]`
- Produces: `BudgetPlanningYearOption = { label: string; value: string }`
- Produces: `buildBudgetPlanningYearOptions(input: { availableYears: Array<number | string>; currentYear: number; selectedYear: number }): BudgetPlanningYearOption[]`
- Produces: `BudgetPlanningPageData.baseYears: BudgetPlanningYearOption[]`

- [ ] **Step 1: Write failing pure-function tests for available years**

Add the import and tests to `tests/budget-planning.test.ts`:

```ts
import {
  buildBudgetPlanningYearOptions,
  // existing imports remain
} from "../lib/budget-planning";

describe("budget planning year options", () => {
  test("deduplicates qualifying years, includes the current year, and sorts newest first", () => {
    expect(buildBudgetPlanningYearOptions({
      availableYears: [2024, "2025", 2024, "invalid"],
      currentYear: 2026,
      selectedYear: 2026,
    })).toEqual([
      { label: "2026 — ปีปัจจุบัน", value: "2026" },
      { label: "2025", value: "2025" },
      { label: "2024", value: "2024" },
    ]);
  });

  test("retains a valid selected fallback and rejects invalid year records", () => {
    expect(buildBudgetPlanningYearOptions({
      availableYears: [1999, 2025.5, 2101, Number.NaN],
      currentYear: 2026,
      selectedYear: 2023,
    })).toEqual([
      { label: "2026 — ปีปัจจุบัน", value: "2026" },
      { label: "2023", value: "2023" },
    ]);
  });
});
```

- [ ] **Step 2: Run the pure-function tests and confirm RED**

Run: `npm test -- tests/budget-planning.test.ts`

Expected: FAIL because `buildBudgetPlanningYearOptions` is not exported.

- [ ] **Step 3: Implement the shared status list and year-option builder**

In `lib/budget-planning.ts`, replace the private status set and add:

```ts
export const INCLUDED_ACTUAL_STATUSES = ["GENERATED", "PRINTED", "SIGNED"] as const;
const INCLUDED_ACTUAL_STATUS_SET = new Set<string>(INCLUDED_ACTUAL_STATUSES);

export type BudgetPlanningYearOption = { label: string; value: string };

export function buildBudgetPlanningYearOptions({
  availableYears,
  currentYear,
  selectedYear,
}: {
  availableYears: Array<number | string>;
  currentYear: number;
  selectedYear: number;
}): BudgetPlanningYearOption[] {
  const years = new Set<number>([currentYear, selectedYear]);
  for (const value of availableYears) {
    const year = Number(value);
    if (Number.isInteger(year) && year >= 2000 && year <= 2100) years.add(year);
  }

  return [...years]
    .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100)
    .sort((left, right) => right - left)
    .map((year) => ({
      label: year === currentYear ? `${year} — ปีปัจจุบัน` : String(year),
      value: String(year),
    }));
}
```

Update the existing actual-record filter to call `INCLUDED_ACTUAL_STATUS_SET.has(record.status)`.

- [ ] **Step 4: Run the pure-function tests and confirm GREEN**

Run: `npm test -- tests/budget-planning.test.ts`

Expected: PASS with all tests in the file green.

- [ ] **Step 5: Write failing server tests for qualifying year loading**

Extend the Prisma mock in `tests/budget-planning-server.test.ts`:

```ts
import { readFileSync } from "node:fs";

const serverSource = readFileSync("lib/budget-planning.server.ts", "utf8");

prisma: {
  $queryRaw: vi.fn(),
  // existing delegates remain
},
```

Reset it in `beforeEach` with `mocks.prisma.$queryRaw.mockResolvedValue([]);`, then add:

```ts
test("returns qualifying Actual PR years plus the current year and selected fallback", async () => {
  mocks.prisma.$queryRaw.mockResolvedValue([
    { baseYear: 2024 },
    { baseYear: 2022 },
  ]);

  const result = await getBudgetPlanningPageData({ year: 2023 });
  const currentYear = new Date().getFullYear();

  expect(result.baseYears).toEqual(expect.arrayContaining([
    { label: `${currentYear} — ปีปัจจุบัน`, value: String(currentYear) },
    { label: "2024", value: "2024" },
    { label: "2023", value: "2023" },
    { label: "2022", value: "2022" },
  ]));
  expect(mocks.prisma.$queryRaw).toHaveBeenCalledTimes(1);
});

test("queries distinct document years using the approved Actual status list", () => {
  expect(serverSource).toContain("SELECT DISTINCT YEAR([documentDate]) AS [baseYear]");
  expect(serverSource).toContain("INCLUDED_ACTUAL_STATUSES[0]");
  expect(serverSource).toContain("INCLUDED_ACTUAL_STATUSES[1]");
  expect(serverSource).toContain("INCLUDED_ACTUAL_STATUSES[2]");
});
```

- [ ] **Step 6: Run the server test and confirm RED**

Run: `npm test -- tests/budget-planning-server.test.ts`

Expected: FAIL because the mock lacks an observed call and `baseYears` is undefined.

- [ ] **Step 7: Load distinct years and add them to page data**

In `lib/budget-planning.server.ts`, import `buildBudgetPlanningYearOptions`, `INCLUDED_ACTUAL_STATUSES`, and `BudgetPlanningYearOption`. Extend the page-data type:

```ts
export type BudgetPlanningPageData = BudgetPlanningViewModel & {
  baseYears: BudgetPlanningYearOption[];
  companies: BudgetPlanningFilterOption[];
  categories: BudgetPlanningFilterOption[];
};
```

Load years alongside companies and categories:

```ts
const [companyRecords, categoryRecords, yearRecords] = await Promise.all([
  // existing company query,
  // existing category query,
  prisma.$queryRaw<Array<{ baseYear: number }>>`
    SELECT DISTINCT YEAR([documentDate]) AS [baseYear]
    FROM [dbo].[PurchaseRequest]
    WHERE [status] IN (${INCLUDED_ACTUAL_STATUSES[0]}, ${INCLUDED_ACTUAL_STATUSES[1]}, ${INCLUDED_ACTUAL_STATUSES[2]})
    ORDER BY [baseYear] DESC
  `,
]);
```

Add to the returned object:

```ts
baseYears: buildBudgetPlanningYearOptions({
  availableYears: yearRecords.map(({ baseYear }) => baseYear),
  currentYear: new Date().getFullYear(),
  selectedYear: filters.baseYear,
}),
```

- [ ] **Step 8: Run domain and server tests and confirm GREEN**

Run: `npm test -- tests/budget-planning.test.ts tests/budget-planning-server.test.ts`

Expected: PASS with no failed tests.

- [ ] **Step 9: Commit the Base Year data model**

```bash
git add lib/budget-planning.ts lib/budget-planning.server.ts tests/budget-planning.test.ts tests/budget-planning-server.test.ts
git commit -m "feat: add data-grounded budget planning years"
```

### Task 2: Safe Category Comparison Chart Model

**Files:**
- Create: `lib/budget-planning-chart.ts`
- Create: `tests/budget-planning-chart.test.ts`

**Interfaces:**
- Consumes: `BudgetPlanningCategoryRow` from `lib/budget-planning.ts`
- Produces: `BudgetPlanningChartRow = { key: string; label: string; actualSpend: number; planningBaseline: number; actualPercent: number; baselinePercent: number }`
- Produces: `buildBudgetPlanningChartRows(rows: BudgetPlanningCategoryRow[]): BudgetPlanningChartRow[]`

- [ ] **Step 1: Write failing tests for chart scaling and safety**

Create `tests/budget-planning-chart.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { buildBudgetPlanningChartRows } from "../lib/budget-planning-chart";
import type { BudgetPlanningCategoryRow } from "../lib/budget-planning";

function row(overrides: Partial<BudgetPlanningCategoryRow> = {}): BudgetPlanningCategoryRow {
  return {
    categoryId: "cat_hw",
    categoryCode: "HARDWARE",
    categoryName: "Hardware",
    categoryIsActive: true,
    actualSpend: 100,
    recurringIncludedInActual: 0,
    nonRecurringActual: 100,
    activeRecurringForecast: 50,
    planningBaseline: 150,
    actualPrCount: 1,
    activeScheduleCount: 1,
    ...overrides,
  };
}

describe("budget planning chart rows", () => {
  test("uses one shared maximum for Actual and Planning Baseline", () => {
    expect(buildBudgetPlanningChartRows([
      row(),
      row({ categoryId: "cat_sw", categoryCode: "SOFTWARE", actualSpend: 300, planningBaseline: 120 }),
    ])).toEqual([
      expect.objectContaining({ key: "cat_hw", actualPercent: 100 / 3, baselinePercent: 50 }),
      expect.objectContaining({ key: "cat_sw", actualPercent: 100, baselinePercent: 40 }),
    ]);
  });

  test("keeps zero bars at zero and clamps non-finite or negative values", () => {
    expect(buildBudgetPlanningChartRows([
      row({ categoryId: null, categoryCode: "Not categorized", actualSpend: Number.NaN, planningBaseline: -10 }),
    ])).toEqual([
      {
        key: "__not_categorized__",
        label: "Not categorized",
        actualSpend: 0,
        planningBaseline: 0,
        actualPercent: 0,
        baselinePercent: 0,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run the chart-model test and confirm RED**

Run: `npm test -- tests/budget-planning-chart.test.ts`

Expected: FAIL because `lib/budget-planning-chart.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure chart model**

Create `lib/budget-planning-chart.ts`:

```ts
import type { BudgetPlanningCategoryRow } from "./budget-planning";

export type BudgetPlanningChartRow = {
  key: string;
  label: string;
  actualSpend: number;
  planningBaseline: number;
  actualPercent: number;
  baselinePercent: number;
};

function safeAmount(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function buildBudgetPlanningChartRows(rows: BudgetPlanningCategoryRow[]): BudgetPlanningChartRow[] {
  const values = rows.flatMap((row) => [safeAmount(row.actualSpend), safeAmount(row.planningBaseline)]);
  const maximum = Math.max(0, ...values);
  const percent = (value: number) => maximum > 0 ? (value / maximum) * 100 : 0;

  return rows.map((row) => {
    const actualSpend = safeAmount(row.actualSpend);
    const planningBaseline = safeAmount(row.planningBaseline);
    return {
      key: row.categoryId || "__not_categorized__",
      label: row.categoryCode,
      actualSpend,
      planningBaseline,
      actualPercent: percent(actualSpend),
      baselinePercent: percent(planningBaseline),
    };
  });
}
```

- [ ] **Step 4: Run the chart-model test and confirm GREEN**

Run: `npm test -- tests/budget-planning-chart.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit the chart model**

```bash
git add lib/budget-planning-chart.ts tests/budget-planning-chart.test.ts
git commit -m "feat: add budget planning chart model"
```

### Task 3: Responsive Chart and Base Year Select UI

**Files:**
- Create: `components/dashboard/BudgetPlanningCategoryChart.tsx`
- Modify: `components/dashboard/BudgetPlanningView.tsx`
- Modify: `tests/budget-planning-page.test.ts`

**Interfaces:**
- Consumes: `BudgetPlanningCategoryChart({ rows }: { rows: BudgetPlanningCategoryRow[] }): React.ReactNode`
- Consumes: `BudgetPlanningPageData.baseYears`
- Consumes: `buildBudgetPlanningChartRows(rows)` and `formatTHB(value)`

- [ ] **Step 1: Load project UI context before changing the interface**

Run: `node .agents/skills/impeccable/scripts/context.mjs --target components/dashboard`

Expected: the project product/design context or `NO_PRODUCT_MD`. If `NO_PRODUCT_MD` is printed, follow the skill's `reference/init.md` workflow before continuing. Read the app-product register and the existing `docs/DESIGN_SYSTEM.md`, `components/dashboard/DashboardCharts.tsx`, and `components/ui/Card.tsx` before editing.

- [ ] **Step 2: Write failing source-contract tests for the new UI**

Extend `tests/budget-planning-page.test.ts` with a source read for the new component and these tests:

```ts
const chartSource = readFileSync("components/dashboard/BudgetPlanningCategoryChart.tsx", "utf8");

test("uses a Base Year select sourced from qualifying page-data years", () => {
  expect(viewSource).toContain('defaultValue={String(data.filters.baseYear)}');
  expect(viewSource).toContain('name="year"');
  expect(viewSource).toContain("data.baseYears.map");
  expect(viewSource).toContain("<select");
  expect(viewSource).not.toMatch(/<input[^>]*name="year"[^>]*type="number"/);
  expect(viewSource).toContain("Forecast Year:");
});

test("renders the category comparison chart before the audit table", () => {
  expect(viewSource).toContain("<BudgetPlanningCategoryChart rows={data.categoryRows}");
  expect(viewSource.indexOf("<BudgetPlanningCategoryChart")).toBeLessThan(
    viewSource.indexOf('aria-label="Budget plan by PR Category"'),
  );
});

test("chart exposes both exact-value series without relying on hover or horizontal scrolling", () => {
  expect(chartSource).toContain("Actual vs Planning Baseline by PR Category");
  expect(chartSource).toContain("Actual Spend");
  expect(chartSource).toContain("Planning Baseline");
  expect(chartSource).toContain("formatTHB");
  expect(chartSource).toContain("buildBudgetPlanningChartRows");
  expect(chartSource).toContain('role="list"');
  expect(chartSource).not.toContain("overflow-x-auto");
  expect(chartSource).not.toContain("min-w-[");
});
```

Update the older filter test by replacing the `min="2000"` and `max="2100"` assertions with `data.baseYears.map` and the selected string value assertion.

- [ ] **Step 3: Run the page test and confirm RED**

Run: `npm test -- tests/budget-planning-page.test.ts`

Expected: FAIL because the chart component is missing and the page still uses a numeric input.

- [ ] **Step 4: Create the responsive semantic chart component**

Create `components/dashboard/BudgetPlanningCategoryChart.tsx`:

```tsx
import { buildBudgetPlanningChartRows } from "@/lib/budget-planning-chart";
import type { BudgetPlanningCategoryRow } from "@/lib/budget-planning";
import { formatTHB } from "@/lib/utils";

export function BudgetPlanningCategoryChart({ rows }: { rows: BudgetPlanningCategoryRow[] }): React.ReactNode {
  const chartRows = buildBudgetPlanningChartRows(rows);

  return (
    <section aria-labelledby="budget-category-chart-title" className="rounded-lg border border-border bg-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink" id="budget-category-chart-title">
            Actual vs Planning Baseline by PR Category
          </h2>
          <p className="mt-1 text-sm text-muted">เปรียบเทียบตาม Base Year, Company และ Category ที่เลือก</p>
        </div>
        <div aria-label="Chart legend" className="flex flex-wrap gap-4 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-2"><span aria-hidden className="h-2.5 w-5 rounded-full bg-slate-400" />Actual Spend</span>
          <span className="inline-flex items-center gap-2"><span aria-hidden className="h-2.5 w-5 rounded-full bg-primary" />Planning Baseline</span>
        </div>
      </div>

      {chartRows.length ? (
        <div className="mt-5 space-y-5" role="list">
          {chartRows.map((row) => (
            <div className="space-y-3" key={row.key} role="listitem">
              <h3 className="text-sm font-bold text-ink">{row.label}</h3>
              <div className="grid gap-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_8.5rem] sm:items-center">
                <span className="font-semibold text-muted">Actual Spend</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-400" style={{ width: `${row.actualPercent}%` }} />
                </div>
                <span className="font-bold tabular-nums text-ink sm:text-right">{formatTHB(row.actualSpend)}</span>
                <span className="font-semibold text-muted">Planning Baseline</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-blue-50">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.baselinePercent}%` }} />
                </div>
                <span className="font-bold tabular-nums text-primary sm:text-right">{formatTHB(row.planningBaseline)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-muted">
          ไม่พบข้อมูลวางแผนงบตาม filter ที่เลือก
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Replace the numeric input and insert the chart**

In `components/dashboard/BudgetPlanningView.tsx`, import the new component:

```tsx
import { BudgetPlanningCategoryChart } from "@/components/dashboard/BudgetPlanningCategoryChart";
```

Replace the Base Year input with:

```tsx
<label className="grid gap-1.5 text-sm font-semibold text-ink">
  Base Year
  <select className={inputClass()} defaultValue={String(data.filters.baseYear)} name="year">
    {data.baseYears.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
  </select>
</label>
```

Insert after the summary section and before the Category table section:

```tsx
<BudgetPlanningCategoryChart rows={data.categoryRows} />
```

- [ ] **Step 6: Run focused UI tests and confirm GREEN**

Run: `npm test -- tests/budget-planning-page.test.ts tests/budget-planning-chart.test.ts`

Expected: PASS with no failed tests.

- [ ] **Step 7: Run formatting-neutral checks and commit the UI**

Run: `git diff --check`

Expected: exit 0 with no whitespace errors.

```bash
git add components/dashboard/BudgetPlanningCategoryChart.tsx components/dashboard/BudgetPlanningView.tsx tests/budget-planning-page.test.ts
git commit -m "feat: visualize budget planning by category"
```

### Task 4: Full Verification and Browser QA

**Files:**
- Verify only; modify the smallest relevant file only if a failing check exposes a defect, and add a failing regression test before the fix.

**Interfaces:**
- Consumes: the complete Budget Planning page at `/dashboard?view=planning`
- Produces: verified desktop and 390px behavior with the original unfiltered page left open

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: exit 0 with zero failed tests.

- [ ] **Step 2: Run TypeScript verification**

Run: `npm run typecheck`

Expected: exit 0 with no TypeScript diagnostics.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit 0 and a successful Next.js production build.

- [ ] **Step 4: Verify the desktop experience in the user-selected Chrome**

Open or claim `http://localhost:3000/dashboard?view=planning`, then verify from a fresh DOM snapshot and screenshot:

- Base Year is a native select.
- Its options equal qualifying Actual PR years plus the current year, newest first.
- Forecast Year updates to selected Base Year plus one after applying filters.
- The chart appears between summary and table.
- Category ordering and exact amounts match the table.
- Actual and Planning series remain separately labelled when equal or zero.
- Company and Category filters update chart, summary, table, and export scope consistently.

- [ ] **Step 5: Verify the 390px responsive experience**

Temporarily set the Chrome viewport to `390x844`, then verify:

- Chart rows stack without document-level or chart-level horizontal overflow.
- Exact currency values remain visible.
- Base Year select, Apply Filters, Reset, and Export remain operable.
- The chart does not depend on hover.

Reset the viewport override before finishing.

- [ ] **Step 6: Restore the unfiltered deliverable state and inspect logs**

Navigate to `http://localhost:3000/dashboard?view=planning`, verify Base Year defaults to the current year, and inspect console warning/error logs.

Expected: no application warnings or errors caused by this feature.

- [ ] **Step 7: Review the final diff against acceptance criteria**

Run:

```bash
git status --short
git log -4 --oneline
git diff HEAD~3 --check
```

Expected: only intentional feature commits, no unstaged feature files, and no whitespace errors.
