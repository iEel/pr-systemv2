import { AppFrame } from "@/components/app/AppFrame";
import { PRList } from "@/components/pr/PRList";
import { getPurchaseRequestListItems } from "@/lib/purchase-requests";

export const dynamic = "force-dynamic";

export default async function PRPage() {
  const requests = await getPurchaseRequestListItems();

  return (
    <AppFrame>
      <PRList requests={requests} />
    </AppFrame>
  );
}