import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { CancelPRForm } from "@/components/pr/CancelPRForm";
import { getPurchaseRequestDetail } from "@/lib/purchase-requests";

export default async function CancelPurchaseRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPurchaseRequestDetail(id);

  if (!detail || !["Generated", "Printed", "Signed"].includes(detail.header.status)) {
    notFound();
  }

  return (
    <AppFrame>
      <CancelPRForm prNo={detail.header.prNo} purchaseRequestId={id} />
    </AppFrame>
  );
}
