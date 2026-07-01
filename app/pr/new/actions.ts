"use server";

import { redirect } from "next/navigation";
import { createDraftPurchaseRequestFromFormData } from "@/lib/pr-draft";
import { getDraftSubmissionRedirectPath, readDraftSubmissionIntent } from "@/lib/pr-submit-intent";

export async function createDraftPurchaseRequestAction(formData: FormData) {
  const intent = readDraftSubmissionIntent(formData);
  const created = await createDraftPurchaseRequestFromFormData(formData);
  redirect(getDraftSubmissionRedirectPath(created.id, intent));
}
