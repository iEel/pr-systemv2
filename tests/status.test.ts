import { describe, expect, it } from "vitest";
import { getStatusConfig, statusConfig } from "../lib/status";

describe("statusConfig", () => {
  it("defines readable semantic tones for every PR workflow status", () => {
    expect(Object.keys(statusConfig)).toEqual(["Draft", "Generated", "Printed", "Signed", "Cancelled", "Reissued"]);
    expect(getStatusConfig("Draft")).toMatchObject({ label: "Draft", tone: "neutral" });
    expect(getStatusConfig("Generated")).toMatchObject({ label: "Generated", tone: "info" });
    expect(getStatusConfig("Printed")).toMatchObject({ label: "Printed", tone: "warning" });
    expect(getStatusConfig("Signed")).toMatchObject({ label: "Signed", tone: "success" });
    expect(getStatusConfig("Cancelled")).toMatchObject({ label: "Cancelled", tone: "danger" });
    expect(getStatusConfig("Reissued")).toMatchObject({ label: "Reissued", tone: "purple" });
  });
});
