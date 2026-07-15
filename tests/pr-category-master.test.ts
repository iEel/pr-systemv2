import { describe, expect, test } from "vitest";
import {
  mapPrCategoryRecordToRow,
  normalizePrCategoryFilters,
  parsePrCategoryInput,
  validateCategoryCodeMutation,
} from "../lib/pr-category-master";

describe("PR category master", () => {
  test("normalizes filters and category input", () => {
    expect(normalizePrCategoryFilters({ includeInactive: "1", q: " license " })).toEqual({ includeInactive: true, q: "license" });
    expect(parsePrCategoryInput({ code: " software license ", description: " Annual tools ", name: " Software ", sortOrder: "20" })).toEqual({
      code: "SOFTWARE_LICENSE",
      description: "Annual tools",
      name: "Software",
      sortOrder: 20,
    });
  });

  test("locks a referenced category code", () => {
    expect(() => validateCategoryCodeMutation({ currentCode: "HARDWARE", nextCode: "DEVICE", referenceCount: 1 })).toThrow(
      "Category code cannot change after it is used",
    );
    expect(() => validateCategoryCodeMutation({ currentCode: "HARDWARE", nextCode: "HARDWARE", referenceCount: 8 })).not.toThrow();
  });

  test("maps category records to master rows", () => {
    expect(
      mapPrCategoryRecordToRow({
        _count: { purchaseRequests: 3 },
        code: "HARDWARE",
        description: "Devices and peripherals",
        id: "cat_hardware",
        isActive: true,
        name: "Hardware",
        sortOrder: 10,
        updatedAt: new Date("2026-07-15T06:00:00.000Z"),
      }),
    ).toEqual({
      affectedActiveScheduleCount: 0,
      code: "HARDWARE",
      description: "Devices and peripherals",
      id: "cat_hardware",
      isActive: true,
      name: "Hardware",
      referenceCount: 3,
      sortOrder: 10,
      status: "Active",
      updatedAt: "2026-07-15T06:00:00.000Z",
    });
  });
});
