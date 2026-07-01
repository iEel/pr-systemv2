import { NextResponse } from "next/server";
import { buildPdfDeliveryHeaders } from "@/lib/pr-document-control";
import { getTemplatePreviewPdf } from "@/lib/template-management";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);

  try {
    const pdf = await getTemplatePreviewPdf(id);

    if (!pdf) {
      return NextResponse.json({ error: "Template preview PDF not found" }, { status: 404 });
    }

    const mode = url.searchParams.get("download") === "1" ? "download" : "inline";

    return new NextResponse(pdf.file, {
      headers: buildPdfDeliveryHeaders(pdf.fileName, mode),
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to load template preview PDF";

    return NextResponse.json({ error: message }, { status });
  }
}
