import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { PRForm } from "@/components/pr/PRForm";
import { getDraftFormOptions, getEditableDraftPurchaseRequest } from "@/lib/pr-draft";
import { updateDraftPurchaseRequestAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditPRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [options, initialDraft] = await Promise.all([
    getDraftFormOptions(),
    getEditableDraftPurchaseRequest(id),
  ]);

  if (!initialDraft) {
    notFound();
  }

  const action = updateDraftPurchaseRequestAction.bind(null, id);

  return (
    <AppFrame>
      <PRForm action={action} initialDraft={initialDraft} mode="edit" options={options} />
    </AppFrame>
  );
}
