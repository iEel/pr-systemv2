export type AnnualOccurrence = {
  occurrenceYear: number;
  renewalDate: Date;
  scheduledDraftDate: Date;
};

type AnnualRule = {
  leadDays: number;
  renewalDay: number;
  renewalMonth: number;
};

type BuildAnnualOccurrenceArgs = AnnualRule & {
  year: number;
};

type ChooseInitialOccurrenceYearArgs = Pick<AnnualRule, "renewalDay" | "renewalMonth"> & {
  today: string;
};

type CalculateNextAnnualOccurrenceArgs = AnnualRule & {
  occurrenceYear: number;
};

export function toBangkokDateOnly(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function buildAnnualOccurrence({
  leadDays,
  renewalDay,
  renewalMonth,
  year,
}: BuildAnnualOccurrenceArgs): AnnualOccurrence {
  const lastDay = new Date(Date.UTC(year, renewalMonth, 0)).getUTCDate();
  const day = renewalMonth === 2 && renewalDay === 29 ? Math.min(renewalDay, lastDay) : renewalDay;
  const renewalDate = new Date(Date.UTC(year, renewalMonth - 1, day));
  const scheduledDraftDate = new Date(renewalDate);

  scheduledDraftDate.setUTCDate(scheduledDraftDate.getUTCDate() - leadDays);

  return { occurrenceYear: year, renewalDate, scheduledDraftDate };
}

export function chooseInitialOccurrenceYear({
  renewalDay,
  renewalMonth,
  today,
}: ChooseInitialOccurrenceYearArgs): number {
  const [year] = today.split("-").map(Number);
  const occurrence = buildAnnualOccurrence({ leadDays: 0, renewalDay, renewalMonth, year });
  const occurrenceDate = occurrence.renewalDate.toISOString().slice(0, 10);

  return occurrenceDate < today ? year + 1 : year;
}

export function calculateNextAnnualOccurrence({
  occurrenceYear,
  ...rule
}: CalculateNextAnnualOccurrenceArgs): AnnualOccurrence {
  return buildAnnualOccurrence({ ...rule, year: occurrenceYear + 1 });
}
