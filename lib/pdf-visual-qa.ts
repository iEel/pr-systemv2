import crypto from "node:crypto";
import path from "node:path";

export type PdfVisualQaStatus = "PASS" | "WARN" | "FAIL";
export type PdfVisualQaFindingLevel = "PASS" | "WARN" | "FAIL";

export type PdfVisualQaFinding = {
  code: string;
  level: PdfVisualQaFindingLevel;
  message: string;
};

export type RenderedPdfPage = {
  bytes: number;
  page: number;
  path: string;
};

export type BuildPdfVisualQaReportInput = {
  expectedPageCount?: number;
  fileName: string;
  generatedAt?: string;
  minBytes?: number;
  pdf: Buffer;
  renderSkippedReason?: string;
  renderedPages?: RenderedPdfPage[];
};

export type PdfVisualQaReport = {
  bytes: number;
  expectedPageCount: number | null;
  fileName: string;
  findings: PdfVisualQaFinding[];
  generatedAt: string;
  pageCount: number;
  renderedPages: RenderedPdfPage[];
  sha256: string;
  status: PdfVisualQaStatus;
};

function pushFinding(findings: PdfVisualQaFinding[], level: PdfVisualQaFindingLevel, code: string, message: string) {
  findings.push({ code, level, message });
}

export function estimatePdfPageCount(pdf: Buffer) {
  const text = pdf.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page\b/g);

  return matches?.length ?? 0;
}

export function buildPdfVisualQaReport({
  expectedPageCount,
  fileName,
  generatedAt = new Date().toISOString(),
  minBytes = 1024,
  pdf,
  renderSkippedReason,
  renderedPages = [],
}: BuildPdfVisualQaReportInput): PdfVisualQaReport {
  const findings: PdfVisualQaFinding[] = [];
  const bytes = pdf.length;
  const text = pdf.toString("latin1");
  const pageCount = estimatePdfPageCount(pdf);
  const hasPdfMagic = pdf.subarray(0, 4).toString("latin1") === "%PDF";
  const hasEof = text.includes("%%EOF");

  pushFinding(
    findings,
    hasPdfMagic ? "PASS" : "FAIL",
    hasPdfMagic ? "PDF_MAGIC_OK" : "PDF_MAGIC_INVALID",
    hasPdfMagic ? "PDF header starts with %PDF." : "PDF header does not start with %PDF.",
  );
  pushFinding(
    findings,
    hasEof ? "PASS" : "FAIL",
    hasEof ? "PDF_EOF_OK" : "PDF_EOF_MISSING",
    hasEof ? "PDF includes EOF marker." : "PDF EOF marker is missing.",
  );
  pushFinding(
    findings,
    bytes >= minBytes ? "PASS" : "FAIL",
    bytes >= minBytes ? "PDF_SIZE_OK" : "PDF_TOO_SMALL",
    bytes >= minBytes ? `PDF size is ${bytes} bytes.` : `PDF size is ${bytes} bytes, below minimum ${minBytes}.`,
  );
  pushFinding(
    findings,
    pageCount > 0 ? "PASS" : "FAIL",
    pageCount > 0 ? "PDF_PAGE_COUNT_OK" : "PDF_PAGE_COUNT_ZERO",
    pageCount > 0 ? `Estimated page count is ${pageCount}.` : "Could not estimate a positive PDF page count.",
  );

  if (expectedPageCount !== undefined) {
    pushFinding(
      findings,
      pageCount === expectedPageCount ? "PASS" : "FAIL",
      pageCount === expectedPageCount ? "PDF_PAGE_COUNT_MATCH" : "PDF_PAGE_COUNT_MISMATCH",
      pageCount === expectedPageCount
        ? `Estimated page count matches expected ${expectedPageCount}.`
        : `Estimated page count ${pageCount} does not match expected ${expectedPageCount}.`,
    );
  }

  if (renderSkippedReason) {
    pushFinding(findings, "WARN", "PDF_RENDER_SKIPPED", `Page rendering skipped: ${renderSkippedReason}`);
  } else {
    pushFinding(
      findings,
      renderedPages.length === pageCount ? "PASS" : "FAIL",
      renderedPages.length === pageCount ? "PDF_RENDER_PAGE_COUNT_OK" : "PDF_RENDER_PAGE_COUNT_MISMATCH",
      renderedPages.length === pageCount
        ? `Rendered ${renderedPages.length} page image(s).`
        : `Rendered ${renderedPages.length} page image(s), expected ${pageCount}.`,
    );

    for (const page of renderedPages) {
      pushFinding(
        findings,
        page.bytes > 0 ? "PASS" : "FAIL",
        page.bytes > 0 ? "PDF_RENDER_PAGE_NONEMPTY" : "PDF_RENDER_PAGE_EMPTY",
        page.bytes > 0 ? `Rendered page ${page.page} is ${page.bytes} bytes.` : `Rendered page ${page.page} is empty.`,
      );
    }
  }

  const status: PdfVisualQaStatus = findings.some((finding) => finding.level === "FAIL")
    ? "FAIL"
    : findings.some((finding) => finding.level === "WARN")
      ? "WARN"
      : "PASS";

  return {
    bytes,
    expectedPageCount: expectedPageCount ?? null,
    fileName,
    findings,
    generatedAt,
    pageCount,
    renderedPages,
    sha256: crypto.createHash("sha256").update(pdf).digest("hex"),
    status,
  };
}

function toPosixPath(value: string) {
  return value.replace(/\\/g, "/").replace(/\/+$/g, "");
}

function safePathPart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "pdf";
}

export function buildPdfQaOutputPaths({ inputPath, outputRoot }: { inputPath: string; outputRoot: string }) {
  const normalizedInput = toPosixPath(inputPath);
  const normalizedRoot = toPosixPath(outputRoot) || "output/pdf-qa";
  const extension = path.posix.extname(normalizedInput);
  const fileBase = safePathPart(path.posix.basename(normalizedInput, extension));
  const directory = path.posix.join(normalizedRoot, fileBase);

  return {
    directory,
    pagePrefix: path.posix.join(directory, "page"),
    reportJsonPath: path.posix.join(directory, "report.json"),
    reportMarkdownPath: path.posix.join(directory, "report.md"),
  };
}

function findingIcon(level: PdfVisualQaFindingLevel) {
  if (level === "PASS") return "[PASS]";
  if (level === "WARN") return "[WARN]";
  return "[FAIL]";
}

export function formatPdfVisualQaMarkdown(report: PdfVisualQaReport) {
  const renderedPages = report.renderedPages.length
    ? report.renderedPages.map((page) => `- Page ${page.page}: \`${page.path}\` (${page.bytes} bytes)`).join("\n")
    : "- No rendered page images were captured.";

  return `# PDF Visual QA Report

## Summary

| Field | Value |
| --- | --- |
| Status | ${report.status} |
| File | ${report.fileName} |
| Bytes | ${report.bytes} |
| Estimated Pages | ${report.pageCount} |
| Expected Pages | ${report.expectedPageCount ?? "-"} |
| SHA-256 | ${report.sha256} |
| Generated At | ${report.generatedAt} |

## Automated Findings

${report.findings.map((finding) => `- ${findingIcon(finding.level)} ${finding.code}: ${finding.message}`).join("\n")}

## Rendered Page Images

${renderedPages}

## Human Visual Checklist

- Header and footer appear in the right place.
- PR number, date, company, branch, department, and division are readable.
- The item table stays aligned across all rows.
- Unit cost, total amount, subtotal, VAT, and grand total amounts show comma separators and two decimals.
- Remark lines do not overflow or push content into an unintended page.
- There is no unexpected second page.
- Thai and English text is not clipped, overlapped, or rendered as missing glyph boxes.
- Signature, approval, and attachment areas remain inside the intended page boundaries.
`;
}
