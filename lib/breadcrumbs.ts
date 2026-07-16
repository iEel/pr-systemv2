const labels: Record<string, string> = {
  dashboard: "Dashboard",
  pr: "PR Documents",
  "recurring-pr": "Recurring PR",
  templates: "Templates",
  reports: "Reports",
  masters: "Master Data",
  companies: "Company / Branch Master",
  budgets: "Budget IT",
  "pr-categories": "PR Categories",
  settings: "Settings",
  users: "Users / Roles",
  "running-numbers": "Running Number Settings",
  "audit-logs": "Audit Logs",
  "upload-signed": "Upload Signed Document",
};

export function getBreadcrumbLabel(segments: string[], index: number) {
  const segment = segments[index];

  if (segment === "new") {
    return segments[index - 1] === "recurring-pr" ? "Create Schedule" : "Create PR";
  }
  if (segment === "edit") {
    return segments[index - 2] === "recurring-pr" ? "Edit Schedule" : "Edit PR";
  }

  return labels[segment] ?? (segment.startsWith("pr-") ? "PR Detail" : segment);
}
