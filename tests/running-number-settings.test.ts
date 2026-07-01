import { describe, expect, test } from "vitest";
import {
  buildRunningNumberCreateData,
  buildRunningNumberPreview,
  buildRunningNumberUpdateData,
  mapRunningNumberSettingToRow,
  validateRunningNumberDuplicate,
  validateRunningNumberScope,
} from "../lib/running-number-settings";

describe("running number settings helpers", () => {
  test("builds create and update data", () => {
    expect(
      buildRunningNumberCreateData({
        currentValue: "6",
        documentType: " itpr ",
        monthFormat: "MM",
        padding: "3",
        prefix: " ITPR_ ",
        scopeBranchId: "",
        scopeCompanyId: "",
        yearFormat: "YY",
      }),
    ).toEqual({
      currentValue: 6,
      documentType: "ITPR",
      monthFormat: "MM",
      padding: 3,
      prefix: "ITPR_",
      scopeBranchId: null,
      scopeCompanyId: null,
      yearFormat: "YY",
    });

    expect(
      buildRunningNumberUpdateData({
        currentValue: "10",
        monthFormat: "NONE",
        padding: "4",
        prefix: "PO-",
        yearFormat: "YYYY",
      }),
    ).toEqual({
      currentValue: 10,
      monthFormat: "",
      padding: 4,
      prefix: "PO-",
      yearFormat: "YYYY",
    });
  });

  test("validates padding, current value, and supported formats", () => {
    expect(() => buildRunningNumberUpdateData({ currentValue: "-1", monthFormat: "MM", padding: "3", prefix: "ITPR_", yearFormat: "YY" })).toThrow(
      "Current value must be non-negative",
    );
    expect(() => buildRunningNumberUpdateData({ currentValue: "0", monthFormat: "MM", padding: "0", prefix: "ITPR_", yearFormat: "YY" })).toThrow(
      "Padding must be between 1 and 8",
    );
    expect(() => buildRunningNumberUpdateData({ currentValue: "0", monthFormat: "BAD", padding: "3", prefix: "ITPR_", yearFormat: "YY" })).toThrow(
      "Month format is invalid",
    );
  });

  test("builds next-number previews with existing PR formatter", () => {
    expect(
      buildRunningNumberPreview(
        {
          currentValue: 6,
          monthFormat: "MM",
          padding: 3,
          prefix: "ITPR_",
          yearFormat: "YY",
        },
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe("ITPR_2606007");
  });

  test("validates scope references and duplicate settings", () => {
    expect(() =>
      validateRunningNumberScope(
        {
          scopeBranchId: "br_sonic04",
          scopeCompanyId: "co_sonic",
        },
        {
          branch: { companyId: "co_other", id: "br_sonic04", isActive: true },
          company: { id: "co_sonic", isActive: true },
        },
      ),
    ).toThrow("Selected branch does not belong to the selected company");

    expect(() =>
      validateRunningNumberDuplicate({
        existingSettingId: "rn_1",
        scopeLabel: "ITPR / Global",
      }),
    ).toThrow("Running number setting already exists for ITPR / Global");
  });

  test("maps running number settings to display rows", () => {
    const row = mapRunningNumberSettingToRow(
      {
        currentValue: 6,
        documentType: "ITPR",
        id: "rn_itpr",
        monthFormat: "MM",
        padding: 3,
        prefix: "ITPR_",
        scopeBranchId: null,
        scopeCompanyId: null,
        updatedAt: new Date("2026-06-30T00:00:00.000Z"),
        yearFormat: "YY",
      },
      { asOf: new Date("2026-06-30T00:00:00.000Z") },
    );

    expect(row).toEqual({
      currentValue: 6,
      documentType: "ITPR",
      formatLabel: "ITPR_YYMM###",
      id: "rn_itpr",
      monthFormat: "MM",
      nextPreview: "ITPR_2606007",
      padding: 3,
      prefix: "ITPR_",
      scopeBranchId: null,
      scopeCompanyId: null,
      scopeLabel: "Global",
      updatedAt: "2026-06-30T00:00:00.000Z",
      yearFormat: "YY",
    });
  });
});
