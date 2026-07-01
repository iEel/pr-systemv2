import { describe, expect, test } from "vitest";
import { formatAmount, formatDateTime } from "../lib/utils";

describe("date formatting utilities", () => {
  test("formats ISO date-time values for Thai document metadata", () => {
    expect(formatDateTime("2026-06-20T02:18:00.000Z")).toBe("20/06/2569 09:18");
  });
});

describe("amount formatting utilities", () => {
  test("formats PR item amounts without a currency prefix", () => {
    expect(formatAmount(78500)).toBe("78,500.00");
    expect(formatAmount(5250.5)).toBe("5,250.50");
  });
});
