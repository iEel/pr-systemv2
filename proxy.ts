import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { normalizeRole } from "@/lib/auth/permissions";
import {
  buildForbiddenRedirectUrl,
  buildLoginRedirectUrl,
  canRoleAccessPath,
  isProtectedAppPath,
  requiredPermissionForPath,
} from "@/lib/auth/route-access";

const authSecret = process.env.AUTH_SECRET || "dev-only-it-pr-dms-auth-secret-change-before-production";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: authSecret });

  if (!token?.id) {
    return NextResponse.redirect(buildLoginRedirectUrl(request.url));
  }

  const role = normalizeRole(typeof token.role === "string" ? token.role : null);
  const permission = requiredPermissionForPath(pathname);

  if (permission && !canRoleAccessPath(role, pathname)) {
    return NextResponse.redirect(buildForbiddenRedirectUrl(request.url, permission));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
