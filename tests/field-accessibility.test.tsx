import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(" "),
}));

import { Field } from "../components/ui/Field";

const referenceFields = ["renewalMonth", "branchId", "departmentId", "divisionId", "categoryId", "responsibleUserId"] as const;

describe("Field error accessibility", () => {
  test.each(referenceFields)("associates the %s control with its stable error message", (name) => {
    const markup = renderToStaticMarkup(
      <Field error={`${name} is invalid`} label={name}>
        <select name={name}><option value="">Choose</option></select>
      </Field>,
    );
    const errorId = markup.match(/<span[^>]*id="([^"]+)"[^>]*role="alert"/)?.[1];

    expect(errorId).toBeTruthy();
    expect(markup).toContain(`aria-describedby="${errorId}"`);
    expect(markup).toContain('aria-invalid="true"');
  });
});
