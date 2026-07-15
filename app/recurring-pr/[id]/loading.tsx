import { Skeleton } from "@/components/ui/Skeleton";

export default function RecurringScheduleLoading() {
  return <div className="space-y-5"><Skeleton className="h-8 w-72" /><Skeleton className="h-40 w-full" /><Skeleton className="h-56 w-full" /></div>;
}
