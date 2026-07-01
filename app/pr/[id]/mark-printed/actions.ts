"use server";

import { redirect } from "next/navigation";
import { markPurchaseRequestPrinted } from "@/lib/pr-document-control";

export async function markPurchaseRequestPrintedAction(id: string) {
  await markPurchaseRequestPrinted(id);
  redirect(`/pr/${id}`);
}
