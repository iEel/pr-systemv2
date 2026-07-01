# Phase 4.1 Auth.js Session And RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Auth.js-backed login/session handling and RBAC guards while keeping SQL Server `User.role` authoritative for future AD/LDAP.

**Architecture:** Install Auth.js and add a JWT session boundary using Credentials provider. Keep local credential verification and permission rules in focused `lib/auth/*` modules, then replace seeded `admin` lookups in document/template commands with authenticated actors. Protect routes through middleware and surface the authenticated user in the shell.

**Tech Stack:** Next.js App Router, Auth.js/NextAuth beta, Prisma SQL Server, Vitest, TypeScript.

---

## File Structure

- Create `auth.ts`: Auth.js configuration and exported route/session helpers.
- Create `app/api/auth/[...nextauth]/route.ts`: Auth.js route handler.
- Create `middleware.ts`: protected-route redirect rules.
- Create `lib/auth/permissions.ts`: role/permission map, authorization error, pure guards, and server helpers.
- Create `lib/auth/local-provider.ts`: username/password verification against SQL Server.
- Create `types/next-auth.d.ts`: session/JWT type augmentation.
- Modify `app/login/page.tsx`: real credential form.
- Create `app/login/actions.ts`: sign-in server action.
- Create `app/logout/actions.ts`: sign-out server action.
- Modify `components/app/AppFrame.tsx` and `components/app/Topbar.tsx`: session-aware shell.
- Modify `lib/pr-draft.ts`, `lib/pr-generate.ts`, `lib/pr-document-control.ts`, `lib/template-management.ts`: authenticated actor and permission checks.
- Modify `prisma/seed.mjs`: seed a usable dev admin password hash.
- Add tests in `tests/auth-permissions.test.ts`, `tests/auth-local-provider.test.ts`, and focused command tests where practical.

## Task 1: Permission Model

- [ ] **Step 1: Write failing permission tests**

Create `tests/auth-permissions.test.ts` with tests for `hasPermission`, `assertPermission`, and the initial role matrix.

- [ ] **Step 2: Verify red**

Run: `npm.cmd test -- tests/auth-permissions.test.ts`

Expected: FAIL because `lib/auth/permissions` does not exist.

- [ ] **Step 3: Implement permission helpers**

Create `lib/auth/permissions.ts` with `Role`, `Permission`, `AuthorizationError`, `hasPermission`, `assertPermission`, `requirePermission`, and `requireCurrentUser`.

- [ ] **Step 4: Verify green**

Run: `npm.cmd test -- tests/auth-permissions.test.ts`

Expected: PASS.

## Task 2: Local Credential Boundary

- [ ] **Step 1: Write failing local-provider tests**

Create `tests/auth-local-provider.test.ts` covering invalid username, invalid password, inactive user, and valid user.

- [ ] **Step 2: Verify red**

Run: `npm.cmd test -- tests/auth-local-provider.test.ts`

Expected: FAIL because local provider helpers do not exist.

- [ ] **Step 3: Implement password verification and user shaping**

Create `lib/auth/local-provider.ts` with an injectable `verifyLocalCredentials` helper using Node crypto `scrypt`.

- [ ] **Step 4: Verify green**

Run: `npm.cmd test -- tests/auth-local-provider.test.ts`

Expected: PASS.

## Task 3: Auth.js Wiring

- [ ] **Step 1: Install Auth.js package**

Run: `npm.cmd install next-auth@beta`

- [ ] **Step 2: Add Auth.js config and routes**

Create `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, and `types/next-auth.d.ts`.

- [ ] **Step 3: Add login/logout actions and middleware**

Modify login page into a POSTing credentials form, add logout action, and protect routes with middleware.

- [ ] **Step 4: Verify types**

Run: `npm.cmd run typecheck`

Expected: PASS.

## Task 4: Authenticated Actor In Commands

- [ ] **Step 1: Write failing actor injection tests**

Add focused tests proving draft create data and document/template command helpers can use an explicit actor id.

- [ ] **Step 2: Verify red**

Run focused tests and confirm missing actor APIs fail.

- [ ] **Step 3: Replace seeded admin lookups**

Update draft, generate, document-control, and template-management commands to call `requirePermission()` and use the returned user id for created/uploaded/audit actor fields.

- [ ] **Step 4: Verify green**

Run focused tests.

## Task 5: Session-Aware Shell

- [ ] **Step 1: Update AppFrame and Topbar**

Pass session user from the server shell into the client topbar and add logout.

- [ ] **Step 2: Validate login route behavior**

Check `/login`, `/dashboard`, and protected redirects over localhost.

## Task 6: Docs And Final Verification

- [ ] **Step 1: Update docs**

Update `docs/PHASE_2_STATUS.md` and `docs/BACKEND_INTEGRATION.md` with Phase 4.1 status and AD/LDAP future path.

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npx.cmd prisma validate
npm.cmd audit
npm.cmd run build
```

Expected: all commands exit 0.
