"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createRunningNumberSettingFromFormData, updateRunningNumberSettingFromFormData } from "@/lib/running-number-settings";

function redirectBackToRunningNumbers() {
  redirect("/settings/running-numbers");
}

export async function createRunningNumberSettingAction(formData: FormData) {
  await createRunningNumberSettingFromFormData(formData);
  revalidatePath("/settings/running-numbers");
  redirectBackToRunningNumbers();
}

export async function updateRunningNumberSettingAction(formData: FormData) {
  await updateRunningNumberSettingFromFormData(formData);
  revalidatePath("/settings/running-numbers");
  redirectBackToRunningNumbers();
}
