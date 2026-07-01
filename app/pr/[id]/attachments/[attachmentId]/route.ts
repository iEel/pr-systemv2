import { NextResponse } from "next/server";
import { buildAttachmentDeliveryHeaders, getPurchaseRequestAttachmentFile } from "@/lib/pr-document-control";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string; id: string }> }) {
  const { attachmentId, id } = await params;

  try {
    const attachment = await getPurchaseRequestAttachmentFile(id, attachmentId);

    if (!attachment) {
      return NextResponse.json({ error: "PR attachment not found" }, { status: 404 });
    }

    return new NextResponse(attachment.file, {
      headers: buildAttachmentDeliveryHeaders(attachment.fileName, attachment.mimeType),
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to load PR attachment";

    return NextResponse.json({ error: message }, { status });
  }
}
