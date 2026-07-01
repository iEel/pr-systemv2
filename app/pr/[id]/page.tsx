import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { PRDetail } from "@/components/pr/PRDetail";
import { getPurchaseRequestDetail } from "@/lib/purchase-requests";

export const dynamic = "force-dynamic";

export default async function PRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPurchaseRequestDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <AppFrame>
      <PRDetail detail={detail} />
    </AppFrame>
  );
}