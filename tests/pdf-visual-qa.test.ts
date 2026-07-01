import { describe, expect, test } from "vitest";
import {
  buildPdfQaOutputPaths,
  buildPdfVisualQaReport,
  estimatePdfPageCount,
  formatPdfVisualQaMarkdown,
} from "../lib/pdf-visual-qa";

function fakePdf(pageCount: number, extra = "") {
  const pages = Array.from({ length: pageCount }, (_, index) => `${index + 1} 0 obj\n<< /Type /Page >>\nendobj`).join("\n");

  return Buffer.from(`%PDF-1.7\n${pages}\n${extra}\n%%EOF`);
}

describe("pdf visual qa helpers", () => {
  test("estimates page count from PDF page objects", () => {
    expect(estimatePdfPageCount(fakePdf(1))).toBe(1);
    expect(estimatePdfPageCount(fakePdf(3))).toBe(3);
  });

  test("builds a passing report when signature, page count, size, and rendered pages are valid", () => {
    const report = buildPdfVisualQaReport({
      expectedPageCount: 1,
      fileName: "ITPR_2606008.pdf",
      minBytes: 20,
      pdf: fakePdf(1),
      renderedPages: [
        {
          bytes: 42_000,
          page: 1,
          path: "output/pdf-qa/ITPR_2606008/page-1.png",
        },
      ],
    });

    expect(report.status).toBe("PASS");
    expect(report.pageCount).toBe(1);
    expect(report.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.findings.every((finding) => finding.level !== "FAIL")).toBe(true);
  });

  test("fails when a PDF is malformed or page count does not match expectation", () => {
    const report = buildPdfVisualQaReport({
      expectedPageCount: 1,
      fileName: "broken.pdf",
      minBytes: 100,
      pdf: Buffer.from("not a pdf"),
      renderedPages: [],
    });

    expect(report.status).toBe("FAIL");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["PDF_MAGIC_INVALID", "PDF_EOF_MISSING", "PDF_TOO_SMALL", "PDF_PAGE_COUNT_ZERO", "PDF_PAGE_COUNT_MISMATCH"]),
    );
  });

  test("warns when rendering was skipped but structural checks passed", () => {
    const report = buildPdfVisualQaReport({
      expectedPageCount: 1,
      fileName: "draft-preview.pdf",
      minBytes: 20,
      pdf: fakePdf(1),
      renderSkippedReason: "pdftoppm not found",
      renderedPages: [],
    });

    expect(report.status).toBe("WARN");
    expect(report.findings).toContainEqual(expect.objectContaining({ code: "PDF_RENDER_SKIPPED", level: "WARN" }));
  });

  test("builds deterministic output paths and markdown checklist", () => {
    const paths = buildPdfQaOutputPaths({
      inputPath: "storage/generated/ITPR_2606008.pdf",
      outputRoot: "output/pdf-qa",
    });
    const report = buildPdfVisualQaReport({
      expectedPageCount: 1,
      fileName: "ITPR_2606008.pdf",
      minBytes: 20,
      pdf: fakePdf(1),
      renderedPages: [{ bytes: 42_000, page: 1, path: paths.pagePrefix + "-1.png" }],
    });
    const markdown = formatPdfVisualQaMarkdown(report);

    expect(paths.reportJsonPath).toBe("output/pdf-qa/ITPR_2606008/report.json");
    expect(paths.reportMarkdownPath).toBe("output/pdf-qa/ITPR_2606008/report.md");
    expect(paths.pagePrefix).toBe("output/pdf-qa/ITPR_2606008/page");
    expect(markdown).toContain("# PDF Visual QA Report");
    expect(markdown).toContain("## Human Visual Checklist");
    expect(markdown).toContain("item table stays aligned");
    expect(markdown).toContain("amounts show comma separators and two decimals");
  });
});
