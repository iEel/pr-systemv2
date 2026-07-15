import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

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
