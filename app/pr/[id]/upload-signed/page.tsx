import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { SignedUpload } from "@/components/pr/SignedUpload";
import { getPurchaseRequestDetail } from "@/lib/purchase-requests";

export default async function UploadSignedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPurchaseRequestDetail(id);

  if (!detail || detail.header.status !== "Printed") {
    notFound();
  }

  return (
    <AppFrame>
      <SignedUpload purchaseRequestId={id} />
    </AppFrame>
  );
}
