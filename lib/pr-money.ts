export type DraftLineItemRowType = "ITEM" | "HEADING" | "DETAIL";

export type DraftLineItem = {
  rowType?: DraftLineItemRowType;
  accountCode: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
};

export type DraftTotals = {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPricedItem(item: Pick<DraftLineItem, "rowType">) {
  return item.rowType !== "HEADING" && item.rowType !== "DETAIL";
}

export function calculateDraftLineTotal(quantity: number, unitCost: number) {
  return roundMoney(quantity * unitCost);
}

export function calculateDraftTotals(items: DraftLineItem[]): DraftTotals {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + (isPricedItem(item) ? item.totalAmount : 0), 0));
  const vatRate = 7;
  const vatAmount = roundMoney(subtotal * (vatRate / 100));

  return {
    subtotal,
    vatRate,
    vatAmount,
    totalAmount: roundMoney(subtotal + vatAmount),
  };
}
