import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import {
  applyBranchImagesToDocxTemplate,
  buildDraftPreviewFileInfo,
  buildGeneratedFileInfo,
  buildPurchaseRequestRenderPayload,
  formatRunningNumber,
  getNextRunningNumberValue,
  sha256Hex,
  splitRemarkIntoTemplateLines,
} from "../lib/pr-generate";

describe("purchase request generation helpers", () => {
  test("formats the next IT PR running number from settings and document date", () => {
    expect(
      formatRunningNumber(
        {
          prefix: "ITPR_",
          yearFormat: "YY",
          monthFormat: "MM",
          padding: 3,
          currentValue: 6,
        },
        new Date("2026-06-28T00:00:00.000Z"),
      ),
    ).toBe("ITPR_2606007");
  });

  test("allocates the next running number after both setting state and existing PR numbers", () => {
    expect(getNextRunningNumberValue({ currentValue: 6 }, 7)).toBe(8);
    expect(getNextRunningNumberValue({ currentValue: 9 }, 7)).toBe(10);
  });

  test("builds a normalized Carbone payload from a Prisma-like PR record", () => {
    const payload = buildPurchaseRequestRenderPayload(
      {
        id: "draft_001",
        prNo: null,
        refNo: null,
        documentDate: new Date("2026-06-28T00:00:00.000Z"),
        requiredDate: new Date("2026-07-15T00:00:00.000Z"),
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: "Need infrastructure parts",
        subtotal: "2469.00",
        vatRate: "7.00",
        vatAmount: "172.83",
        totalAmount: "2641.83",
        company: { displayName: "Sonic_04", legalName: "Sonic Branch 04", taxId: "0100000000000" },
        branch: {
          name: "Sonic_04",
          code: "SONIC04",
          address: "Bangkok",
          documentAddress: "509/10 Chonburi",
          documentDisplayName: "Sonic 00004 (PT)",
          documentFooterAssetPath: "company-assets/br_sonic04/footer.png",
          documentHeaderAssetPath: "company-assets/br_sonic04/header.png",
          documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
          documentRefNo: "SN17-DOCSA011",
          documentTaxId: "0107560000427",
        },
        department: { name: "IT Operation" },
        division: null,
        createdBy: { displayName: "Admin User" },
        items: [
          {
            lineNo: 1,
            accountCode: "51599999",
            description: "Phase 3 generation item",
            quantity: "2.0000",
            unitCost: "1234.50",
            totalAmount: "2469.00",
          },
        ],
      },
      "ITPR_2606007",
    );

    expect(payload).toMatchObject({
      prNo: "ITPR_2606007",
      refNo: "SN17-DOCSA011",
      documentDate: "28/06/2569",
      requiredDate: "15/07/2569",
      companyName: "Sonic_04",
      companyDisplayName: "Sonic 00004 (PT)",
      companyLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
      companyTaxId: "0107560000427",
      branchAddress: "509/10 Chonburi",
      companyHeaderImage: "",
      companyFooterImage: "",
      department: "IT Operation",
      division: "-",
      subtotal: 2469,
      subtotalFormatted: "2,469.00",
      vatRate: 7,
      vatAmount: 172.83,
      vatAmountFormatted: "172.83",
      totalAmount: 2641.83,
      totalAmountFormatted: "2,641.83",
      totalAmountText: "THB 2,641.83",
      purposeNewMark: "X",
      purposeRenewalMark: "",
      purposeRepairMark: "",
      purposeReplacementMark: "",
      purchaseByProcurementMark: "X",
      purchaseSelfMark: "",
      remark: "Need infrastructure parts",
      remarkLine1: "Need infrastructure parts",
      remarkLine2: "",
    });
    expect(payload.items).toEqual([
      {
        lineNo: 1,
        itemNo: 1,
        rowType: "ITEM",
        isHeading: false,
        isDetail: false,
        accountCode: "51599999",
        description: "Phase 3 generation item",
        quantity: 2,
        unitCost: 1234.5,
        unitCostFormatted: "1,234.50",
        totalAmount: 2469,
        totalAmountFormatted: "2,469.00",
      },
    ]);
  });

  test("splits remark text into two fixed template rows", () => {
    expect(splitRemarkIntoTemplateLines("Line one\nLine two\nLine three", 20)).toEqual({
      line1: "Line one",
      line2: "Line two Line three",
    });

    expect(splitRemarkIntoTemplateLines("Alpha beta gamma delta", 14)).toEqual({
      line1: "Alpha beta",
      line2: "gamma delta",
    });

    expect(splitRemarkIntoTemplateLines(null, 16)).toEqual({
      line1: "-",
      line2: "",
    });
  });

  test("marks only the selected purpose and purchase method for fixed checkbox cells", () => {
    const payload = buildPurchaseRequestRenderPayload(
      {
        id: "draft_002",
        prNo: null,
        refNo: null,
        documentDate: new Date("2026-06-28T00:00:00.000Z"),
        requiredDate: null,
        purpose: "ซ่อมแซม",
        purchaseMethod: "ขอซื้อเอง",
        remark: null,
        subtotal: "0",
        vatRate: "7",
        vatAmount: "0",
        totalAmount: "0",
        company: { displayName: "Grandlink", legalName: "Grandlink Logistics", taxId: null },
        branch: { name: "Grandlink", code: "GL", address: null },
        department: { name: "IT" },
        division: { name: "IT" },
        createdBy: { displayName: "Admin User" },
        items: [],
      },
      "ITPR_2606008",
    );

    expect(payload).toMatchObject({
      purposeNewMark: "",
      purposeRenewalMark: "",
      purposeRepairMark: "X",
      purposeReplacementMark: "",
      purchaseByProcurementMark: "",
      purchaseSelfMark: "X",
    });
  });

  test("formats monetary values with comma separators and two decimals", () => {
    const payload = buildPurchaseRequestRenderPayload(
      {
        id: "draft_003",
        prNo: null,
        refNo: null,
        documentDate: new Date("2026-06-28T00:00:00.000Z"),
        requiredDate: null,
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: null,
        subtotal: "108650.50",
        vatRate: "7",
        vatAmount: "7605.535",
        totalAmount: "116256.035",
        company: { displayName: "Grandlink", legalName: "Grandlink Logistics", taxId: null },
        branch: { name: "Grandlink", code: "GL", address: null },
        department: { name: "IT" },
        division: { name: "IT" },
        createdBy: { displayName: "Admin User" },
        items: [
          {
            lineNo: 1,
            accountCode: "",
            description: "Server",
            quantity: "1",
            unitCost: "78500",
            totalAmount: "78500",
          },
          {
            lineNo: 2,
            accountCode: "",
            description: "Battery",
            quantity: "1",
            unitCost: "5250.5",
            totalAmount: "5250.5",
          },
        ],
      },
      "ITPR_2606009",
    );

    expect(payload).toMatchObject({
      subtotalFormatted: "108,650.50",
      vatAmountFormatted: "7,605.54",
      totalAmountFormatted: "116,256.04",
    });
    expect(payload.items).toMatchObject([
      { unitCostFormatted: "78,500.00", totalAmountFormatted: "78,500.00" },
      { unitCostFormatted: "5,250.50", totalAmountFormatted: "5,250.50" },
    ]);
  });

  test("renders heading rows without item numbering or priced values", () => {
    const payload = buildPurchaseRequestRenderPayload(
      {
        id: "draft_004",
        prNo: null,
        refNo: null,
        documentDate: new Date("2026-06-28T00:00:00.000Z"),
        requiredDate: null,
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: null,
        subtotal: "83750.00",
        vatRate: "7",
        vatAmount: "5862.50",
        totalAmount: "89612.50",
        company: { displayName: "Grandlink", legalName: "Grandlink Logistics", taxId: null },
        branch: { name: "Grandlink", code: "GL", address: null },
        department: { name: "IT" },
        division: { name: "IT" },
        createdBy: { displayName: "Admin User" },
        items: [
          {
            lineNo: 1,
            rowType: "HEADING",
            accountCode: "",
            description: "Hardware",
            quantity: "0",
            unitCost: "0",
            totalAmount: "0",
          },
          {
            lineNo: 2,
            rowType: "ITEM",
            accountCode: "",
            description: "Server",
            quantity: "1",
            unitCost: "78500",
            totalAmount: "78500",
          },
          {
            lineNo: 3,
            rowType: "HEADING",
            accountCode: "",
            description: "Power",
            quantity: "0",
            unitCost: "0",
            totalAmount: "0",
          },
          {
            lineNo: 4,
            rowType: "ITEM",
            accountCode: "",
            description: "Battery",
            quantity: "1",
            unitCost: "5250",
            totalAmount: "5250",
          },
        ],
      },
      "ITPR_2606010",
    );

    expect(payload.items).toEqual([
      {
        lineNo: "",
        itemNo: "",
        rowType: "HEADING",
        isHeading: true,
        isDetail: false,
        accountCode: "",
        description: "Hardware",
        quantity: "",
        unitCost: 0,
        unitCostFormatted: "",
        totalAmount: 0,
        totalAmountFormatted: "",
      },
      {
        lineNo: 1,
        itemNo: 1,
        rowType: "ITEM",
        isHeading: false,
        isDetail: false,
        accountCode: "",
        description: "Server",
        quantity: 1,
        unitCost: 78500,
        unitCostFormatted: "78,500.00",
        totalAmount: 78500,
        totalAmountFormatted: "78,500.00",
      },
      {
        lineNo: "",
        itemNo: "",
        rowType: "HEADING",
        isHeading: true,
        isDetail: false,
        accountCode: "",
        description: "Power",
        quantity: "",
        unitCost: 0,
        unitCostFormatted: "",
        totalAmount: 0,
        totalAmountFormatted: "",
      },
      {
        lineNo: 2,
        itemNo: 2,
        rowType: "ITEM",
        isHeading: false,
        isDetail: false,
        accountCode: "",
        description: "Battery",
        quantity: 1,
        unitCost: 5250,
        unitCostFormatted: "5,250.00",
        totalAmount: 5250,
        totalAmountFormatted: "5,250.00",
      },
    ]);
  });

  test("renders detail rows as description-only continuations without item numbering", () => {
    const payload = buildPurchaseRequestRenderPayload(
      {
        id: "draft_005",
        prNo: null,
        refNo: null,
        documentDate: new Date("2026-06-28T00:00:00.000Z"),
        requiredDate: null,
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
        remark: null,
        subtotal: "88750.00",
        vatRate: "7",
        vatAmount: "6212.50",
        totalAmount: "94962.50",
        company: { displayName: "Grandlink", legalName: "Grandlink Logistics", taxId: null },
        branch: { name: "Grandlink", code: "GL", address: null },
        department: { name: "IT" },
        division: { name: "IT" },
        createdBy: { displayName: "Admin User" },
        items: [
          {
            lineNo: 1,
            rowType: "ITEM",
            accountCode: "",
            description: "Server",
            quantity: "1",
            unitCost: "78500",
            totalAmount: "78500",
          },
          {
            lineNo: 2,
            rowType: "DETAIL",
            accountCode: "",
            description: "Includes rack rail kit and onsite setup",
            quantity: "0",
            unitCost: "0",
            totalAmount: "0",
          },
          {
            lineNo: 3,
            rowType: "ITEM",
            accountCode: "",
            description: "Battery",
            quantity: "1",
            unitCost: "10250",
            totalAmount: "10250",
          },
        ],
      },
      "ITPR_2606011",
    );

    expect(payload.items).toEqual([
      {
        lineNo: 1,
        itemNo: 1,
        rowType: "ITEM",
        isHeading: false,
        isDetail: false,
        accountCode: "",
        description: "Server",
        quantity: 1,
        unitCost: 78500,
        unitCostFormatted: "78,500.00",
        totalAmount: 78500,
        totalAmountFormatted: "78,500.00",
      },
      {
        lineNo: "",
        itemNo: "",
        rowType: "DETAIL",
        isHeading: false,
        isDetail: true,
        accountCode: "",
        description: "- Includes rack rail kit and onsite setup",
        quantity: "",
        unitCost: 0,
        unitCostFormatted: "",
        totalAmount: 0,
        totalAmountFormatted: "",
      },
      {
        lineNo: 2,
        itemNo: 2,
        rowType: "ITEM",
        isHeading: false,
        isDetail: false,
        accountCode: "",
        description: "Battery",
        quantity: 1,
        unitCost: 10250,
        unitCostFormatted: "10,250.00",
        totalAmount: 10250,
        totalAmountFormatted: "10,250.00",
      },
    ]);
  });

  test("keeps default remark lines short enough for the PR template ruled rows", () => {
    const lines = splitRemarkIntoTemplateLines(
      "ASUS Mini PC NUC 13 Pro90AB3ANK-MR4100 Replace แทน Lenovo ThinkCentre e72 จำนวน 7 เครื่อง สำหรับทีม IT Operation และใช้ทดแทนอุปกรณ์เดิมที่เสื่อมสภาพ",
    );

    expect(lines.line1.length).toBeLessThanOrEqual(78);
    expect(lines.line2.length).toBeLessThanOrEqual(78);
    expect(lines.line2).not.toBe("");
  });

  test("builds deterministic generated file metadata", () => {
    expect(buildGeneratedFileInfo("ITPR_2606007")).toMatchObject({
      fileName: "ITPR_2606007.pdf",
      mimeType: "application/pdf",
      storagePath: "generated/ITPR_2606007.pdf",
    });
  });

  test("builds deterministic draft preview file metadata without an official PR number", () => {
    expect(buildDraftPreviewFileInfo("draft_001")).toMatchObject({
      fileName: "PR_DRAFT_PREVIEW_draft_001.pdf",
      mimeType: "application/pdf",
    });
  });

  test("hashes rendered output using SHA-256", () => {
    expect(sha256Hex(Buffer.from("rendered pdf"))).toBe("d6daae37ebaab1cb26a2969bcf2973b2de43ba47fda1ed1ca6bd52a0011b5d48");
  });

  test("applies branch header and footer images directly into a DOCX template", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="jpg" ContentType="image/jpeg"/></Types>');
    zip.file(
      "word/header1.xml",
      '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:docPr descr="{d.companyHeaderImage}"/><a:blip r:embed="rId1"/></w:hdr>',
    );
    zip.file(
      "word/footer1.xml",
      '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:docPr descr="{d.companyFooterImage}"/><a:blip r:embed="rId2"/></w:ftr>',
    );
    zip.file("word/_rels/header1.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>');
    zip.file("word/_rels/footer1.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.jpg"/></Relationships>');
    zip.file("word/media/image1.png", Buffer.from("old header"));
    zip.file("word/media/image2.jpg", Buffer.from("old footer"));

    const output = await applyBranchImagesToDocxTemplate(Buffer.from(await zip.generateAsync({ type: "uint8array" })), {
      footer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]),
      header: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0a]),
    });
    const patched = await JSZip.loadAsync(output);

    await expect(patched.file("word/media/image1.png")!.async("nodebuffer")).resolves.toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0a]));
    await expect(patched.file("word/media/image2.png")!.async("nodebuffer")).resolves.toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]));
    await expect(patched.file("word/_rels/footer1.xml.rels")!.async("string")).resolves.toContain('Target="media/image2.png"');
    await expect(patched.file("[Content_Types].xml")!.async("string")).resolves.toContain('Extension="png"');
  });
});

describe("purchase request generation soft budget tracking", () => {
  test("issue PR moves soft budget reservation into used amount", () => {
    const source = readFileSync("lib/pr-generate.ts", "utf8");

    expect(source).toContain("issueDraftBudget");
    expect(source).toContain("budgetReference");
    expect(source).toContain("budgetStatus");
  });
});
