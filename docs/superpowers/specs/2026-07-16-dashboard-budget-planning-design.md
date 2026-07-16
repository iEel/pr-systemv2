# Dashboard Budget Planning and Excel Export Design

Last updated: 2026-07-16

## Goal

Add a budget-planning view to the Dashboard that combines actual PR spending by PR Category with the next year's active Recurring PR commitments. The view must help IT staff prepare a defensible budget baseline without double-counting recurring purchases and must export the full calculation trail to Excel.

## Approved Direction

Add a dedicated `Budget Planning` view within the Dashboard alongside the existing `Overview` view. This follows visual direction B from the approved brainstorming mockups: planning receives enough space for filters, methodology, category comparisons, and export without making the operational Dashboard overview denser.

The feature reuses the existing application shell, dashboard visual language, reporting filter patterns, authentication, and XLSX infrastructure. It introduces a separate budget-planning domain module so planning rules do not become coupled to historical reporting rules.

## Planning Definitions

The base year is the selected historical year. The forecast year is always `base year + 1`.

### Actual Spend

Actual Spend contains Purchase Requests whose document date is in the base year and whose status is one of:

- `GENERATED`
- `PRINTED`
- `SIGNED`

Draft, Cancelled, and Reissued Purchase Requests are excluded from Actual Spend. The existing relationship between a Purchase Request and `RecurringPurchaseRequestRun` determines whether an actual PR originated from a recurring schedule.

### Recurring Included in Actual

Recurring Included in Actual is the portion of Actual Spend from Purchase Requests linked to a recurring run. It remains visible for reconciliation but must not be carried forward as part of non-recurring actual spend.

### Non-recurring Actual

`Non-recurring Actual = Actual Spend - Recurring Included in Actual`

### Active Recurring Forecast

Active Recurring Forecast contains only `RecurringPurchaseRequestSchedule` records with status `ACTIVE`. Each active annual schedule contributes once to the forecast year using the sum of its current schedule item amounts. The forecast uses current quantity and unit cost values without applying an inflation or contingency percentage.

Paused and Needs Attention schedules are excluded. A zero-value schedule or item remains visible in detail output for diagnosis but contributes zero to totals.

### Planning Baseline

`Planning Baseline = Non-recurring Actual in the base year + Active Recurring Forecast for the forecast year`

This formula prevents recurring purchases already present in base-year actuals from being counted twice.

## Filters

Budget Planning supports these filters:

- Base Year, defaulting to the current calendar year.
- Company, defaulting to all companies.
- PR Category, defaulting to all categories.

The forecast year is derived and read-only. Status is not user-configurable because the approved Actual and Recurring status rules are part of the planning methodology. Invalid or out-of-range years fall back to the current year using a documented normalization rule.

The selected filters are represented in the URL so the view can be refreshed, linked, and exported consistently.

## Dashboard Information Architecture

The Dashboard provides two views:

1. `Overview` preserves the current Dashboard content.
2. `Budget Planning` displays the approved planning experience.

The selected view must be linkable through the URL and must not hide the existing New PR action from the Overview workflow.

### Budget Planning Header and Filters

The planning header identifies both years, for example `Budget Planning 2026 → 2027`. The filter row contains Base Year, Company, and Category. An `Export Budget Plan` action exports exactly the current filtered view.

### Summary Strip

Display these five metrics in a compact summary strip rather than a grid of decorative hero cards:

1. Actual Spend
2. Recurring Included in Actual
3. Non-recurring Actual
4. Active Recurring Forecast
5. Planning Baseline

Each metric has a concise helper label that identifies its year or role. The strip must wrap or stack cleanly on narrow viewports and retain tabular number alignment.

### Category Planning Table

The main table is grouped by PR Category and sorted by Planning Baseline descending. It contains:

- Category code and name
- Actual PR count
- Actual Spend
- Recurring Included in Actual
- Non-recurring Actual
- Active schedule count
- Next-year Recurring
- Planning Baseline

Selecting a Category applies the Category filter to the planning view instead of opening a modal. The table remains horizontally scrollable on narrow viewports, with the Category identity retained as the leading column.

Inactive categories remain visible when they have historical or forecast data and receive an explicit `Inactive` label.

### Methodology and Empty States

A short methodology note below the table states the included statuses and the Planning Baseline formula. The interface distinguishes between:

- no qualifying Actual PRs;
- no Active Recurring schedules; and
- no data of either type for the current filters.

Zero is shown as a real value, not as missing data. Status and data-source distinctions must not rely on color alone.

## Architecture and Data Flow

Create a focused budget-planning module with pure normalization, aggregation, and workbook-mapping functions plus data-loading functions. The module exposes one planning view model consumed by both the Dashboard and export route.

The flow is:

1. Normalize the Base Year, Company, and Category filters.
2. Build the base-year date range using the application's existing UTC date convention.
3. Load qualifying actual Purchase Requests with Category, organization, recurring-run relation, and ordered items.
4. Load Active recurring schedules with Category, organization, responsible user, and ordered items.
5. Aggregate totals and counts globally and per Category.
6. Derive the forecast renewal date from the schedule's renewal month/day and forecast year for display and export.
7. Build a single immutable view model for UI and workbook generation.

The budget-planning query must not inherit the existing reporting loader's `take: 1000` limit. Planning totals and exported detail must never be silently truncated. If future data volume requires batching, batching must preserve a complete result and explicit failure behavior.

## Excel Export

The export route uses the same normalized filters and planning view model as the UI. It requires an authenticated current user, returns the standard XLSX MIME type with `nosniff` and `no-store` headers, and names files using both years, for example:

`budget-planning-2026-to-2027.xlsx`

The workbook contains six sheets.

### 1. Budget Plan Summary

Contains:

- Base Year and Forecast Year
- Company and Category filter labels
- Export timestamp
- Actual Spend
- Recurring Included in Actual
- Non-recurring Actual
- Active Recurring Forecast
- Planning Baseline
- Included Actual statuses
- Included Recurring status
- The Planning Baseline formula

### 2. By Category

Contains one row per Category with:

- Category Code
- Category Name
- Category Active/Inactive state
- Actual PR Count
- Actual Spend
- Recurring Included in Actual
- Non-recurring Actual
- Active Schedule Count
- Next-year Recurring
- Planning Baseline

### 3. Actual PR

Contains one row per qualifying Purchase Request with:

- Base Year
- Category Code and Name
- PR Number
- Document Date
- Company and Branch
- Department and Division
- Purpose
- Status
- Recurring-origin indicator
- Total Amount

### 4. Actual PR Items

Contains one row per item belonging to a qualifying Purchase Request with:

- Category Code and Name
- PR Number
- PR database identifier for stable joining
- Line Number
- Row Type
- Account Code
- Description
- Quantity
- Unit Cost
- Total Amount

### 5. Active Recurring

Contains one row per included schedule with:

- Forecast Year
- Category Code and Name
- Schedule ID and Name
- Company and Branch
- Department and Division
- Forecast Renewal Date
- Responsible User
- Status
- Schedule Total

### 6. Recurring Items

Contains one row per item belonging to an included schedule with:

- Category Code and Name
- Schedule ID and Name
- Line Number
- Row Type
- Account Code
- Description
- Quantity
- Unit Cost
- Forecast Amount

Detail sheets use a Category column and Category-first sorting instead of creating a separate sheet for each Category. This remains stable when categories are added, renamed, or deactivated and supports Excel filters and Pivot Tables without dynamic sheet-name constraints.

Every sheet is created even when it has no matching rows. An empty sheet retains its headers and includes a clear no-data row. Workbook values are precomputed by the server rather than depending on mutable Excel formulas.

## Error Handling and Data Integrity

- The export and UI use the same calculation functions, filters, and status sets.
- A missing Category relation is grouped under `Not categorized` for historical integrity and remains filterable only through the all-category view.
- Inactive categories are not discarded.
- Invalid money values normalize to zero and remain represented in detail output where possible.
- Schedule totals are derived from their current item amounts; a stored aggregate is not trusted as a separate source of truth.
- Invalid forecast renewal dates produce an explicit row-level issue rather than silently shifting the date.
- Authentication failures follow the existing Reports export behavior.
- Data-loading or workbook-generation failures return an error response and never return a partially valid XLSX file.

## Accessibility and Responsive Behavior

- The Dashboard view selector uses standard links or tabs with an explicit current state and keyboard-visible focus.
- Filter labels remain visible and are associated with their controls.
- Summary values and table numbers use readable contrast and tabular alignment.
- The Category table has semantic headers and a descriptive accessible name.
- Meaning is never encoded only through color.
- Desktop uses the available analysis width; mobile stacks the summary and filter controls while allowing intentional table scrolling.
- Export remains reachable without depending on hover interactions.

## Testing

Use test-first development.

1. Filter-normalization tests for default, valid, and invalid years plus Company and Category values.
2. Aggregation tests confirming only Generated, Printed, and Signed PRs contribute to Actual Spend.
3. Aggregation tests confirming Draft, Cancelled, and Reissued PRs are excluded.
4. Double-counting regression test proving recurring-origin actuals are removed before adding the next-year recurring forecast.
5. Recurring tests confirming only Active schedules contribute and current item values are used without uplift.
6. Category tests confirming global totals equal the sum of category totals and inactive categories remain visible.
7. Filter tests confirming Company and Category filters produce identical UI and workbook scopes.
8. Detail-mapping tests confirming Actual PR Items join to Actual PR by PR identifier/number and Recurring Items join to Active Recurring by Schedule ID.
9. Workbook tests confirming all six sheets, required headers, metadata, sorting, and no-data rows.
10. Export-route tests confirming authentication, filename, MIME type, cache headers, and content-disposition.
11. Dashboard source/component tests for view navigation, filters, summary labels, methodology, table structure, export link, and differentiated empty states.
12. Full test suite, TypeScript typecheck, production build, and manual Chrome verification at desktop and narrow responsive widths.

## Non-Goals

- No inflation, contingency, or per-Category uplift percentage.
- No editable budget proposal values in this phase.
- No persistence of a planning scenario or approval workflow.
- No inclusion of Paused or Needs Attention recurring schedules.
- No status selector that changes the approved methodology.
- No one-sheet-per-Category workbook structure.
- No chart-heavy executive presentation replacing the auditable category table.
- No change to Recurring PR worker behavior or generated Draft creation.
- No schema migration unless implementation discovers a missing relation that cannot be derived from the current schema; such a discovery requires returning to design review.

## Acceptance Criteria

- Users can switch between Dashboard Overview and Budget Planning without losing the existing Overview workflow.
- The planning view defaults to the current year and visibly derives the following forecast year.
- Actual Spend contains only Generated, Printed, and Signed PRs.
- Active Recurring Forecast contains only Active schedules and uses current item values without uplift.
- Planning Baseline excludes recurring-origin Actual Spend before adding the next-year recurring forecast.
- Summary totals reconcile exactly with the Category table.
- Current filters are reflected identically in the UI and exported workbook.
- The workbook contains all six approved sheets, including both PR-document and PR-item detail.
- Historical inactive categories remain identifiable.
- No planning or export query silently truncates detail rows.
- Empty states, errors, desktop layout, narrow layout, keyboard focus, and Excel download behavior are verified.
