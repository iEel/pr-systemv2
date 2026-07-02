import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import {
  assertArchivableTemplateStatus,
  buildTemplatePreviewFileInfo,
  buildTemplatePreviewPayload,
  buildTemplateDeliveryHeaders,
  buildTemplateStoragePath,
  canActivateTemplateVersion,
  extractCarboneTagsFromTemplateBuffer,
  mergeTemplatePreviewResult,
  normalizeTemplatePreview,
  normalizeTemplateValidation,
  validateTemplateTags,
  validateTemplateUploadFile,
} from "../lib/template-management";

async function makeZipBuffer(files: Record<string, string>) {
  const zip = new JSZip();

  for (const [fileName, content] of Object.entries(files)) {
    zip.file(fileName, content);
  }

  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

describe("template management helpers", () => {
  test("validates DOCX and XLSX template uploads", () => {
    expect(validateTemplateUploadFile({ name: "PR_STANDARD.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 })).toMatchObject({
      extension: ".docx",
      templateType: "DOCX",
    });
    expect(validateTemplateUploadFile({ name: "PR_SUMMARY.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1024 })).toMatchObject({
      extension: ".xlsx",
      templateType: "XLSX",
    });
    expect(() => validateTemplateUploadFile({ name: "PR.pdf", type: "application/pdf", size: 1024 })).toThrow("Template file must be a DOCX or XLSX file");
    expect(() => validateTemplateUploadFile({ name: "empty.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 0 })).toThrow("Template file is required");
    expect(() => validateTemplateUploadFile({ name: "large.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 11 * 1024 * 1024 })).toThrow("Template file must be 10 MB or smaller");
  });

  test("builds safe template storage paths by type", () => {
    expect(buildTemplateStoragePath({ name: "PR STANDARD", version: "V2", templateType: "DOCX" })).toBe("templates/PR_STANDARD_V2.docx");
    expect(buildTemplateStoragePath({ name: "PR/EXPORT", version: "V1", templateType: "XLSX" })).toBe("templates/PR_EXPORT_V1.xlsx");
  });

  test("builds safe download headers for original template files", () => {
    expect(buildTemplateDeliveryHeaders("PR_STANDARD_V1.docx", "DOCX")).toMatchObject({
      "content-disposition": 'attachment; filename="PR_STANDARD_V1.docx"',
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "x-content-type-options": "nosniff",
    });
    expect(buildTemplateDeliveryHeaders("PR_EXPORT.xlsx", "XLSX")["content-type"]).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  test("allows archiving draft and active templates only", () => {
    expect(assertArchivableTemplateStatus("DRAFT")).toBeUndefined();
    expect(assertArchivableTemplateStatus("ACTIVE")).toBeUndefined();
    expect(() => assertArchivableTemplateStatus("ARCHIVED")).toThrow("Template is already archived");
  });

  test("extracts Carbone tags from DOCX XML files", async () => {
    const buffer = await makeZipBuffer({
      "word/document.xml": "<w:t>{d.prNo}</w:t><w:t>{d.items[i].description}</w:t><w:t>{d.items[i+1]}</w:t>",
      "docProps/core.xml": "<xml>{ignored}</xml>",
    });

    await expect(extractCarboneTagsFromTemplateBuffer(buffer, "DOCX")).resolves.toEqual([
      "d.items[i+1]",
      "d.items[i].description",
      "d.prNo",
    ]);
  });

  test("extracts Carbone tags from XLSX XML files", async () => {
    const buffer = await makeZipBuffer({
      "xl/sharedStrings.xml": "<si><t>{d.companyName}</t></si>",
      "xl/worksheets/sheet1.xml": "<sheetData><t>{d.totalAmount}</t><t>{d.unknownTag}</t></sheetData>",
    });

    await expect(extractCarboneTagsFromTemplateBuffer(buffer, "XLSX")).resolves.toEqual([
      "d.companyName",
      "d.totalAmount",
      "d.unknownTag",
    ]);
  });

  test("validates required and unknown Carbone tags", () => {
    const result = validateTemplateTags(["d.prNo", "d.documentDate", "d.companyName", "d.unknownTag"]);

    expect(result.totalTagsFound).toBe(4);
    expect(result.unknownTags).toEqual(["d.unknownTag"]);
    expect(result.missingRequiredTags).toContain("d.items[i].description");
  });

  test("validates Carbone tags with formatter chains by their base data path", () => {
    const result = validateTemplateTags([
      "d.prNo",
      "d.documentDate",
      "d.companyName",
      "d.branchName",
      "d.department",
      "d.purpose:ifEQ('ซื้อใหม่'):show(X)",
      "d.purchaseMethod:ifEQ('ขอซื้อเอง'):show(X)",
      "d.totalAmount:formatN(2)",
      "d.items[i].description",
      "d.items[i].quantity:formatN(0)",
      "d.items[i].unitCost:formatN(2)",
      "d.items[i].totalAmount:formatN(2)",
      "d.unknownTag:formatN(2)",
    ]);

    expect(result.missingRequiredTags).toEqual([]);
    expect(result.unknownTags).toEqual(["d.unknownTag:formatN(2)"]);
  });

  test("allows split remark line tags for fixed template rows", () => {
    const result = validateTemplateTags([
      "d.prNo",
      "d.documentDate",
      "d.companyName",
      "d.branchName",
      "d.department",
      "d.purpose",
      "d.purchaseMethod",
      "d.totalAmount",
      "d.items[i].description",
      "d.items[i].quantity",
      "d.items[i].unitCost",
      "d.items[i].totalAmount",
      "d.remarkLine1",
      "d.remarkLine2",
    ]);

    expect(result.missingRequiredTags).toEqual([]);
    expect(result.unknownTags).toEqual([]);
  });

  test("allows precomputed checkbox mark tags for fixed PR template cells", () => {
    const result = validateTemplateTags([
      "d.prNo",
      "d.documentDate",
      "d.companyName",
      "d.branchName",
      "d.department",
      "d.division",
      "d.purpose",
      "d.purchaseMethod",
      "d.totalAmount",
      "d.items[i].description",
      "d.items[i].quantity",
      "d.items[i].unitCost",
      "d.items[i].totalAmount",
      "d.purposeNewMark",
      "d.purposeReplacementMark",
      "d.purposeRepairMark",
      "d.purposeRenewalMark",
      "d.purchaseByProcurementMark",
      "d.purchaseSelfMark",
    ]);

    expect(result.missingRequiredTags).toEqual([]);
    expect(result.unknownTags).toEqual([]);
  });

  test("allows formatted monetary tags for PR amount cells", () => {
    const result = validateTemplateTags([
      "d.prNo",
      "d.documentDate",
      "d.companyName",
      "d.branchName",
      "d.department",
      "d.purpose",
      "d.purchaseMethod",
      "d.totalAmount",
      "d.items[i].description",
      "d.items[i].quantity",
      "d.items[i].unitCost",
      "d.items[i].totalAmount",
      "d.items[i].unitCostFormatted",
      "d.items[i].totalAmountFormatted",
      "d.subtotalFormatted",
      "d.vatAmountFormatted",
      "d.totalAmountFormatted",
    ]);

    expect(result.missingRequiredTags).toEqual([]);
    expect(result.unknownTags).toEqual([]);
  });

  test("allows item row mode tags for heading and detail-aware templates", () => {
    const result = validateTemplateTags([
      "d.prNo",
      "d.documentDate",
      "d.companyName",
      "d.branchName",
      "d.department",
      "d.purpose",
      "d.purchaseMethod",
      "d.totalAmount",
      "d.items[i].description",
      "d.items[i].quantity",
      "d.items[i].unitCost",
      "d.items[i].totalAmount",
      "d.items[i].lineNo",
      "d.items[i].itemNo",
      "d.items[i].rowType",
      "d.items[i].isHeading",
      "d.items[i].isDetail",
    ]);

    expect(result.missingRequiredTags).toEqual([]);
    expect(result.unknownTags).toEqual([]);
  });

  test("keeps item loop markers inside the item table in the active PR template", async () => {
    const buffer = readFileSync("storage/templates/PR_STANDARD_V1.docx");
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const itemTableHeaderIndex = xml.indexOf("Description");
    const firstItemLoopIndex = xml.indexOf("d.items[i]");

    expect(itemTableHeaderIndex).toBeGreaterThan(-1);
    expect(firstItemLoopIndex).toBeGreaterThan(itemTableHeaderIndex);
  });

  test("normalizes legacy numeric validation JSON values", () => {
    expect(normalizeTemplateValidation({ totalTagsFound: 28, missingRequiredTags: 0, unknownTags: 0 })).toMatchObject({
      missingRequiredTags: [],
      totalTagsFound: 28,
      unknownTags: [],
    });
  });

  test("does not treat upload metadata as a completed validation result", () => {
    expect(normalizeTemplateValidation({ sha256: "abc" })).toBeNull();
  });

  test("builds deterministic preview PDF metadata for templates", () => {
    expect(buildTemplatePreviewFileInfo({ name: "PR STANDARD", version: "V2", templateType: "DOCX" })).toMatchObject({
      fileName: "TEMPLATE_PREVIEW_PR_STANDARD_V2_DOCX.pdf",
      mimeType: "application/pdf",
      storagePath: "template-previews/PR_STANDARD_V2_DOCX.pdf",
    });
  });

  test("normalizes and merges template preview metadata without losing validation results", () => {
    const validation = validateTemplateTags([
      "d.prNo",
      "d.documentDate",
      "d.companyName",
      "d.branchName",
      "d.department",
      "d.purpose",
      "d.purchaseMethod",
      "d.totalAmount",
      "d.items[i].description",
      "d.items[i].quantity",
      "d.items[i].unitCost",
      "d.items[i].totalAmount",
    ]);
    const merged = mergeTemplatePreviewResult(validation, {
      contentType: "application/pdf",
      fileName: "TEMPLATE_PREVIEW_PR_STANDARD_V2_DOCX.pdf",
      renderedAt: "2026-06-30T00:00:00.000Z",
      sha256: "a".repeat(64),
      status: "PASSED",
      storagePath: "template-previews/PR_STANDARD_V2_DOCX.pdf",
    });

    expect(merged.missingRequiredTags).toEqual([]);
    expect(merged.totalTagsFound).toBe(12);
    expect(normalizeTemplatePreview(merged.preview)).toMatchObject({
      fileName: "TEMPLATE_PREVIEW_PR_STANDARD_V2_DOCX.pdf",
      status: "PASSED",
    });
    expect(normalizeTemplateValidation(merged)?.preview).toMatchObject({
      status: "PASSED",
      storagePath: "template-previews/PR_STANDARD_V2_DOCX.pdf",
    });
  });

  test("blocks PR_STANDARD DOCX activation until validation and preview pass", () => {
    const validValidation = validateTemplateTags([
      "d.prNo",
      "d.documentDate",
      "d.companyName",
      "d.branchName",
      "d.department",
      "d.purpose",
      "d.purchaseMethod",
      "d.totalAmount",
      "d.items[i].description",
      "d.items[i].quantity",
      "d.items[i].unitCost",
      "d.items[i].totalAmount",
    ]);

    expect(canActivateTemplateVersion({ name: "PR_STANDARD", templateType: "DOCX", validation: null })).toMatchObject({
      canActivate: false,
      reason: "Template must pass validation before activation",
    });
    expect(canActivateTemplateVersion({ name: "PR_STANDARD", templateType: "DOCX", validation: validValidation })).toMatchObject({
      canActivate: false,
      reason: "PR_STANDARD DOCX template must pass preview before activation",
    });
    expect(
      canActivateTemplateVersion({
        name: "PR_STANDARD",
        templateType: "DOCX",
        validation: mergeTemplatePreviewResult(validValidation, {
          error: "Carbone render failed",
          renderedAt: "2026-06-30T00:00:00.000Z",
          status: "FAILED",
        }),
      }),
    ).toMatchObject({
      canActivate: false,
      reason: "PR_STANDARD DOCX template must pass preview before activation",
    });
    expect(
      canActivateTemplateVersion({
        name: "PR_STANDARD",
        templateType: "DOCX",
        validation: mergeTemplatePreviewResult(validValidation, {
          contentType: "application/pdf",
          fileName: "TEMPLATE_PREVIEW_PR_STANDARD_V2_DOCX.pdf",
          renderedAt: "2026-06-30T00:00:00.000Z",
          sha256: "b".repeat(64),
          status: "PASSED",
          storagePath: "template-previews/PR_STANDARD_V2_DOCX.pdf",
        }),
      }),
    ).toMatchObject({
      canActivate: true,
      reason: null,
    });
    expect(canActivateTemplateVersion({ name: "PR_EXPORT", templateType: "XLSX", validation: validValidation })).toMatchObject({
      canActivate: true,
      reason: null,
    });
  });

  test("builds a realistic template preview payload with sample PR values", () => {
    const payload = buildTemplatePreviewPayload();

    expect(payload).toMatchObject({
      prNo: "TEMPLATE PREVIEW",
      companyDisplayName: "Sonic 00004 (PT)",
      department: "IT",
      division: "IT",
      purpose: "ซื้อใหม่",
      purchaseByProcurementMark: "X",
      remarkLine1: expect.any(String),
      totalAmountFormatted: "116,256.04",
    });
    expect(payload.items).toHaveLength(4);
    expect(payload.items[0]).toMatchObject({
      accountCode: "",
      description: "Dell PowerEdge R750 Server",
      unitCostFormatted: "78,500.00",
    });
    expect(payload.items[1]).toMatchObject({
      description: "- Includes rack rail kit and onsite setup",
      isDetail: true,
      lineNo: "",
      totalAmountFormatted: "",
    });
    expect(payload.items[2]).toMatchObject({
      description: "Samsung SSD 1.92TB SATA",
      lineNo: 2,
    });
  });
});
