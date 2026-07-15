import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildReportWorkbookSheets: vi.fn(),
  buildXlsxWorkbook: vi.fn(),
  getReportPageData: vi.fn(),
  normalizeReportFilters: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/lib/reporting", () => ({
  buildReportWorkbookSheets: mocks.buildReportWorkbookSheets,
  getReportPageData: mocks.getReportPageData,
  normalizeReportFilters: mocks.normalizeReportFilters,
}));
vi.mock("@/lib/xlsx", () => ({ buildXlsxWorkbook: mocks.buildXlsxWorkbook }));

import { GET } from "../app/reports/export/route";

describe("report export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "user_admin" });
    mocks.buildReportWorkbookSheets.mockReturnValue([]);
    mocks.buildXlsxWorkbook.mockResolvedValue(Buffer.from("xlsx"));
    mocks.normalizeReportFilters.mockReturnValue({ categoryId: "cat_legacy", companyId: "All", month: "All", status: "GENERATED", year: 2026 });
    mocks.getReportPageData.mockResolvedValue({
      filters: { categoryId: "cat_legacy", companyId: "All", month: "All", status: "All", year: 2033 },
    });
  });

  test("passes raw query filters to the single report normalization boundary", async () => {
    const response = await GET(new Request("http://localhost/reports/export?year=invalid&month=13&status=generated&categoryId=cat_legacy"));

    expect(mocks.getReportPageData).toHaveBeenCalledWith({
      categoryId: "cat_legacy",
      companyId: "",
      month: "13",
      status: "generated",
      year: "invalid",
    });
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="pr-report-2033.xlsx"');
  });
});
