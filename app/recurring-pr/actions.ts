"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DraftValidationError } from "../../lib/pr-draft";
import { initialRecurringScheduleFormState, type RecurringScheduleFormState } from "../../lib/recurring-pr-form";
import {
  createRecurringScheduleFromFormData,
  setRecurringScheduleStatus,
  updateRecurringScheduleFromFormData,
} from "@/lib/recurring-pr";

function revalidateRecurringSchedule(id: string) {
  revalidatePath("/recurring-pr");
  revalidatePath(`/recurring-pr/${id}`);
}

function validationState(error: unknown): RecurringScheduleFormState | null {
  return error instanceof DraftValidationError
    ? { fieldErrors: error.fieldErrors, message: "Please review the highlighted schedule fields." }
    : null;
}

export async function createRecurringScheduleAction(sourcePrId: string, _previousState: RecurringScheduleFormState = initialRecurringScheduleFormState, formData?: FormData): Promise<RecurringScheduleFormState> {
  let created: { id: string };
  try {
    created = await createRecurringScheduleFromFormData(sourcePrId, formData || new FormData());
  } catch (error) {
    const state = validationState(error);
    if (state) return state;
    throw error;
  }
  revalidateRecurringSchedule(created.id);
  redirect(`/recurring-pr/${created.id}`);
}

export async function updateRecurringScheduleAction(id: string, _previousState: RecurringScheduleFormState = initialRecurringScheduleFormState, formData?: FormData): Promise<RecurringScheduleFormState> {
  let updated: { id: string };
  try {
    updated = await updateRecurringScheduleFromFormData(id, formData || new FormData());
  } catch (error) {
    const state = validationState(error);
    if (state) return state;
    throw error;
  }
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
