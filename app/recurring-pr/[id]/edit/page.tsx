import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { RecurringScheduleForm } from "@/components/recurring-pr/RecurringScheduleForm";
import { requirePermission } from "@/lib/auth/current-user";
import { getRecurringScheduleDetail, getRecurringScheduleOptions } from "@/lib/recurring-pr";
import { updateRecurringScheduleAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditRecurringSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("PR_RECURRING_MANAGE");
  const { id } = await params;
  const detail = await getRecurringScheduleDetail(id);
  if (!detail) notFound();
  const options = await getRecurringScheduleOptions(detail.formValue.responsibleUserId);
  return <AppFrame><RecurringScheduleForm action={updateRecurringScheduleAction.bind(null, id)} cancelHref={`/recurring-pr/${id}`} initialValue={detail.formValue} mode="edit" options={options} /></AppFrame>;
}
