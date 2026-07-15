"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import type { DraftLineItemRowType } from "@/lib/pr-draft";
import { calculatePRItemEditorTotals, type PRItemEditorTotals } from "@/lib/pr-item-editor-totals";
import { formatAmount } from "@/lib/utils";

export type PRItemEditorValue = Array<{
  accountCode: string;
  description: string;
  quantity: number;
  rowType: DraftLineItemRowType;
  unitCost: number;
}>;

export type { PRItemEditorTotals } from "@/lib/pr-item-editor-totals";

export type PRItemEditorFieldNames = {
  accountCode: string;
  description: string;
  quantity: string;
  rowType: string;
  unitCost: string;
};

export type PRItemEditorProps = {
  initialItems: PRItemEditorValue;
  onTotalsChange?: (totals: PRItemEditorTotals) => void;
  fieldNames?: PRItemEditorFieldNames;
};

type DraftRow = {
  id: string;
  rowType: DraftLineItemRowType;
  accountCode: string;
  description: string;
  quantity: string;
  unitCost: string;
};

const defaultFieldNames: PRItemEditorFieldNames = {
  rowType: "itemRowType",
  accountCode: "itemAccountCode",
  description: "itemDescription",
  quantity: "itemQuantity",
  unitCost: "itemUnitCost",
};

const itemTableCompactCellClass = "border-t border-border px-2 py-3 text-sm";
const numberInputClass = inputClass(
  "px-2 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
);

function toNumber(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInputNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function createBlankRow(index: number, rowType: DraftLineItemRowType = "ITEM"): DraftRow {
  return { id: `draft-row-${Date.now()}-${index}`, rowType, accountCode: "", description: "", quantity: "", unitCost: "" };
}

function createInitialRows(initialItems: PRItemEditorValue): DraftRow[] {
  const rows = initialItems.map((item, index) => ({
    id: `default-row-${index + 1}`,
    rowType: (item.rowType === "HEADING" || item.rowType === "DETAIL" ? item.rowType : "ITEM") as DraftLineItemRowType,
    accountCode: item.accountCode,
    description: item.description,
    quantity: formatInputNumber(item.quantity),
    unitCost: formatInputNumber(item.unitCost),
  }));
  return rows.length > 0 ? rows : [createBlankRow(1)];
}

export function PRItemEditor({ initialItems, onTotalsChange, fieldNames = defaultFieldNames }: PRItemEditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(() => createInitialRows(initialItems));
  const totals = useMemo(() => calculatePRItemEditorTotals(rows), [rows]);

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [onTotalsChange, totals]);

  function updateRow(rowId: string, field: keyof Omit<DraftRow, "id">, value: string) {
    setRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;
      if (field !== "rowType") return { ...row, [field]: value };
      const rowType = value === "HEADING" || value === "DETAIL" ? value : "ITEM";
      return rowType === "ITEM" ? { ...row, rowType } : { ...row, rowType, accountCode: "", quantity: "", unitCost: "" };
    }));
  }

  function addRow(rowType: DraftLineItemRowType = "ITEM") {
    setRows((current) => [...current, createBlankRow(current.length + 1, rowType)]);
  }

  function removeRow(rowId: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== rowId) : current));
  }

  return (
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
          <thead><tr>{["No", "Type", "Acct", "Description", "Qty", "Unit Cost", "Total Amount", ""].map((head) => <th className={`${tableHeaderClass} px-4 py-3`} key={head}>{head}</th>)}</tr></thead>
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
                  <td className={itemTableCompactCellClass}><select className={inputClass("px-2")} name={fieldNames.rowType} onChange={(event) => updateRow(row.id, "rowType", event.target.value)} value={row.rowType}><option value="ITEM">รายการ</option><option value="HEADING">หัวข้อ</option><option value="DETAIL">รายละเอียด</option></select></td>
                  <td className={itemTableCompactCellClass}><input className={inputClass("px-2")} name={fieldNames.accountCode} onChange={(event) => updateRow(row.id, "accountCode", event.target.value)} placeholder={isPricedRow ? "Optional" : "-"} readOnly={!isPricedRow} value={isPricedRow ? row.accountCode : ""} /></td>
                  <td className={tableCellClass}><input className={inputClass(isHeadingRow ? "border-blue-200 bg-white font-bold text-blue-950" : isDetailRow ? "border-slate-200 bg-white pl-5 text-slate-700" : "")} name={fieldNames.description} onChange={(event) => updateRow(row.id, "description", event.target.value)} placeholder={isHeadingRow ? "หัวข้อกลุ่มรายการ" : isDetailRow ? "รายละเอียดต่อจากรายการ" : ""} required value={row.description} /></td>
                  <td className={itemTableCompactCellClass}><input className={numberInputClass} min="0.0001" name={fieldNames.quantity} onChange={(event) => updateRow(row.id, "quantity", event.target.value)} placeholder={isPricedRow ? "" : "-"} readOnly={!isPricedRow} required={isPricedRow} step="0.0001" type="number" value={isPricedRow ? row.quantity : ""} /></td>
                  <td className={itemTableCompactCellClass}><input className={numberInputClass} min="0" name={fieldNames.unitCost} onChange={(event) => updateRow(row.id, "unitCost", event.target.value)} placeholder={isPricedRow ? "" : "-"} readOnly={!isPricedRow} required={isPricedRow} step="0.01" type="number" value={isPricedRow ? row.unitCost : ""} /></td>
                  <td className={`${itemTableCompactCellClass} text-right font-bold tabular-nums`}>{isPricedRow ? formatAmount(rowTotal) : "-"}</td>
                  <td className={itemTableCompactCellClass}><button aria-label={`Remove line ${index + 1}`} className="rounded-md p-2 text-muted hover:bg-surface hover:text-danger" disabled={rows.length === 1} onClick={() => removeRow(row.id)} type="button"><Trash2 aria-hidden className="h-4 w-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );
}
