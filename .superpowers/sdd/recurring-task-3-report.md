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

## P2 Review Remediation

Addressed both findings in `recurring-task-3-review.md`.

- `RecurringScheduleReferenceLookup` now requires every loaded relationship proof. A branch must carry a company record, and a supplied division must carry its owning `departmentId`; runtime validation rejects missing, inactive, or mismatched proofs.
- `PRForm` initialization and `PRItemEditor` callback totals now share `calculatePRItemEditorTotals`, which uses the persisted draft line and aggregate rounding helpers. The `0.3333 x 1.00` regression resolves to subtotal `0.33`, VAT `0.02`, and total `0.35` before and after mount.

RED evidence: `npm test -- tests/recurring-pr.test.ts tests/pr-item-editor-copy.test.ts` exited 1. The missing-company and missing-division-owner cases did not throw, and the shared totals helper was absent.

GREEN evidence: `npm test -- tests/recurring-pr.test.ts tests/pr-item-editor-copy.test.ts tests/pr-form-workflow-copy.test.ts tests/pr-draft.test.ts` exited 0 with 4 files and 40 tests passed. Final `npm test`, `npm run typecheck`, and `git diff --check` exited 0; the full suite passed with 59 files and 316 tests.

Follow-up commit: `Fix recurring validation and editor totals rounding`.
