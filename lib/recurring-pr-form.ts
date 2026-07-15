export type RecurringScheduleFormState = {
  fieldErrors: Record<string, string>;
  message: string | null;
};

export const initialRecurringScheduleFormState: RecurringScheduleFormState = { fieldErrors: {}, message: null };

export function resetDivisionForDepartmentChange(_previousDivisionId: string) {
  return "";
}
