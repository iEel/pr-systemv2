"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildBudgetMasterHref,
  createBudgetFromFormData,
  readBudgetRedirectFilters,
  setBudgetActiveFromFormData,
  updateBudgetFromFormData,
} from "@/lib/budget-master";

function redirectBackToBudgetMaster(formData: FormData) {
  redirect(buildBudgetMasterHref(readBudgetRedirectFilters(formData)));
}

export async function createBudgetAction(formData: FormData) {
  await createBudgetFromFormData(formData);
  revalidatePath("/masters/budgets");
  redirectBackToBudgetMaster(formData);
}

export async function updateBudgetAction(formData: FormData) {
  await updateBudgetFromFormData(formData);
  revalidatePath("/masters/budgets");
  redirectBackToBudgetMaster(formData);
}

export async function deactivateBudgetAction(formData: FormData) {
  await setBudgetActiveFromFormData(formData, false);
  revalidatePath("/masters/budgets");
  redirectBackToBudgetMaster(formData);
}

export async function reactivateBudgetAction(formData: FormData) {
  await setBudgetActiveFromFormData(formData, true);
  revalidatePath("/masters/budgets");
  redirectBackToBudgetMaster(formData);
}
