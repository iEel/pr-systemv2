export type DraftSubmissionIntent = "save" | "preview";

export function readDraftSubmissionIntent(formData: FormData): DraftSubmissionIntent {
  return formData.get("intent") === "preview" ? "preview" : "save";
}

export function getDraftSubmissionRedirectPath(id: string, intent: DraftSubmissionIntent) {
  return intent === "preview" ? `/pr/${id}/preview-pdf` : `/pr/${id}`;
}
