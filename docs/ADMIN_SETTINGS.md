# Admin Settings

Last updated: 2026-06-30

Admin Settings covers SQL Server-backed user/role management and running-number settings.

## Routes

```text
/settings/users
/settings/running-numbers
```

## Users / Roles

`/settings/users` requires `USER_MANAGE`.

Admins can:

- list SQL Server users
- search by username, display name, or email
- filter by role
- include inactive users
- review a compact role guide before assigning permissions
- open `New User` to create local users with an initial password
- switch `New User` to `AD/LDAP`, verify a short AD username, and create a SQL allowlist row for that directory identity
- open `Edit profile` per row to update display name, email, role, and active state
- open `Open password reset` per local-user row to reset passwords with a visible target and confirmation field
- see provider badges for `Local`, `AD/LDAP`, or `Unknown`
- see inline success/error feedback after user actions

Rules:

- `User.role` remains the source of truth for RBAC.
- AD/LDAP authenticates identity only; SQL Server `User` rows remain the application allowlist, active/inactive switch, and role source.
- Passwords are hashed with the same `scrypt` format used by Auth.js credentials login.
- Local seeded admin remains a `LOCAL` fallback account.
- LDAP-backed users use AD passwords through Search + Bind; AD passwords are never stored in SQL Server.
- Password hashes are never rendered to the UI.
- Password reset requires confirmation before hashing and saving.
- Password reset is available only for exact `LOCAL` users. LDAP and unknown-provider rows fail closed.
- Password reset audit metadata never stores raw passwords or password hashes.
- The current admin cannot deactivate their own user or change their own role from the admin screen.
- The current session row is marked in the UI, and role/active controls are locked for that row before submit.
- Server-side self-protection still rejects self-deactivation and self-role changes even if a request bypasses the UI.

LDAP Search + Bind:

- Environment mode is controlled by `AUTH_MODE=LOCAL`, `LDAP`, or `HYBRID`.
- LDAP is enabled by `LDAP_ENABLED=true` and configured with `LDAP_URL`, service bind DN/password, `LDAP_BASE_DN`, and `LDAP_USER_FILTER`.
- Usernames are short names only, for example `veerapon.l`; email/domain formats are rejected.
- `Verify AD User` binds with the LDAP service account, searches the configured filter, and stores the verified username/display name/email in the page state.
- Creating an LDAP user re-verifies the same username server-side before inserting the SQL allowlist row.
- `User.externalUsername` stores the AD short username and `User.externalId` stores the stable LDAP identifier such as `objectGUID`.
- Current alpha UAT verification works through LDAPS on port `636`. The local `.env` uses `LDAP_TLS_REJECT_UNAUTHORIZED=false` until the AD certificate chain is trusted by Node.js; switch it back to `true` after installing or exposing the correct internal CA.

## Running Number Settings

`/settings/running-numbers` requires `RUNNING_NUMBER_MANAGE`.

Admins can:

- list `RunningNumberSetting` rows
- create global or scoped settings
- update prefix, year format, month format, padding, and current value
- preview the next number

UI notes:

- Running-number table rows use `RunningNumberSetting.id` as the React key, so rendering the `<tbody>` does not emit duplicate/missing key console warnings.

Rules:

- Document type and scope are fixed after create.
- Optional scope fields are `scopeCompanyId` and `scopeBranchId`.
- A branch scope must belong to the selected company.
- Duplicate `documentType + scopeCompanyId + scopeBranchId` rows are rejected before insert.
- Padding must be between 1 and 8.
- Current value must be non-negative.
- Preview uses the same formatter as PR Issue generation.

## Permissions

- `ADMIN` and `IT_ADMIN` have:
  - `USER_MANAGE`
  - `RUNNING_NUMBER_MANAGE`
- `IT_USER` and `VIEWER` do not have admin settings permissions.

## Audit Events

User events:

- `User created`
- `User updated`
- `User password reset`

Running-number events:

- `Running number setting created`
- `Running number setting updated`

## Main Files

- `app/settings/users/page.tsx`
- `app/settings/users/actions.ts`
- `app/settings/running-numbers/page.tsx`
- `app/settings/running-numbers/actions.ts`
- `lib/user-management.ts`
- `lib/running-number-settings.ts`
- `lib/auth/permissions.ts`
