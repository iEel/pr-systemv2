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

  it("filters purchase requests by exact category and searches category text", () => {
    const requests = [
      {
        prNo: "ITPR_2606001",
        company: "Grandlink",
        branch: "HQ",
        department: "IT Operation",
        division: "Infrastructure",
        createdBy: "Admin User",
        category: "Hardware & Equipment",
        status: "Printed" as const,
      },
      {
        prNo: "ITPR_2606002",
        company: "Grandlink",
        branch: "HQ",
        department: "IT Operation",
        division: "Infrastructure",
        createdBy: "Admin User",
        category: "Not categorized",
        status: "Draft" as const,
      },
    ];

    const result = filterPurchaseRequests(requests, { category: "Hardware & Equipment" });
    const searchResult = filterPurchaseRequests(requests, { search: "hardware" });

    expect(result.every((request) => request.category === "Hardware & Equipment")).toBe(true);
    expect(searchResult).toEqual([requests[0]]);
  });
});
