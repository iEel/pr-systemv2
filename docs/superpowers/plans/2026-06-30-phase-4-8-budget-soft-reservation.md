# Phase 4.8 Budget Soft Reservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track PR draft reservations and issued usage in Budget Master without blocking PR creation or issuance when budget is missing or insufficient.

**Architecture:** Add a focused `lib/budget-tracking.ts` helper with pure matching/math functions and transaction-aware adjustment functions. Wire the helper into existing PR transactions in `lib/pr-draft.ts`, `lib/pr-generate.ts`, and `lib/pr-document-control.ts`; keep warning status in audit metadata rather than adding database columns.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 6 SQL Server adapter, Vitest.

---

## File Map

- Create: `lib/budget-tracking.ts`
  - Pure budget reference, matching, bucket math, warning status, and Prisma transaction adjustment helpers.
- Create: `tests/budget-tracking.test.ts`
  - Unit tests for matching priority, missing budget, reservation math, issue/cancel math, and clamp behavior.
- Modify: `lib/pr-draft.ts`
  - Reserve budget on draft create; update reservation on draft edit; add budget result to audit metadata.
- Modify: `lib/pr-generate.ts`
  - Move draft reservation to used budget after successful render while setting status to `GENERATED`; add budget result to audit metadata.
- Modify: `lib/pr-document-control.ts`
  - Reverse used budget on cancel; reserve replacement draft on reissue; add budget result to audit metadata.
- Modify: `DEVELOPER_HANDOFF.md`, `docs/BUDGET_MASTER.md`, `docs/FEATURES.md`, `docs/QA_CHECKLIST.md`
  - Document soft budget behavior and verification results.

---

### Task 1: Budget Tracking Helper Tests

**Files:**
- Create: `tests/budget-tracking.test.ts`
- Create after RED: `lib/budget-tracking.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/budget-tracking.test.ts` with tests that import these intended APIs:

```ts
import { describe, expect, test } from "vitest";
import {
  adjustBudgetBuckets,
  buildBudgetReference,
  selectBudgetMatch,
  type BudgetCandidate,
} from "../lib/budget-tracking";

const exact: BudgetCandidate = {
  budgetAmount: "1000.00",
  branchId: "br_hq",
  companyId: "co_sonic",
  departmentId: "dep_it",
  id: "budget_exact",
  reservedAmount: "100.00",
  usedAmount: "200.00",
  year: 2026,
};

const allBranches: BudgetCandidate = {
  ...exact,
  branchId: null,
  id: "budget_all",
};

describe("budget tracking helpers", () => {
  test("matches exact branch budget before all-branches fallback", () => {
    const reference = buildBudgetReference({
      branchId: "br_hq",
      companyId: "co_sonic",
      departmentId: "dep_it",
      documentDate: new Date("2026-06-30T00:00:00.000Z"),
      totalAmount: "250.00",
    });

    expect(selectBudgetMatch(reference, [allBranches, exact])?.id).toBe("budget_exact");
  });

  test("falls back to all-branches budget and reports missing when none match", () => {
    const reference = buildBudgetReference({
      branchId: "br_other",
      companyId: "co_sonic",
      departmentId: "dep_it",
      documentDate: new Date("2026-06-30T00:00:00.000Z"),
      totalAmount: "250.00",
    });

    expect(selectBudgetMatch(reference, [allBranches])?.id).toBe("budget_all");
    expect(selectBudgetMatch(reference, [])).toBeNull();
  });

  test("updates reserved and used buckets without blocking over-budget states", () => {
    expect(adjustBudgetBuckets(exact, { reservedDelta: 950, usedDelta: 0 })).toMatchObject({
      reservedAmount: "1050.00",
      status: "OVER_BUDGET",
    });

    expect(adjustBudgetBuckets(exact, { reservedDelta: -25, usedDelta: 25 })).toMatchObject({
      reservedAmount: "75.00",
      usedAmount: "225.00",
      status: "MATCHED",
    });
  });

  test("clamps subtract operations at zero", () => {
    expect(adjustBudgetBuckets(exact, { reservedDelta: -500, usedDelta: -500 })).toMatchObject({
      reservedAmount: "0.00",
      usedAmount: "0.00",
      status: "MATCHED",
    });
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- tests/budget-tracking.test.ts
```

Expected: FAIL because `lib/budget-tracking.ts` does not exist.

- [ ] **Step 3: Implement minimal helper**

Create `lib/budget-tracking.ts` with:

- `BudgetReference`
- `BudgetCandidate`
- `BudgetTrackingStatus = "MATCHED" | "OVER_BUDGET" | "MISSING"`
- `buildBudgetReference()`
- `selectBudgetMatch()`
- `adjustBudgetBuckets()`
- transaction helper stubs used by later tasks:
  - `reserveDraftBudget()`
  - `updateDraftBudgetReservation()`
  - `issueDraftBudget()`
  - `reverseUsedBudget()`

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- tests/budget-tracking.test.ts
```

Expected: PASS.

---

### Task 2: Wire Draft Create And Edit

**Files:**
- Modify: `lib/pr-draft.ts`
- Modify: `tests/pr-draft.test.ts`

- [ ] **Step 1: Write failing source contract test**

Add a test to `tests/pr-draft.test.ts` asserting:

```ts
import { readFileSync } from "node:fs";

test("draft create and update call soft budget reservation helpers", () => {
  const source = readFileSync("lib/pr-draft.ts", "utf8");

  expect(source).toContain("reserveDraftBudget");
  expect(source).toContain("updateDraftBudgetReservation");
  expect(source).toContain("budgetStatus");
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- tests/pr-draft.test.ts
```

Expected: FAIL because draft code has not imported or called the helper.

- [ ] **Step 3: Implement draft integration**

In `lib/pr-draft.ts`:

- import `buildBudgetReference`, `reserveDraftBudget`, and `updateDraftBudgetReservation`
- on create, build a budget reference from new draft data and call `reserveDraftBudget(tx, reference)`
- include returned status in `Draft created` audit metadata
- on update, select current draft budget fields before update
- build previous and next references and call `updateDraftBudgetReservation(tx, previousReference, nextReference)`
- include returned status in `Draft updated` audit metadata

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- tests/pr-draft.test.ts tests/budget-tracking.test.ts
```

Expected: PASS.

---

### Task 3: Wire Issue PR

**Files:**
- Modify: `lib/pr-generate.ts`
- Modify: `tests/pr-generate.test.ts`

- [ ] **Step 1: Write failing source contract test**

Add a test to `tests/pr-generate.test.ts` asserting:

```ts
import { readFileSync } from "node:fs";

test("issue PR moves soft budget reservation into used amount", () => {
  const source = readFileSync("lib/pr-generate.ts", "utf8");

  expect(source).toContain("issueDraftBudget");
  expect(source).toContain("budgetReference");
  expect(source).toContain("budgetStatus");
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- tests/pr-generate.test.ts
```

Expected: FAIL because Issue PR does not call `issueDraftBudget`.

- [ ] **Step 3: Implement issue integration**

In `lib/pr-generate.ts`:

- import `buildBudgetReference` and `issueDraftBudget`
- return `budgetReference` from the first allocation transaction
- after render succeeds, call `issueDraftBudget(tx, allocation.budgetReference)` inside the final transaction that sets `status = "GENERATED"`
- include returned status in `Generated PDF` audit metadata

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- tests/pr-generate.test.ts tests/budget-tracking.test.ts
```

Expected: PASS.

---

### Task 4: Wire Cancel And Reissue

**Files:**
- Modify: `lib/pr-document-control.ts`
- Modify: `tests/pr-document-control.test.ts`

- [ ] **Step 1: Write failing source contract test**

Add a test to `tests/pr-document-control.test.ts` asserting:

```ts
import { readFileSync } from "node:fs";

test("cancel and reissue update soft budget tracking", () => {
  const source = readFileSync("lib/pr-document-control.ts", "utf8");

  expect(source).toContain("reverseUsedBudget");
  expect(source).toContain("reserveDraftBudget");
  expect(source).toContain("budgetStatus");
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- tests/pr-document-control.test.ts
```

Expected: FAIL because cancel and reissue do not call budget tracking helpers.

- [ ] **Step 3: Implement cancel/reissue integration**

In `lib/pr-document-control.ts`:

- import `buildBudgetReference`, `reverseUsedBudget`, and `reserveDraftBudget`
- for cancel, select PR budget fields, call `reverseUsedBudget(tx, reference)`, and add result to `Cancelled` audit metadata
- for reissue, after replacement draft is created, build a reference from replacement fields and call `reserveDraftBudget(tx, reference)`
- add result to the replacement `Draft created` audit metadata

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- tests/pr-document-control.test.ts tests/budget-tracking.test.ts
```

Expected: PASS.

---

### Task 5: Docs And Verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/BUDGET_MASTER.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/QA_CHECKLIST.md`

- [ ] **Step 1: Update docs**

Document:

- Soft budget control does not block PRs.
- Draft reserves budget when a matching active budget exists.
- Issue moves reserved to used.
- Cancel reverses used.
- Missing/over-budget states are stored as audit warning metadata.

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm test -- tests/budget-tracking.test.ts tests/pr-draft.test.ts tests/pr-generate.test.ts tests/pr-document-control.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run typecheck
npx prisma validate
npm run build
```

Expected: all commands exit 0. Prisma/MSSQL `DEP0123` IP ServerName warning may remain non-blocking.
