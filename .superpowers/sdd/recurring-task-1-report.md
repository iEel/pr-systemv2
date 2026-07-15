# Annual Recurring PR Task 1 Report

## Scope

Implemented the annual recurring PR schema, SQL Server migration, recurring-management RBAC contract, and authenticated route boundary.

## RED Evidence

Command:

```powershell
npm test -- tests/recurring-pr-schema.test.ts tests/auth-permissions.test.ts tests/auth-route-access.test.ts
```

Result: failed as expected before implementation. The focused suite reported three failures: the recurring migration file was absent, `ADMIN` lacked `PR_RECURRING_MANAGE`, and `/recurring-pr` was not a protected application path. The schema test was adjusted from an absent-file read error to an explicit migration-exists assertion, then the command was rerun and failed through assertions only.

## GREEN Evidence

Commands:

```powershell
npm test -- tests/recurring-pr-schema.test.ts tests/auth-permissions.test.ts tests/auth-route-access.test.ts
npx prisma validate
```

Results:

- Focused Vitest suite passed: 3 files, 9 tests.
- Prisma schema validation passed.

## Files

- `prisma/schema.prisma`
- `prisma/migrations/000010_annual_recurring_pr/migration.sql`
- `lib/auth/permissions.ts`
- `lib/auth/route-access.ts`
- `tests/recurring-pr-schema.test.ts`
- `tests/auth-permissions.test.ts`
- `tests/auth-route-access.test.ts`
- `.superpowers/sdd/recurring-task-1-report.md`

## Commit

`Add annual recurring PR data model`

## Limitations

- The migration was not applied to a database, per Task 1 scope.
- `npm run prisma:generate` now passes after the controller stopped the worktree dev server that had held `node_modules/.prisma/client/query_engine-windows.dll.node` open.

## P2 Regression Coverage Follow-up

Fix commit: `b356f762a457c322455a5545a44b9941ec4acb69` - `Add recurring PR migration regression coverage`

The structural migration test normalizes SQL whitespace before asserting all six check constraints, both composite unique constraints, the filtered unique generated-PR index, all recurring foreign keys and delete actions, catalog idempotency guards, and nullable Prisma `SetNull` relation declarations.

### RED Evidence

After adding the assertions, a controlled temporary mutation changed `RecurringPurchaseRequestRun_purchaseRequestId_fkey` from `ON DELETE SET NULL` to `ON DELETE NO ACTION`. The command below failed only in `keeps every recurring foreign key and its delete behavior`, with the missing generated-PR `SET NULL` contract in the assertion output. The migration was then restored exactly.

```powershell
npm test -- tests/recurring-pr-schema.test.ts
```

### GREEN And Verification Evidence

```powershell
npm test -- tests/recurring-pr-schema.test.ts tests/auth-permissions.test.ts tests/auth-route-access.test.ts
npx prisma validate
npm run prisma:generate
npm test
npm run typecheck
git diff --check
```

Results:

- Focused suite passed: 3 files, 12 tests.
- Prisma schema validation passed.
- Prisma Client generation passed after the dev server was stopped.
- Full suite passed: 56 files, 293 tests. Node emitted TLS ServerName deprecation warnings, but Vitest completed successfully.
- TypeScript typecheck passed.
- Diff check passed.

## P2 Relation Assertion Scope Follow-up

Fix commit: `f2c2eaf742709d18c719035befa18587dbe254b3` - `Scope recurring Prisma relation assertions`

The Prisma checks now extract the exact `RecurringPurchaseRequestSchedule` and `RecurringPurchaseRequestRun` model blocks and require each relation's full `@relation(...)` signature through its closing parenthesis. Catalog guard assertions now include each expected table's `parent_object_id` or `object_id` predicate.

### Equivalent Mutation Evidence

The source and generated-run checks each make an in-memory copy of their own model block, change only that block's `onDelete: SetNull` to `onDelete: NoAction`, and assert that the corresponding full relation signature no longer matches. This independently proves both removals are detected without modifying the production Prisma schema or migration.

### Verification Evidence

```powershell
npm test -- tests/recurring-pr-schema.test.ts tests/auth-permissions.test.ts tests/auth-route-access.test.ts
npx prisma validate
npm run prisma:generate
npm run typecheck
git diff --check
```

Results:

- Focused suite passed: 3 files, 14 tests.
- Prisma schema validation and client generation passed.
- TypeScript typecheck passed.
- Diff check passed.
