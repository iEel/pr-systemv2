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

export type RenewalPreview = { valid: false; maximumDay: number } | { valid: true; maximumDay: number; occurrence: AnnualOccurrence };

function maximumRenewalDay(renewalMonth: number) {
  return Number.isInteger(renewalMonth) && renewalMonth >= 1 && renewalMonth <= 12
    ? new Date(Date.UTC(2024, renewalMonth, 0)).getUTCDate()
    : 0;
}

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

export function getRenewalPreview({ leadDays, renewalDay, renewalMonth, today }: AnnualRule & { today: string }): RenewalPreview {
  const maximumDay = maximumRenewalDay(renewalMonth);
  if (!Number.isInteger(renewalDay) || renewalDay < 1 || renewalDay > maximumDay || !Number.isInteger(leadDays) || leadDays < 1 || leadDays > 365) {
    return { valid: false, maximumDay };
  }
  const year = chooseInitialOccurrenceYear({ renewalDay, renewalMonth, today });
  return { valid: true, maximumDay, occurrence: buildAnnualOccurrence({ leadDays, renewalDay, renewalMonth, year }) };
}
