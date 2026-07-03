# PR Kanban Board View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Board view to PR Documents so users can scan PR workflow status by column without replacing the existing table.

**Architecture:** Keep `/pr` as the single PR Documents route and add a client-side `Table | Board` segmented control inside `components/pr/PRList.tsx`. Reuse existing filtered rows and `buildPurchaseRequestRowActions()` so the board and table show the same scope and lifecycle links. Keep the board read-only; status changes still go through explicit document-control commands.

**Tech Stack:** Next.js App Router, React client state, Tailwind CSS, lucide-react icons, Vitest source-level regression tests.

---

### Task 1: Board View Regression Tests

**Files:**
- Modify: `tests/pr-list-actions.test.ts`

- [x] Add a source-level regression test that expects `components/pr/PRList.tsx` to expose a `Table | Board` view switch.
- [x] Assert that the board renders active workflow columns for Draft, Generated, and Printed.
- [x] Assert that Signed, Cancelled, and Reissued are grouped into a Completed/Archived archive area.
- [x] Assert that the board uses existing lifecycle URLs such as Preview, Issue PR, Mark Printed, Upload Signed, and Clone as Draft.
- [x] Run `npm test -- tests/pr-list-actions.test.ts` and verify the new test fails before implementation.

### Task 2: PRList Board UI

**Files:**
- Modify: `components/pr/PRList.tsx`

- [x] Add `viewMode` client state with a segmented `Table` / `Board` control.
- [x] Keep filters shared by both views.
- [x] Render Board columns for active workflow statuses: Draft, Generated, and Printed.
- [x] Put Signed, Cancelled, and Reissued into a compact Completed/Archived group below the main columns.
- [x] Default the archive group to Latest Signed and cap the preview so a large signed history does not dominate the board.
- [x] Make cards dense and operational: PR No., company/branch, total, date, creator, and next action.
- [x] Use explicit quick-action links/forms only; do not add drag-and-drop status changes.

### Task 3: Docs And Verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/QA_CHECKLIST.md`

- [x] Document that PR Documents now has table and board views.
- [x] Add QA checks for board filters, status columns, empty columns, archived rows, and quick actions.
- [x] Run focused tests, full tests, typecheck, build, and diff check.
