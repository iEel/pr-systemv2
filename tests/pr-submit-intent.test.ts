import { describe, expect, test } from "vitest";
import { getDraftSubmissionRedirectPath, readDraftSubmissionIntent } from "../lib/pr-submit-intent";

function formData(intent?: string) {
  const form = new FormData();

  if (intent !== undefined) {
    form.set("intent", intent);
  }

  return form;
}

describe("draft submission intent", () => {
  test("defaults to returning to the saved draft detail page", () => {
    expect(readDraftSubmissionIntent(formData())).toBe("save");
    expect(getDraftSubmissionRedirectPath("draft_001", "save")).toBe("/pr/draft_001");
  });

  test("redirects to draft preview pdf when requested", () => {
    expect(readDraftSubmissionIntent(formData("preview"))).toBe("preview");
    expect(getDraftSubmissionRedirectPath("draft_001", "preview")).toBe("/pr/draft_001/preview-pdf");
  });

  test("treats unknown intent values as normal save", () => {
    expect(readDraftSubmissionIntent(formData("delete"))).toBe("save");
    expect(readDraftSubmissionIntent(formData(""))).toBe("save");
  });
});
