import { hasPermission, type Permission, type Role } from "./permissions";

const protectedPrefixes = ["/audit-logs", "/dashboard", "/forbidden", "/masters", "/pr", "/reports", "/settings", "/templates"];

const publicPrefixes = ["/api/auth", "/_next", "/login"];

const permissionRoutes: Array<{ permission: Permission; prefix: string }> = [
  { permission: "USER_MANAGE", prefix: "/settings/users" },
  { permission: "RUNNING_NUMBER_MANAGE", prefix: "/settings/running-numbers" },
  { permission: "BUDGET_MANAGE", prefix: "/masters/budgets" },
  { permission: "MASTER_DATA_MANAGE", prefix: "/masters/pr-categories" },
  { permission: "MASTER_DATA_MANAGE", prefix: "/masters/companies" },
  { permission: "TEMPLATE_MANAGE", prefix: "/templates" },
  { permission: "AUDIT_VIEW", prefix: "/audit-logs" },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedAppPath(pathname: string) {
  if (publicPrefixes.some((prefix) => matchesPrefix(pathname, prefix))) return false;

  return protectedPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function requiredPermissionForPath(pathname: string): Permission | null {
  return permissionRoutes.find((route) => matchesPrefix(pathname, route.prefix))?.permission || null;
}

export function canRoleAccessPath(role: Role, pathname: string) {
  const permission = requiredPermissionForPath(pathname);

  return permission ? hasPermission(role, permission) : true;
}

export function buildLoginRedirectUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const loginUrl = new URL("/login", url.origin);

  loginUrl.searchParams.set("callbackUrl", `${url.pathname}${url.search}`);

  return loginUrl;
}

export function buildForbiddenRedirectUrl(requestUrl: string, permission: Permission) {
  const url = new URL(requestUrl);
  const forbiddenUrl = new URL("/forbidden", url.origin);

  forbiddenUrl.searchParams.set("permission", permission);
  forbiddenUrl.searchParams.set("from", url.pathname);

  return forbiddenUrl;
}
