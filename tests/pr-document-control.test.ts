import path from "node:path";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  requirePermission: vi.fn(),
  reserveDraftBudget: vi.fn(),
  reverseUsedBudget: vi.fn(),
}));

vi.mock("../lib/auth/current-user", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("../lib/budget-tracking", () => ({
  buildBudgetReference: (input: unknown) => input,
  reserveDraftBudget: mocks.reserveDraftBudget,
  reverseUsedBudget: mocks.reverseUsedBudget,
}));

vi.mock("../lib/prisma", () => ({
  prisma: mocks.prisma,
}));
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
  reissuePurchaseRequest,
  resolveDocumentStoragePath,
  validateQuotationUploadFile,
  validateSignedUploadFile,
} from "../lib/pr-document-control";

function buildReissueSource({ categoryId = "cat_hardware", categoryIsActive = true }: { categoryId?: string | null; categoryIsActive?: boolean } = {}) {
  return {
    id: "pr_cancelled",
    branchId: "br_sonic04",
    categoryId,
    category: categoryId ? { id: categoryId, isActive: categoryIsActive } : null,
    companyId: "co_sonic04",
    departmentId: "dep_it",
    divisionId: null,
    documentDate: new Date("2026-07-01T00:00:00.000Z"),
    items: [],
    prNo: "ITPR_2607001",
    purchaseMethod: "ฝ่ายจัดซื้อจัดหา",
    purpose: "ซื้อใหม่",
    refNo: "SN17-DOCSA011",
    remark: null,
    requiredDate: null,
    status: "CANCELLED",
    subtotal: 100,
    totalAmount: 107,
    vatAmount: 7,
    vatRate: 7,
  };
}

function useReissueTransaction(original = buildReissueSource()) {
  const tx = {
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit_1" }) },
    purchaseRequest: {
      create: vi.fn().mockResolvedValue({ id: "pr_replacement" }),
      findUnique: vi.fn().mockResolvedValue(original),
      update: vi.fn().mockResolvedValue({ id: original.id }),
    },
    purchaseRequestCategory: {
      findFirst: vi.fn(),
    },
  };

  mocks.prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) => callback(tx));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ id: "user_admin" });
  mocks.reserveDraftBudget.mockResolvedValue({ budgetStatus: "TRACKED" });
});

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

  test("reissue validates and reuses an active source category", async () => {
    const tx = useReissueTransaction();
    tx.purchaseRequestCategory.findFirst.mockResolvedValue({ id: "cat_hardware" });

    await reissuePurchaseRequest("pr_cancelled");

    expect(tx.purchaseRequestCategory.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: { id: "cat_hardware", isActive: true },
    });
    expect(tx.purchaseRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ categoryId: "cat_hardware" }),
    }));
  });

  test("reissue accepts an explicitly selected active category for an uncategorized source", async () => {
    const tx = useReissueTransaction(buildReissueSource({ categoryId: null }));
    tx.purchaseRequestCategory.findFirst.mockResolvedValue({ id: "cat_service_maintenance" });

    await reissuePurchaseRequest("pr_cancelled", "cat_service_maintenance");

    expect(tx.purchaseRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ categoryId: "cat_service_maintenance" }),
    }));
  });

  test("reissue rejects a missing category before creating a replacement draft", async () => {
    const tx = useReissueTransaction(buildReissueSource({ categoryId: null }));

    await expect(reissuePurchaseRequest("pr_cancelled")).rejects.toThrow("PR category is required");

    expect(tx.purchaseRequest.create).not.toHaveBeenCalled();
  });

  test("reissue rejects an inactive submitted or fallback category before creating a replacement draft", async () => {
    const tx = useReissueTransaction(buildReissueSource({ categoryId: "cat_inactive", categoryIsActive: false }));
    tx.purchaseRequestCategory.findFirst.mockResolvedValue(null);

    await expect(reissuePurchaseRequest("pr_cancelled", "cat_inactive")).rejects.toThrow("PR category is not available");

    expect(tx.purchaseRequest.create).not.toHaveBeenCalled();
  });
});
