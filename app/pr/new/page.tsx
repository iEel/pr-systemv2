import { AppFrame } from "@/components/app/AppFrame";
import { PRForm } from "@/components/pr/PRForm";
import { getCloneablePurchaseRequestInitialValue, getDraftFormOptions } from "@/lib/pr-draft";
import { notFound } from "next/navigation";
import { createDraftPurchaseRequestAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ cloneFrom?: string | string[] }>;

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewPRPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const cloneFrom = readSearchParam(params.cloneFrom);
  const options = await getDraftFormOptions();
  const cloneContext = cloneFrom ? await getCloneablePurchaseRequestInitialValue(cloneFrom, options.defaultDocumentDate) : null;

  if (cloneFrom && !cloneContext) {
    notFound();
  }

  return (
    <AppFrame>
      <PRForm action={createDraftPurchaseRequestAction} cloneSource={cloneContext?.cloneSource} initialDraft={cloneContext?.initialDraft} options={options} />
    </AppFrame>
  );
}
