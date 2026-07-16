export type RecurringScheduleFormState = {
  fieldErrors: Record<string, string>;
  message: string | null;
};

export type RecurringScheduleReadinessInput = {
  categoryId: string;
  name: string;
  previewValid: boolean;
  responsibleUserId: string;
};

export const initialRecurringScheduleFormState: RecurringScheduleFormState = { fieldErrors: {}, message: null };

export const thaiMonthOptions: ReadonlyArray<{ label: string; value: number }> = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
].map((label, index) => ({ label, value: index + 1 }));

export function getRecurringScheduleReadiness(input: RecurringScheduleReadinessInput) {
  const missing = [
    !input.name.trim() ? "Schedule name" : null,
    !input.responsibleUserId ? "Responsible user" : null,
    !input.categoryId ? "PR category" : null,
    !input.previewValid ? "Valid renewal date" : null,
  ].filter((item): item is string => Boolean(item));

  return { ready: missing.length === 0, missing };
}

export function getRecurringDraftTimingState(scheduledDraftDate: Date, today: string) {
  const scheduled = scheduledDraftDate.toISOString().slice(0, 10);

  return scheduled === today ? "dueToday" : scheduled < today ? "overdue" : "upcoming";
}

export function resetDivisionForDepartmentChange(_previousDivisionId: string) {
  return "";
}
