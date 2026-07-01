import { describe, expect, test } from "vitest";
import {
  buildReportFilterChips,
  buildReportDateRange,
  buildReportExportHref,
  buildReportWorkbookSheets,
  buildReportViewModel,
  calculateReportBarPercent,
  normalizeReportFilters,
} from "../lib/reporting";

const records = [
  {
    id: "pr_1",
    prNo: "ITPR_2606001",
    documentDate: new Date("2026-06-10T00:00:00.000Z"),
    status: "GENERATED",
    totalAmount: "100.00",
    company: { id: "co_sonic", displayName: "Sonic" },
    branch: { id: "br_sonic", name: "Sonic HQ" },
    department: { name: "IT" },
    division: { name: "IT" },
    createdBy: { displayName: "Admin User" },
  },
  {
    id: "pr_2",
    prNo: "ITPR_2606002",
    documentDate: new Date("2026-06-11T00:00:00.000Z"),
    status: "PRINTED",
    totalAmount: "200.00",
    company: { id: "co_sonic", displayName: "Sonic" },
    branch: { id: "br_sonic", name: "Sonic HQ" },
    department: { name: "IT" },
    division: null,
    createdBy: { displayName: "Admin User" },
  },
  {
    id: "pr_3",
    prNo: null,
    documentDate: new Date("2026-06-12T00:00:00.000Z"),
    status: "DRAFT",
    totalAmount: "50.00",
    company: { id: "co_grandlink", displayName: "Grandlink" },
    branch: { id: "br_grandlink", name: "Grandlink" },
    department: { name: "Helpdesk" },
    division: null,
    createdBy: { displayName: "Admin User" },
  },
  {
    id: "pr_4",
    prNo: "ITPR_2605001",
    documentDate: new Date("2026-05-20T00:00:00.000Z"),
    status: "SIGNED",
    totalAmount: "300.00",
    company: { id: "co_grandlink", displayName: "Grandlink" },
    branch: { id: "br_grandlink", name: "Grandlink" },
    department: { name: "IT" },
    division: null,
    createdBy: { displayName: "Admin User" },
  },
  {
    id: "pr_5",
    prNo: "ITPR_2606003",
    documentDate: new Date("2026-06-13T00:00:00.000Z"),
    status: "CANCELLED",
    totalAmount: "20.00",
    company: { id: "co_sonic", displayName: "Sonic" },
    branch: { id: "br_sonic", name: "Sonic HQ" },
    department: { name: "IT" },
    division: null,
    createdBy: { displayName: "Admin User" },
  },
];

describe("report filters", () => {
  test("normalizes empty and invalid filters to the current year and all scopes", () => {
    expect(normalizeReportFilters({ month: "13", status: "BROKEN", year: "" }, new Date("2026-06-29T00:00:00.000Z"))).toEqual({
      companyId: "All",
      month: "All",
      status: "All",
      year: 2026,
    });
  });

  test("builds inclusive month date ranges", () => {
    expect(buildReportDateRange({ month: "6", year: 2026 })).toEqual({
      gte: new Date("2026-06-01T00:00:00.000Z"),
      lt: new Date("2026-07-01T00:00:00.000Z"),
    });
  });

  test("builds xlsx export href with active filters", () => {
    expect(buildReportExportHref({ companyId: "co_sonic", month: "6", status: "GENERATED", year: 2026 })).toBe(
      "/reports/export?year=2026&month=6&companyId=co_sonic&status=GENERATED",
    );
  });

  test("builds readable active filter chips for the report workspace", () => {
    const chips = buildReportFilterChips(
      { companyId: "co_sonic", month: "6", status: "GENERATED", year: 2026 },
      {
        companies: [
          { label: "All companies", value: "All" },
          { label: "Sonic", value: "co_sonic" },
        ],
        statusOptions: [
          { label: "All statuses", value: "All" },
          { label: "Generated", value: "GENERATED" },
        ],
      },
    );

    expect(chips).toEqual(["ปี 2026", "มิ.ย.", "Sonic", "Generated"]);
  });

  test("uses Thai wording for all-scope report filter chips", () => {
    const chips = buildReportFilterChips(
      { companyId: "All", month: "All", status: "All", year: 2026 },
      {
        companies: [{ label: "ทุกบริษัท", value: "All" }],
        statusOptions: [{ label: "ทุกสถานะ", value: "All" }],
      },
    );

    expect(chips).toEqual(["ปี 2026", "ทุกเดือน", "ทุกบริษัท", "ทุกสถานะ"]);
  });

  test("calculates bounded report bar percentages", () => {
    expect(calculateReportBarPercent(0, 100)).toBe(0);
    expect(calculateReportBarPercent(25, 100)).toBe(25);
    expect(calculateReportBarPercent(200, 100)).toBe(100);
    expect(calculateReportBarPercent(50, 0)).toBe(0);
  });
});

describe("report view model", () => {
  test("calculates budget summary and grouped PR totals from database-like records", () => {
    const view = buildReportViewModel({
      budgets: [{ budgetAmount: "1000.00" }],
      filters: { companyId: "All", month: "All", status: "All", year: 2026 },
      records,
    });

    expect(view.summary).toEqual({
      cancelledAmount: 20,
      pendingAmount: 50,
      remainingBudget: 350,
      totalAmount: 670,
      totalBudget: 1000,
      totalPr: 5,
      usedAmount: 600,
    });
    expect(view.monthlySummary.find((row) => row.month === 5)).toMatchObject({ count: 1, totalAmount: 300, usedAmount: 300 });
    expect(view.monthlySummary.find((row) => row.month === 6)).toMatchObject({ count: 4, pendingAmount: 50, totalAmount: 370, usedAmount: 300 });
    expect(view.companySummary).toEqual([
      { branch: "Grandlink", company: "Grandlink", count: 2, latestDate: "2026-06-12", totalAmount: 350, usedAmount: 300 },
      { branch: "Sonic HQ", company: "Sonic", count: 3, latestDate: "2026-06-13", totalAmount: 320, usedAmount: 300 },
    ]);
    expect(view.statusSummary).toContainEqual({ count: 1, status: "Draft", totalAmount: 50 });
    expect(view.detailRows[0]).toMatchObject({ prNo: "ITPR_2606003", status: "Cancelled", totalAmount: 20 });
  });

  test("flags missing budget context when PR amounts exist without an active budget", () => {
    const view = buildReportViewModel({
      budgets: [],
      filters: { companyId: "All", month: "All", status: "All", year: 2026 },
      records,
    });

    expect(view.budgetWarning).toMatchObject({
      message: "ยังไม่มี Budget สำหรับมุมมองนี้ กรุณาตรวจสอบ Budget Master ก่อนใช้ Remaining Budget",
      title: "ยังไม่มี Budget สำหรับมุมมองนี้",
      xlsxMessage: "WARNING: No active Budget Master row matched this report filter. Remaining Budget is not reliable for this export.",
    });
  });

  test("writes missing budget warnings into the exported workbook summary sheet", () => {
    const view = buildReportViewModel({
      budgets: [],
      filters: { companyId: "All", month: "All", status: "All", year: 2026 },
      records,
    });
    const sheets = buildReportWorkbookSheets(view);
    const summaryRows = sheets[0].rows;

    expect(summaryRows).toContainEqual([
      "Budget Warning",
      "WARNING: No active Budget Master row matched this report filter. Remaining Budget is not reliable for this export.",
    ]);
  });
});
