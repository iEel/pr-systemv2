import { existsSync, readFileSync } from "node:fs";
import { beforeEach, expect, test, vi } from "vitest";
import { DraftValidationError } from "../lib/pr-draft";

const mocks = vi.hoisted(() => ({
  createRecurringScheduleFromFormData: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  setRecurringScheduleStatus: vi.fn(),
  updateRecurringScheduleFromFormData: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/recurring-pr", () => ({
  createRecurringScheduleFromFormData: mocks.createRecurringScheduleFromFormData,
  setRecurringScheduleStatus: mocks.setRecurringScheduleStatus,
  updateRecurringScheduleFromFormData: mocks.updateRecurringScheduleFromFormData,
}));

import {
  createRecurringScheduleAction,
  pauseRecurringScheduleAction,
  resumeRecurringScheduleAction,
  updateRecurringScheduleAction,
} from "../app/recurring-pr/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createRecurringScheduleFromFormData.mockResolvedValue({ id: "schedule_1" });
  mocks.setRecurringScheduleStatus.mockResolvedValue({ id: "schedule_1" });
  mocks.updateRecurringScheduleFromFormData.mockResolvedValue({ id: "schedule_1" });
});

test("recurring schedule actions delegate each supported mutation and refresh schedule routes", () => {
  const path = "app/recurring-pr/actions.ts";
  expect(existsSync(path)).toBe(true);

  const source = readFileSync(path, "utf8");
  expect(source).toContain("createRecurringScheduleFromFormData");
  expect(source).toContain("updateRecurringScheduleFromFormData");
  expect(source).toContain("setRecurringScheduleStatus");
  expect(source).toContain('revalidatePath("/recurring-pr")');
  expect(source).toContain('redirect(`/recurring-pr/${created.id}`)');
});

test("recurring schedule actions delegate arguments, refresh collection/detail, and redirect", async () => {
  const formData = new FormData();

  await createRecurringScheduleAction("pr_source", { fieldErrors: {}, message: null }, formData);
  await updateRecurringScheduleAction("schedule_1", { fieldErrors: {}, message: null }, formData);
  await pauseRecurringScheduleAction("schedule_1");
  await resumeRecurringScheduleAction("schedule_1");

  expect(mocks.createRecurringScheduleFromFormData).toHaveBeenCalledWith("pr_source", formData);
  expect(mocks.updateRecurringScheduleFromFormData).toHaveBeenCalledWith("schedule_1", formData);
  expect(mocks.setRecurringScheduleStatus).toHaveBeenNthCalledWith(1, "schedule_1", "PAUSED");
  expect(mocks.setRecurringScheduleStatus).toHaveBeenNthCalledWith(2, "schedule_1", "ACTIVE");
  expect(mocks.revalidatePath).toHaveBeenCalledTimes(8);
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/recurring-pr");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/recurring-pr/schedule_1");
  expect(mocks.redirect).toHaveBeenCalledTimes(4);
  expect(mocks.redirect).toHaveBeenCalledWith("/recurring-pr/schedule_1");
});

test("returns expected recurring validation errors as field feedback instead of throwing a framework error", async () => {
  mocks.createRecurringScheduleFromFormData.mockRejectedValueOnce(new DraftValidationError({ categoryId: "หมวดหมู่ PR ไม่พร้อมใช้งาน" }));
  const result = await createRecurringScheduleAction("pr_source", { fieldErrors: {}, message: null }, new FormData());

  expect(result).toEqual({
    fieldErrors: { categoryId: "หมวดหมู่ PR ไม่พร้อมใช้งาน" },
    message: "Please review the highlighted schedule fields.",
  });
  expect(mocks.redirect).not.toHaveBeenCalled();
});
