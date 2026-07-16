import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Recurring PR pages", () => {
  test("uses a separate operational module instead of a PR Documents tab", () => {
    const sidebar = readFileSync("components/app/AppSidebar.tsx", "utf8");
    const list = readFileSync("app/recurring-pr/page.tsx", "utf8");
    const prList = readFileSync("components/pr/PRList.tsx", "utf8");

    expect(sidebar).toContain('href: "/recurring-pr"');
    expect(list).toContain("Recurring PR");
    expect(list).toContain("Needs attention");
    expect(prList).not.toContain("Recurring Schedules");
  });

  test("keeps editable schedule forms behind the recurring permission while read pages stay authenticated", () => {
    const newPage = readFileSync("app/recurring-pr/new/page.tsx", "utf8");
    const editPage = readFileSync("app/recurring-pr/[id]/edit/page.tsx", "utf8");
    const listPage = readFileSync("app/recurring-pr/page.tsx", "utf8");
    const detailPage = readFileSync("app/recurring-pr/[id]/page.tsx", "utf8");

    expect(newPage).toContain('requirePermission("PR_RECURRING_MANAGE")');
    expect(editPage).toContain('requirePermission("PR_RECURRING_MANAGE")');
    expect(listPage).toContain("requireCurrentUser");
    expect(detailPage).toContain("requireCurrentUser");
  });

  test("builds the five-section schedule form and operational list/detail controls", () => {
    const form = readFileSync("components/recurring-pr/RecurringScheduleForm.tsx", "utf8");
    const list = readFileSync("components/recurring-pr/RecurringScheduleList.tsx", "utf8");
    const detail = readFileSync("app/recurring-pr/[id]/page.tsx", "utf8");

    for (const text of [
      "Create Recurring PR Schedule / สร้างกำหนดการ PR ประจำปี",
      "Schedule details",
      "Annual renewal rule",
      "PR snapshot",
      "Ready to create",
      "Complete",
      "Due immediately",
      "Back to source PR",
    ]) expect(form).toContain(text);

    expect(form).toContain("SectionHeader");
    expect(form).toContain("sourcePurchaseRequestLabel");
    expect(form).toContain("xl:grid-cols-[minmax(0,1fr)_22rem]");
    expect(form).toContain("xl:sticky xl:top-20 xl:self-start");
    expect(form).toContain("disabled={!readiness.ready || isPending}");
    expect(form).toContain("thaiMonthOptions.map");
    expect(form).toContain("PRItemEditor");
    expect(form).toContain("Schedule readiness");
    expect(form).toContain('rowType: "rowType"');
    expect(list).toContain("Needs attention");
    expect(list).toContain("No recurring schedules match this view");
    expect(list).toContain("Actions");
    expect(detail).toContain("Run history");
    expect(detail).toContain("retryRecurringRunAction");
    expect(detail).toContain('"Actions"');
    expect(detail).toContain('canManage && run.status === "FAILED" && !run.purchaseRequest');
    expect(detail).toContain("Retry failed run");
  });

  test("contains the wide run-history table inside a shrinkable mobile grid column", () => {
    const detail = readFileSync("app/recurring-pr/[id]/page.tsx", "utf8");

    expect(detail).toContain('<div className="min-w-0 space-y-5">');
    expect(detail).toContain('<div className="max-w-full overflow-x-auto">');
  });

  test("keeps list filters and the wide schedule table inside the available workspace", () => {
    const list = readFileSync("components/recurring-pr/RecurringScheduleList.tsx", "utf8");

    expect(list).toContain('<div className="min-w-0 space-y-5">');
    expect(list).toContain("2xl:grid-cols-[minmax(14rem,1fr)_10rem_13rem_13rem_9rem_auto]");
    expect(list).not.toContain("lg:grid-cols-[minmax(14rem,1fr)_10rem_13rem_13rem_9rem_auto]");
    expect(list).toContain('<div className="max-w-full overflow-x-auto">');
  });
});
