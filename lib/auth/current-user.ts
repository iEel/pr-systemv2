import { assertPermission, AuthorizationError, normalizeRole, type AuthenticatedUser, type Permission } from "./permissions";

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const { auth } = await import("../../auth");
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.username || !user.displayName) {
    return null;
  }

  return {
    displayName: user.displayName,
    email: user.email || null,
    id: user.id,
    role: normalizeRole(user.role),
    username: user.username,
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    const error = new AuthorizationError("Authentication required");
    error.status = 401;
    throw error;
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireCurrentUser();
  assertPermission(user, permission);

  return user;
}
