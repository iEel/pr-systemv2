"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildCompanyMasterPanelHref,
  createCompanyWithBranchFromFormData,
  removeBranchFromFormData,
  updateBranchDocumentProfileFromFormData,
  uploadCompanyAssetFromFormData,
} from "@/lib/company-master";

export async function createCompanyAction(formData: FormData) {
  const branch = await createCompanyWithBranchFromFormData(formData);
  revalidatePath("/masters/companies");
  redirect(buildCompanyMasterPanelHref({ branchId: branch.id }));
}

export async function uploadCompanyAssetAction(formData: FormData) {
  const branchId = String(formData.get("branchId") || "").trim();
  const includeInactive = formData.get("includeInactive") === "1";

  await uploadCompanyAssetFromFormData(formData);
  revalidatePath("/masters/companies");
  redirect(buildCompanyMasterPanelHref({ branchId, includeInactive }));
}

export async function updateBranchDocumentProfileAction(formData: FormData) {
  const branchId = String(formData.get("branchId") || "").trim();
  const includeInactive = formData.get("includeInactive") === "1";

  await updateBranchDocumentProfileFromFormData(formData);
  revalidatePath("/masters/companies");
  redirect(buildCompanyMasterPanelHref({ branchId, includeInactive }));
}

export async function removeBranchAction(formData: FormData) {
  const includeInactive = formData.get("includeInactive") === "1";

  await removeBranchFromFormData(formData);
  revalidatePath("/masters/companies");
  redirect(includeInactive ? "/masters/companies?includeInactive=1" : "/masters/companies");
}
