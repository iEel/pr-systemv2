# Phase 4.1 Auth.js Session And RBAC Design

## Goal

Add a real authentication and authorization boundary for the IT PR DMS while keeping the design ready for future AD/LDAP authentication.

## Decisions

- Use Auth.js for session handling.
- Start with a Credentials provider that authenticates against the existing SQL Server `User` table.
- Use SQL Server `User.role` as the authoritative role source.
- Do not add Auth.js adapter tables in this phase. JWT sessions carry the minimal user identity and role, and the app can refresh DB user data where needed.
- Keep AD/LDAP as a future provider behind the same authentication boundary. AD/LDAP will prove identity; SQL Server will still decide role.

## Roles And Permissions

Initial roles:

- `ADMIN`
- `IT_ADMIN`
- `IT_USER`
- `VIEWER`

Initial permissions:

- `PR_CREATE`
- `PR_UPDATE_DRAFT`
- `PR_GENERATE`
- `PR_MARK_PRINTED`
- `PR_UPLOAD_SIGNED`
- `PR_CANCEL_REISSUE`
- `TEMPLATE_MANAGE`
- `AUDIT_VIEW`

Permission rules:

- `ADMIN` receives all permissions.
- `IT_ADMIN` can manage PR document-control flows and templates.
- `IT_USER` can create and update drafts, generate PDFs, mark printed, upload signed documents, cancel, and reissue.
- `VIEWER` can view protected app pages but cannot run document-control commands.

## Architecture

Auth.js lives at the root `auth.ts` and exports `handlers`, `auth`, `signIn`, and `signOut`. The route handler at `app/api/auth/[...nextauth]/route.ts` exposes Auth.js HTTP endpoints.

Authentication logic stays in `lib/auth/local-provider.ts`. It validates username/password against the SQL Server `User` table and returns only active users.

Authorization logic is split between `lib/auth/permissions.ts` for pure role rules and `lib/auth/current-user.ts` for server-side `requirePermission(permission)` and `requireCurrentUser()` helpers. Command modules call these helpers and receive the authenticated user id instead of looking up the seeded `admin` user.

The app frame becomes session-aware. The topbar displays the logged-in user's display name and role. The login page submits to Auth.js credentials sign-in. Logout signs out through Auth.js.

## Command Boundaries

The following commands must use the logged-in user for `createdById`, `uploadedById`, and `AuditLog.actorId`:

- Draft create and update.
- Generate PDF.
- Mark printed.
- Upload signed document.
- Cancel and reissue.
- Template upload, validate, activate, and archive.

If a user is missing, inactive, or lacks permission, the command throws an authorization error before mutating business data.

## Route Protection

Protected app routes redirect anonymous users to `/login`. The login page redirects authenticated users to `/dashboard`.

This phase protects app pages and server actions. Fine-grained read restrictions by company/branch are out of scope.

## AD/LDAP Future Path

Future AD/LDAP work adds a provider implementation that authenticates against directory services and then finds or provisions a matching SQL Server `User`. Role remains read from SQL Server `User.role`.

The future provider should produce the same identity shape:

- `id`
- `username`
- `displayName`
- `email`
- `role`

No document-control command should need to change when AD/LDAP replaces or supplements the local credentials provider.

## Error Handling

- Invalid credentials return a generic login failure.
- Inactive users cannot sign in.
- Missing sessions redirect from page routes and throw authorization errors in server actions.
- Insufficient permissions throw a clear `Forbidden` authorization error.
- Audit logs must not include passwords, session tokens, or raw credentials.

## Testing

Unit tests cover:

- Role-to-permission mapping.
- Permission checks for allowed and denied roles.
- Local credential validation for invalid, inactive, and valid users through an injectable verifier boundary.
- Command helper behavior uses provided/current actor ids instead of seeded `admin`.

Runtime verification covers:

- Login with seeded admin user.
- Topbar displays the authenticated user.
- Protected route redirects when signed out.
- A PR/template command writes audit history with the authenticated user id.
