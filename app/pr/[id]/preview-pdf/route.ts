import { NextResponse } from "next/server";
import { buildPdfDeliveryHeaders } from "@/lib/pr-document-control";
import { previewDraftPurchaseRequestPdf } from "@/lib/pr-generate";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  try {
    const preview = await previewDraftPurchaseRequestPdf(id);
    const mode = url.searchParams.get("download") === "1" ? "download" : "inline";

    return new NextResponse(preview.output, {
      headers: buildPdfDeliveryHeaders(preview.fileName, mode),
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to render draft preview";

    return NextResponse.json({ error: message }, { status });
  }
}
