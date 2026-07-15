import { AppFrame } from "@/components/app/AppFrame";
import { RecurringScheduleList } from "@/components/recurring-pr/RecurringScheduleList";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/auth/permissions";
import { getRecurringScheduleOptions, getRecurringSchedulePageData } from "@/lib/recurring-pr";

export const dynamic = "force-dynamic";
export const metadata = { description: "Monitor annual schedules in the Needs attention state.", title: "Recurring PR | IT PR DMS" };

export default async function RecurringPRPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const [{ filters, rows }, options] = await Promise.all([getRecurringSchedulePageData(params), getRecurringScheduleOptions()]);

  return <AppFrame><RecurringScheduleList canManage={hasPermission(user.role, "PR_RECURRING_MANAGE")} filters={filters} options={options} rows={rows} /></AppFrame>;
}
