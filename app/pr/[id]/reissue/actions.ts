"use server";

import { redirect } from "next/navigation";
import { reissuePurchaseRequest } from "@/lib/pr-document-control";

export async function reissuePurchaseRequestAction(id: string, formData: FormData) {
  const categoryId = formData.get("categoryId");
  const replacement = await reissuePurchaseRequest(id, typeof categoryId === "string" ? categoryId : "");

  redirect(`/pr/${replacement.id}`);
}
