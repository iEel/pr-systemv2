import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { calculatePRItemEditorTotals } from "../lib/pr-item-editor-totals";

test("shares one item editor between PR and recurring schedule forms", () => {
  const editor = readFileSync("components/pr/PRItemEditor.tsx", "utf8");
  const prForm = readFileSync("components/pr/PRForm.tsx", "utf8");

  expect(editor).toContain('rowType: "itemRowType"');
  expect(editor).toContain('description: "itemDescription"');
  expect(editor).toContain('accountCode: "itemAccountCode"');
  expect(editor).toContain('quantity: "itemQuantity"');
  expect(editor).toContain('unitCost: "itemUnitCost"');
  expect(editor).toContain("เพิ่มหัวข้อ");
  expect(editor).toContain("เพิ่มรายละเอียด");
  expect(editor).toContain("export function PRItemEditor");
  expect(editor).toContain("quantity: number;");
  expect(editor).toContain("unitCost: number;");
  expect(editor).toContain("calculatePRItemEditorTotals");
  expect(prForm).toContain("<PRItemEditor");
  expect(prForm).toContain("onTotalsChange");
  expect(prForm).toContain("calculatePRItemEditorTotals");
});

test("uses persisted draft rounding for callback totals", () => {
  expect(calculatePRItemEditorTotals([
    { rowType: "ITEM", accountCode: "", description: "Fractional item", quantity: 0.3333, unitCost: 1 },
  ])).toEqual({
    subtotal: 0.33,
    vatAmount: 0.02,
    totalAmount: 0.35,
  });
});

test("keeps the client item editor totals graph free of draft and server imports", () => {
  const editor = readFileSync("components/pr/PRItemEditor.tsx", "utf8");
  const totals = readFileSync("lib/pr-item-editor-totals.ts", "utf8");

  expect(editor).toContain('from "@/lib/pr-money"');
  expect(totals).toContain('from "./pr-money"');

  for (const source of [editor, totals]) {
    expect(source).not.toContain("pr-draft");
    expect(source).not.toContain("prisma");
    expect(source).not.toContain("auth/current-user");
    expect(source).not.toContain("budget-tracking");
  }
});
