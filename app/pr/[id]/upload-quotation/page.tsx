import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { QuotationUpload } from "@/components/pr/QuotationUpload";
import { getPurchaseRequestDetail } from "@/lib/purchase-requests";

const quotationUploadableStatuses = ["Draft", "Generated", "Printed", "Signed"];

export default async function UploadQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPurchaseRequestDetail(id);

  if (!detail || !quotationUploadableStatuses.includes(detail.header.status)) {
    notFound();
  }

  return (
    <AppFrame>
      <QuotationUpload purchaseRequestId={id} prNo={detail.header.prNo} status={detail.header.status} />
    </AppFrame>
  );
}
