import type { PRStatus } from "./status";

export type PurchaseRequest = {
  id: string;
  prNo: string;
  date: string;
  company: string;
  branch: string;
  department: string;
  division: string;
  createdBy: string;
  total: number;
  status: PRStatus;
};

export const purchaseRequests: PurchaseRequest[] = [
  {
    id: "pr-2606001",
    prNo: "ITPR_2606001",
    date: "2026-06-20",
    company: "Grandlink",
    branch: "HQ",
    department: "IT Operation",
    division: "Infrastructure",
    createdBy: "Admin User",
    total: 116255.5,
    status: "Printed",
  },
  {
    id: "pr-2606002",
    prNo: "ITPR_2606002",
    date: "2026-06-21",
    company: "Sonic_04",
    branch: "Sonic_04",
    department: "Infrastructure",
    division: "Network",
    createdBy: "Somchai S.",
    total: 78950,
    status: "Generated",
  },
  {
    id: "pr-2606003",
    prNo: "ITPR_2606003",
    date: "2026-06-22",
    company: "IT City",
    branch: "IT City",
    department: "Helpdesk",
    division: "Service Desk",
    createdBy: "Natcha P.",
    total: 24500,
    status: "Draft",
  },
  {
    id: "pr-2606004",
    prNo: "ITPR_2606004",
    date: "2026-06-23",
    company: "Sonic_HQ",
    branch: "HQ",
    department: "Infrastructure",
    division: "Server Platform",
    createdBy: "Admin User",
    total: 324210.35,
    status: "Signed",
  },
  {
    id: "pr-2606005",
    prNo: "ITPR_2606005",
    date: "2026-06-24",
    company: "Sonic_04",
    branch: "Sonic_04",
    department: "IT Operation",
    division: "Endpoint",
    createdBy: "Piyawat K.",
    total: 12500,
    status: "Cancelled",
  },
  {
    id: "pr-2606006",
    prNo: "ITPR_2606006",
    date: "2026-06-25",
    company: "Sonic_04",
    branch: "Sonic_04",
    department: "Infrastructure",
    division: "Network",
    createdBy: "Admin User",
    total: 32421,
    status: "Reissued",
  },
];

export const prItems = [
  { lineNo: 1, accountCode: "51510101", description: "Dell PowerEdge R750 Server", quantity: 1, unitCost: 78500, total: 78500 },
  { lineNo: 2, accountCode: "51520101", description: "Samsung SSD 1.92TB SATA", quantity: 2, unitCost: 12450, total: 24900 },
  { lineNo: 3, accountCode: "51530101", description: "UPS Battery Replacement Pack", quantity: 1, unitCost: 5250.5, total: 5250.5 },
];

export const templates = [
  { name: "PR_STANDARD", version: "V1", contract: "IT PR Contract", status: "Active", updatedAt: "2026-06-25 10:20" },
  { name: "PR_STANDARD", version: "V2", contract: "IT PR Contract", status: "Draft", updatedAt: "2026-06-24 16:45" },
  { name: "PR_GRANDLINK", version: "V1", contract: "Grandlink Contract", status: "Archived", updatedAt: "2026-06-10 14:30" },
  { name: "PR_SONIC", version: "V1", contract: "Sonic Contract", status: "Active", updatedAt: "2026-06-05 09:12" },
];

export const companies = [
  { key: "Grandlink", legalName: "Grandlink Co., Ltd.", refNo: "REF-IT-2606-0044", active: true },
  { key: "Sonic_HQ", legalName: "Sonic Interfreight Public Co., Ltd.", refNo: "REF-IT-2606-0045", active: true },
  { key: "Sonic_04", legalName: "Sonic Branch 04", refNo: "REF-IT-2606-0046", active: true },
  { key: "IT City", legalName: "IT City Public Co., Ltd.", refNo: "REF-IT-2606-0047", active: true },
];

export const auditLogs = [
  { action: "Draft created", actor: "Admin User", date: "2026-06-20 09:15", detail: "Created new PR draft" },
  { action: "Generated PDF", actor: "System", date: "2026-06-20 09:18", detail: "Stored data snapshot and rendered PR_STANDARD V1" },
  { action: "Marked printed", actor: "Admin User", date: "2026-06-20 10:05", detail: "Document printed for physical signature" },
  { action: "Waiting signed upload", actor: "System", date: "2026-06-20 10:06", detail: "Signed document upload is pending" },
];
