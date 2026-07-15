"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RecurringPRError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="rounded-lg border border-red-200 bg-red-50 p-5"><h1 className="text-lg font-bold text-ink">Recurring PR is unavailable</h1><p className="mt-1 text-sm leading-6 text-muted">The schedule data could not be loaded. Try again, or return to the schedule list.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={reset} type="button" variant="secondary">Try again</Button><Link className="inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-ink hover:bg-white/70" href="/recurring-pr">Schedule list</Link></div></section>;
}
