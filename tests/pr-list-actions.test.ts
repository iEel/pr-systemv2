import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { buildPurchaseRequestRowActions } from "../lib/pr-list-actions";

describe("PR list row actions", () => {
  test("uses draft preview download for draft rows", () => {
    const actions = buildPurchaseRequestRowActions({ id: "pr_draft", prNo: "Draft pending", status: "Draft" });

    expect(actions.detailHref).toBe("/pr/pr_draft");
    expect(actions.primaryDownload).toEqual({
      ariaLabel: "Download preview for Draft pending",
      href: "/pr/pr_draft/preview-pdf?download=1",
      label: "Download Preview",
    });
    expect(actions.menuActions).toEqual(
      expect.arrayContaining([
        { href: "/pr/new?cloneFrom=pr_draft", label: "Clone as Draft" },
        { href: "/pr/pr_draft/upload-quotation", label: "Upload Quotation" },
        { href: "/pr/pr_draft/edit", label: "Edit Draft" },
        { href: "/pr/pr_draft/preview-pdf", label: "Preview Draft", target: "_blank" },
        { href: "/pr/pr_draft/preview-pdf?download=1", label: "Download Preview" },
      ]),
    );
  });

  test("uses generated PDF download and lifecycle links for controlled rows", () => {
    const actions = buildPurchaseRequestRowActions({ id: "pr_printed", prNo: "ITPR_2606008", status: "Printed" });

    expect(actions.primaryDownload).toEqual({
      ariaLabel: "Download PDF for ITPR_2606008",
      href: "/pr/pr_printed/pdf?download=1",
      label: "Download PDF",
    });
    expect(actions.menuActions).toEqual(
      expect.arrayContaining([
        { href: "/pr/new?cloneFrom=pr_printed", label: "Clone as Draft" },
        { href: "/pr/pr_printed/upload-quotation", label: "Upload Quotation" },
        { href: "/pr/pr_printed/pdf", label: "Preview PDF", target: "_blank" },
        { href: "/pr/pr_printed/pdf?download=1", label: "Download PDF" },
        { href: "/pr/pr_printed/upload-signed", label: "Upload Signed" },
        { href: "/pr/pr_printed/cancel", label: "Cancel PR" },
      ]),
    );
  });

  test("PR Documents exposes a read-only board view with lifecycle quick actions", () => {
    const source = readFileSync("components/pr/PRList.tsx", "utf8");

    expect(source).toContain("viewMode");
    expect(source).toContain("Table");
    expect(source).toContain("Board");
    expect(source).toContain("boardColumns");
    expect(source).toContain("workflowRows");
    expect(source).toContain("archivedRows");
    expect(source).toContain("Draft");
    expect(source).toContain("Generated");
    expect(source).toContain("Printed");
    expect(source).toContain("Signed");
    expect(source).toContain("Cancelled / Reissued");
    expect(source).toContain("Preview Draft");
    expect(source).toContain("Issue PR");
    expect(source).toContain("Mark Printed");
    expect(source).toContain("Upload Signed");
    expect(source).toContain("Clone as Draft");
    expect(source).not.toContain("onDragEnd");
  });
});
