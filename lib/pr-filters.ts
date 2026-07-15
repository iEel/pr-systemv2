import type { PRStatus } from "./status";

export type PurchaseRequestFilterable = {
  prNo: string;
  company: string;
  branch: string;
  department: string;
  division: string;
  createdBy: string;
  category?: string;
  status: PRStatus;
};

export type PurchaseRequestFilters = {
  search?: string;
  company?: string;
  branch?: string;
  category?: string;
  status?: PRStatus | "All";
};

export function filterPurchaseRequests<T extends PurchaseRequestFilterable>(requests: T[], filters: PurchaseRequestFilters) {
  const search = filters.search?.trim().toLowerCase();

  return requests.filter((request) => {
    const matchesSearch = search
      ? [request.prNo, request.company, request.branch, request.department, request.division, request.createdBy, request.category || ""]
          .join(" ")
          .toLowerCase()
          .includes(search)
      : true;
    const matchesCompany = filters.company && filters.company !== "All" ? request.company === filters.company : true;
    const matchesBranch = filters.branch && filters.branch !== "All" ? request.branch === filters.branch : true;
    const matchesCategory = filters.category && filters.category !== "All" ? request.category === filters.category : true;
    const matchesStatus = filters.status && filters.status !== "All" ? request.status === filters.status : true;

    return matchesSearch && matchesCompany && matchesBranch && matchesCategory && matchesStatus;
  });
}
