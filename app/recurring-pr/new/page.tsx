import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app/AppFrame";
import { RecurringScheduleForm } from "@/components/recurring-pr/RecurringScheduleForm";
import { requirePermission } from "@/lib/auth/current-user";
import { getRecurringScheduleOptions, getRecurringScheduleSource } from "@/lib/recurring-pr";
import { createRecurringScheduleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewRecurringSchedulePage({ searchParams }: { searchParams?: Promise<{ sourcePrId?: string | string[] }> }) {
  await requirePermission("PR_RECURRING_MANAGE");
  const params = searchParams ? await searchParams : {};
  const sourcePrId = Array.isArray(params.sourcePrId) ? params.sourcePrId[0] : params.sourcePrId;
  if (!sourcePrId) notFound();
  const [initialValue, options] = await Promise.all([getRecurringScheduleSource(sourcePrId), getRecurringScheduleOptions()]);
  if (!initialValue) notFound();
  return <AppFrame><RecurringScheduleForm action={createRecurringScheduleAction.bind(null, sourcePrId)} cancelHref={`/pr/${sourcePrId}`} initialValue={initialValue} mode="create" options={options} /></AppFrame>;
}
