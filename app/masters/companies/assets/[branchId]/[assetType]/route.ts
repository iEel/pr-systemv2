import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCompanyAssetFileForPreview, type CompanyAssetType } from "@/lib/company-master";

function normalizeAssetType(value: string): CompanyAssetType | null {
  if (value.toLowerCase() === "header") return "HEADER";
  if (value.toLowerCase() === "footer") return "FOOTER";

  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ assetType: string; branchId: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { assetType, branchId } = await params;
  const normalizedAssetType = normalizeAssetType(assetType);

  if (!normalizedAssetType) {
    notFound();
  }

  const asset = await getCompanyAssetFileForPreview(branchId, normalizedAssetType);

  if (!asset) {
    notFound();
  }

  return new Response(asset.file, {
    headers: asset.headers,
  });
}
