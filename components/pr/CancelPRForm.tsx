import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { cancelPurchaseRequestAction } from "@/app/pr/[id]/cancel/actions";

export function CancelPRForm({
  prNo,
  purchaseRequestId,
}: {
  prNo: string;
  purchaseRequestId: string;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title={`Cancel ${prNo}`}
        description="บันทึกเหตุผลการยกเลิกเอกสารควบคุม ระบบจะเก็บไฟล์เดิมและ audit history ไว้ครบ"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form action={cancelPurchaseRequestAction.bind(null, purchaseRequestId)}>
          <Card className="space-y-4">
            <Field label="Cancel Reason">
              <textarea
                className={inputClass("min-h-36 resize-y leading-6")}
                name="reason"
                placeholder="ระบุเหตุผล เช่น ราคาเปลี่ยน, vendor ยกเลิก quote, ต้องแก้ scope งาน"
                required
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
                href={`/pr/${purchaseRequestId}`}
              >
                Back
              </Link>
              <Button type="submit" variant="danger">
                Cancel PR
              </Button>
            </div>
          </Card>
        </form>
        <Card className="space-y-3 border-red-200 bg-red-50/60 shadow-none">
          <AlertTriangle aria-hidden className="h-8 w-8 text-red-700" />
          <div>
            <h2 className="font-bold text-red-900">Controlled document action</h2>
            <p className="mt-1 text-sm leading-6 text-red-800">
              การยกเลิกจะไม่ลบ PDF หรือไฟล์ signed เดิม หากต้องออกเอกสารใหม่ให้ใช้ Reissue หลังจาก cancel แล้ว
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
