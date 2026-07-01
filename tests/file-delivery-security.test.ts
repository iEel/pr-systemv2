import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attachmentFindFirst: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  requirePermission: vi.fn(),
  templateFindUnique: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("../lib/auth/current-user", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    documentTemplate: {
      findUnique: mocks.templateFindUnique,
    },
    purchaseRequestAttachment: {
      findFirst: mocks.attachmentFindFirst,
    },
  },
}));

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: mocks.mkdir,
    readFile: mocks.readFile,
    writeFile: mocks.writeFile,
  },
}));

import { getGeneratedPdfForPurchaseRequest, getPurchaseRequestAttachmentFile } from "../lib/pr-document-control";
import { getTemplateFileForDownload } from "../lib/template-management";

const actor = {
  displayName: "Admin User",
  email: null,
  id: "user_admin",
  role: "ADMIN",
  username: "admin",
};

function authorizationError() {
  const error = new Error("Authentication required") as Error & { status: number };
  error.status = 401;
  return error;
}

describe("file delivery security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue(actor);
  });

  test("requires PR_GENERATE before loading generated PR PDFs", async () => {
    const file = Buffer.from("%PDF-1.7");
    mocks.attachmentFindFirst.mockResolvedValue({
      fileName: "ITPR_2606008.pdf",
      fileSize: file.byteLength,
      mimeType: "application/pdf",
      sha256: "a".repeat(64),
      storagePath: "generated/ITPR_2606008.pdf",
    });
    mocks.readFile.mockResolvedValue(file);

    await expect(getGeneratedPdfForPurchaseRequest("pr_001")).resolves.toMatchObject({
      file,
      fileName: "ITPR_2606008.pdf",
      mimeType: "application/pdf",
    });

    expect(mocks.requirePermission).toHaveBeenCalledWith("PR_GENERATE");
    expect(mocks.attachmentFindFirst).toHaveBeenCalled();
    expect(mocks.readFile).toHaveBeenCalled();
  });

  test("stops generated PR PDF delivery before database lookup when permission is missing", async () => {
    mocks.requirePermission.mockRejectedValue(authorizationError());

    await expect(getGeneratedPdfForPurchaseRequest("pr_001")).rejects.toThrow("Authentication required");

    expect(mocks.requirePermission).toHaveBeenCalledWith("PR_GENERATE");
    expect(mocks.attachmentFindFirst).not.toHaveBeenCalled();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  test("requires PR_GENERATE before loading PR attachment files", async () => {
    const file = Buffer.from("quotation");
    mocks.attachmentFindFirst.mockResolvedValue({
      fileName: "ITPR_2606008_quotation_v1.pdf",
      fileSize: file.byteLength,
      mimeType: "application/pdf",
      sha256: "b".repeat(64),
      storagePath: "quotations/ITPR_2606008_quotation_v1.pdf",
    });
    mocks.readFile.mockResolvedValue(file);

    await expect(getPurchaseRequestAttachmentFile("pr_001", "att_quotation")).resolves.toMatchObject({
      file,
      fileName: "ITPR_2606008_quotation_v1.pdf",
      mimeType: "application/pdf",
    });

    expect(mocks.requirePermission).toHaveBeenCalledWith("PR_GENERATE");
    expect(mocks.attachmentFindFirst).toHaveBeenCalled();
    expect(mocks.readFile).toHaveBeenCalled();
  });

  test("stops PR attachment delivery before database lookup when permission is missing", async () => {
    mocks.requirePermission.mockRejectedValue(authorizationError());

    await expect(getPurchaseRequestAttachmentFile("pr_001", "att_quotation")).rejects.toThrow("Authentication required");

    expect(mocks.requirePermission).toHaveBeenCalledWith("PR_GENERATE");
    expect(mocks.attachmentFindFirst).not.toHaveBeenCalled();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  test("requires TEMPLATE_MANAGE before loading original template files", async () => {
    const file = Buffer.from("template");
    mocks.templateFindUnique.mockResolvedValue({
      fileName: "PR_STANDARD_V1.docx",
      storagePath: "templates/PR_STANDARD_V1.docx",
      templateType: "DOCX",
    });
    mocks.readFile.mockResolvedValue(file);

    await expect(getTemplateFileForDownload("tpl_001")).resolves.toMatchObject({
      file,
      fileName: "PR_STANDARD_V1.docx",
      templateType: "DOCX",
    });

    expect(mocks.requirePermission).toHaveBeenCalledWith("TEMPLATE_MANAGE");
    expect(mocks.templateFindUnique).toHaveBeenCalled();
    expect(mocks.readFile).toHaveBeenCalled();
  });

  test("stops template file delivery before database lookup when permission is missing", async () => {
    mocks.requirePermission.mockRejectedValue(authorizationError());

    await expect(getTemplateFileForDownload("tpl_001")).rejects.toThrow("Authentication required");

    expect(mocks.requirePermission).toHaveBeenCalledWith("TEMPLATE_MANAGE");
    expect(mocks.templateFindUnique).not.toHaveBeenCalled();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  test("file delivery routes map authorization failures to status-aware JSON responses", () => {
    const prPdfRoute = readFileSync("app/pr/[id]/pdf/route.ts", "utf8");
    const prAttachmentRoute = readFileSync("app/pr/[id]/attachments/[attachmentId]/route.ts", "utf8");
    const templateFileRoute = readFileSync("app/templates/[id]/file/route.ts", "utf8");

    expect(prPdfRoute).toContain("catch (error)");
    expect(prPdfRoute).toContain("Unable to load generated PDF");
    expect(prAttachmentRoute).toContain("catch (error)");
    expect(prAttachmentRoute).toContain("Unable to load PR attachment");
    expect(templateFileRoute).toContain("catch (error)");
    expect(templateFileRoute).toContain("Unable to load template file");
  });
});
