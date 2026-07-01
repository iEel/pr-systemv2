import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { getAuditLogCsv, readAuditLogFiltersFromSearchParams } from "@/lib/audit-logs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requirePermission("AUDIT_VIEW");

  const url = new URL(request.url);
  const csv = await getAuditLogCsv(readAuditLogFiltersFromSearchParams(url.searchParams));

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="audit-logs.csv"',
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
