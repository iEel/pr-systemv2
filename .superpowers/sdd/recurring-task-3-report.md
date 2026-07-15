# Recurring Task 3 Report

## Scope

Implemented the recurring schedule snapshot form model and extracted the existing PR item table into a shared editor.

Files: `lib/recurring-pr.ts`, `components/pr/PRItemEditor.tsx`, `components/pr/PRForm.tsx`, `tests/recurring-pr.test.ts`, `tests/pr-item-editor-copy.test.ts`, and `tests/pr-form-workflow-copy.test.ts`.

Commit: `Add recurring schedule snapshot form model`

## RED Evidence

Before production implementation, `npm test -- tests/recurring-pr.test.ts tests/pr-item-editor-copy.test.ts tests/pr-form-workflow-copy.test.ts` exited 1. Vitest could not import the missing `lib/recurring-pr` module, and the PR item editor source tests failed because `components/pr/PRItemEditor.tsx` did not exist.

The public editor type contract was also added test-first. `npm test -- tests/pr-item-editor-copy.test.ts` exited 1 because `PRItemEditorValue` exposed `number | string` for `quantity` and `unitCost`, before the boundary conversion was added.

## GREEN Evidence

`npm test -- tests/recurring-pr.test.ts tests/pr-item-editor-copy.test.ts tests/pr-form-workflow-copy.test.ts tests/pr-draft.test.ts` exited 0 with 4 files and 34 tests passed.

Final verification: `npm test`, `npm run typecheck`, and `git diff --check` all exited 0. The full suite passed with 59 files and 310 tests. Vitest emitted the existing Node TLS ServerName deprecation warnings, with no test failures.

## Behavior Covered

- Parses trimmed annual schedule snapshots, valid month/day/lead-day rules, and required references.
- Preserves HEADING, ITEM, and DETAIL row order; normalizes HEADING/DETAIL numerics to zero; requires an ITEM row.
- Validates active schedule references and maps only editable PR header/item snapshot data, excluding controlled/generated metadata.
- Extracts the PR item editor without changing the PR form's `item*` repeated field names.
- Keeps PR totals in `PRForm` through the `PRItemEditor` totals callback.

## Limitations

- Database loading, schedule persistence, next-run calculation, and recurring schedule pages remain in the later scoped tasks.
- `PRItemEditor` accepts configurable field names for the future recurring form, but Task 3 does not create that form.
