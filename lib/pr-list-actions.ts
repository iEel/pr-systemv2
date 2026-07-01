import type { PRStatus } from "./status";

export type PurchaseRequestRowAction = {
  href: string;
  label: string;
  target?: "_blank";
};

export type PurchaseRequestRowActionInput = {
  id: string;
  prNo: string;
  status: PRStatus;
};

export function buildPurchaseRequestRowActions(request: PurchaseRequestRowActionInput) {
  const detailHref = `/pr/${request.id}`;
  const isDraft = request.status === "Draft";
  const canUploadQuotation = ["Draft", "Generated", "Printed", "Signed"].includes(request.status);
  const previewHref = isDraft ? `${detailHref}/preview-pdf` : `${detailHref}/pdf`;
  const downloadLabel = isDraft ? "Download Preview" : "Download PDF";
  const previewLabel = isDraft ? "Preview Draft" : "Preview PDF";
  const downloadHref = `${previewHref}?download=1`;
  const menuActions: PurchaseRequestRowAction[] = [
    { href: detailHref, label: "Open Detail" },
    { href: `/pr/new?cloneFrom=${encodeURIComponent(request.id)}`, label: "Clone as Draft" },
    ...(isDraft ? [{ href: `${detailHref}/edit`, label: "Edit Draft" }] : []),
    ...(canUploadQuotation ? [{ href: `${detailHref}/upload-quotation`, label: "Upload Quotation" }] : []),
    { href: previewHref, label: previewLabel, target: "_blank" },
    { href: downloadHref, label: downloadLabel },
  ];

  if (request.status === "Printed") {
    menuActions.push({ href: `${detailHref}/upload-signed`, label: "Upload Signed" });
  }

  if (["Generated", "Printed", "Signed"].includes(request.status)) {
    menuActions.push({ href: `${detailHref}/cancel`, label: "Cancel PR" });
  }

  if (request.status === "Cancelled") {
    menuActions.push({ href: detailHref, label: "Reissue from Detail" });
  }

  return {
    detailHref,
    menuActions,
    primaryDownload: {
      ariaLabel: `${isDraft ? "Download preview" : "Download PDF"} for ${request.prNo}`,
      href: downloadHref,
      label: downloadLabel,
    },
  };
}
