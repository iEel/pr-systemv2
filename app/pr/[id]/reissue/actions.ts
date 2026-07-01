"use server";

import { redirect } from "next/navigation";
import { reissuePurchaseRequest } from "@/lib/pr-document-control";

export async function reissuePurchaseRequestAction(id: string) {
  const replacement = await reissuePurchaseRequest(id);

  redirect(`/pr/${replacement.id}`);
}
