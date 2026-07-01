import { describe, expect, test } from "vitest";
import { mapPurchaseRequestRecordToListItem } from "../lib/purchase-requests";

describe("purchase request list mapping", () => {
  test("maps a Prisma-like purchase request record into the PR list row shape", () => {
    const row = mapPurchaseRequestRecordToListItem({
      id: "pr_seed_001",
      prNo: "ITPR_2606001",
      documentDate: new Date("2026-06-20T00:00:00.000Z"),
      totalAmount: "116255.50",
      status: "PRINTED",
      company: { displayName: "Sonic_04" },
      branch: { name: "Sonic_04" },
      department: { name: "IT Operation" },
      division: { name: "Infrastructure" },
      createdBy: { displayName: "Admin User" },
    });

    expect(row).toEqual({
      id: "pr_seed_001",
      prNo: "ITPR_2606001",
      date: "2026-06-20",
      company: "Sonic_04",
      branch: "Sonic_04",
      department: "IT Operation",
      division: "Infrastructure",
      createdBy: "Admin User",
      total: 116255.5,
      status: "Printed",
    });
  });

  test("uses a readable placeholder for drafts without a PR number", () => {
    const row = mapPurchaseRequestRecordToListItem({
      id: "pr_draft",
      prNo: null,
      documentDate: new Date("2026-06-25T00:00:00.000Z"),
      totalAmount: 0,
      status: "DRAFT",
      company: { displayName: "Grandlink" },
      branch: { name: "HQ" },
      department: { name: "Infrastructure" },
      division: null,
      createdBy: { displayName: "Admin User" },
    });

    expect(row.prNo).toBe("Draft pending");
    expect(row.division).toBe("-");
    expect(row.status).toBe("Draft");
  });
});
