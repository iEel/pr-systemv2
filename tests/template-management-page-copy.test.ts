import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("template management page wiring", () => {
  test("templates page exposes rendered preview workflow before activation", () => {
    const pageSource = readFileSync("app/templates/page.tsx", "utf8");
    const actionsSource = readFileSync("app/templates/actions.ts", "utf8");

    expect(pageSource).toContain("Preview Template");
    expect(pageSource).toContain("Open Preview");
    expect(pageSource).toContain("Download Preview");
    expect(pageSource).toContain("Preview Status");
    expect(pageSource).toContain("previewTemplateAction");
    expect(pageSource).toContain("/preview");
    expect(actionsSource).toContain("previewTemplateAction");
    expect(actionsSource).toContain("previewTemplate");
  });

  test("template preview route is implemented for inline and download PDF delivery", () => {
    const routePath = "app/templates/[id]/preview/route.ts";

    expect(existsSync(routePath)).toBe(true);

    const routeSource = readFileSync(routePath, "utf8");

    expect(routeSource).toContain("getTemplatePreviewPdf");
    expect(routeSource).toContain("buildPdfDeliveryHeaders");
    expect(routeSource).toContain('searchParams.get("download") === "1"');
  });
});
