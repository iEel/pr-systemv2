# Recurring PR Create UI/UX Improvement Design

Last updated: 2026-07-16

## Goal

Make the create-recurring-PR screen clearly communicate that the user is creating an annual schedule from an existing PR, reduce review effort before submission, and surface schedule readiness and date consequences without changing recurring-worker or schedule-creation behavior.

## Approved Direction

Keep the existing single-page form and reorganize it into a main editing column plus a sticky summary/action column on desktop. Reuse the current app shell, `SectionHeader`, `Card`, `Badge`, `Field`, `Button`, and PR item editor patterns. Do not introduce a wizard, modal, new visual language, or new backend workflow.

## Page Structure

The page contains these regions in order:

1. A page-level `SectionHeader` with `h1`, the bilingual title `Create Recurring PR Schedule / สร้างกำหนดการ PR ประจำปี`, a concise explanation, and a neutral `Schedule setup` badge.
2. A source-PR banner that identifies the originating PR and explains that changes affect only future recurring Drafts, not the source PR.
3. A responsive two-column layout:
   - Main column: schedule identity, annual rule, copied PR header snapshot, and item snapshot.
   - Side column: sticky readiness, next occurrence, responsible user, and actions.
4. On viewports below the desktop breakpoint, the layout becomes one column and the summary/action card follows the editable content.

The source banner follows the existing clone-source treatment in `components/pr/PRForm.tsx`: blue informational styling, traceability label, and a compact review badge.

## Source PR Context

`RecurringScheduleFormValue` gains a display-only `sourcePurchaseRequestLabel` populated from `PurchaseRequest.prNo`, falling back to `Draft pending`. The existing hidden `sourcePurchaseRequestId` remains authoritative for submission and server validation.

The banner copy must state:

- which PR supplied the snapshot;
- that editing the schedule does not modify the source PR; and
- that attachments, PR number, PDF, signed file, and audit history are not copied.

The Cancel action continues to return to the source PR and its label becomes `Back to source PR` in create mode. Edit mode keeps `Cancel` because it does not have the same creation context.

## Form Information Hierarchy

The main column preserves the existing five logical sections but uses shorter, task-oriented titles:

1. `Schedule details` — schedule name and responsible user.
2. `Annual renewal rule` — renewal month, renewal day, and lead days.
3. `PR snapshot` — company/branch, department, division, category, purpose, purchase method, and remark.
4. `Items and services` — the reusable PR line editor.
5. The next-run preview moves into the summary column instead of remaining a separate full-width footer card.

Month options display localized Thai month names with their numeric values retained in submitted form data. Helper copy stays brief and explains consequences rather than repeating labels.

The page uses the language of schedules consistently. Breadcrumb/page copy must say `Create Schedule`, never `Create PR`, on this route.

## Readiness And Submission

Add a pure UI helper that derives a readiness result from:

- trimmed schedule name;
- responsible user selection;
- category selection; and
- renewal preview validity.

The helper returns `ready: boolean` and a stable list of missing or invalid requirements. The summary renders either:

- a positive `Ready to create` state; or
- `Complete N required fields` followed by the missing labels.

The `Create Schedule` button is disabled while the known requirements are incomplete, while the server action is pending, or while the renewal preview is invalid. Server-side validation remains authoritative and existing error rendering remains intact.

The form controls for schedule name, responsible user, and category become controlled only as needed to update readiness immediately. Existing initial values and submitted field names do not change.

## Renewal Preview States

Add a pure presentation helper that compares the scheduled Draft date with the current Asia/Bangkok date and returns one of:

- `upcoming` when the scheduled Draft date is after today;
- `dueToday` when it equals today; or
- `overdue` when it is before today.

Copy rules:

- `upcoming`: show `Next Draft` with the formatted date.
- `dueToday`: show `Due today` and explain that the worker will create the Draft on its next run.
- `overdue`: show `Due immediately` and explain that the worker will catch up on its next run.
- invalid date: show the existing invalid-date error and block submission.

The renewal date remains visible beside the Draft timing state. No date calculation or worker behavior changes.

## Summary Card

The sticky summary card contains:

- readiness badge and missing-field list;
- renewal date;
- Draft timing state and date;
- selected responsible user label;
- create/save button; and
- back/cancel action.

It uses the same `xl:sticky xl:top-20 xl:self-start` pattern as the standard PR form. The primary action is full width. The summary must remain readable without relying on color alone.

## Item Editor Accessibility

Extend `PRItemEditor` with an optional accessible-label prefix or equivalent label builder. Each editable row control receives a unique accessible name that includes the row number and field purpose, for example:

- `Row 1 type`
- `Row 1 account code`
- `Row 1 description`
- `Row 1 quantity`
- `Row 1 unit cost`

Existing visible table headers and remove-button labels remain unchanged. Other PR-form uses of `PRItemEditor` receive the same accessible naming improvement without changing submitted data.

The page must contain exactly one `h1`, retain logical `h2` section headings, and avoid heading-level jumps. Mixed Thai and English copy should use bilingual labels intentionally rather than alternating languages unpredictably.

## Responsive Behavior

- Desktop (`xl` and above): main content plus a 22rem sticky summary column.
- Tablet and mobile: one column; cards use existing spacing and the summary follows the item editor.
- The item editor retains its horizontal-overflow behavior where necessary.
- No fixed heights are introduced.
- Primary and secondary actions retain at least the existing 40px minimum target height.

## Error Handling

- Existing action-level and field-level server errors remain visible and announced through their current alert behavior.
- A server error re-enables the submit button after the pending state ends.
- Client readiness never replaces server validation.
- Invalid renewal days continue to use the month-aware maximum-day rule.
- If the source label is unavailable, render `Draft pending`; never expose a raw database ID as the primary label.

## Testing

Use test-first development.

1. Unit tests for readiness with empty, partial, complete, and invalid-date inputs.
2. Unit tests for `upcoming`, `dueToday`, and `overdue` Draft timing states using fixed date-only values.
3. Source-mapping test confirming `sourcePurchaseRequestLabel` uses PR number and falls back to `Draft pending`.
4. Component-source assertions for the page `h1`, source banner, sticky summary, disabled readiness behavior, localized month labels, and accessible row labels.
5. Existing recurring schedule parsing, date, worker, and page tests remain green.
6. Typecheck and production build.
7. Manual Chrome verification at the current desktop viewport plus one narrow responsive viewport, covering initial incomplete state, completed readiness state without submitting, overdue messaging, and keyboard-visible focus.

## Non-Goals

- No database migration or schema change.
- No change to annual recurrence calculation, worker scheduling, catch-up, or Draft creation.
- No stepper or modal flow.
- No redesign of the Recurring PR list or detail pages.
- No attachment-copying behavior.
- No automatic PR category inference beyond the existing source data.
- No creation of a recurring schedule during visual verification.

## Acceptance Criteria

- The user can identify the page, source PR, and non-destructive snapshot behavior before interacting with the form.
- The user can see what is missing before attempting submission.
- A past scheduled Draft date is described as due immediately rather than as a future Draft.
- The primary action is disabled until known required inputs are complete and the renewal date is valid.
- The summary and action remain visible while reviewing the desktop form.
- Every editable item-row control has a unique accessible name.
- The layout remains usable on desktop and narrow viewports.
- Existing server validation and recurring schedule behavior are unchanged.
