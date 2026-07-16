import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildBudgetPlanningWorkbookSheets: vi.fn(),
  buildXlsxWorkbook: vi.fn(),
  getBudgetPlanningPageData: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/lib/budget-planning.server", () => ({
  getBudgetPlanningPageData: mocks.getBudgetPlanningPageData,
}));
vi.mock("@/lib/budget-planning-workbook", () => ({
  buildBudgetPlanningWorkbookSheets: mocks.buildBudgetPlanningWorkbookSheets,
}));
vi.mock("@/lib/xlsx", () => ({ buildXlsxWorkbook: mocks.buildXlsxWorkbook }));

import { dynamic, GET } from "../app/dashboard/budget-planning/export/route";

describe("budget planning export route", () => {
  const pageData = {
    actualItemRows: [],
    actualPrRows: [],
    categories: [{ label: "All categories", value: "All" }],
    categoryRows: [],
    companies: [{ label: "All companies", value: "All" }],
    filters: { baseYear: 2031, categoryId: "cat_1", companyId: "company_1", forecastYear: 2032 },
    recurringItemRows: [],
    recurringScheduleRows: [],
    summary: {
      activeRecurringForecast: 0,
      activeScheduleCount: 0,
      actualPrCount: 0,
      actualSpend: 0,
      nonRecurringActual: 0,
      planningBaseline: 0,
      recurringIncludedInActual: 0,
    },
  };
  const mappedSheets = [{ name: "Budget Plan Summary", rows: [["Base Year", 2031]] }];
  const workbookBytes = new Uint8Array([80, 75, 3, 4, 120, 108, 115, 120]);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "user_admin" });
    mocks.getBudgetPlanningPageData.mockResolvedValue(pageData);
    mocks.buildBudgetPlanningWorkbookSheets.mockReturnValue(mappedSheets);
    mocks.buildXlsxWorkbook.mockResolvedValue(workbookBytes);
  });

  test("authenticates before exporting the normalized budget plan with exact response metadata", async () => {
    const response = await GET(new Request(
      "http://localhost/dashboard/budget-planning/export?year=2031&companyId=company_1&categoryId=cat_1",
    ));

    expect(dynamic).toBe("force-dynamic");
    expect(mocks.requireCurrentUser).toHaveBeenCalledTimes(1);
    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledTimes(1);
    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledWith({
      categoryId: "cat_1",
      companyId: "company_1",
      year: "2031",
    });
    expect(mocks.requireCurrentUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getBudgetPlanningPageData.mock.invocationCallOrder[0],
    );
    expect(mocks.getBudgetPlanningPageData.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.buildBudgetPlanningWorkbookSheets.mock.invocationCallOrder[0],
    );
    expect(mocks.buildBudgetPlanningWorkbookSheets).toHaveBeenCalledTimes(1);
    expect(mocks.buildBudgetPlanningWorkbookSheets).toHaveBeenCalledWith(pageData);
    expect(mocks.buildXlsxWorkbook).toHaveBeenCalledTimes(1);
    expect(mocks.buildXlsxWorkbook).toHaveBeenCalledWith({ sheets: mappedSheets });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="budget-planning-2031-to-2032.xlsx"',
    );
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(workbookBytes);
  });

  test("passes empty strings for missing query parameters", async () => {
    await GET(new Request("http://localhost/dashboard/budget-planning/export"));

    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledTimes(1);
    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledWith({
      categoryId: "",
      companyId: "",
      year: "",
    });
  });

  test("passes an invalid raw year unchanged to shared normalization", async () => {
    await GET(new Request("http://localhost/dashboard/budget-planning/export?year=not-a-year"));

    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledTimes(1);
    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledWith({
      categoryId: "",
      companyId: "",
      year: "not-a-year",
    });
  });

  test("rejects without loading or building when authentication fails", async () => {
    const authError = new Error("unauthenticated");
    mocks.requireCurrentUser.mockRejectedValue(authError);

    await expect(GET(new Request("http://localhost/dashboard/budget-planning/export?year=2031"))).rejects.toBe(authError);

    expect(mocks.getBudgetPlanningPageData).not.toHaveBeenCalled();
    expect(mocks.buildBudgetPlanningWorkbookSheets).not.toHaveBeenCalled();
    expect(mocks.buildXlsxWorkbook).not.toHaveBeenCalled();
  });

  test("propagates loader failures without mapping or building a workbook", async () => {
    const loaderError = new Error("database unavailable");
    mocks.getBudgetPlanningPageData.mockRejectedValue(loaderError);

    await expect(GET(new Request("http://localhost/dashboard/budget-planning/export?year=2031"))).rejects.toBe(loaderError);

    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledTimes(1);
    expect(mocks.buildBudgetPlanningWorkbookSheets).not.toHaveBeenCalled();
    expect(mocks.buildXlsxWorkbook).not.toHaveBeenCalled();
  });

  test("propagates workbook builder failures after loading and mapping once", async () => {
    const builderError = new Error("xlsx serialization failed");
    mocks.buildXlsxWorkbook.mockRejectedValue(builderError);

    await expect(GET(new Request("http://localhost/dashboard/budget-planning/export?year=2031"))).rejects.toBe(builderError);

    expect(mocks.getBudgetPlanningPageData).toHaveBeenCalledTimes(1);
    expect(mocks.buildBudgetPlanningWorkbookSheets).toHaveBeenCalledTimes(1);
    expect(mocks.buildXlsxWorkbook).toHaveBeenCalledTimes(1);
  });
});
