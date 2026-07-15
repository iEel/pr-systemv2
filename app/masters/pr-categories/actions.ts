"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPrCategoryFromFormData, setPrCategoryActiveFromFormData, updatePrCategoryFromFormData } from "@/lib/pr-category-master";

export async function createPrCategoryAction(formData: FormData) {
  await createPrCategoryFromFormData(formData);
  revalidatePath("/masters/pr-categories");
  redirect("/masters/pr-categories");
}

export async function updatePrCategoryAction(formData: FormData) {
  await updatePrCategoryFromFormData(formData);
  revalidatePath("/masters/pr-categories");
  redirect("/masters/pr-categories");
}

export async function setPrCategoryActiveAction(isActive: boolean, formData: FormData) {
  await setPrCategoryActiveFromFormData(formData, isActive);
  revalidatePath("/masters/pr-categories");
  redirect("/masters/pr-categories");
}
