import { describe, expect, test } from "vitest";
import { getBreadcrumbLabel } from "../lib/breadcrumbs";

describe("breadcrumb labels", () => {
  test("labels recurring creation as Create Schedule", () => {
    expect(getBreadcrumbLabel(["recurring-pr", "new"], 0)).toBe("Recurring PR");
    expect(getBreadcrumbLabel(["recurring-pr", "new"], 1)).toBe("Create Schedule");
  });

  test("labels recurring editing as Edit Schedule", () => {
    expect(getBreadcrumbLabel(["recurring-pr", "schedule_1", "edit"], 2)).toBe("Edit Schedule");
  });

  test("keeps the standard PR creation label", () => {
    expect(getBreadcrumbLabel(["pr", "new"], 1)).toBe("Create PR");
  });
});
