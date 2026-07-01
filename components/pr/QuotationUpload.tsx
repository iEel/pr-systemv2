"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { uploadQuotationPurchaseRequestAction } from "@/app/pr/[id]/upload-quotation/actions";
import type { PRStatus } from "@/lib/status";

type UploadState = "idle" | "dragging" | "selected" | "error";

const allowedQuotationExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"];

export function QuotationUpload({ prNo, purchaseRequestId, status }: { prNo: string; purchaseRequestId: string; status: PRStatus }) {
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFile(file?: File) {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const allowed = allowedQuotationExtensions.some((extension) => lowerName.endsWith(extension));
    setFileName(file.name);
    setState(allowed ? "selected" : "error");

    if (allowed && inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Upload Quotation"
        description="แนบใบเสนอราคาหรือไฟล์ประกอบ PR ระบบจะเก็บ version, hash และ audit log โดยไม่เปลี่ยนสถานะเอกสาร"
        action={<Badge tone="info">{status}</Badge>}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form action={uploadQuotationPurchaseRequestAction.bind(null, purchaseRequestId)}>
          <Card>
            <label
              className={`grid min-h-72 cursor-pointer place-items-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                state === "dragging" ? "border-primary bg-blue-50" : state === "error" ? "border-danger bg-red-50" : "border-border bg-slate-50"
              }`}
              onDragLeave={() => setState("idle")}
              onDragOver={(event) => {
                event.preventDefault();
                setState("dragging");
              }}
              onDrop={(event) => {
                event.preventDefault();
                acceptFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                ref={inputRef}
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                className="sr-only"
                name="quotationFile"
                onChange={(event) => acceptFile(event.target.files?.[0])}
                type="file"
              />
              <span>
                <UploadCloud aria-hidden className="mx-auto h-12 w-12 text-primary" />
                <span className="mt-4 block text-lg font-bold text-ink">Drag and drop quotation / support file</span>
                <span className="mt-2 block text-sm text-muted">รองรับ .pdf, .jpg, .jpeg, .png, .docx, .xlsx ขนาดไม่เกิน 15 MB</span>
                {fileName ? <span className="mt-4 block rounded-md bg-white px-4 py-2 text-sm font-bold text-ink">{fileName}</span> : null}
              </span>
            </label>
            {state === "error" ? <p className="mt-3 text-sm font-semibold text-red-700">ไฟล์นี้ไม่รองรับ กรุณาเลือก PDF, JPG, PNG, DOCX หรือ XLSX</p> : null}
            <div className="mt-4 flex justify-end">
              <Button disabled={state !== "selected"} type="submit">
                <UploadCloud aria-hidden className="h-4 w-4" />Upload Quotation
              </Button>
            </div>
          </Card>
        </form>
        <Card className="space-y-4">
          <FileText aria-hidden className="h-8 w-8 text-primary" />
          <div>
            <h2 className="font-bold text-ink">Versioning rule</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              ไฟล์ quotation จะถูกเก็บเป็น version แยกจาก PDF หลักของ PR พร้อม SHA-256 และ audit trail ทุกครั้งที่อัปโหลด
            </p>
          </div>
          <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm font-semibold text-muted">
            PR: <span className="text-ink">{prNo}</span>
          </div>
          <Link className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href={`/pr/${purchaseRequestId}`}>
            Back to PR Detail
          </Link>
        </Card>
      </div>
    </div>
  );
}
