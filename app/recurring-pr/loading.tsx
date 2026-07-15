import { Skeleton } from "@/components/ui/Skeleton";

export default function RecurringPRLoading() {
  return <div className="space-y-5"><Skeleton className="h-8 w-44" /><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
}
