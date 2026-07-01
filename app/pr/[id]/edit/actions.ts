"use server";

import { redirect } from "next/navigation";
import { updateDraftPurchaseRequestFromFormData } from "@/lib/pr-draft";
import { getDraftSubmissionRedirectPath, readDraftSubmissionIntent } from "@/lib/pr-submit-intent";

export async function updateDraftPurchaseRequestAction(id: string, formData: FormData) {
  const intent = readDraftSubmissionIntent(formData);
  await updateDraftPurchaseRequestFromFormData(id, formData);
  redirect(getDraftSubmissionRedirectPath(id, intent));
}
