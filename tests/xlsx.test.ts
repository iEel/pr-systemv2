import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import { buildXlsxWorkbook } from "../lib/xlsx";

describe("xlsx workbook builder", () => {
  test("creates a minimal workbook with escaped strings and numeric cells", async () => {
    const file = await buildXlsxWorkbook({
      sheets: [
        {
          name: "Summary",
          rows: [
            ["Metric", "Value"],
            ["ยอดรวม A&B", 1234.5],
            ['Quote "check"', "ผ่าน"],
          ],
        },
      ],
    });
    const zip = await JSZip.loadAsync(file);
    const workbook = await zip.file("xl/workbook.xml")?.async("string");
    const sheet = await zip.file("xl/worksheets/sheet1.xml")?.async("string");

    expect(workbook).toContain('name="Summary"');
    expect(sheet).toContain("ยอดรวม A&amp;B");
    expect(sheet).toContain("Quote &quot;check&quot;");
    expect(sheet).toContain("<v>1234.5</v>");
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
  });
});
