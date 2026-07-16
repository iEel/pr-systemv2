import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    company: { findMany: vi.fn() },
    purchaseRequest: { findMany: vi.fn() },
    purchaseRequestCategory: { findMany: vi.fn() },
    recurringPurchaseRequestSchedule: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import { getBudgetPlanningPageData } from "../lib/budget-planning.server";

const category = { code: "IT", id: "category_it", isActive: true, name: "Technology" };
const item = {
  accountCode: "6100",
  description: "Service",
  lineNo: 1,
  quantity: 1,
  rowType: "ITEM",
  totalAmount: 100,
  unitCost: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.purchaseRequest.findMany.mockResolvedValue([]);
  mocks.prisma.recurringPurchaseRequestSchedule.findMany.mockResolvedValue([]);
  mocks.prisma.company.findMany.mockResolvedValue([]);
  mocks.prisma.purchaseRequestCategory.findMany.mockResolvedValue([]);
});

describe("getBudgetPlanningPageData", () => {
  test("normalizes raw filters once and applies them to both detail queries", async () => {
    await getBudgetPlanningPageData({ categoryId: " category_it ", companyId: " company_a ", year: "2025" });

    expect(mocks.prisma.purchaseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          categoryId: "category_it",
          companyId: "company_a",
          documentDate: {
            gte: new Date("2025-01-01T00:00:00.000Z"),
            lt: new Date("2026-01-01T00:00:00.000Z"),
          },
          status: { in: ["GENERATED", "PRINTED", "SIGNED"] },
        },
      }),
    );
    expect(mocks.prisma.recurringPurchaseRequestSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { categoryId: "category_it", companyId: "company_a", status: "ACTIVE" },
      }),
    );
  });

  test("loads actual items and recurring schedule identity without truncation", async () => {
    await getBudgetPlanningPageData({ year: 2025 });

    const query = mocks.prisma.purchaseRequest.findMany.mock.calls[0][0];
    expect(query.include.items).toEqual({ orderBy: { lineNo: "asc" } });
    expect(query.include.recurringRun).toEqual({
      select: { schedule: { select: { id: true, name: true } } },
    });
    expect(query).not.toHaveProperty("take");
    expect(query).not.toHaveProperty("skip");
  });

  test("loads recurring items and responsible user without truncation", async () => {
    await getBudgetPlanningPageData({ year: 2025 });

    const query = mocks.prisma.recurringPurchaseRequestSchedule.findMany.mock.calls[0][0];
    expect(query.include.items).toEqual({ orderBy: { lineNo: "asc" } });
    expect(query.include.responsibleUser).toEqual({ select: { displayName: true } });
    expect(query).not.toHaveProperty("take");
    expect(query).not.toHaveProperty("skip");
  });

  test("omits company and category conditions for All scope", async () => {
    await getBudgetPlanningPageData({ categoryId: "All", companyId: "All", year: 2025 });

    expect(mocks.prisma.purchaseRequest.findMany.mock.calls[0][0].where).toEqual({
      documentDate: {
        gte: new Date("2025-01-01T00:00:00.000Z"),
        lt: new Date("2026-01-01T00:00:00.000Z"),
      },
      status: { in: ["GENERATED", "PRINTED", "SIGNED"] },
    });
    expect(mocks.prisma.recurringPurchaseRequestSchedule.findMany.mock.calls[0][0].where).toEqual({ status: "ACTIVE" });
  });

  test("builds company and category options from the loader results", async () => {
    mocks.prisma.company.findMany.mockResolvedValue([
      { displayName: "Alpha", id: "company_a" },
      { displayName: "Beta", id: "company_b" },
    ]);
    mocks.prisma.purchaseRequestCategory.findMany.mockResolvedValue([
      { code: "IT", id: "category_it", isActive: true, name: "Technology" },
      { code: "OLD", id: "category_old", isActive: false, name: "Legacy" },
    ]);

    const result = await getBudgetPlanningPageData({ year: 2025 });

    expect(mocks.prisma.company.findMany).toHaveBeenCalledWith({
      orderBy: { displayName: "asc" },
      select: { displayName: true, id: true },
      where: { isActive: true },
    });
    expect(result.companies).toEqual([
      { label: "ทุกบริษัท", value: "All" },
      { label: "Alpha", value: "company_a" },
      { label: "Beta", value: "company_b" },
    ]);
    expect(result.categories).toEqual([
      { label: "ทุกหมวดหมู่", value: "All" },
      { label: "IT - Technology", value: "category_it" },
      { label: "OLD - Legacy (Inactive)", value: "category_old" },
    ]);
  });

  test("returns detail and no-uplift baseline from the shared view model", async () => {
    mocks.prisma.purchaseRequest.findMany.mockResolvedValue([
      {
        branch: { name: "Bangkok" },
        category,
        categoryId: category.id,
        company: { displayName: "Alpha" },
        companyId: "company_a",
        department: { name: "IT" },
        division: null,
        documentDate: new Date("2025-03-01T00:00:00.000Z"),
        id: "pr_1",
        items: [item],
        prNo: "PR-001",
        purpose: "Current service",
        recurringRun: null,
        status: "SIGNED",
        totalAmount: 100,
      },
    ]);
    mocks.prisma.recurringPurchaseRequestSchedule.findMany.mockResolvedValue([
      {
        branch: { name: "Bangkok" },
        category,
        categoryId: category.id,
        company: { displayName: "Alpha" },
        companyId: "company_a",
        department: { name: "IT" },
        division: null,
        id: "schedule_1",
        items: [{ ...item, totalAmount: 25, unitCost: 25 }],
        name: "Annual service",
        purpose: "Renewal",
        renewalDay: 15,
        renewalMonth: 4,
        responsibleUser: { displayName: "Ari" },
        status: "ACTIVE",
      },
    ]);

    const result = await getBudgetPlanningPageData({ categoryId: category.id, companyId: "company_a", year: 2025 });

    expect(result.filters).toEqual({ baseYear: 2025, categoryId: category.id, companyId: "company_a", forecastYear: 2026 });
    expect(result.summary).toEqual({
      activeRecurringForecast: 25,
      activeScheduleCount: 1,
      actualPrCount: 1,
      actualSpend: 100,
      nonRecurringActual: 100,
      planningBaseline: 125,
      recurringIncludedInActual: 0,
    });
    expect(result.actualPrRows[0]).toMatchObject({ purchaseRequestId: "pr_1", totalAmount: 100 });
    expect(result.recurringScheduleRows[0]).toMatchObject({ scheduleId: "schedule_1", totalAmount: 25 });
  });
});
