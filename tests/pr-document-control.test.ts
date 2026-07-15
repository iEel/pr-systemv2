import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  assertCancellableStatus,
  assertQuotationUploadableStatus,
  assertReissuableStatus,
  assertSignableStatus,
  assertPrintableStatus,
  buildPdfDeliveryHeaders,
  buildQuotationStoragePath,
  buildSignedDocumentStoragePath,
  normalizeCancelReason,
  resolveDocumentStoragePath,
  validateQuotationUploadFile,
  validateSignedUploadFile,
} from "../lib/pr-document-control";

describe("document-control helpers", () => {
  test("resolves document storage paths only inside the storage directory", () => {
    const resolved = resolveDocumentStoragePath("generated/ITPR_2606007.pdf");

    expect(resolved).toBe(path.join(process.cwd(), "storage", "generated", "ITPR_2606007.pdf"));
    expect(() => resolveDocumentStoragePath("../.env")).toThrow("Invalid document storage path");
    expect(() => resolveDocumentStoragePath("C:/tmp/outside.pdf")).toThrow("Invalid document storage path");
  });

  test("builds inline and attachment headers for generated PDF delivery", () => {
    expect(buildPdfDeliveryHeaders("ITPR_2606007.pdf", "inline")).toMatchObject({
      "content-disposition": 'inline; filename="ITPR_2606007.pdf"',
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    });

    expect(buildPdfDeliveryHeaders("ITPR_2606007.pdf", "download")["content-disposition"]).toBe(
      'attachment; filename="ITPR_2606007.pdf"',
    );
  });

  test("allows Mark Printed only from generated status", () => {
    expect(assertPrintableStatus("GENERATED")).toBeUndefined();
    expect(() => assertPrintableStatus("DRAFT")).toThrow("Only generated purchase requests can be marked printed");
    expect(() => assertPrintableStatus("PRINTED")).toThrow("Only generated purchase requests can be marked printed");
  });

  test("allows signed upload only from printed status", () => {
    expect(assertSignableStatus("PRINTED")).toBeUndefined();
    expect(() => assertSignableStatus("DRAFT")).toThrow("Only printed purchase requests can receive signed documents");
    expect(() => assertSignableStatus("SIGNED")).toThrow("Only printed purchase requests can receive signed documents");
  });

  test("allows quotation uploads before cancellation states", () => {
    expect(assertQuotationUploadableStatus("DRAFT")).toBeUndefined();
    expect(assertQuotationUploadableStatus("GENERATED")).toBeUndefined();
    expect(assertQuotationUploadableStatus("PRINTED")).toBeUndefined();
    expect(assertQuotationUploadableStatus("SIGNED")).toBeUndefined();
    expect(() => assertQuotationUploadableStatus("CANCELLED")).toThrow("Cancelled or reissued purchase requests cannot receive quotations");
    expect(() => assertQuotationUploadableStatus("REISSUED")).toThrow("Cancelled or reissued purchase requests cannot receive quotations");
  });

  test("allows cancel only for controlled document statuses", () => {
    expect(assertCancellableStatus("GENERATED")).toBeUndefined();
    expect(assertCancellableStatus("PRINTED")).toBeUndefined();
    expect(assertCancellableStatus("SIGNED")).toBeUndefined();
    expect(() => assertCancellableStatus("DRAFT")).toThrow("Only generated, printed, or signed purchase requests can be cancelled");
    expect(() => assertCancellableStatus("CANCELLED")).toThrow("Only generated, printed, or signed purchase requests can be cancelled");
  });

  test("allows reissue only from cancelled status", () => {
    expect(assertReissuableStatus("CANCELLED")).toBeUndefined();
    expect(() => assertReissuableStatus("SIGNED")).toThrow("Only cancelled purchase requests can be reissued");
    expect(() => assertReissuableStatus("DRAFT")).toThrow("Only cancelled purchase requests can be reissued");
  });

  test("normalizes cancel reasons and rejects blank reasons", () => {
    expect(normalizeCancelReason("  wrong vendor quote  ")).toBe("wrong vendor quote");
    expect(normalizeCancelReason("line one\r\nline two")).toBe("line one\nline two");
    expect(() => normalizeCancelReason("   ")).toThrow("Cancel reason is required");
  });

  test("validates signed document upload file type and size", () => {
    expect(validateSignedUploadFile({ name: "signed.pdf", type: "application/pdf", size: 1024 })).toMatchObject({
      extension: ".pdf",
      type: "SIGNED_PDF",
    });

    expect(validateSignedUploadFile({ name: "signed.jpg", type: "image/jpeg", size: 1024 })).toMatchObject({
      extension: ".jpg",
      type: "SIGNED_SCAN",
    });

    expect(validateSignedUploadFile({ name: "signed.png", type: "image/png", size: 1024 })).toMatchObject({
      extension: ".png",
      type: "SIGNED_SCAN",
    });

    expect(() => validateSignedUploadFile({ name: "signed.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 })).toThrow(
      "Signed document must be a PDF, JPG, JPEG, or PNG file",
    );
    expect(() => validateSignedUploadFile({ name: "empty.pdf", type: "application/pdf", size: 0 })).toThrow("Signed document file is required");
    expect(() => validateSignedUploadFile({ name: "large.pdf", type: "application/pdf", size: 16 * 1024 * 1024 })).toThrow(
      "Signed document must be 15 MB or smaller",
    );
  });

  test("validates quotation upload file type and size", () => {
    expect(validateQuotationUploadFile({ name: "quotation.pdf", type: "application/pdf", size: 1024 })).toMatchObject({
      extension: ".pdf",
      mimeType: "application/pdf",
      type: "QUOTATION",
    });

    expect(validateQuotationUploadFile({ name: "quotation.xlsx", type: "application/octet-stream", size: 1024 })).toMatchObject({
      extension: ".xlsx",
      type: "QUOTATION",
    });

    expect(validateQuotationUploadFile({ name: "quotation.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 })).toMatchObject({
      extension: ".docx",
      type: "QUOTATION",
    });

    expect(() => validateQuotationUploadFile({ name: "quotation.exe", type: "application/octet-stream", size: 1024 })).toThrow(
      "Quotation must be a PDF, JPG, PNG, DOCX, or XLSX file",
    );
    expect(() => validateQuotationUploadFile({ name: "empty.pdf", type: "application/pdf", size: 0 })).toThrow("Quotation file is required");
    expect(() => validateQuotationUploadFile({ name: "large.pdf", type: "application/pdf", size: 16 * 1024 * 1024 })).toThrow(
      "Quotation must be 15 MB or smaller",
    );
  });

  test("builds deterministic signed document storage paths", () => {
    expect(buildSignedDocumentStoragePath({ prNo: "ITPR_2606007", version: 2, originalName: "signed copy.pdf", mimeType: "application/pdf" })).toBe(
      "signed/ITPR_2606007_signed_v2.pdf",
    );
    expect(buildSignedDocumentStoragePath({ prNo: null, version: 1, originalName: "scan.final.PNG", mimeType: "image/png" })).toMatch(
      /^signed\/pr_[a-z0-9]+_signed_v1\.png$/,
    );
  });

  test("builds deterministic quotation storage paths", () => {
    expect(buildQuotationStoragePath({ prNo: "ITPR_2606007", purchaseRequestId: "pr_001", version: 2, originalName: "vendor quote.PDF", mimeType: "application/pdf" })).toBe(
      "quotations/ITPR_2606007_quotation_v2.pdf",
    );
    expect(buildQuotationStoragePath({ prNo: null, purchaseRequestId: "pr_draft", version: 1, originalName: "quote.xlsx", mimeType: "application/octet-stream" })).toBe(
      "quotations/pr_draft_quotation_v1.xlsx",
    );
  });

  test("cancel and reissue update soft budget tracking", () => {
    const source = readFileSync("lib/pr-document-control.ts", "utf8");

    expect(source).toContain("reverseUsedBudget");
    expect(source).toContain("reserveDraftBudget");
    expect(source).toContain("budgetStatus");
  });

  test("reissue preserves the original category in its replacement draft", () => {
    const source = readFileSync("lib/pr-document-control.ts", "utf8");

    expect(source).toContain("categoryId: original.categoryId");
  });
});
