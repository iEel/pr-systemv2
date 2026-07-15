import {
  calculateDraftLineTotal,
  calculateDraftTotals,
  type DraftLineItem,
  type DraftLineItemRowType,
} from "./pr-draft";

export type PRItemEditorTotals = Pick<ReturnType<typeof calculateDraftTotals>, "subtotal" | "vatAmount" | "totalAmount">;

export type PRItemEditorTotalsInput = Array<{
  accountCode: string;
  description: string;
  quantity: number | string;
  rowType: DraftLineItemRowType;
  unitCost: number | string;
}>;

function toNumber(value: number | string) {
  const parsed = typeof value === "string" ? Number(value.replaceAll(",", "")) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculatePRItemEditorTotals(items: PRItemEditorTotalsInput): PRItemEditorTotals {
  const draftItems: DraftLineItem[] = items.map((item) => {
    const quantity = toNumber(item.quantity);
    const unitCost = toNumber(item.unitCost);
    const isPricedItem = item.rowType === "ITEM";

    return {
      rowType: item.rowType,
      accountCode: isPricedItem ? item.accountCode : "",
      description: item.description,
      quantity: isPricedItem ? quantity : 0,
      unitCost: isPricedItem ? unitCost : 0,
      totalAmount: isPricedItem ? calculateDraftLineTotal(quantity, unitCost) : 0,
    };
  });
  const totals = calculateDraftTotals(draftItems);

  return { subtotal: totals.subtotal, vatAmount: totals.vatAmount, totalAmount: totals.totalAmount };
}
