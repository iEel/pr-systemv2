# Budget Planning Category Chart and Base Year Selector Design

Last updated: 2026-07-16

## Goal

Improve the Budget Planning view so users can compare Actual Spend with the next-year Planning Baseline by PR Category and can select a meaningful Base Year without typing an arbitrary year.

This design extends the approved Dashboard Budget Planning feature. It does not change the planning formula, status rules, Company or Category filters, Excel export, or source data definitions.

## Approved Direction

Add a horizontal comparison chart above the Category table and replace the numeric Base Year input with a native select. The chart and select use the same normalized planning data and filters as the existing summary and table.

## Base Year Selector

### Available Years

The select contains the union of:

- calendar years that contain at least one Purchase Request in status `GENERATED`, `PRINTED`, or `SIGNED`; and
- the current calendar year, even when it has no qualifying Purchase Requests yet.

Draft, Cancelled, and Reissued Purchase Requests do not make a year available because they do not contribute to Actual Spend. Duplicate years are removed and the list is sorted newest first.

The current year is labelled with context, for example `2026 — ปีปัจจุบัน`. Historical years use the four-digit year only. If no qualifying historical data exists, the select contains the current year as its sole option.

### Selection and Forecast Behavior

The default remains the current year. Selecting a Base Year and applying filters preserves the selected Company and Category. Forecast Year remains read-only and is always `Base Year + 1`.

Incoming URLs may contain a year that is no longer in the available list. To preserve valid shared links and exported scopes, a normalized valid year that is not currently returned by the availability query is added to the select as a selected fallback option. Invalid or out-of-range year values continue to normalize to the current year.

A native select is preferred over a searchable combobox or fixed rolling range because the expected list is short, keyboard behavior is reliable, and every normal option is grounded in planning data.

## Category Comparison Chart

### Placement and Purpose

Place the chart after the summary strip and before the detailed Category table. It is a visual comparison layer, while the table remains the authoritative auditable detail.

The chart title is `Actual vs Planning Baseline by PR Category`. Supporting copy states that values follow the current Base Year, Company, and Category filters.

### Chart Form

Use horizontal grouped bars with one row per Category:

- Actual Spend uses a neutral slate tone.
- Planning Baseline uses the existing primary blue.
- Both series have a text legend and are not distinguished by color alone.
- Each row shows the Category code or `Not categorized` and formatted currency values.
- Bar widths use the largest visible value across both series as the shared scale.
- Categories remain sorted by Planning Baseline descending, matching the existing table.

The chart renders all filtered Category rows. The current master has a small bounded Category set, so truncation and a top-N control are unnecessary in this phase.

### Zero and Equal Values

Zero values render as `฿0.00` without a misleading minimum-width bar. When Actual Spend and Planning Baseline are equal, the two values remain separately labelled so users can see that no forecast delta exists. When no Actual or recurring data matches the filters, the chart uses the existing no-planning-data message rather than rendering an empty frame.

### Responsive Behavior

The chart does not require horizontal scrolling. On narrow screens, each Category becomes a compact vertical block containing the Category label followed by the two labelled horizontal bars. Currency labels may wrap below their bar when space is constrained, but they must remain visible.

The implementation uses semantic HTML and CSS widths, matching the existing Dashboard chart approach and avoiding a new chart dependency. A hidden accessible summary or descriptive labels expose each Category and both exact values to assistive technology.

## Data Flow

1. Query distinct qualifying Purchase Request document years using the same Actual status set as Budget Planning.
2. Merge those years with the current calendar year and normalize the selected fallback.
3. Return the year options with the existing `BudgetPlanningPageData` view model.
4. Build chart rows directly from `categoryRows`; do not issue a separate chart aggregation query.
5. Apply the current Base Year, Company, and Category filters before the view model reaches the chart.

The chart therefore reconciles with both the summary and Category table by construction.

## Error Handling

- If the available-year query returns no rows, show the current year.
- If an unavailable but valid normalized year is selected through a URL, retain it as a selected fallback option.
- If a Category value is negative or non-finite after normalization, reuse the existing money normalization behavior; chart widths never become negative or non-finite.
- A data-loading failure follows the existing Budget Planning page error behavior rather than showing a partially valid chart.

## Accessibility

- The Base Year select retains a persistent visible label.
- Chart series have text labels and exact currency values.
- Meaning does not rely on blue versus slate alone.
- Interactive controls retain visible keyboard focus and the shared product control height.
- The chart is readable without pointer hover; `title` attributes may supplement but do not replace visible values.

## Testing

Use test-first development.

1. Available-year tests for qualifying statuses, excluded statuses, duplicate removal, descending order, and current-year inclusion.
2. Selected-fallback tests for a valid URL year absent from the availability query.
3. Page-data tests confirming year options are returned without changing planning totals.
4. Chart tests for two labelled series, Category labels, exact values, shared maximum scaling, zero values, and empty state.
5. Source/component tests confirming the number input is replaced by a labelled select and the Forecast Year remains derived.
6. Full test suite, TypeScript typecheck, production build, and Chrome verification at desktop and 390px widths.

## Non-Goals

- No user-entered arbitrary Base Year.
- No year range with empty future years.
- No Draft, Cancelled, or Reissued year options.
- No inflation, uplift, target budget, variance percentage, or editable scenarios.
- No replacement of the detailed Category table.
- No new charting library.
- No changes to Excel workbook sheets in this increment.

## Acceptance Criteria

- Base Year is selected from qualifying Actual PR years plus the current year.
- The current year remains available when it has no qualifying PR data.
- Forecast Year remains Base Year plus one.
- Shared links with a valid historical selected year remain representable.
- The chart compares Actual Spend and Planning Baseline for every filtered Category row.
- Chart values reconcile exactly with the Category table.
- Zero, equal, filtered, empty, desktop, narrow, and keyboard states are verified.
