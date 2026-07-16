# Recurring Worker Final Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve recurring schedule VAT snapshots and prevent lifecycle/reference changes from producing an invalid annual Draft.

**Architecture:** Keep ordinary PR drafts on their current 7% default while allowing the recurring snapshot to supply an explicit VAT rate. Make the serializable worker transaction re-load the schedule with all required references before it claims a run, creates a Draft, reserves budget, and writes audit data; use the refreshed snapshot throughout that transaction.

**Tech Stack:** Next.js, TypeScript, Prisma SQL Server, Vitest.

## Global Constraints

- Do not run destructive live database setup.
- Preserve Draft-only generated records, rollback semantics, and retry behavior.
- Keep one annual occurrence per schedule per invocation.
- Use TDD: every production change follows an observed focused-test failure.

---

### Task 1: Worker Regression Tests

**Files:**
- Modify: `tests/recurring-pr-worker-repository.test.ts`

- [ ] Add a non-7% schedule VAT test asserting persisted Draft totals and the budget reference total.
- [ ] Add deterministic outer-read-to-transaction interleaving tests for pause and category deactivation.
- [ ] Add duplicate-skip audit tests for existing occurrence and unique-claim contention.
- [ ] Run `npm test -- tests/recurring-pr-worker-repository.test.ts` and observe the expected failures.

### Task 2: Scoped Draft And Worker Changes

**Files:**
- Modify: `lib/pr-money.ts`
- Modify: `lib/pr-draft.ts`
- Modify: `lib/recurring-pr-worker.ts`

- [ ] Add an optional VAT-rate path to draft total/create helpers while retaining 7% for ordinary form inputs.
- [ ] Supply the schedule VAT snapshot to recurring Draft creation and budget reservation.
- [ ] Re-read schedule and references in one serializable transaction before annual run claim/Draft creation; return skipped for a newly paused schedule and persist one failed run for newly inactive references.
- [ ] Record a System `Duplicate annual run skipped` audit for existing and contention skips.
- [ ] Run the focused worker test file until it passes.

### Task 3: Operational Documentation

**Files:**
- Modify: `docs/RECURRING_PR.md`
- Modify: `docs/OPERATIONS_RUNBOOK.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] Clarify one annual occurrence per invocation and audit/lifecycle guarantees.
- [ ] Record migration and prior development evidence accurately without representing these fixes as live-verified.

### Task 4: Verification And Reporting

**Files:**
- Create: `.superpowers/sdd/recurring-final-fix-report.md`

- [ ] Run focused recurring tests, full tests, typecheck, Prisma validation, build, and `git diff --check`.
- [ ] Record TDD red/green evidence and exact verification outcomes in the report.
- [ ] Inspect the final diff and commit the scoped change.
