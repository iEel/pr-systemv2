import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

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
  expect(prForm).toContain("<PRItemEditor");
  expect(prForm).toContain("onTotalsChange");
});
