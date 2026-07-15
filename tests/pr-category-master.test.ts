import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    purchaseRequestCategory: undefined as unknown as { findUnique: ReturnType<typeof vi.fn> },
    recurringPurchaseRequestSchedule: undefined as unknown as { findMany: ReturnType<typeof vi.fn> },
  },
  requirePermission: vi.fn(),
}));

vi.mock("../lib/auth/current-user", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("../lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import {
  buildPrCategoryHref,
  getPrCategoryDeactivationImpact,
  mapPrCategoryRecordToRow,
  normalizePrCategoryFilters,
  parsePrCategoryInput,
  readPrCategoryRedirectFilters,
  setPrCategoryActiveFromFormData,
  updatePrCategoryFromFormData,
  validateCategoryCodeMutation,
} from "../lib/pr-category-master";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ id: "user_admin" });
});

describe("PR category master", () => {
  test("normalizes filters and category input", () => {
    expect(normalizePrCategoryFilters({ includeInactive: "1", q: " license " })).toEqual({ includeInactive: true, q: "license" });
    expect(parsePrCategoryInput({ code: " software license ", description: " Annual tools ", name: " Software ", sortOrder: "20" })).toEqual({
      code: "SOFTWARE_LICENSE",
      description: "Annual tools",
      name: "Software",
      sortOrder: 20,
    });
  });

  test("preserves category filters after a category mutation", () => {
    const formData = new FormData();
    formData.set("includeInactive", "1");
    formData.set("redirectQ", "other");

    expect(buildPrCategoryHref(readPrCategoryRedirectFilters(formData))).toBe("/masters/pr-categories?q=other&includeInactive=1");
  });

  test("locks a referenced category code", () => {
    expect(() => validateCategoryCodeMutation({ currentCode: "HARDWARE", nextCode: "DEVICE", referenceCount: 1 })).toThrow(
      "Category code cannot change after it is used",
    );
    expect(() => validateCategoryCodeMutation({ currentCode: "HARDWARE", nextCode: "HARDWARE", referenceCount: 8 })).not.toThrow();
  });

  test("maps category records to master rows", () => {
    expect(
      mapPrCategoryRecordToRow({
        _count: { purchaseRequests: 3 },
        code: "HARDWARE",
        description: "Devices and peripherals",
        id: "cat_hardware",
        isActive: true,
        name: "Hardware",
        sortOrder: 10,
        updatedAt: new Date("2026-07-15T06:00:00.000Z"),
      }),
    ).toEqual({
      affectedActiveScheduleCount: 0,
      code: "HARDWARE",
      description: "Devices and peripherals",
      id: "cat_hardware",
      isActive: true,
      name: "Hardware",
      referenceCount: 3,
      sortOrder: 10,
      status: "Active",
      updatedAt: "2026-07-15T06:00:00.000Z",
    });
  });

  test("updates category code under Serializable isolation", async () => {
    const category = {
      _count: { purchaseRequests: 0 },
      code: "HARDWARE",
      description: "Devices and peripherals",
      id: "cat_hardware",
      isActive: true,
      name: "Hardware",
      sortOrder: 10,
      updatedAt: new Date("2026-07-15T06:00:00.000Z"),
    };
    const tx = {
      auditLog: { create: vi.fn().mockResolvedValue({ id: "audit_1" }) },
      purchaseRequestCategory: {
        findUnique: vi.fn().mockResolvedValueOnce(category).mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue({ ...category, code: "DEVICE" }),
      },
    };
    mocks.prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) => callback(tx));
    const formData = new FormData();
    formData.set("categoryId", category.id);
    formData.set("code", "DEVICE");
    formData.set("description", category.description);
    formData.set("name", category.name);
    formData.set("sortOrder", String(category.sortOrder));

    await updatePrCategoryFromFormData(formData);

    expect(tx.purchaseRequestCategory.findUnique).toHaveBeenCalledWith({
      include: { _count: { select: { purchaseRequests: true } } },
      where: { id: category.id },
    });
    expect(tx.purchaseRequestCategory.update).toHaveBeenCalledWith({
      data: { code: "DEVICE", description: category.description, name: category.name, sortOrder: category.sortOrder },
      where: { id: category.id },
    });
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  test("lists only active schedules for deactivation impact in stable name order", async () => {
    mocks.prisma.purchaseRequestCategory = {
      findUnique: vi.fn().mockResolvedValue({ code: "HARDWARE", id: "cat_hardware", name: "Hardware" }),
    };
    mocks.prisma.recurringPurchaseRequestSchedule = {
      findMany: vi.fn().mockResolvedValue([
        { id: "schedule_a", name: "Annual devices", nextRunDate: new Date("2026-08-02T00:00:00.000Z"), responsibleUser: { displayName: "Ari" } },
      ]),
    };

    await expect(getPrCategoryDeactivationImpact("cat_hardware")).resolves.toEqual({
      category: { code: "HARDWARE", id: "cat_hardware", name: "Hardware" },
      activeSchedules: [
        { id: "schedule_a", name: "Annual devices", nextRunDate: "2026-08-02T00:00:00.000Z", responsibleUserName: "Ari" },
      ],
    });
    expect(mocks.prisma.recurringPurchaseRequestSchedule.findMany).toHaveBeenCalledWith({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, nextRunDate: true, responsibleUser: { select: { displayName: true } } },
      where: { categoryId: "cat_hardware", status: "ACTIVE" },
    });
  });

  test("re-queries active schedules inside category deactivation and audits their ids", async () => {
    const category = { code: "HARDWARE", id: "cat_hardware", name: "Hardware" };
    const tx = {
      auditLog: { create: vi.fn().mockResolvedValue({ id: "audit_1" }) },
      purchaseRequestCategory: {
        findUnique: vi.fn().mockResolvedValue(category),
        update: vi.fn().mockResolvedValue({ ...category, isActive: false }),
      },
      recurringPurchaseRequestSchedule: {
        findMany: vi.fn().mockResolvedValue([{ id: "schedule_a" }, { id: "schedule_b" }]),
      },
    };
    mocks.prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) => callback(tx));
    const formData = new FormData();
    formData.set("categoryId", category.id);

    await setPrCategoryActiveFromFormData(formData, false);

    expect(tx.recurringPurchaseRequestSchedule.findMany).toHaveBeenCalledWith({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true },
      where: { categoryId: category.id, status: "ACTIVE" },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "PR category deactivated",
        metadataJson: expect.stringContaining('"affectedScheduleIds":["schedule_a","schedule_b"]'),
      }),
    });
  });
});
