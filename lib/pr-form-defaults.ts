export type DraftDefaultLineItem = {
  rowType: "ITEM";
  accountCode: string;
  description: string;
  quantity: "";
  unitCost: "";
};

export function buildDefaultDraftItems(): DraftDefaultLineItem[] {
  return [
    {
      rowType: "ITEM",
      accountCode: "",
      description: "",
      quantity: "",
      unitCost: "",
    },
  ];
}

export function buildDefaultDraftRemark() {
  return "";
}
