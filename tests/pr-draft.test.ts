import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  DraftValidationError,
  buildDefaultDraftItems,
  buildDefaultDraftRemark,
  buildDraftCreateData,
  buildDraftUpdateData,
  calculateDraftTotals,
  mapCloneSourceRecordToInitialValue,
  mapDraftEditRecordToInitialValue,
  parseDraftPurchaseRequestForm,
  selectDefaultDepartmentAndDivision,
} from "../lib/pr-draft";

function formData(values: Record<string, string | string[]>) {
  const form = new FormData();

  for (const [key, value] of Object.entries(values)) {
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      form.append(key, entry);
    }
  }

  return form;
}

describe("draft purchase request form parsing", () => {
  test("parses repeated line item fields and calculates totals server-side", () => {
    const draft = parseDraftPurchaseRequestForm(
      formData({
        branchId: "br_sonic04",
        categoryId: "cat_hardware",
        departmentId: "dep_it_operation",
        divisionId: "div_infrastructure",
        documentDate: "2026-06-28",
        requiredDate: "2026-07-05",
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: "Need infrastructure parts",
        itemAccountCode: ["51510101", "51520101", ""],
        itemDescription: ["Server", "SSD", ""],
        itemQuantity: ["2", "3", ""],
        itemUnitCost: ["1000.50", "250.10", ""],
      }),
    );

    expect(draft.categoryId).toBe("cat_hardware");
    expect(draft.items).toEqual([
      {
        rowType: "ITEM",
        accountCode: "51510101",
        description: "Server",
        quantity: 2,
        unitCost: 1000.5,
        totalAmount: 2001,
      },
      {
        rowType: "ITEM",
        accountCode: "51520101",
        description: "SSD",
        quantity: 3,
        unitCost: 250.1,
        totalAmount: 750.3,
      },
    ]);
    expect(calculateDraftTotals(draft.items)).toEqual({
      subtotal: 2751.3,
      vatRate: 7,
      vatAmount: 192.59,
      totalAmount: 2943.89,
    });
  });

  test("requires at least one valid line item", () => {
    expect(() =>
      parseDraftPurchaseRequestForm(
        formData({
          branchId: "br_sonic04",
          departmentId: "dep_it_operation",
          documentDate: "2026-06-28",
          purpose: "ซื้อใหม่",
          purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
          itemAccountCode: [""],
          itemDescription: [""],
          itemQuantity: [""],
          itemUnitCost: [""],
        }),
      ),
    ).toThrow(DraftValidationError);
  });

  test("requires a category", () => {
    let error: unknown;

    try {
      parseDraftPurchaseRequestForm(
        formData({
          branchId: "br_sonic04",
          departmentId: "dep_it",
          documentDate: "2026-07-15",
          purpose: "ซื้อใหม่",
          purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
          itemDescription: ["Server"],
          itemQuantity: ["1"],
          itemUnitCost: ["100"],
        }),
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(DraftValidationError);
    expect(error).toMatchObject({ fieldErrors: { categoryId: "กรุณาเลือกหมวดหมู่ PR" } });
  });

  test("allows line items without an account code", () => {
    const draft = parseDraftPurchaseRequestForm(
      formData({
        branchId: "br_sonic04",
        categoryId: "cat_hardware",
        departmentId: "dep_it",
        divisionId: "div_it",
        documentDate: "2026-06-28",
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        itemAccountCode: [""],
        itemDescription: ["Mini PC"],
        itemQuantity: ["1"],
        itemUnitCost: ["12500"],
      }),
    );

    expect(draft.items).toEqual([
      {
        rowType: "ITEM",
        accountCode: "",
        description: "Mini PC",
        quantity: 1,
        unitCost: 12500,
        totalAmount: 12500,
      },
    ]);
  });

  test("allows heading rows without quantity or unit cost and totals only priced items", () => {
    const draft = parseDraftPurchaseRequestForm(
      formData({
        branchId: "br_sonic04",
        categoryId: "cat_hardware",
        departmentId: "dep_it",
        divisionId: "div_it",
        documentDate: "2026-06-28",
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        itemRowType: ["HEADING", "ITEM"],
        itemAccountCode: ["", ""],
        itemDescription: ["Hardware", "Mini PC"],
        itemQuantity: ["", "2"],
        itemUnitCost: ["", "12500"],
      }),
    );

    expect(draft.items).toEqual([
      {
        rowType: "HEADING",
        accountCode: "",
        description: "Hardware",
        quantity: 0,
        unitCost: 0,
        totalAmount: 0,
      },
      {
        rowType: "ITEM",
        accountCode: "",
        description: "Mini PC",
        quantity: 2,
        unitCost: 12500,
        totalAmount: 25000,
      },
    ]);
    expect(calculateDraftTotals(draft.items)).toEqual({
      subtotal: 25000,
      vatRate: 7,
      vatAmount: 1750,
      totalAmount: 26750,
    });
  });

  test("allows detail rows after a priced item without quantity or unit cost", () => {
    const draft = parseDraftPurchaseRequestForm(
      formData({
        branchId: "br_sonic04",
        categoryId: "cat_hardware",
        departmentId: "dep_it",
        divisionId: "div_it",
        documentDate: "2026-06-28",
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        itemRowType: ["ITEM", "DETAIL"],
        itemAccountCode: ["", ""],
        itemDescription: ["Mini PC", "Includes keyboard and onsite setup"],
        itemQuantity: ["2", ""],
        itemUnitCost: ["12500", ""],
      }),
    );

    expect(draft.items).toEqual([
      {
        rowType: "ITEM",
        accountCode: "",
        description: "Mini PC",
        quantity: 2,
        unitCost: 12500,
        totalAmount: 25000,
      },
      {
        rowType: "DETAIL",
        accountCode: "",
        description: "Includes keyboard and onsite setup",
        quantity: 0,
        unitCost: 0,
        totalAmount: 0,
      },
    ]);
    expect(calculateDraftTotals(draft.items)).toEqual({
      subtotal: 25000,
      vatRate: 7,
      vatAmount: 1750,
      totalAmount: 26750,
    });
  });

  test("requires at least one priced item even when heading or detail rows exist", () => {
    expect(() =>
      parseDraftPurchaseRequestForm(
        formData({
          branchId: "br_sonic04",
          categoryId: "cat_hardware",
          departmentId: "dep_it",
          documentDate: "2026-06-28",
          purpose: "ซื้อใหม่",
          purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
          itemRowType: ["HEADING", "DETAIL"],
          itemAccountCode: [""],
          itemDescription: ["Software", "Antivirus subscription"],
          itemQuantity: ["", ""],
          itemUnitCost: ["", ""],
        }),
      ),
    ).toThrow(DraftValidationError);
  });

  test("prefers IT department and IT division for new PR defaults", () => {
    expect(
      selectDefaultDepartmentAndDivision([
        { id: "dep_helpdesk", name: "Helpdesk", divisions: [{ id: "div_service", name: "Service Desk" }] },
        { id: "dep_it", name: "IT", divisions: [{ id: "div_endpoint", name: "Endpoint" }, { id: "div_it", name: "IT" }] },
      ]),
    ).toEqual({
      defaultDepartmentId: "dep_it",
      defaultDivisionId: "div_it",
    });
  });

  test("starts new PR item defaults without sample product data", () => {
    expect(buildDefaultDraftItems()).toEqual([
      {
        rowType: "ITEM",
        accountCode: "",
        description: "",
        quantity: "",
        unitCost: "",
      },
    ]);
  });

  test("starts new PR remark default as blank", () => {
    expect(buildDefaultDraftRemark()).toBe("");
  });
});

describe("draft purchase request create payload", () => {
  test("builds a database create payload with server-calculated totals", () => {
    const data = buildDraftCreateData(
      {
        branchId: "br_sonic04",
        categoryId: "cat_hardware",
        departmentId: "dep_it_operation",
        divisionId: "div_infrastructure",
        documentDate: "2026-06-28",
        requiredDate: "2026-07-05",
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: "Need infrastructure parts",
        items: [
          {
            accountCode: "51510101",
            description: "Server",
            quantity: 2,
            unitCost: 1000.5,
            totalAmount: 2001,
          },
          {
            accountCode: "51520101",
            description: "SSD",
            quantity: 3,
            unitCost: 250.1,
            totalAmount: 750.3,
          },
        ],
      },
      { companyId: "co_sonic04", createdById: "user_admin", documentRefNo: "SN17-DOCSA011" },
    );

    expect(data).toMatchObject({
      categoryId: "cat_hardware",
      prNo: null,
      refNo: "SN17-DOCSA011",
      companyId: "co_sonic04",
      branchId: "br_sonic04",
      departmentId: "dep_it_operation",
      divisionId: "div_infrastructure",
      purpose: "ซื้อใหม่",
      purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
      remark: "Need infrastructure parts",
      subtotal: 2751.3,
      vatRate: 7,
      vatAmount: 192.59,
      totalAmount: 2943.89,
      status: "DRAFT",
      createdById: "user_admin",
    });
    expect(data.items.create).toEqual([
      {
        lineNo: 1,
        rowType: "ITEM",
        accountCode: "51510101",
        description: "Server",
        quantity: 2,
        unitCost: 1000.5,
        totalAmount: 2001,
      },
      {
        lineNo: 2,
        rowType: "ITEM",
        accountCode: "51520101",
        description: "SSD",
        quantity: 3,
        unitCost: 250.1,
        totalAmount: 750.3,
      },
    ]);
  });

  test("links a cloned draft to its source without copying controlled document data", () => {
    const data = buildDraftCreateData(
      {
        branchId: "br_sonic04",
        categoryId: "cat_hardware",
        departmentId: "dep_it_operation",
        divisionId: null,
        documentDate: "2026-06-30",
        requiredDate: null,
        purpose: "ต่ออายุ",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: "Clone for new cycle",
        items: [
          {
            accountCode: "",
            description: "Firewall subscription",
            quantity: 1,
            unitCost: 100000,
            totalAmount: 100000,
          },
        ],
      },
      { clonedFromId: "pr_original", companyId: "co_sonic04", createdById: "user_admin", documentRefNo: "SN17-DOCSA011" },
    );

    expect(data).toMatchObject({
      clonedFromId: "pr_original",
      prNo: null,
      requiredDate: null,
      status: "DRAFT",
      templateVersionId: undefined,
      generatedSnapshotJson: undefined,
    });
  });
});

describe("draft purchase request edit mapping", () => {
  const draftInput = {
    branchId: "br_sonic04",
    categoryId: "cat_hardware",
    departmentId: "dep_it_operation",
    divisionId: null,
    documentDate: "2026-06-28",
    requiredDate: null,
    purpose: "ซ่อมแซม",
    purchaseMethod: "ขอซื้อเอง",
    remark: "Updated draft",
    items: [
      {
        accountCode: "51590101",
        description: "Updated service",
        quantity: 4,
        unitCost: 300.25,
        totalAmount: 1201,
      },
    ],
  };

  test("maps an editable Prisma-like draft record into PRForm initial values", () => {
    const initial = mapDraftEditRecordToInitialValue({
      id: "draft_001",
      branchId: "br_sonic04",
      categoryId: "cat_hardware",
      departmentId: "dep_it_operation",
      divisionId: null,
      documentDate: new Date("2026-06-28T00:00:00.000Z"),
      requiredDate: null,
      purpose: "ซื้อใหม่",
      purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
      remark: "Draft remark",
      items: [
        {
          lineNo: 1,
          accountCode: "51510101",
          description: "Draft server",
          quantity: "2.0000",
          unitCost: "1500.50",
        },
      ],
    });

    expect(initial).toEqual({
      id: "draft_001",
      branchId: "br_sonic04",
      categoryId: "cat_hardware",
      departmentId: "dep_it_operation",
      divisionId: null,
      documentDate: "2026-06-28",
      requiredDate: null,
      purpose: "ซื้อใหม่",
      purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
      remark: "Draft remark",
      items: [
        {
          rowType: "ITEM",
          accountCode: "51510101",
          description: "Draft server",
          quantity: 2,
          unitCost: 1500.5,
        },
      ],
    });
  });

  test("maps a source PR into clone initial values with fresh dates and sorted items", () => {
    const initial = mapCloneSourceRecordToInitialValue(
      {
        id: "pr_source",
        branchId: "br_sonic04",
        categoryId: "cat_hardware",
        departmentId: "dep_it_operation",
        divisionId: "div_infrastructure",
        documentDate: new Date("2026-01-15T00:00:00.000Z"),
        requiredDate: new Date("2026-01-30T00:00:00.000Z"),
        purpose: "ต่ออายุ",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: "Use same vendor",
        items: [
          {
            lineNo: 2,
            rowType: "ITEM",
            accountCode: "",
            description: "Support package",
            quantity: "1.0000",
            unitCost: "25000.00",
          },
          {
            lineNo: 1,
            rowType: "ITEM",
            accountCode: "51510101",
            description: "License renewal",
            quantity: "3.0000",
            unitCost: "12000.00",
          },
        ],
      },
      "2026-06-30",
    );

    expect(initial).toEqual({
      id: "pr_source",
      branchId: "br_sonic04",
      categoryId: "cat_hardware",
      departmentId: "dep_it_operation",
      divisionId: "div_infrastructure",
      documentDate: "2026-06-30",
      requiredDate: null,
      purpose: "ต่ออายุ",
      purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
      remark: "Use same vendor",
      items: [
        {
          rowType: "ITEM",
          accountCode: "51510101",
          description: "License renewal",
          quantity: 3,
          unitCost: 12000,
        },
        {
          rowType: "ITEM",
          accountCode: "",
          description: "Support package",
          quantity: 1,
          unitCost: 25000,
        },
      ],
    });
  });

  test("builds an update payload that preserves draft status and recalculates totals", () => {
    const data = buildDraftUpdateData(
      {
        ...draftInput,
        items: [
          {
            rowType: "HEADING",
            accountCode: "",
            description: "Support",
            quantity: 0,
            unitCost: 0,
            totalAmount: 0,
          },
          ...draftInput.items,
        ],
      },
      { companyId: "co_sonic04", documentRefNo: "SN17-DOCSA011" },
    );

    expect(data.purchaseRequest).toMatchObject({
      companyId: "co_sonic04",
      branchId: "br_sonic04",
      categoryId: "cat_hardware",
      refNo: "SN17-DOCSA011",
      departmentId: "dep_it_operation",
      divisionId: null,
      purpose: "ซ่อมแซม",
      purchaseMethod: "ขอซื้อเอง",
      remark: "Updated draft",
      subtotal: 1201,
      vatRate: 7,
      vatAmount: 84.07,
      totalAmount: 1285.07,
      status: "DRAFT",
    });
    expect(data.items).toEqual([
      {
        lineNo: 1,
        rowType: "HEADING",
        accountCode: "",
        description: "Support",
        quantity: 0,
        unitCost: 0,
        totalAmount: 0,
      },
      {
        lineNo: 2,
        rowType: "ITEM",
        accountCode: "51590101",
        description: "Updated service",
        quantity: 4,
        unitCost: 300.25,
        totalAmount: 1201,
      },
    ]);
  });
});

describe("draft purchase request soft budget tracking", () => {
  test("draft create and update call soft budget reservation helpers", () => {
    const source = readFileSync("lib/pr-draft.ts", "utf8");

    expect(source).toContain("reserveDraftBudget");
    expect(source).toContain("updateDraftBudgetReservation");
    expect(source).toContain("budgetStatus");
  });
});
