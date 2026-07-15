import { readFileSync } from "node:fs";
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
        categoryId: "cat_hardware",
        category: { id: "cat_hardware", isActive: true, name: "Hardware & Equipment" },
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
      [{ id: "cat_hardware", code: "HARDWARE", name: "Hardware & Equipment" }],
    );

    expect(detail.header).toMatchObject({
      id: "pr_seed_2606001",
      prNo: "ITPR_2606001",
      refNo: "REF-IT-2606-0044",
      status: "Printed",
      company: "Grandlink",
      branch: "HQ",
      category: "Hardware & Equipment",
      categoryId: "cat_hardware",
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
    expect(detail.reissue).toEqual({
      categories: [{ id: "cat_hardware", label: "HARDWARE - Hardware & Equipment" }],
      categoryId: "cat_hardware",
    });
  });

  test("requires category selection when a reissue source category is inactive", () => {
    const detail = mapPurchaseRequestDetailRecord(
      {
        id: "pr_cancelled",
        prNo: "ITPR_2606002",
        refNo: null,
        categoryId: "cat_inactive",
        category: { id: "cat_inactive", isActive: false, name: "Inactive Category" },
        documentDate: new Date("2026-07-01T00:00:00.000Z"),
        requiredDate: null,
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        subtotal: 100,
        vatRate: 7,
        vatAmount: 7,
        totalAmount: 107,
        status: "CANCELLED",
        generatedAt: null,
        printedAt: null,
        signedAt: null,
        company: { displayName: "Grandlink" },
        branch: { name: "HQ" },
        department: { name: "IT" },
        division: null,
        createdBy: { displayName: "Admin User" },
        items: [],
        attachments: [],
      },
      [],
      [{ id: "cat_hardware", code: "HARDWARE", name: "Hardware & Equipment" }],
    );

    expect(detail.reissue.categoryId).toBe("");
    expect(detail.reissue.categories).toEqual([{ id: "cat_hardware", label: "HARDWARE - Hardware & Equipment" }]);
  });

  test("maps legacy purchase requests without a category as not categorized", () => {
    const detail = mapPurchaseRequestDetailRecord(
      {
        id: "pr_legacy",
        prNo: "ITPR_2606003",
        refNo: null,
        categoryId: null,
        category: null,
        documentDate: new Date("2026-07-01T00:00:00.000Z"),
        requiredDate: null,
        purpose: "Legacy PR",
        purchaseMethod: "Direct purchase",
        subtotal: 100,
        vatRate: 7,
        vatAmount: 7,
        totalAmount: 107,
        status: "DRAFT",
        generatedAt: null,
        printedAt: null,
        signedAt: null,
        company: { displayName: "Grandlink" },
        branch: { name: "HQ" },
        department: { name: "IT" },
        division: null,
        createdBy: { displayName: "Admin User" },
        items: [],
        attachments: [],
      },
      [],
    );

    expect(detail.header.category).toBe("Not categorized");
    expect(detail.header.categoryId).toBeNull();
  });

  test("loads the source category and ordered active options for the reissue read model", () => {
    const source = readFileSync("lib/purchase-requests.ts", "utf8");
    const detailLoader = source.slice(source.indexOf("export async function getPurchaseRequestDetail"));

    expect(detailLoader).toContain("category: { select: { id: true, isActive: true, name: true } }");
    expect(detailLoader).toContain('orderBy: [{ sortOrder: "asc" }, { name: "asc" }]');
    expect(detailLoader).toContain("where: { isActive: true }");
  });
});
