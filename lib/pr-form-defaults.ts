export type DraftDefaultLineItem = {
  accountCode: string;
  description: string;
  quantity: "";
  unitCost: "";
};

export function buildDefaultDraftItems(): DraftDefaultLineItem[] {
  return [
    {
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
