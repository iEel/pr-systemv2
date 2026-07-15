import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { PRDetail } from "@/components/pr/PRDetail";
import { getPurchaseRequestDetail } from "@/lib/purchase-requests";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function PRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const detail = await getPurchaseRequestDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <AppFrame>
      <PRDetail canManageRecurring={hasPermission(user.role, "PR_RECURRING_MANAGE")} detail={detail} />
    </AppFrame>
  );
}
