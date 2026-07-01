"use server";

import { redirect } from "next/navigation";
import { cancelPurchaseRequest } from "@/lib/pr-document-control";

export async function cancelPurchaseRequestAction(id: string, formData: FormData) {
  const reason = String(formData.get("reason") || "");

  await cancelPurchaseRequest(id, reason);
  redirect(`/pr/${id}`);
}
