import { afterEach, describe, expect, test, vi } from "vitest";

import { buildReportFilterChips, getReportPageData } from "../lib/reporting";
import { prisma } from "../lib/prisma";

describe("report page data", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("keeps inactive categories selectable and human-readable for historical reports", async () => {
    vi.spyOn(prisma.budget, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.company, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.purchaseRequest, "findMany").mockResolvedValue([]);
    const categoryFindMany = vi.spyOn(prisma.purchaseRequestCategory, "findMany").mockResolvedValue([
      { id: "cat_hardware", isActive: true, name: "Hardware & Equipment" },
      { id: "cat_legacy", isActive: false, name: "Legacy Hardware" },
    ] as never);

    const data = await getReportPageData({ categoryId: "cat_legacy", year: 2026 });

    expect(categoryFindMany).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, isActive: true, name: true },
    });
    expect(data.filters.categoryId).toBe("cat_legacy");
    expect(data.categories).toContainEqual({ label: "Legacy Hardware (Inactive)", value: "cat_legacy" });
    expect(
      buildReportFilterChips(data.filters, {
        categories: data.categories,
        companies: data.companies,
        statusOptions: data.statusOptions,
      }),
    ).toContain("Legacy Hardware (Inactive)");
  });
});
