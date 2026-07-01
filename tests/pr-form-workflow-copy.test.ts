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
    expect(source).toContain('<col className="w-[38%]" data-column="description" />');
    expect(source).toContain('<col className="w-[9%]" data-column="acct" />');
    expect(source).toContain('<col className="w-[10%]" data-column="qty" />');
    expect(source).toContain('<col className="w-[15%]" data-column="unit-cost" />');
    expect(source).toContain('<col className="w-[15%]" data-column="total-amount" />');
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
});
