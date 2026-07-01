import Link from "next/link";
import { Archive, CheckCircle2, Download, Eye, FileCheck2, FileSpreadsheet, FileText, SearchCheck, Upload } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { activateTemplateAction, archiveTemplateAction, previewTemplateAction, uploadTemplateAction, validateTemplateAction } from "./actions";
import { canActivateTemplateVersion, getTemplateManagementItems, type TemplateStatus, type TemplateType } from "@/lib/template-management";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTone: Record<TemplateStatus, "success" | "neutral" | "purple"> = {
  ACTIVE: "success",
  ARCHIVED: "purple",
  DRAFT: "neutral",
};

const previewTone = {
  FAILED: "danger",
  NA: "neutral",
  PASSED: "success",
  PENDING: "warning",
} as const;

function typeIcon(type: TemplateType) {
  return type === "XLSX" ? <FileSpreadsheet aria-hidden className="h-4 w-4" /> : <FileText aria-hidden className="h-4 w-4" />;
}

function latestValidation(templates: Awaited<ReturnType<typeof getTemplateManagementItems>>) {
  return templates
    .filter((template) => template.validation?.totalTagsFound !== undefined)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0]?.validation || null;
}

function tagList(tags: string[] | undefined, emptyText: string) {
  if (!tags?.length) return <p className="mt-2 text-sm text-muted">{emptyText}</p>;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.slice(0, 24).map((tag) => (
        <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold text-ink" key={tag}>
          {tag}
        </span>
      ))}
      {tags.length > 24 ? <span className="px-2 py-1 text-xs font-semibold text-muted">+{tags.length - 24} more</span> : null}
    </div>
  );
}

function previewSummary(template: Awaited<ReturnType<typeof getTemplateManagementItems>>[number]) {
  if (template.templateType === "XLSX") {
    return {
      detail: "XLSX ใช้ validation เท่านั้น",
      key: "NA" as const,
      label: "N/A",
    };
  }

  const preview = template.validation?.preview;
  if (preview?.status === "PASSED") {
    return {
      detail: preview.renderedAt ? `Rendered ${formatDateTime(preview.renderedAt)}` : "Preview PDF ready",
      key: "PASSED" as const,
      label: "Passed",
    };
  }

  if (preview?.status === "FAILED") {
    return {
      detail: preview.error || "Last preview render failed",
      key: "FAILED" as const,
      label: "Failed",
    };
  }

  return {
    detail: "Validate แล้ว render preview ก่อน Activate",
    key: "PENDING" as const,
    label: "Not previewed",
  };
}

export default async function TemplatesPage() {
  const templates = await getTemplateManagementItems();
  const validation = latestValidation(templates);

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="Template Management / Carbone Templates"
          description="จัดการ DOCX/XLSX template, validation result, version และสถานะ active/archive สำหรับ Carbone render"
        />

        <Card>
          <form action={uploadTemplateAction} className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_1fr_0.7fr_1.4fr_auto] lg:items-end">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Template Name
              <input className={inputClass()} defaultValue="PR_STANDARD" name="name" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Version
              <input className={inputClass()} defaultValue="V2" name="version" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Contract
              <input className={inputClass()} defaultValue="IT PR Contract" name="contractName" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Type
              <select className={inputClass()} name="templateType" defaultValue="DOCX">
                <option value="DOCX">DOCX</option>
                <option value="XLSX">XLSX</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Template File
              <input className={inputClass("pt-2")} name="templateFile" type="file" accept=".docx,.xlsx" required />
            </label>
            <Button type="submit">
              <Upload aria-hidden className="h-4 w-4" />Upload
            </Button>
          </form>
        </Card>

        <TableWrap>
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full border-collapse">
              <thead>
                <tr>
                  {["Template Name", "Type", "Version", "Contract", "Status", "Validation", "Preview Status", "Last Updated", "Action"].map((head) => (
                    <th className={`${tableHeaderClass} px-4 py-3`} key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => {
                  const missingCount = template.validation?.missingRequiredTags?.length ?? null;
                  const activation = canActivateTemplateVersion({
                    name: template.name,
                    templateType: template.templateType,
                    validation: template.validation,
                  });
                  const canActivate = activation.canActivate && template.status !== "ACTIVE";
                  const canArchive = template.status !== "ARCHIVED";
                  const canPreview = template.templateType === "DOCX" && missingCount === 0;
                  const preview = previewSummary(template);
                  const hasPreviewPdf = template.validation?.preview?.status === "PASSED";

                  return (
                    <tr key={template.id}>
                      <td className={`${tableCellClass} font-bold text-primary`}>{template.name}</td>
                      <td className={tableCellClass}>
                        <span className="inline-flex items-center gap-2 font-semibold text-ink">
                          {typeIcon(template.templateType)}
                          {template.templateType}
                        </span>
                      </td>
                      <td className={tableCellClass}>{template.version}</td>
                      <td className={tableCellClass}>{template.contractName}</td>
                      <td className={tableCellClass}>
                        <Badge tone={statusTone[template.status]}>{template.status}</Badge>
                      </td>
                      <td className={tableCellClass}>
                        {template.validation?.totalTagsFound !== undefined ? (
                          <span>{template.validation.totalTagsFound} tags / {missingCount} missing</span>
                        ) : (
                          <span className="text-muted">Not validated</span>
                        )}
                      </td>
                      <td className={tableCellClass}>
                        <Badge tone={previewTone[preview.key]}>{preview.label}</Badge>
                        <p className="mt-1 max-w-48 text-xs leading-5 text-muted">{preview.detail}</p>
                      </td>
                      <td className={tableCellClass}>{formatDateTime(template.updatedAt)}</td>
                      <td className={tableCellClass}>
                        <div className="flex flex-wrap gap-2">
                          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href={`/templates/${template.id}/file`}>
                            <Download aria-hidden className="h-4 w-4" />Download
                          </Link>
                          <form action={validateTemplateAction.bind(null, template.id)}>
                            <Button type="submit" variant="secondary">
                              <SearchCheck aria-hidden className="h-4 w-4" />Validate
                            </Button>
                          </form>
                          {template.templateType === "DOCX" ? (
                            <form action={previewTemplateAction.bind(null, template.id)}>
                              <Button disabled={!canPreview} type="submit" variant="secondary">
                                <FileCheck2 aria-hidden className="h-4 w-4" />Preview Template
                              </Button>
                            </form>
                          ) : null}
                          {hasPreviewPdf ? (
                            <>
                              <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href={`/templates/${template.id}/preview`} target="_blank">
                                <Eye aria-hidden className="h-4 w-4" />Open Preview
                              </Link>
                              <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href={`/templates/${template.id}/preview?download=1`}>
                                <Download aria-hidden className="h-4 w-4" />Download Preview
                              </Link>
                            </>
                          ) : null}
                          {canActivate ? (
                            <form action={activateTemplateAction.bind(null, template.id)}>
                              <Button type="submit" variant="success">
                                <CheckCircle2 aria-hidden className="h-4 w-4" />Activate
                              </Button>
                            </form>
                          ) : (
                            <div className="grid gap-1">
                              <Button disabled variant="secondary">
                                <Archive aria-hidden className="h-4 w-4" />Activate
                              </Button>
                              {template.status !== "ACTIVE" && activation.reason ? (
                                <span className="max-w-56 text-xs leading-5 text-muted">{activation.reason}</span>
                              ) : null}
                            </div>
                          )}
                          {canArchive ? (
                            <form action={archiveTemplateAction.bind(null, template.id)}>
                              <Button type="submit" variant="danger">
                                <Archive aria-hidden className="h-4 w-4" />Archive
                              </Button>
                            </form>
                          ) : (
                            <Button disabled variant="secondary">
                              <Archive aria-hidden className="h-4 w-4" />Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TableWrap>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-red-200 bg-red-50 shadow-none">
            <div className="text-sm font-bold text-red-800">Unknown Tags</div>
            <div className="mt-2 text-4xl font-bold text-red-700">{validation?.unknownTags?.length ?? 0}</div>
            <p className="mt-1 text-sm text-red-700">{validation?.unknownTags?.slice(0, 3).join(" / ") || "No unknown tags"}</p>
          </Card>
          <Card className="border-amber-200 bg-amber-50 shadow-none">
            <div className="text-sm font-bold text-amber-800">Missing Required Tags</div>
            <div className="mt-2 text-4xl font-bold text-amber-700">{validation?.missingRequiredTags?.length ?? 0}</div>
            <p className="mt-1 text-sm text-amber-700">{validation?.missingRequiredTags?.slice(0, 3).join(" / ") || "All required tags found"}</p>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50 shadow-none">
            <div className="text-sm font-bold text-emerald-800">Total Tags Found</div>
            <div className="mt-2 text-4xl font-bold text-emerald-700">{validation?.totalTagsFound ?? 0}</div>
            <p className="mt-1 text-sm text-emerald-700">DOCX และ XLSX ใช้ validation pipeline เดียวกัน</p>
          </Card>
        </div>
        {validation ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <div className="text-sm font-bold text-ink">Found Tags</div>
              {tagList(validation.foundTags, "No tags found")}
            </Card>
            <Card>
              <div className="text-sm font-bold text-ink">Missing Required Tags</div>
              {tagList(validation.missingRequiredTags, "All required tags found")}
            </Card>
            <Card>
              <div className="text-sm font-bold text-ink">Unknown Tags</div>
              {tagList(validation.unknownTags, "No unknown tags")}
            </Card>
          </div>
        ) : null}
      </div>
    </AppFrame>
  );
}
