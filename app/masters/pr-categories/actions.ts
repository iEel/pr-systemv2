"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildPrCategoryHref,
  createPrCategoryFromFormData,
  readPrCategoryRedirectFilters,
  setPrCategoryActiveFromFormData,
  updatePrCategoryFromFormData,
} from "@/lib/pr-category-master";

function redirectBackToPrCategories(formData: FormData) {
  redirect(buildPrCategoryHref(readPrCategoryRedirectFilters(formData)));
}

export async function createPrCategoryAction(formData: FormData) {
  await createPrCategoryFromFormData(formData);
  revalidatePath("/masters/pr-categories");
  redirectBackToPrCategories(formData);
}

export async function updatePrCategoryAction(formData: FormData) {
  await updatePrCategoryFromFormData(formData);
  revalidatePath("/masters/pr-categories");
  redirectBackToPrCategories(formData);
}

export async function setPrCategoryActiveAction(isActive: boolean, formData: FormData) {
  await setPrCategoryActiveFromFormData(formData, isActive);
  revalidatePath("/masters/pr-categories");
  revalidatePath("/recurring-pr");
  redirectBackToPrCategories(formData);
}
