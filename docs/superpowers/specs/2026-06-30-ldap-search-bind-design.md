# LDAP Search + Bind Design

Date: 2026-06-30

## Goal

Add AD/LDAP authentication for IT users while keeping SQL Server `User.role` as the authoritative permission source. The system should accept short usernames only, such as `somchai.s`, and should not bulk-sync directory users into SQL Server.

## User Decision

- Use LDAP Search + Bind.
- Keep local SQL Server login for the MVP admin fallback.
- Manage roles and active/inactive state in SQL Server.
- Accept short username input only, not email or display name.
- Preferred username format is `sAMAccountName`, for example `somchai.s`.

## Current Context

The app currently uses Auth.js Credentials with SQL Server users. `auth.ts` calls `verifySqlServerCredentials()`, which reads `User.username`, validates `User.passwordHash`, and puts the SQL Server role into the JWT session. `/settings/users` creates local users with an initial password, supports role/profile updates, and can reset local passwords.

Existing docs already state the future AD/LDAP direction: directory services authenticate identity, while SQL Server remains the source for `User.role`.

## Scope

This phase will add a hybrid authentication path:

- Local users continue to sign in with SQL Server `username + passwordHash`.
- LDAP users sign in with AD password through Search + Bind.
- SQL Server stores the allowlisted application user row, selected role, active state, and stable directory identity.
- `/settings/users` can create an LDAP-backed user after verifying the short username against AD/LDAP.
- Password reset remains available only for local users.

## Non-Goals

- No bulk AD sync.
- No automatic user creation at login.
- No role mapping from AD groups in this phase.
- No email login in this phase.
- No replacement of Auth.js.
- No blocking changes to PR, Reports, Templates, Budget, or Audit workflows.

## Architecture

### Authentication Mode

The system will support a hybrid mode:

- `LOCAL`: use SQL Server password verification only.
- `LDAP`: use LDAP Search + Bind only.
- `HYBRID`: try the provider configured on the SQL Server user row; keep local admin available.

The recommended default for this LAN MVP is `HYBRID`.

### LDAP Search + Bind Flow

1. Normalize the submitted username by trimming and lowercasing.
2. Reject input that is not a short username. The login field should accept values like `somchai.s`, not `somchai@domain.local`.
3. Search SQL Server `User` by `username`.
4. Reject login if no SQL user row exists or `isActive=false`.
5. If the SQL user is local, verify the local password hash.
6. If the SQL user is LDAP-backed:
   - bind to LDAP using the configured service account;
   - search under `LDAP_BASE_DN` with `LDAP_USER_FILTER`, defaulting to `(sAMAccountName={{username}})`;
   - require exactly one user result;
   - read the user's DN and stable identity attribute;
   - bind again with the found DN and submitted password;
   - return the SQL user with the SQL role if bind succeeds.

### SQL Server Role Boundary

LDAP proves identity only. SQL Server decides whether that identity can use the app and which role it has:

- `User.role` remains the RBAC source of truth.
- `User.isActive` can immediately disable access even if AD login still works.
- `User.externalUsername` stores the AD username such as `somchai.s`.
- `User.externalId` stores a stable identifier from AD, preferably `objectGUID` encoded as a stable string.

### Local Admin Fallback

The seeded `admin` account remains local. This keeps emergency access available when AD/LDAP is unavailable, misconfigured, or under maintenance.

## Environment

Add environment variables for LDAP:

```env
AUTH_MODE=HYBRID
LDAP_ENABLED=true
LDAP_URL=ldap://server.example.local:389
LDAP_BIND_DN=CN=ldap-reader,OU=Service Accounts,DC=example,DC=local
LDAP_BIND_PASSWORD=
LDAP_BASE_DN=DC=example,DC=local
LDAP_USER_FILTER=(sAMAccountName={{username}})
LDAP_ID_ATTRIBUTE=objectGUID
LDAP_DISPLAY_NAME_ATTRIBUTE=displayName
LDAP_EMAIL_ATTRIBUTE=mail
LDAP_TLS_REJECT_UNAUTHORIZED=true
```

Secrets remain in `.env` only. `.env.example` should show keys without real values.

## Data Model

Extend `User` with provider metadata:

- `authProvider`: `LOCAL` or `LDAP`.
- `externalUsername`: AD short username for LDAP users.
- `externalId`: stable AD identifier such as `objectGUID`.
- `lastLoginAt`: latest successful login timestamp.

`passwordHash` should become nullable, because LDAP users do not store AD passwords. Server-side validation must require a password hash for local users and must reject password reset on LDAP users.

## Users / Roles UX

`/settings/users` should remain table-first, but the New User panel will support two account types:

- Local user: current flow with initial password.
- LDAP user: short username + Verify AD User.

LDAP creation flow:

1. Admin enters `somchai.s`.
2. Admin clicks `Verify AD User`.
3. The system searches LDAP with the service account.
4. If found, the panel displays display name, email, and external identity confirmation.
5. Admin chooses SQL role and saves.
6. Audit log records the LDAP user creation without writing LDAP passwords or secrets.

LDAP user rows should show a provider badge. Password reset should be hidden or disabled for LDAP users with copy explaining that the password is managed by AD.

## Error Handling

Login errors should stay generic to avoid leaking which part failed:

- invalid username/password;
- user not allowlisted;
- SQL user inactive;
- LDAP user not found;
- LDAP bind failed.

Admin verification errors can be more specific because the page requires `USER_MANAGE`:

- LDAP configuration missing;
- LDAP user not found;
- duplicate SQL username;
- duplicate external identity;
- ambiguous LDAP result.

LDAP outage should not break local admin login in `HYBRID` mode.

## Security

- Never store AD passwords.
- Never log LDAP bind passwords.
- Escape LDAP filter values before search.
- Reject email/domain input for login and LDAP user creation.
- Keep all user mutation routes behind `USER_MANAGE`.
- Keep audit metadata free of secrets and password hashes.
- Production deployment must use LDAPS on port 636 or StartTLS with a trusted internal CA. If the LAN certificate is not ready during development, `LDAP_TLS_REJECT_UNAUTHORIZED=false` must remain a documented development-only setting.

## Testing

Add focused tests for:

- username normalization and short-username validation;
- LDAP filter escaping;
- LDAP Search + Bind success with mocked LDAP client;
- no SQL row means login denied even if LDAP bind would succeed;
- inactive SQL row denies login;
- local admin login still works in hybrid mode;
- LDAP user cannot use local password reset;
- `/settings/users` shows provider badges and LDAP verify/save controls;
- duplicate `externalId` is rejected;
- docs and `.env.example` include LDAP configuration.

## Documentation Updates

When implemented, update:

- `DEVELOPER_HANDOFF.md`
- `docs/ADMIN_SETTINGS.md`
- `docs/DATA_MODEL.md`
- `docs/FEATURES.md`
- `docs/QA_CHECKLIST.md`
- `.env.example`

## Rollout Notes

Start with one LDAP allowlisted user, `somchai.s`, before adding more users. Verify local admin login after enabling LDAP. After the first LDAP login succeeds, test deactivation in SQL Server to confirm SQL still controls access.
