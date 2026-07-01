"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activateTemplate, archiveTemplate, previewTemplate, uploadTemplateFromFormData, validateTemplate } from "@/lib/template-management";

export async function uploadTemplateAction(formData: FormData) {
  await uploadTemplateFromFormData(formData);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function validateTemplateAction(id: string) {
  await validateTemplate(id);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function previewTemplateAction(id: string) {
  await previewTemplate(id);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function activateTemplateAction(id: string) {
  await activateTemplate(id);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function archiveTemplateAction(id: string) {
  await archiveTemplate(id);
  revalidatePath("/templates");
  redirect("/templates");
}
