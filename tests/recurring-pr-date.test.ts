import { describe, expect, test } from "vitest";
import {
  buildAnnualOccurrence,
  calculateNextAnnualOccurrence,
  chooseInitialOccurrenceYear,
  toBangkokDateOnly,
} from "../lib/recurring-pr-date";

describe("annual recurring PR dates", () => {
  test("uses Asia/Bangkok for today's date", () => {
    expect(toBangkokDateOnly(new Date("2026-07-14T17:30:00.000Z"))).toBe("2026-07-15");
  });

  test("stores renewal and draft dates as UTC-midnight date-only values", () => {
    const occurrence = buildAnnualOccurrence({ leadDays: 30, renewalDay: 15, renewalMonth: 1, year: 2026 });

    expect(occurrence).toMatchObject({ occurrenceYear: 2026 });
    expect(occurrence.renewalDate.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(occurrence.scheduledDraftDate.toISOString()).toBe("2025-12-16T00:00:00.000Z");
  });

  test("clamps February 29 in non-leap years", () => {
    expect(buildAnnualOccurrence({ leadDays: 30, renewalDay: 29, renewalMonth: 2, year: 2027 }).renewalDate.toISOString()).toBe(
      "2027-02-28T00:00:00.000Z",
    );
    expect(buildAnnualOccurrence({ leadDays: 30, renewalDay: 29, renewalMonth: 2, year: 2028 }).renewalDate.toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });

  test("starts in the current year when this year's renewal is today or later", () => {
    expect(chooseInitialOccurrenceYear({ renewalDay: 1, renewalMonth: 9, today: "2026-07-15" })).toBe(2026);
    expect(chooseInitialOccurrenceYear({ renewalDay: 15, renewalMonth: 7, today: "2026-07-15" })).toBe(2026);
  });

  test("starts next year only after this year's renewal has passed", () => {
    expect(chooseInitialOccurrenceYear({ renewalDay: 1, renewalMonth: 6, today: "2026-07-15" })).toBe(2027);
  });

  test("calculates the next occurrence from the following calendar year", () => {
    const next = calculateNextAnnualOccurrence({
      leadDays: 30,
      occurrenceYear: 2026,
      renewalDay: 15,
      renewalMonth: 1,
    });

    expect(next.occurrenceYear).toBe(2027);
    expect(next.renewalDate.toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(next.scheduledDraftDate.toISOString()).toBe("2026-12-16T00:00:00.000Z");
  });
});
