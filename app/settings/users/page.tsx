import { Fragment } from "react";
import Link from "next/link";
import { ChevronDown, Filter, KeyRound, Pencil, Plus, Save, ShieldAlert, ShieldCheck, UserPlus, X } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import {
  buildUserManagementHref,
  canResetUserPassword,
  getUserManagementPageData,
  manageableRoles,
  roleDescription,
  roleLabel,
  type UserManagementFilters,
  type UserManagementRow,
} from "@/lib/user-management";
import { createUserAction, resetUserPasswordAction, updateUserAction, verifyLdapUserAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type LinkTone = "primary" | "secondary";
type RoleTone = "info" | "neutral" | "purple" | "success";

function linkButtonClass(tone: LinkTone = "secondary") {
  const tones = {
    primary: "border-primary bg-primary text-white hover:bg-primary/90",
    secondary: "border-border bg-panel text-ink hover:bg-surface",
  };

  return `inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${tones[tone]}`;
}

function providerTabClass(active: boolean) {
  return `inline-flex min-h-8 items-center justify-center rounded px-3 py-1.5 text-sm font-bold transition-colors ${
    active ? "bg-white text-primary shadow-sm" : "text-muted hover:bg-white/70 hover:text-ink"
  }`;
}

function userBaseFilters(filters: UserManagementFilters) {
  return {
    includeInactive: filters.includeInactive,
    q: filters.q,
    role: filters.role,
  };
}

function userModeHref(filters: UserManagementFilters, row: UserManagementRow, mode: "edit" | "reset" | "read") {
  return buildUserManagementHref({
    ...userBaseFilters(filters),
    editUserId: mode === "edit" ? row.id : "",
    resetUserId: mode === "reset" ? row.id : "",
  });
}

function createUserHref(filters: UserManagementFilters, isOpen: boolean) {
  return buildUserManagementHref({
    ...userBaseFilters(filters),
    createUser: isOpen,
  });
}

function formatUserDate(value: string) {
  return value.slice(0, 10);
}

function roleTone(role: UserManagementRow["role"]): RoleTone {
  if (role === "ADMIN") return "purple";
  if (role === "IT_ADMIN") return "info";
  if (role === "IT_USER") return "success";

  return "neutral";
}

function redirectInputs(filters: UserManagementFilters) {
  return (
    <>
      <input name="redirectQ" type="hidden" value={filters.q} />
      <input name="redirectRole" type="hidden" value={filters.role} />
      <input name="redirectCreateUser" type="hidden" value={filters.createUser ? "1" : "0"} />
      <input name="redirectCreateAuthProvider" type="hidden" value={filters.createAuthProvider} />
      <input name="redirectLdapVerifiedDisplayName" type="hidden" value={filters.ldapVerifiedDisplayName} />
      <input name="redirectLdapVerifiedEmail" type="hidden" value={filters.ldapVerifiedEmail} />
      <input name="redirectLdapVerifiedUsername" type="hidden" value={filters.ldapVerifiedUsername} />
      <input name="includeInactive" type="hidden" value={filters.includeInactive ? "1" : "0"} />
    </>
  );
}

function roleOptions() {
  return manageableRoles.map((role) => (
    <option key={role} value={role}>
      {roleLabel(role)}
    </option>
  ));
}

function ActionFeedback({ filters }: { filters: UserManagementFilters }) {
  if (!filters.feedbackMessage || !filters.feedbackType) return null;

  const isSuccess = filters.feedbackType === "success";

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
        isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="status"
    >
      {filters.feedbackMessage}
    </div>
  );
}

function CompactRoleGuide() {
  return (
    <details aria-label="Role guide" className="group rounded-md border border-border bg-panel text-sm">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 font-bold text-ink">
        <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
        Show role guide
      </summary>
      <div className="grid gap-3 border-t border-border bg-surface p-3 xl:grid-cols-4">
        {manageableRoles.map((role) => (
          <div className="rounded-md border border-border bg-white px-3 py-2" key={role}>
            <Badge tone={roleTone(role)}>{roleLabel(role)}</Badge>
            <p className="mt-2 text-xs leading-5 text-muted">{roleDescription(role)}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function filterForm({ filters }: { filters: UserManagementFilters }) {
  return (
    <form className="grid gap-3 rounded-lg border border-border bg-panel p-4 lg:grid-cols-[minmax(16rem,1fr)_14rem_auto_auto]" method="get">
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Search
        <input className={inputClass()} defaultValue={filters.q} name="q" placeholder="username, display name, email" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Role
        <select className={inputClass()} defaultValue={filters.role} name="role">
          <option value="ALL">All roles</option>
          {roleOptions()}
        </select>
      </label>
      <label className="inline-flex min-h-10 items-center gap-2 self-end text-sm font-bold text-ink">
        <input className="h-4 w-4 rounded border-border" defaultChecked={filters.includeInactive} name="includeInactive" type="checkbox" value="1" />
        Include inactive
      </label>
      <div className="flex items-end gap-2">
        <Button className="min-h-10" type="submit">
          <Filter aria-hidden className="h-4 w-4" />
          Apply
        </Button>
        <Link className={linkButtonClass()} href="/settings/users">
          Reset
        </Link>
      </div>
    </form>
  );
}

function createUserForm({ filters }: { filters: UserManagementFilters }) {
  const isLdap = filters.createAuthProvider === "LDAP";

  return (
    <Card className="border-blue-200 bg-white shadow-none" id="new-user-panel">
      <form action={createUserAction} className="grid gap-4">
        {redirectInputs(filters)}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Create User</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {isLdap
                ? "Allowlist an AD/LDAP account while role ใน SQL Server ยังเป็นตัวกำหนดสิทธิ์ของระบบ"
                : "สร้าง local user สำหรับ MVP โดย role ใน SQL Server เป็นตัวกำหนดสิทธิ์ของระบบ"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-md border border-border bg-surface p-1">
              <Link className={providerTabClass(filters.createAuthProvider === "LOCAL")} href={buildUserManagementHref({ ...userBaseFilters(filters), createUser: true, createAuthProvider: "LOCAL" })}>
                Local
              </Link>
              <Link className={providerTabClass(filters.createAuthProvider === "LDAP")} href={buildUserManagementHref({ ...userBaseFilters(filters), createUser: true, createAuthProvider: "LDAP" })}>
                AD/LDAP
              </Link>
            </div>
            <Badge tone={isLdap ? "info" : "neutral"}>{isLdap ? "AD/LDAP" : "SQL Server User"}</Badge>
            <Link className={linkButtonClass()} href={createUserHref(filters, false)}>
              <X aria-hidden className="h-4 w-4" />
              Close
            </Link>
          </div>
        </div>
        {isLdap ? (
          <>
            <input name="authProvider" type="hidden" value="LDAP" />
            <input name="verifiedUsername" type="hidden" value={filters.ldapVerifiedUsername} />
            <div className="grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_13rem_auto] lg:items-end">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Short username
                <input
                  className={inputClass(filters.ldapVerifiedUsername ? "bg-slate-100 text-muted" : "")}
                  defaultValue={filters.ldapVerifiedUsername}
                  name="username"
                  placeholder="somchai.s"
                  readOnly={Boolean(filters.ldapVerifiedUsername)}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Role
                <select className={inputClass()} defaultValue="IT_USER" name="role">
                  {roleOptions()}
                </select>
              </label>
              <Button formAction={verifyLdapUserAction} type="submit" variant="secondary">
                <ShieldCheck aria-hidden className="h-4 w-4" />
                Verify AD User
              </Button>
            </div>
            {filters.ldapVerifiedUsername ? (
              <div className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div>{filters.ldapVerifiedDisplayName}</div>
                  <div className="text-xs">{filters.ldapVerifiedEmail || "-"}</div>
                </div>
                <Link className="text-xs font-bold text-emerald-900 underline-offset-4 hover:underline" href={buildUserManagementHref({ ...userBaseFilters(filters), createUser: true, createAuthProvider: "LDAP" })}>
                  Change AD user
                </Link>
              </div>
            ) : null}
            <div className="flex justify-end">
              {filters.ldapVerifiedUsername ? (
                <Button type="submit">
                  <Plus aria-hidden className="h-4 w-4" />
                  Create LDAP User
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <input name="authProvider" type="hidden" value="LOCAL" />
            <div className="grid gap-4 lg:grid-cols-5">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Username
                <input className={inputClass()} name="username" placeholder="somchai.s" required />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Display Name
                <input className={inputClass()} name="displayName" placeholder="Somchai S." required />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Email
                <input className={inputClass()} name="email" placeholder="user@example.local" type="email" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Role
                <select className={inputClass()} defaultValue="IT_USER" name="role">
                  {roleOptions()}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Initial Password
                <input className={inputClass()} minLength={8} name="password" placeholder="at least 8 chars" required type="password" />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                <Plus aria-hidden className="h-4 w-4" />
                Create User
              </Button>
            </div>
          </>
        )}
      </form>
    </Card>
  );
}

function editUserExpansion({ filters, row }: { filters: UserManagementFilters; row: UserManagementRow }) {
  return (
    <tr className="bg-blue-50/30">
      <td className="px-4 pb-5 pt-0" colSpan={5}>
        <form action={updateUserAction} className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          {redirectInputs(filters)}
          <input name="userId" type="hidden" value={row.id} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink">Edit profile</h3>
              <p className="mt-1 text-xs font-semibold text-muted">This action is audited and recorded in audit logs.</p>
            </div>
            <Link className={linkButtonClass()} href={userModeHref(filters, row, "read")}>
              <X aria-hidden className="h-4 w-4" />
              Close
            </Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_13rem_10rem_auto] lg:items-end">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Display Name
              <input className={inputClass()} defaultValue={row.displayName} name="displayName" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Email
              <input className={inputClass()} defaultValue={row.email || ""} name="email" type="email" />
            </label>
            {row.isCurrentUser ? (
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Role
                <input name="role" type="hidden" value={row.role} />
                <select className={inputClass("bg-slate-100 text-muted")} defaultValue={row.role} disabled>
                  {roleOptions()}
                </select>
              </label>
            ) : (
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Role
                <select className={inputClass()} defaultValue={row.role} name="role">
                  {roleOptions()}
                </select>
              </label>
            )}
            {row.isCurrentUser ? (
              <label className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-muted">
                <input name="isActive" type="hidden" value={row.isActive ? "true" : "false"} />
                <input className="h-4 w-4 rounded border-border" checked={row.isActive} disabled readOnly type="checkbox" />
                Active
              </label>
            ) : (
              <label className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-ink">
                <input className="h-4 w-4 rounded border-border" defaultChecked={row.isActive} name="isActive" type="checkbox" />
                Active
              </label>
            )}
            <Button className="min-h-10 px-3" type="submit" variant="secondary">
              <Save aria-hidden className="h-4 w-4" />
              Update User
            </Button>
          </div>
          {row.isCurrentUser ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Role is locked for your current session. You cannot deactivate or change the role of the account you are using.
            </p>
          ) : null}
        </form>
      </td>
    </tr>
  );
}

function resetPasswordExpansion({ filters, row }: { filters: UserManagementFilters; row: UserManagementRow }) {
  return (
    <tr className="bg-red-50/30">
      <td className="px-4 pb-5 pt-0" colSpan={5}>
        <form action={resetUserPasswordAction} className="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
          {redirectInputs(filters)}
          <input name="userId" type="hidden" value={row.id} />
          <div className="grid gap-4 lg:grid-cols-[minmax(14rem,20rem)_1fr_auto] lg:items-start">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-700">
                <ShieldAlert aria-hidden className="h-4 w-4" />
                Reset target
              </div>
              <div className="mt-2 font-bold text-ink">{row.username}</div>
              <div className="text-sm text-muted">{row.displayName}</div>
              <div className="text-xs text-muted">{row.email || "-"}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Open password reset</h3>
              <p className="mt-1 text-xs font-semibold text-red-700">Password reset requires confirmation. This action is audited.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-ink">
                  New Password
                  <input className={inputClass()} minLength={8} name="password" placeholder="at least 8 chars" required type="password" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-ink">
                  Confirm Password
                  <input className={inputClass()} minLength={8} name="passwordConfirm" placeholder="repeat password" required type="password" />
                </label>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">Password hashes are never shown or stored in audit metadata.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Link className={linkButtonClass()} href={userModeHref(filters, row, "read")}>
                <X aria-hidden className="h-4 w-4" />
                Close
              </Link>
              <Button className="min-h-10 px-3" type="submit" variant="danger">
                <KeyRound aria-hidden className="h-4 w-4" />
                Reset Password
              </Button>
            </div>
          </div>
        </form>
      </td>
    </tr>
  );
}

function userRow({ filters, row }: { filters: UserManagementFilters; row: UserManagementRow }) {
  const isEditing = filters.editUserId === row.id;
  const isResetting = filters.resetUserId === row.id;
  const canResetPassword = canResetUserPassword(row);

  return (
    <Fragment key={row.id}>
      <tr className="align-top hover:bg-slate-50">
        <td className={`${tableCellClass} min-w-64`}>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ink">{row.username}</span>
              {row.isCurrentUser ? <Badge tone="info">Current session</Badge> : null}
              <Badge tone={row.authProvider === "LDAP" ? "info" : "neutral"}>{row.providerLabel}</Badge>
            </div>
            <span className="text-sm font-semibold text-ink">{row.displayName}</span>
            <span className="text-sm text-muted">{row.email || "-"}</span>
          </div>
        </td>
        <td className={`${tableCellClass} min-w-40`}>
          <Badge tone={roleTone(row.role)}>{row.roleLabel}</Badge>
        </td>
        <td className={`${tableCellClass} min-w-32`}>
          <Badge tone={row.isActive ? "active" : "neutral"}>{row.status}</Badge>
        </td>
        <td className={`${tableCellClass} min-w-36 text-sm font-semibold text-muted`}>{formatUserDate(row.updatedAt)}</td>
        <td className={`${tableCellClass} min-w-72`}>
          <div className="flex flex-wrap justify-end gap-2">
            <Link className={linkButtonClass(isEditing ? "primary" : "secondary")} href={userModeHref(filters, row, "edit")}>
              <Pencil aria-hidden className="h-4 w-4" />
              Edit profile
            </Link>
            {canResetPassword ? (
              <Link className={linkButtonClass(isResetting ? "primary" : "secondary")} href={userModeHref(filters, row, "reset")}>
                <KeyRound aria-hidden className="h-4 w-4" />
                Open password reset
              </Link>
            ) : (
              <span className="inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-xs font-bold text-muted">
                {row.authProvider === "LDAP" ? "LDAP user passwords are managed by AD" : "Password reset is unavailable for this provider."}
              </span>
            )}
          </div>
        </td>
      </tr>
      {isEditing ? editUserExpansion({ filters, row }) : null}
      {isResetting && canResetPassword ? resetPasswordExpansion({ filters, row }) : null}
    </Fragment>
  );
}

function usersToolbar({ filters, totals }: { filters: UserManagementFilters; totals: { activeUsers: number; adminUsers: number; inactiveUsers: number; rowCount: number } }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Manage users</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            {totals.rowCount} visible users, {totals.activeUsers} active, {totals.adminUsers} admin-level, {totals.inactiveUsers} inactive.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <CompactRoleGuide />
          <Link className={linkButtonClass(filters.createUser ? "primary" : "secondary")} href={`${createUserHref(filters, true)}#new-user-panel`}>
            <UserPlus aria-hidden className="h-4 w-4" />
            New User
          </Link>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-semibold leading-5 text-blue-900">
        Password hashes are never shown. The signed-in admin cannot deactivate or change their own role from this screen.
      </div>
    </div>
  );
}

function usersTable({ filters, rows }: { filters: UserManagementFilters; rows: UserManagementRow[] }) {
  return (
    <TableWrap>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse">
          <thead>
            <tr>
              {["User", "Role", "Status", "Last Updated", "Actions"].map((head) => (
                <th className={`${tableHeaderClass} px-4 py-3`} key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm font-semibold text-muted" colSpan={5}>
                  No users match this view.
                </td>
              </tr>
            ) : (
              rows.map((row) => userRow({ filters, row }))
            )}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const { filters, rows, totals } = await getUserManagementPageData(params);

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="Users / Roles"
          description="จัดการ local user/password และ role ใน SQL Server ซึ่งจะยังเป็นตัวกำหนดสิทธิ์ของระบบตอนต่อ AD/LDAP"
          action={
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900">
              <ShieldCheck aria-hidden className="h-4 w-4" />
              Admin permission: USER_MANAGE
            </div>
          }
        />

        <ActionFeedback filters={filters} />
        {filterForm({ filters })}

        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="shadow-none">
            <div className="text-xs font-bold uppercase text-muted">Visible Users</div>
            <div className="mt-2 text-2xl font-bold text-ink">{totals.rowCount}</div>
          </Card>
          <Card className="shadow-none">
            <div className="text-xs font-bold uppercase text-muted">Active</div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{totals.activeUsers}</div>
          </Card>
          <Card className="shadow-none">
            <div className="text-xs font-bold uppercase text-muted">Admins</div>
            <div className="mt-2 text-2xl font-bold text-primary">{totals.adminUsers}</div>
          </Card>
          <Card className="shadow-none">
            <div className="text-xs font-bold uppercase text-muted">Inactive</div>
            <div className="mt-2 text-2xl font-bold text-muted">{totals.inactiveUsers}</div>
          </Card>
        </div>

        {usersToolbar({ filters, totals })}
        {usersTable({ filters, rows })}
        {filters.createUser ? createUserForm({ filters }) : null}
      </div>
    </AppFrame>
  );
}
