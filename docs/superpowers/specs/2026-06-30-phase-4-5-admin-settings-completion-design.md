# Phase 4.5 Admin Settings Completion Design

Last updated: 2026-06-30

## Goal

Finish the remaining admin shell pages by wiring Users/Roles and Running Number Settings to SQL Server with permission guards, audit logs, and focused tests.

## Scope

- Replace `/settings/users` placeholder content with SQL Server-backed user management.
- Replace `/settings/running-numbers` placeholder content with SQL Server-backed running-number settings management.
- Add `USER_MANAGE` and `RUNNING_NUMBER_MANAGE` permissions for `ADMIN` and `IT_ADMIN`.
- Use existing SQL Server `User.role` as the role source of truth, preserving the future AD/LDAP model where directory auth only verifies identity.
- Use existing `hashPassword()` from `lib/auth/local-provider.ts` for admin password reset and new-user passwords.
- Reuse existing running-number formatting logic from `lib/pr-generate.ts` so previewed numbers match Issue PR behavior.
- Write audit logs for all admin mutations.
- Keep Budget reservation/enforcement explicitly out of this phase.

## Users / Roles

`/settings/users` will support:

- listing users from SQL Server
- search by username, display name, or email
- role filter
- include inactive toggle
- creating a user with username, display name, optional email, role, and initial password
- editing display name, email, role, and active state
- resetting a user password

Safety rules:

- Username is immutable after create.
- Passwords must be at least 8 characters.
- Only known roles are accepted.
- Admins cannot deactivate or change the role of their own current session user from this screen.
- Password hashes are never rendered.

## Running Number Settings

`/settings/running-numbers` will support:

- listing `RunningNumberSetting` rows from SQL Server
- creating a setting with document type, prefix, year format, month format, padding, current value, and optional company/branch scope
- updating prefix, year format, month format, padding, and current value
- showing a next-number preview from the same formatter used by PR generation

Safety rules:

- `documentType` and scope are immutable after create.
- Branch scope must belong to the selected company.
- Duplicate `documentType + scopeCompanyId + scopeBranchId` rows are rejected before insert.
- Padding must be between 1 and 8.
- Current value must be non-negative.

## Audit

Audit events:

- `User created`
- `User updated`
- `User password reset`
- `Running number setting created`
- `Running number setting updated`

Audit metadata should include readable admin details, but never raw passwords or password hashes.

## Testing

- Unit tests cover user helper parsing, self-protection, row mapping, password reset data, and role validation.
- Unit tests cover running-number helper parsing, scope validation, duplicate detection, preview formatting, and row mapping.
- Permission tests cover `USER_MANAGE` and `RUNNING_NUMBER_MANAGE`.
- Page-copy tests assert both settings pages no longer import `ModulePage` and include real CRUD affordances.
- Full verification runs `npm test`, `npm run typecheck`, `npx prisma validate`, and `npm run build`.
