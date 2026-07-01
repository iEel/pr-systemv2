"use server";

import { redirect } from "next/navigation";
import { generatePurchaseRequestPdf } from "@/lib/pr-generate";

export async function generatePurchaseRequestPdfAction(id: string) {
  await generatePurchaseRequestPdf(id);
  redirect(`/pr/${id}`);
}
