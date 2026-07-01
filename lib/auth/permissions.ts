export type Role = "ADMIN" | "IT_ADMIN" | "IT_USER" | "VIEWER";

export type Permission =
  | "PR_CREATE"
  | "PR_UPDATE_DRAFT"
  | "PR_GENERATE"
  | "PR_MARK_PRINTED"
  | "PR_UPLOAD_ATTACHMENT"
  | "PR_UPLOAD_SIGNED"
  | "PR_CANCEL_REISSUE"
  | "TEMPLATE_MANAGE"
  | "MASTER_DATA_MANAGE"
  | "BUDGET_MANAGE"
  | "USER_MANAGE"
  | "RUNNING_NUMBER_MANAGE"
  | "AUDIT_VIEW";

export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: Role;
};

const allPermissions: Permission[] = [
  "PR_CREATE",
  "PR_UPDATE_DRAFT",
  "PR_GENERATE",
  "PR_MARK_PRINTED",
  "PR_UPLOAD_ATTACHMENT",
  "PR_UPLOAD_SIGNED",
  "PR_CANCEL_REISSUE",
  "TEMPLATE_MANAGE",
  "MASTER_DATA_MANAGE",
  "BUDGET_MANAGE",
  "USER_MANAGE",
  "RUNNING_NUMBER_MANAGE",
  "AUDIT_VIEW",
];

export const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: allPermissions,
  IT_ADMIN: allPermissions,
  IT_USER: ["PR_CREATE", "PR_UPDATE_DRAFT", "PR_GENERATE", "PR_MARK_PRINTED", "PR_UPLOAD_ATTACHMENT", "PR_UPLOAD_SIGNED", "PR_CANCEL_REISSUE"],
  VIEWER: [],
};

export class AuthorizationError extends Error {
  status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function isRole(value: string | null | undefined): value is Role {
  return value === "ADMIN" || value === "IT_ADMIN" || value === "IT_USER" || value === "VIEWER";
}

export function normalizeRole(value: string | null | undefined): Role {
  return isRole(value) ? value : "VIEWER";
}

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function assertPermission(user: Pick<AuthenticatedUser, "role">, permission: Permission) {
  if (!hasPermission(user.role, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}
