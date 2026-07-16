# Final Review Fix Report: Auditable Filter Scope

## Status

Implemented the final-review correction. Budget Planning now resolves Company and Category option records before either detail query, validates selected IDs against those records, retains known inactive selections with human-readable labels, and normalizes unknown selections to `All` consistently for UI data, detail queries, and workbook metadata.

## Changed files

- `lib/budget-planning.server.ts`
- `tests/budget-planning-server.test.ts`
- `tests/budget-planning-workbook.test.ts`
- `tests/budget-planning-export-route.test.ts`

No UI, workbook production mapping, export route production, schema, calculation, or worker files were changed.

## TDD evidence

### RED

Command:

```text
npm test -- tests/budget-planning-server.test.ts tests/budget-planning-workbook.test.ts tests/budget-planning-export-route.test.ts
```

Result: expected failure. Three files ran; the workbook and route characterization suites passed, while four server assertions failed for the missing production behavior:

- Company option query did not select `isActive`.
- A selected inactive Company was not included by the option query or labeled.
- Company/Category option calls were not completed before detail-query calls.
- Unknown Company/Category IDs remained selected instead of normalizing to `All`.

The workbook inactive-label and export rejection-path regressions passed during RED because their production behavior already propagated option labels/errors correctly; these tests add required coverage without changing those production modules.

### GREEN

Command:

```text
npm test -- tests/budget-planning-server.test.ts tests/budget-planning-workbook.test.ts tests/budget-planning-export-route.test.ts
```

Result: 3 test files passed, 22 tests passed.

## Implementation review

- Raw inputs are normalized once into `requestedFilters`.
- Company and Category option records load together in the first `Promise.all`.
- All-Company scope queries active Companies only; selected-Company scope queries active Companies plus the selected ID.
- Company records select `id`, `displayName`, and `isActive`; selected inactive records receive the `(Inactive)` suffix.
- Category loading and existing active/inactive labels remain unchanged.
- Unknown selected IDs become `All` before actual/recurring query objects are built.
- Both detail queries use the same validated filters passed to `buildBudgetPlanningViewModel`.
- Actual statuses, recurring `ACTIVE` status, relation/item includes, ordering, and absence of `take`/`skip` remain explicitly covered.
- Export failure tests confirm loader and builder errors reject without route fallback behavior.

## Verification

- Focused tests: 3 files passed, 22 tests passed.
- `npm run typecheck`: passed.
- Full `npm test` (run once): 75 files passed, 456 tests passed.
- `npm run build`: passed; Next.js production build compiled and generated successfully.
- Dashboard detector: `node C:\Users\Eltross\.agents\skills\impeccable\scripts\detect.mjs --json app/dashboard/page.tsx components/dashboard/BudgetPlanningView.tsx` returned `[]`.
- `git diff --check`: passed on the staged implementation and test diff before commit.

## Concerns

- Full tests and build emit the repository's existing Node `DEP0123` TLS ServerName deprecation warnings; commands still exit successfully.
