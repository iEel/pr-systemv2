import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  FileUp,
  LockKeyhole,
  Paperclip,
  Pencil,
  Printer,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import type { PurchaseRequestDetail } from "@/lib/purchase-requests";
import type { PRStatus } from "@/lib/status";
import { getStatusConfig } from "@/lib/status";
import { formatAmount, formatDate, formatDateTime, formatTHB } from "@/lib/utils";
import { generatePurchaseRequestPdfAction } from "@/app/pr/[id]/generate/actions";
import { markPurchaseRequestPrintedAction } from "@/app/pr/[id]/mark-printed/actions";
import { reissuePurchaseRequestAction } from "@/app/pr/[id]/reissue/actions";
import { PRTimeline } from "./PRTimeline";

type Header = PurchaseRequestDetail["header"];
type Attachment = PurchaseRequestDetail["attachments"][number];
type Reissue = PurchaseRequestDetail["reissue"];

const attachmentSlots = [
  { label: "Generated PDF", types: ["GENERATED_PDF"] },
  { label: "Signed PDF / Scan", types: ["SIGNED_PDF", "SIGNED_SCAN"] },
  { label: "Quotation", types: ["QUOTATION"] },
];

const linkButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface";
const commandPrimaryLinkClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90";
const commandSuccessLinkClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-success/90";
const dangerLinkClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/90";

function findAttachment(attachments: Attachment[], types: string[]) {
  return attachments.find((attachment) => types.includes(attachment.type));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 4,
  }).format(value);
}

function canUploadQuotation(status: PRStatus) {
  return ["Draft", "Generated", "Printed", "Signed"].includes(status);
}

function attachmentDownloadHref(prId: string, attachment: Attachment) {
  if (attachment.type === "GENERATED_PDF") {
    return `/pr/${prId}/pdf?download=1`;
  }

  return `/pr/${prId}/attachments/${attachment.id}`;
}

function NextActionCard({ generatedPdf, header, reissue }: { generatedPdf?: Attachment; header: Header; reissue: Reissue }) {
  const pdfDownloadHref = `/pr/${header.id}/pdf?download=1`;

  if (header.status === "Draft") {
    return (
      <CommandCard
        description="ออกเลข PR และสร้าง PDF ทางการ"
        icon={<Printer aria-hidden className="h-5 w-5 text-primary" />}
        title="Issue PR"
      >
        <form action={generatePurchaseRequestPdfAction.bind(null, header.id)}>
          <Button className="min-h-9 px-3 py-1.5 text-xs w-full sm:w-auto" type="submit" variant="primary">
            <Printer aria-hidden className="h-4 w-4" />Issue PR
          </Button>
        </form>
      </CommandCard>
    );
  }

  if (header.status === "Generated") {
    return (
      <CommandCard
        description="ยืนยันเมื่อพิมพ์เอกสารแล้ว"
        icon={<Printer aria-hidden className="h-5 w-5 text-primary" />}
        title="Mark printed"
      >
        <form action={markPurchaseRequestPrintedAction.bind(null, header.id)}>
          <Button className="min-h-9 px-3 py-1.5 text-xs w-full sm:w-auto" type="submit" variant="primary">
            <Printer aria-hidden className="h-4 w-4" />Mark Printed
          </Button>
        </form>
      </CommandCard>
    );
  }

  if (header.status === "Printed") {
    return (
      <CommandCard
        description="แนบไฟล์ที่เซ็นแล้วเพื่อปิดรอบ"
        icon={<FileUp aria-hidden className="h-5 w-5 text-success" />}
        title="Upload signed"
      >
        <Link className={commandSuccessLinkClass} href={`/pr/${header.id}/upload-signed`}>
          <FileUp aria-hidden className="h-4 w-4" />Upload Signed
        </Link>
      </CommandCard>
    );
  }

  if (header.status === "Signed") {
    return (
      <CommandCard
        description="เอกสารปิดรอบแล้ว"
        icon={<CheckCircle2 aria-hidden className="h-5 w-5 text-success" />}
        title="Signed complete"
      >
        {generatedPdf ? (
          <Link className={commandPrimaryLinkClass} href={pdfDownloadHref}>
            <Download aria-hidden className="h-4 w-4" />Download PDF
          </Link>
        ) : null}
      </CommandCard>
    );
  }

  if (header.status === "Cancelled") {
    return (
      <CommandCard
        description="สร้าง draft ใหม่จากข้อมูลเดิม"
        icon={<RotateCcw aria-hidden className="h-5 w-5 text-primary" />}
        title="Reissue draft"
      >
        <form action={reissuePurchaseRequestAction.bind(null, header.id)} className="grid w-full gap-2 sm:min-w-72">
          <Field label="PR Category / หมวดหมู่ PR *">
            <select className={inputClass()} defaultValue={reissue.categoryId} name="categoryId" required>
              <option value="">Select category</option>
              {reissue.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </Field>
          <Button className="min-h-9 px-3 py-1.5 text-xs w-full sm:w-auto" type="submit" variant="primary">
            <RotateCcw aria-hidden className="h-4 w-4" />Reissue
          </Button>
        </form>
      </CommandCard>
    );
  }

  return (
    <CommandCard
      description="นำข้อมูลไปเริ่ม draft ใหม่"
      icon={<Copy aria-hidden className="h-5 w-5 text-primary" />}
      title="Clone source"
    >
      <Link className={commandPrimaryLinkClass} href={`/pr/new?cloneFrom=${header.id}`}>
        <Copy aria-hidden className="h-4 w-4" />Clone as Draft
      </Link>
    </CommandCard>
  );
}

function CommandCard({
  children,
  description,
  icon,
  title,
}: {
  children?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
  }) {
  return (
    <div className="rounded-md border border-blue-200/80 bg-blue-50/50 px-3 py-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-primary shadow-sm">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-blue-950">{title}</div>
            <p className="mt-0.5 text-xs leading-5 text-blue-800">{description}</p>
          </div>
        </div>
        {children ? <div className="flex flex-wrap gap-2 sm:justify-end">{children}</div> : null}
      </div>
    </div>
  );
}

export function PRDetail({ canManageRecurring = false, detail }: { canManageRecurring?: boolean; detail: PurchaseRequestDetail }) {
  const { header } = detail;
  const status = getStatusConfig(header.status);
  const generatedPdf = findAttachment(detail.attachments, ["GENERATED_PDF"]);
  const canUseGeneratedPdf = Boolean(generatedPdf);
  const canPreviewDraft = header.status === "Draft";
  const canCancel = ["Generated", "Printed", "Signed"].includes(header.status);
  const quotationAllowed = canUploadQuotation(header.status);

  return (
    <div className="space-y-5">
      <SectionHeader
        title={`PR No. ${header.prNo}`}
        description="ตรวจสอบข้อมูลเอกสาร, รายการสินค้า, ไฟล์แนบ และ timeline ก่อนทำขั้นตอนถัดไป"
        action={<div className="flex flex-wrap items-center gap-2">{header.recurringOrigin ? <Link href={`/recurring-pr/${header.recurringOrigin.scheduleId}`}><Badge tone="purple">Recurring</Badge></Link> : null}<Badge tone={status.tone}>{status.label}</Badge></div>}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-5">
          <Card>
            <div className="grid gap-5 border-b border-border pb-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div>
                <div className="text-sm font-semibold text-muted">Company</div>
                <Link className="mt-1 inline-block text-lg font-bold text-primary" href="/masters/companies">
                  {header.company} / {header.branch}
                </Link>
                <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                  <div>
                    <span className="font-bold text-ink">Created by</span> {header.createdBy}
                  </div>
                  <div>
                    <span className="font-bold text-ink">Total</span> {formatTHB(header.total)}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.02em] text-muted">Next action</div>
                  <div className="mt-2">
                    <NextActionCard generatedPdf={generatedPdf} header={header} reissue={detail.reissue} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FileText aria-hidden className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-ink">Document information</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Ref No.", header.refNo],
                    ["Document Date", formatDate(header.date)],
                    ["Required Date", header.requiredDate ? formatDate(header.requiredDate) : "-"],
                    ["Category", header.category],
                    ["Department", header.department],
                    ["Division", header.division],
                    ["Purchase Type", header.purpose],
                    ["Purchase By", header.purchaseMethod],
                    ["Generated", header.generatedAt ? formatDateTime(header.generatedAt) : "-"],
                    ["Printed", header.printedAt ? formatDateTime(header.printedAt) : "-"],
                    ["Signed", header.signedAt ? formatDateTime(header.signedAt) : "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs font-bold uppercase tracking-[0.02em] text-muted">{label}</div>
                      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-slate-50 p-4">
                <div className="text-sm font-bold text-ink">Review & files</div>
                <div className="mt-3 grid gap-2">
                  <Link className={linkButtonClass} href={`/pr/new?cloneFrom=${header.id}`}>
                    <Copy aria-hidden className="h-4 w-4" />Clone as Draft
                  </Link>
                  {canManageRecurring ? <Link className={linkButtonClass} href={`/recurring-pr/new?sourcePrId=${header.id}`}><CalendarDays aria-hidden className="h-4 w-4" />Create Recurring Schedule</Link> : null}
                  {header.status === "Draft" ? (
                    <Link className={linkButtonClass} href={`/pr/${header.id}/edit`}>
                      <Pencil aria-hidden className="h-4 w-4" />Edit Draft
                    </Link>
                  ) : null}
                  {canUseGeneratedPdf ? (
                    <>
                      <Link className={linkButtonClass} href={`/pr/${header.id}/pdf`} target="_blank">
                        <Eye aria-hidden className="h-4 w-4" />Preview PDF
                      </Link>
                      <Link className={linkButtonClass} href={`/pr/${header.id}/pdf?download=1`}>
                        <Download aria-hidden className="h-4 w-4" />Download PDF
                      </Link>
                    </>
                  ) : canPreviewDraft ? (
                    <>
                      <Link className={linkButtonClass} href={`/pr/${header.id}/preview-pdf`} target="_blank">
                        <Eye aria-hidden className="h-4 w-4" />Preview Draft
                      </Link>
                      <Link className={linkButtonClass} href={`/pr/${header.id}/preview-pdf?download=1`}>
                        <Download aria-hidden className="h-4 w-4" />Download Preview
                      </Link>
                    </>
                  ) : null}
                  {quotationAllowed ? (
                    <Link className={linkButtonClass} href={`/pr/${header.id}/upload-quotation`}>
                      <Paperclip aria-hidden className="h-4 w-4" />Upload Quotation
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <TableWrap>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-bold text-ink">รายการสินค้า / บริการ</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse">
                <thead>
                  <tr>
                    {["No", "Acct", "Description", "Qty", "Unit Cost", "Total Amount"].map((head) => (
                      <th className={`${tableHeaderClass} px-4 py-3`} key={head}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.items.length > 0 ? (
                    detail.items.map((item) =>
                      item.rowType === "HEADING" ? (
                        <tr className="bg-blue-50/70" key={item.lineNo}>
                          <td className="border-t border-border px-4 py-3 text-sm font-extrabold text-blue-950" colSpan={6}>
                            {item.description}
                          </td>
                        </tr>
                      ) : item.rowType === "DETAIL" ? (
                        <tr className="bg-slate-50/70" key={item.lineNo}>
                          <td className={tableCellClass}></td>
                          <td className={tableCellClass}></td>
                          <td className={`${tableCellClass} font-semibold text-slate-700`} colSpan={4}>
                            <span className="mr-2 text-muted">-</span>
                            {item.description}
                          </td>
                        </tr>
                      ) : (
                        <tr key={item.lineNo}>
                          <td className={tableCellClass}>{item.displayLineNo}</td>
                          <td className={tableCellClass}>{item.accountCode || "-"}</td>
                          <td className={`${tableCellClass} font-semibold text-ink`}>{item.description}</td>
                          <td className={`${tableCellClass} text-right`}>{formatQuantity(item.quantity)}</td>
                          <td className={`${tableCellClass} text-right`}>{formatAmount(item.unitCost)}</td>
                          <td className={`${tableCellClass} text-right font-bold`}>{formatAmount(item.total)}</td>
                        </tr>
                      ),
                    )
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted" colSpan={6}>
                        ยังไม่มีรายการสินค้า/บริการใน PR นี้
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="border-t border-border px-4 py-3 text-right text-sm font-bold" colSpan={5}>
                      Subtotal
                    </td>
                    <td className="border-t border-border px-4 py-3 text-right text-sm font-bold">{formatTHB(header.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="border-t border-border px-4 py-3 text-right text-sm font-bold" colSpan={5}>{`VAT ${formatQuantity(header.vatRate)}%`}</td>
                    <td className="border-t border-border px-4 py-3 text-right text-sm font-bold">{formatTHB(header.vatAmount)}</td>
                  </tr>
                  <tr>
                    <td className="border-t border-border bg-slate-50 px-4 py-3 text-right text-sm font-bold" colSpan={5}>
                      Total
                    </td>
                    <td className="border-t border-border bg-slate-50 px-4 py-3 text-right text-base font-extrabold text-primary">{formatTHB(header.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TableWrap>

          <div className="grid gap-4 lg:grid-cols-3">
            {attachmentSlots.map((slot) => {
              const attachment = findAttachment(detail.attachments, slot.types);
              const isQuotationSlot = slot.types.includes("QUOTATION");

              return (
                <Card className="p-4" key={slot.label}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-ink">{slot.label}</div>
                    {attachment ? <Badge tone="info">v{attachment.version}</Badge> : null}
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-slate-50 p-3 text-sm text-muted">
                    {attachment ? (
                      <div className="space-y-3">
                        <div>
                          <div className="font-semibold text-ink">{attachment.fileName}</div>
                          <div>
                            {attachment.fileSizeLabel} • {formatDateTime(attachment.uploadedAt)}
                          </div>
                        </div>
                        <Link className={linkButtonClass} href={attachmentDownloadHref(header.id, attachment)}>
                          <Download aria-hidden className="h-4 w-4" />Download file
                        </Link>
                      </div>
                    ) : isQuotationSlot && quotationAllowed ? (
                      <Link className={linkButtonClass} href={`/pr/${header.id}/upload-quotation`}>
                        <Paperclip aria-hidden className="h-4 w-4" />Attach quotation
                      </Link>
                    ) : (
                      "No file uploaded"
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <Card className="border-blue-200 bg-blue-50/50 shadow-none">
            <div className="flex gap-3">
              <LockKeyhole aria-hidden className="mt-0.5 h-5 w-5 text-blue-700" />
              <div>
                <div className="font-bold text-blue-900">Preview ก่อนออกเอกสารจริง</div>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Draft สามารถ Preview PDF ได้หลายรอบโดยไม่ออกเลข PR เมื่อกด Issue PR แล้วจึงถือว่าเอกสารถูกควบคุม และควรใช้ Cancel/Reissue หากต้องแก้หลังออกเอกสาร
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="text-base font-bold text-ink">Danger zone</h2>
            <p className="mt-1 text-sm leading-6 text-muted">คำสั่งที่เปลี่ยนประวัติเอกสารควรอยู่แยกจากงานตรวจสอบไฟล์ปกติ</p>
            {canCancel ? (
              <Link className={`${dangerLinkClass} mt-4 w-full`} href={`/pr/${header.id}/cancel`}>
                <XCircle aria-hidden className="h-4 w-4" />Cancel PR
              </Link>
            ) : (
              <div className="mt-4 flex gap-3 rounded-md border border-border bg-slate-50 p-3 text-sm text-muted">
                <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                <span>No destructive action available for this status.</span>
              </div>
            )}
          </Card>
          <Card>
            <h2 className="text-base font-bold text-ink">Timeline</h2>
            <div className="mt-4">
              <PRTimeline items={detail.timeline} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
