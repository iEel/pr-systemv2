import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Card, SectionHeader } from "@/components/ui/Card";

type SearchParams = Record<string, string | string[] | undefined>;

function searchValue(params: SearchParams | undefined, key: string) {
  const value = params?.[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const permission = searchValue(params, "permission") || "required permission";
  const from = searchValue(params, "from") || "protected page";

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader title="Access denied" description="คุณไม่มีสิทธิ์เข้าใช้งานส่วนนี้ของระบบ IT PR Document Management" />
        <Card className="max-w-3xl shadow-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700">
              <ShieldAlert aria-hidden className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-ink">This page requires additional permission</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Required permission: <span className="font-bold text-ink">{permission}</span>
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Requested page: <span className="font-bold text-ink">{from}</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">ติดต่อผู้ดูแลระบบเพื่อปรับ role ใน SQL Server หากคุณควรมีสิทธิ์ใช้งานส่วนนี้</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90" href="/dashboard">
                  Back to Dashboard
                </Link>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-panel px-4 py-2 text-sm font-bold text-ink hover:bg-surface"
                  href="/"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppFrame>
  );
}
