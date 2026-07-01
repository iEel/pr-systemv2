"use server";

import { redirect } from "next/navigation";
import { uploadQuotationForPurchaseRequest } from "@/lib/pr-document-control";

export async function uploadQuotationPurchaseRequestAction(id: string, formData: FormData) {
  const file = formData.get("quotationFile");

  if (!(file instanceof File)) {
    throw new Error("Quotation file is required");
  }

  await uploadQuotationForPurchaseRequest(id, file);
  redirect(`/pr/${id}`);
}
