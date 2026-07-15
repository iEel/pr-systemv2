import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("PR form workflow copy", () => {
  test("offers explicit save and save-preview submit actions", () => {
    const source = readFileSync("components/pr/PRForm.tsx", "utf8");

    expect(source).toContain('name="intent"');
    expect(source).toContain('value="save"');
    expect(source).toContain('value="preview"');
    expect(source).toContain("Save & Preview");
    expect(source).toContain("Update & Preview");
    expect(source).not.toContain("Preview Saved Draft");
  });

  test("gives item description more table space than short numeric fields", () => {
    const source = readFileSync("components/pr/PRForm.tsx", "utf8");

    expect(source).toContain('table className="min-w-[860px] w-full table-fixed border-collapse"');
    expect(source).toContain("<colgroup>");
    expect(source).toContain('<col className="w-[12%]" data-column="row-type" />');
    expect(source).toContain('<col className="w-[33%]" data-column="description" />');
    expect(source).toContain('<col className="w-[8%]" data-column="acct" />');
    expect(source).toContain('<col className="w-[9%]" data-column="qty" />');
    expect(source).toContain('<col className="w-[14%]" data-column="unit-cost" />');
    expect(source).toContain('<col className="w-[14%]" data-column="total-amount" />');
    expect(source).toContain('<col className="w-[5%]" data-column="actions" />');
    expect(source).toContain("itemTableCompactCellClass");
    expect(source).toContain("numberInputClass");
  });

  test("preserves clone source identity through the save form", () => {
    const source = readFileSync("components/pr/PRForm.tsx", "utf8");

    expect(source).toContain("cloneSourceId");
    expect(source).toContain('name="cloneSourceId"');
    expect(source).toContain("Cloned from");
  });

  test("requires an active PR category selection in document information", () => {
    const source = readFileSync("components/pr/PRForm.tsx", "utf8");

    expect(source).toContain("PR Category / หมวดหมู่ PR *");
    expect(source).toContain('name="categoryId"');
    expect(source).toContain("options.categories.map");
    expect(source).toContain("initialDraft?.categoryId || \"\"");
  });

  test("submits a preselected or explicitly required active category for reissue", () => {
    const detailSource = readFileSync("components/pr/PRDetail.tsx", "utf8");
    const actionSource = readFileSync("app/pr/[id]/reissue/actions.ts", "utf8");

    expect(detailSource).toContain('name="categoryId"');
    expect(detailSource).toContain("defaultValue={reissue.categoryId}");
    expect(detailSource).toContain("reissue.categories.map");
    expect(detailSource).toContain("required");
    expect(actionSource).toContain("formData: FormData");
    expect(actionSource).toContain('formData.get("categoryId")');
  });

  test("supports item, heading, and detail row modes in the PR item table", () => {
    const source = readFileSync("components/pr/PRForm.tsx", "utf8");

    expect(source).toContain("rowType");
    expect(source).toContain('name="itemRowType"');
    expect(source).toContain("หัวข้อ");
    expect(source).toContain("รายละเอียด");
    expect(source).toContain("รายการ");
    expect(source).toContain("isHeadingRow");
    expect(source).toContain("isDetailRow");
    expect(source).toContain('addRow("DETAIL")');
  });
});
