"use client";

import { Eye, Save, Send } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { PRItemEditor, type PRItemEditorValue } from "@/components/pr/PRItemEditor";
import { buildDefaultDraftRemark } from "@/lib/pr-form-defaults";
import { type DraftCloneSource, type DraftFormInitialValue, type DraftFormOptions } from "@/lib/pr-draft";
import { calculatePRItemEditorTotals, type PRItemEditorTotals } from "@/lib/pr-item-editor-totals";
import { formatTHB } from "@/lib/utils";

type PRFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  cloneSource?: DraftCloneSource | null;
  initialDraft?: DraftFormInitialValue;
  mode?: "new" | "edit";
  options: DraftFormOptions;
};

const purposeOptions = ["ซื้อใหม่", "ทดแทนของเดิม", "ซ่อมแซม", "ต่ออายุ"];
const purchaseMethodOptions = ["ฝ่ายจัดซื้อจัดหา", "ขอซื้อเอง"];
function createInitialItems(options: DraftFormOptions, initialDraft?: DraftFormInitialValue): PRItemEditorValue {
  const sourceItems = initialDraft?.items.length ? initialDraft.items : options.defaultItems;
  return sourceItems.map((item) => ({
    rowType: item.rowType === "HEADING" || item.rowType === "DETAIL" ? item.rowType : "ITEM",
    accountCode: item.accountCode,
    description: item.description,
    quantity: item.quantity === "" ? Number.NaN : Number(item.quantity),
    unitCost: item.unitCost === "" ? Number.NaN : Number(item.unitCost),
  }));
}

function calculateInitialTotals(items: PRItemEditorValue): PRItemEditorTotals {
  return calculatePRItemEditorTotals(items);
}

export function PRForm({ action, cloneSource, initialDraft, mode = "new", options }: PRFormProps) {
  const isClone = mode === "new" && Boolean(cloneSource);
  const initialDepartmentId = initialDraft?.departmentId || options.defaultDepartmentId || options.departments[0]?.id || "";
  const initialDepartment = options.departments.find((department) => department.id === initialDepartmentId);
  const initialDivisionId = initialDraft ? initialDraft.divisionId || "" : options.defaultDivisionId || initialDepartment?.divisions[0]?.id || "";
  const [selectedBranchId, setSelectedBranchId] = useState(initialDraft?.branchId || options.branches[0]?.id || "");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialDepartmentId);
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialDivisionId);
  const initialItems = createInitialItems(options, initialDraft);
  const [totals, setTotals] = useState<PRItemEditorTotals>(() => calculateInitialTotals(initialItems));

  const selectedBranch = options.branches.find((branch) => branch.id === selectedBranchId);
  const selectedDepartment = options.departments.find((department) => department.id === selectedDepartmentId);
  const availableDivisions = selectedDepartment?.divisions || [];
  const canSave = Boolean(action);

  function handleDepartmentChange(value: string) {
    const nextDepartment = options.departments.find((department) => department.id === value);
    setSelectedDepartmentId(value);
    setSelectedDivisionId(nextDepartment?.divisions[0]?.id || "");
  }

  return (
    <form action={action} className="space-y-5">
      <SectionHeader
        title={isClone ? "Clone Purchase Request / สร้าง PR จากรายการเดิม" : mode === "new" ? "New Purchase Request / สร้าง PR ใหม่" : "Edit Draft Purchase Request"}
        description={isClone ? "ตรวจทานข้อมูลที่คัดลอกมาก่อนบันทึกเป็น Draft ใหม่" : "กรอกข้อมูล PR ด้วย layout ที่อ่านง่ายและแยก business data ออกจาก document render logic"}
        action={<Badge tone="neutral">Draft</Badge>}
      />
      {cloneSource ? (
        <>
          <input name="cloneSourceId" type="hidden" value={cloneSource.id} />
          <Card className="border-blue-200 bg-blue-50/80">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-bold text-blue-950">Cloned from {cloneSource.label}</div>
                <div className="mt-1 text-sm font-semibold text-blue-800">ระบบจะสร้างเป็น Draft ใหม่ โดยไม่คัดลอกเลข PR, PDF, signed file หรือ audit history เดิม</div>
              </div>
              <Badge tone="info">Review before save</Badge>
            </div>
          </Card>
        </>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Company / Branch *">
                <select className={inputClass()} name="branchId" onChange={(event) => setSelectedBranchId(event.target.value)} required value={selectedBranchId}>
                  {options.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.companyDisplayName} / {branch.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ref No.">
                <input className={inputClass("bg-slate-50")} placeholder="Draft pending" readOnly />
              </Field>
              <Field label="Legal Name">
                <input className={inputClass()} readOnly value={selectedBranch?.companyLegalName || ""} />
              </Field>
              <Field label="Document Date *">
                <input className={inputClass()} defaultValue={initialDraft?.documentDate || options.defaultDocumentDate} name="documentDate" required type="date" />
              </Field>
              <Field label="Required Date">
                <input className={inputClass()} defaultValue={initialDraft?.requiredDate || ""} name="requiredDate" type="date" />
              </Field>
              <Field label="PR Category / หมวดหมู่ PR *">
                <select className={inputClass()} defaultValue={initialDraft?.categoryId || ""} name="categoryId" required>
                  <option value="">Select category</option>
                  {options.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </Field>
              <Field label="Department *">
                <select className={inputClass()} name="departmentId" onChange={(event) => handleDepartmentChange(event.target.value)} required value={selectedDepartmentId}>
                  {options.departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Division">
                <select className={inputClass()} name="divisionId" onChange={(event) => setSelectedDivisionId(event.target.value)} value={selectedDivisionId}>
                  <option value="">-</option>
                  {availableDivisions.map((division) => (
                    <option key={division.id} value={division.id}>{division.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <fieldset className="rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-bold text-ink">วัตถุประสงค์</legend>
                <div className="mt-2 grid gap-3 text-sm text-ink sm:grid-cols-2">
                  {purposeOptions.map((item, index) => (
                    <label className="flex items-center gap-2" key={item}>
                      <input defaultChecked={initialDraft ? initialDraft.purpose === item : index === 0} name="purpose" type="radio" value={item} />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-bold text-ink">ประเภทการจัดซื้อ</legend>
                <div className="mt-2 grid gap-3 text-sm text-ink">
                  {purchaseMethodOptions.map((item, index) => (
                    <label className="flex items-center gap-2" key={item}>
                      <input defaultChecked={initialDraft ? initialDraft.purchaseMethod === item : index === 0} name="purchaseMethod" type="radio" value={item} />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Card>
          <PRItemEditor initialItems={initialItems} onTotalsChange={setTotals} />
          <Card>
            <Field label="Remark">
              <textarea className={inputClass("min-h-28 resize-y")} defaultValue={initialDraft ? initialDraft.remark || "" : buildDefaultDraftRemark()} name="remark" />
            </Field>
          </Card>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <h2 className="text-base font-bold text-ink">สรุปยอดรวม</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><strong>{formatTHB(totals.subtotal)}</strong></div>
              <div className="flex justify-between"><span className="text-muted">VAT 7%</span><strong>{formatTHB(totals.vatAmount)}</strong></div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg"><span className="font-bold text-ink">Total</span><strong className="text-primary">{formatTHB(totals.totalAmount)}</strong></div>
              </div>
            </div>
          </Card>
          <Card className="space-y-3">
            <div className="text-sm font-bold text-ink">สถานะปัจจุบัน</div>
            <div className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">Draft</div>
            <Button className="w-full" disabled={!canSave} name="intent" type="submit" value="save" variant="secondary">
              <Save aria-hidden className="h-4 w-4" />{mode === "edit" ? "Update Draft" : "Save Draft"}
            </Button>
            <Button className="w-full" disabled={!canSave} name="intent" type="submit" value="preview">
              <Eye aria-hidden className="h-4 w-4" />{mode === "edit" ? "Update & Preview" : "Save & Preview"}
            </Button>
            <Button className="w-full" disabled type="button"><Send aria-hidden className="h-4 w-4" />Issue PR</Button>
          </Card>
        </aside>
      </div>
    </form>
  );
}
