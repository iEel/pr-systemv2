"use server";

import { redirect } from "next/navigation";
import { uploadSignedDocumentForPurchaseRequest } from "@/lib/pr-document-control";

export async function uploadSignedPurchaseRequestAction(id: string, formData: FormData) {
  const file = formData.get("signedFile");

  if (!(file instanceof File)) {
    throw new Error("Signed document file is required");
  }

  await uploadSignedDocumentForPurchaseRequest(id, file);
  redirect(`/pr/${id}`);
}
