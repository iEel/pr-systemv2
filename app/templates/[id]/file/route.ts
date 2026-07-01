import { NextResponse } from "next/server";
import { buildTemplateDeliveryHeaders, getTemplateFileForDownload } from "@/lib/template-management";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const template = await getTemplateFileForDownload(id);

    if (!template) {
      return NextResponse.json({ error: "Template file not found" }, { status: 404 });
    }

    return new NextResponse(template.file, {
      headers: buildTemplateDeliveryHeaders(template.fileName, template.templateType),
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to load template file";

    return NextResponse.json({ error: message }, { status });
  }
}
