"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createRecurringScheduleFromFormData,
  setRecurringScheduleStatus,
  updateRecurringScheduleFromFormData,
} from "@/lib/recurring-pr";

function revalidateRecurringSchedule(id: string) {
  revalidatePath("/recurring-pr");
  revalidatePath(`/recurring-pr/${id}`);
}

export async function createRecurringScheduleAction(sourcePrId: string, formData: FormData) {
  const created = await createRecurringScheduleFromFormData(sourcePrId, formData);
  revalidateRecurringSchedule(created.id);
  redirect(`/recurring-pr/${created.id}`);
}

export async function updateRecurringScheduleAction(id: string, formData: FormData) {
  const updated = await updateRecurringScheduleFromFormData(id, formData);
  revalidateRecurringSchedule(updated.id);
  redirect(`/recurring-pr/${updated.id}`);
}

export async function pauseRecurringScheduleAction(id: string) {
  const updated = await setRecurringScheduleStatus(id, "PAUSED");
  revalidateRecurringSchedule(updated.id);
  redirect(`/recurring-pr/${updated.id}`);
}

export async function resumeRecurringScheduleAction(id: string) {
  const updated = await setRecurringScheduleStatus(id, "ACTIVE");
  revalidateRecurringSchedule(updated.id);
  redirect(`/recurring-pr/${updated.id}`);
}
