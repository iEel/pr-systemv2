import { describe, expect, it } from "vitest";
import { filterPurchaseRequests } from "../lib/pr-filters";
import { purchaseRequests } from "../lib/sample-data";

describe("filterPurchaseRequests", () => {
  it("filters sample purchase requests by search text across PR number, company, branch, department, and creator", () => {
    const byPrNo = filterPurchaseRequests(purchaseRequests, { search: "2606001" });
    const byCompany = filterPurchaseRequests(purchaseRequests, { search: "grandlink" });
    const byDepartment = filterPurchaseRequests(purchaseRequests, { search: "helpdesk" });

    expect(byPrNo.map((request) => request.prNo)).toEqual(["ITPR_2606001"]);
    expect(byCompany.every((request) => request.company === "Grandlink")).toBe(true);
    expect(byDepartment.map((request) => request.department)).toEqual(["Helpdesk"]);
  });

  it("filters by company, branch, and status together", () => {
    const result = filterPurchaseRequests(purchaseRequests, {
      company: "Sonic_04",
      branch: "Sonic_04",
      status: "Generated",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      prNo: "ITPR_2606002",
      company: "Sonic_04",
      branch: "Sonic_04",
      status: "Generated",
    });
  });
});
