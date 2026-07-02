import { describe, expect, test } from "vitest";
import { mapPurchaseRequestDetailRecord } from "../lib/purchase-requests";

describe("purchase request detail mapping", () => {
  test("maps a Prisma-like detail record into the PR detail view shape", () => {
    const detail = mapPurchaseRequestDetailRecord(
      {
        id: "pr_seed_2606001",
        prNo: "ITPR_2606001",
        refNo: "REF-IT-2606-0044",
        documentDate: new Date("2026-06-20T00:00:00.000Z"),
        requiredDate: new Date("2026-07-02T00:00:00.000Z"),
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อ",
        subtotal: "108650.00",
        vatRate: "7.00",
        vatAmount: "7605.50",
        totalAmount: "116255.50",
        status: "PRINTED",
        generatedAt: new Date("2026-06-20T02:18:00.000Z"),
        printedAt: new Date("2026-06-20T03:05:00.000Z"),
        signedAt: null,
        company: { displayName: "Grandlink" },
        branch: { name: "HQ" },
        department: { name: "IT Operation" },
        division: { name: "Infrastructure" },
        createdBy: { displayName: "Admin User" },
        items: [
          {
            lineNo: 1,
            rowType: "ITEM",
            accountCode: "51510101",
            description: "Dell PowerEdge R750 Server",
            quantity: "1.0000",
            unitCost: "78500.00",
            totalAmount: "78500.00",
          },
          {
            lineNo: 2,
            rowType: "DETAIL",
            accountCode: "",
            description: "Includes rack rail kit and onsite setup",
            quantity: "0.0000",
            unitCost: "0.00",
            totalAmount: "0.00",
          },
          {
            lineNo: 3,
            rowType: "ITEM",
            accountCode: "",
            description: "UPS Battery Replacement Pack",
            quantity: "1.0000",
            unitCost: "30150.00",
            totalAmount: "30150.00",
          },
        ],
        attachments: [
          {
            id: "att_gen",
            type: "GENERATED_PDF",
            version: 1,
            fileName: "ITPR_2606001.pdf",
            fileSize: 512000,
            uploadedAt: new Date("2026-06-20T02:18:00.000Z"),
          },
        ],
      },
      [
        {
          id: "audit_gen",
          action: "Generated PDF",
          detail: "Rendered PR_STANDARD V1",
          createdAt: new Date("2026-06-20T02:18:00.000Z"),
          actor: { displayName: "System" },
        },
      ],
    );

    expect(detail.header).toMatchObject({
      id: "pr_seed_2606001",
      prNo: "ITPR_2606001",
      refNo: "REF-IT-2606-0044",
      status: "Printed",
      company: "Grandlink",
      branch: "HQ",
      subtotal: 108650,
      vatAmount: 7605.5,
      total: 116255.5,
    });
    expect(detail.items).toEqual([
      {
        lineNo: 1,
        displayLineNo: 1,
        rowType: "ITEM",
        accountCode: "51510101",
        description: "Dell PowerEdge R750 Server",
        quantity: 1,
        unitCost: 78500,
        total: 78500,
      },
      {
        lineNo: 2,
        displayLineNo: "",
        rowType: "DETAIL",
        accountCode: "",
        description: "Includes rack rail kit and onsite setup",
        quantity: 0,
        unitCost: 0,
        total: 0,
      },
      {
        lineNo: 3,
        displayLineNo: 2,
        rowType: "ITEM",
        accountCode: "",
        description: "UPS Battery Replacement Pack",
        quantity: 1,
        unitCost: 30150,
        total: 30150,
      },
    ]);
    expect(detail.attachments[0]).toMatchObject({
      type: "GENERATED_PDF",
      label: "Generated PDF",
      fileName: "ITPR_2606001.pdf",
      fileSizeLabel: "500.0 KB",
    });
    expect(detail.timeline[0]).toMatchObject({
      action: "Generated PDF",
      actor: "System",
      detail: "Rendered PR_STANDARD V1",
    });
  });
});
