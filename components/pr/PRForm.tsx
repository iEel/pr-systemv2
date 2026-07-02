"use client";

import { Eye, Plus, Save, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { buildDefaultDraftRemark } from "@/lib/pr-form-defaults";
import type { DraftCloneSource, DraftFormInitialValue, DraftFormOptions } from "@/lib/pr-draft";
import { formatAmount, formatTHB } from "@/lib/utils";

type DraftRow = {
  id: string;
  rowType: "ITEM" | "HEADING" | "DETAIL";
  accountCode: string;
  description: string;
  quantity: string;
  unitCost: string;
};

type PRFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  cloneSource?: DraftCloneSource | null;
  initialDraft?: DraftFormInitialValue;
  mode?: "new" | "edit";
  options: DraftFormOptions;
};

const purposeOptions = ["ซื้อใหม่", "ทดแทนของเดิม", "ซ่อมแซม", "ต่ออายุ"];
const purchaseMethodOptions = ["ฝ่ายจัดซื้อจัดหา", "ขอซื้อเอง"];
const itemTableCompactCellClass = "border-t border-border px-2 py-3 text-sm";
const numberInputClass = inputClass(
  "px-2 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
);

function toNumber(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInputNumber(value: number | string) {
  return typeof value === "number" ? String(value) : value;
}

function normalizeDraftRowType(value: string | null | undefined): DraftRow["rowType"] {
  return value === "HEADING" || value === "DETAIL" ? value : "ITEM";
}

function createBlankRow(index: number, rowType: DraftRow["rowType"] = "ITEM"): DraftRow {
  return {
    id: `draft-row-${Date.now()}-${index}`,
    rowType,
    accountCode: "",
    description: "",
    quantity: "",
    unitCost: "",
  };
}

function createInitialRows(options: DraftFormOptions, initialDraft?: DraftFormInitialValue): DraftRow[] {
  const sourceItems = initialDraft?.items.length ? initialDraft.items : options.defaultItems;
  const rows = sourceItems.map((item, index) => ({
    id: `default-row-${index + 1}`,
    rowType: normalizeDraftRowType(item.rowType),
    accountCode: item.accountCode,
    description: item.description,
    quantity: formatInputNumber(item.quantity),
    unitCost: formatInputNumber(item.unitCost),
  }));

  return rows.length > 0 ? rows : [createBlankRow(1)];
}

export function PRForm({ action, cloneSource, initialDraft, mode = "new", options }: PRFormProps) {
  const isClone = mode === "new" && Boolean(cloneSource);
  const initialDepartmentId = initialDraft?.departmentId || options.defaultDepartmentId || options.departments[0]?.id || "";
  const initialDepartment = options.departments.find((department) => department.id === initialDepartmentId);
  const initialDivisionId = initialDraft ? initialDraft.divisionId || "" : options.defaultDivisionId || initialDepartment?.divisions[0]?.id || "";
  const [selectedBranchId, setSelectedBranchId] = useState(initialDraft?.branchId || options.branches[0]?.id || "");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialDepartmentId);
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialDivisionId);
  const [rows, setRows] = useState<DraftRow[]>(() => createInitialRows(options, initialDraft));

  const selectedBranch = options.branches.find((branch) => branch.id === selectedBranchId);
  const selectedDepartment = options.departments.find((department) => department.id === selectedDepartmentId);
  const availableDivisions = selectedDepartment?.divisions || [];
  const canSave = Boolean(action);

  const totals = useMemo(() => {
    const subtotal = rows.reduce((sum, row) => sum + (row.rowType === "ITEM" ? toNumber(row.quantity) * toNumber(row.unitCost) : 0), 0);
    const vat = subtotal * 0.07;

    return {
      subtotal,
      vat,
      total: subtotal + vat,
    };
  }, [rows]);

  function updateRow(rowId: string, field: keyof Omit<DraftRow, "id">, value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        if (field === "rowType") {
          const rowType = normalizeDraftRowType(value);
          if (rowType !== "ITEM") {
            return { ...row, rowType, accountCode: "", quantity: "", unitCost: "" };
          }

          return { ...row, rowType };
        }

        return { ...row, [field]: value };
      }),
    );
  }

  function addRow(rowType: DraftRow["rowType"] = "ITEM") {
    setRows((current) => [...current, createBlankRow(current.length + 1, rowType)]);
  }

  function removeRow(rowId: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== rowId) : current));
  }

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
          <TableWrap>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-base font-bold text-ink">รายการสินค้า / บริการ</h2>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => addRow("HEADING")} type="button" variant="secondary"><Plus aria-hidden className="h-4 w-4" />เพิ่มหัวข้อ</Button>
                <Button onClick={() => addRow("DETAIL")} type="button" variant="secondary"><Plus aria-hidden className="h-4 w-4" />เพิ่มรายละเอียด</Button>
                <Button onClick={() => addRow("ITEM")} type="button" variant="secondary"><Plus aria-hidden className="h-4 w-4" />เพิ่มรายการ</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[5%]" data-column="line-no" />
                  <col className="w-[12%]" data-column="row-type" />
                  <col className="w-[8%]" data-column="acct" />
                  <col className="w-[33%]" data-column="description" />
                  <col className="w-[9%]" data-column="qty" />
                  <col className="w-[14%]" data-column="unit-cost" />
                  <col className="w-[14%]" data-column="total-amount" />
                  <col className="w-[5%]" data-column="actions" />
                </colgroup>
                <thead>
                  <tr>
                    {["No", "Type", "Acct", "Description", "Qty", "Unit Cost", "Total Amount", ""].map((head) => (
                      <th className={`${tableHeaderClass} px-4 py-3`} key={head}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isHeadingRow = row.rowType === "HEADING";
                    const isDetailRow = row.rowType === "DETAIL";
                    const isPricedRow = row.rowType === "ITEM";
                    const displayLineNo = isPricedRow ? rows.slice(0, index + 1).filter((current) => current.rowType === "ITEM").length : "";
                    const rowTotal = isPricedRow ? toNumber(row.quantity) * toNumber(row.unitCost) : 0;

                    return (
                      <tr className={isHeadingRow ? "bg-blue-50/60" : isDetailRow ? "bg-slate-50/70" : undefined} key={row.id}>
                        <td className={itemTableCompactCellClass}>{displayLineNo}</td>
                        <td className={itemTableCompactCellClass}>
                          <select
                            className={inputClass("px-2")}
                            name="itemRowType"
                            onChange={(event) => updateRow(row.id, "rowType", event.target.value)}
                            value={row.rowType}
                          >
                            <option value="ITEM">รายการ</option>
                            <option value="HEADING">หัวข้อ</option>
                            <option value="DETAIL">รายละเอียด</option>
                          </select>
                        </td>
                        <td className={itemTableCompactCellClass}>
                          <input className={inputClass("px-2")} name="itemAccountCode" onChange={(event) => updateRow(row.id, "accountCode", event.target.value)} placeholder={isPricedRow ? "Optional" : "-"} readOnly={!isPricedRow} value={isPricedRow ? row.accountCode : ""} />
                        </td>
                        <td className={tableCellClass}>
                          <input className={inputClass(isHeadingRow ? "border-blue-200 bg-white font-bold text-blue-950" : isDetailRow ? "border-slate-200 bg-white pl-5 text-slate-700" : "")} name="itemDescription" onChange={(event) => updateRow(row.id, "description", event.target.value)} placeholder={isHeadingRow ? "หัวข้อกลุ่มรายการ" : isDetailRow ? "รายละเอียดต่อจากรายการ" : ""} required value={row.description} />
                        </td>
                        <td className={itemTableCompactCellClass}>
                          <input className={numberInputClass} min="0.0001" name="itemQuantity" onChange={(event) => updateRow(row.id, "quantity", event.target.value)} placeholder={isPricedRow ? "" : "-"} readOnly={!isPricedRow} required={isPricedRow} step="0.0001" type="number" value={isPricedRow ? row.quantity : ""} />
                        </td>
                        <td className={itemTableCompactCellClass}>
                          <input className={numberInputClass} min="0" name="itemUnitCost" onChange={(event) => updateRow(row.id, "unitCost", event.target.value)} placeholder={isPricedRow ? "" : "-"} readOnly={!isPricedRow} required={isPricedRow} step="0.01" type="number" value={isPricedRow ? row.unitCost : ""} />
                        </td>
                        <td className={`${itemTableCompactCellClass} text-right font-bold tabular-nums`}>{isPricedRow ? formatAmount(rowTotal) : "-"}</td>
                        <td className={itemTableCompactCellClass}>
                          <button aria-label={`Remove line ${index + 1}`} className="rounded-md p-2 text-muted hover:bg-surface hover:text-danger" disabled={rows.length === 1} onClick={() => removeRow(row.id)} type="button">
                            <Trash2 aria-hidden className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TableWrap>
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
              <div className="flex justify-between"><span className="text-muted">VAT 7%</span><strong>{formatTHB(totals.vat)}</strong></div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg"><span className="font-bold text-ink">Total</span><strong className="text-primary">{formatTHB(totals.total)}</strong></div>
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
