import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("PR detail command center", () => {
  test("groups lifecycle commands into next action, review files, and danger zone", () => {
    const source = readFileSync("components/pr/PRDetail.tsx", "utf8");

    expect(source).toContain("Next action");
    expect(source).toContain("Review & files");
    expect(source).toContain("Danger zone");
    expect(source).toContain("Upload Quotation");
    expect(source).toContain("Attach quotation");
    expect(source).not.toContain('<Button disabled variant="primary"><Printer');
    expect(source).not.toContain('<Button disabled variant="success"><FileUp');
  });

  test("keeps next action compact inside the PR summary header", () => {
    const source = readFileSync("components/pr/PRDetail.tsx", "utf8");

    expect(source).toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
    expect(source).toContain("text-xs leading-5 text-blue-800");
    expect(source).toContain("min-h-9 px-3 py-1.5 text-xs");
  });

  test("shows category in document information, including legacy category text", () => {
    const source = readFileSync("components/pr/PRDetail.tsx", "utf8");

    expect(source).toContain("Document information");
    expect(source).toContain("Category");
    expect(source).toContain('["Category", header.category]');
  });

  test("offers recurring schedule creation to authorized users and traces recurring origins", () => {
    const source = readFileSync("components/pr/PRDetail.tsx", "utf8");
    const page = readFileSync("app/pr/[id]/page.tsx", "utf8");

    expect(source).toContain("Create Recurring Schedule");
    expect(source).toContain("Recurring");
    expect(source).toContain("header.recurringOrigin");
    expect(source).toContain("canManageRecurring");
    expect(page).toContain('hasPermission(user.role, "PR_RECURRING_MANAGE")');
  });
});
