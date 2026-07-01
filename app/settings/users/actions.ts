"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildUserManagementHref,
  createUserFromFormData,
  readUserRedirectFilters,
  resetUserPasswordFromFormData,
  updateUserFromFormData,
  verifyLdapUserForAdmin,
} from "@/lib/user-management";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function redirectBackToUsers(formData: FormData, overrides: Parameters<typeof buildUserManagementHref>[0] = {}) {
  redirect(buildUserManagementHref({ ...readUserRedirectFilters(formData), ...overrides }));
}

export async function createUserAction(formData: FormData) {
  const isLdapCreate = String(formData.get("authProvider") || "").toUpperCase() === "LDAP";

  try {
    await createUserFromFormData(formData);
  } catch (error) {
    if (isLdapCreate) {
      return redirectBackToUsers(formData, {
        createAuthProvider: "LDAP",
        createUser: true,
        feedbackMessage: "Could not create LDAP user. Verify the AD user again or check for duplicate account data.",
        feedbackType: "error",
        ldapVerifiedDisplayName: "",
        ldapVerifiedEmail: "",
        ldapVerifiedUsername: "",
      });
    }

    redirectBackToUsers(formData, {
      createUser: true,
      feedbackMessage: `Could not create user: ${messageFromError(error)}`,
      feedbackType: "error",
    });
  }

  revalidatePath("/settings/users");
  redirectBackToUsers(formData, {
    createAuthProvider: "LOCAL",
    createUser: false,
    feedbackMessage: "User created successfully",
    feedbackType: "success",
    ldapVerifiedDisplayName: "",
    ldapVerifiedEmail: "",
    ldapVerifiedUsername: "",
  });
}

export async function verifyLdapUserAction(formData: FormData) {
  let profile: Awaited<ReturnType<typeof verifyLdapUserForAdmin>>;

  try {
    profile = await verifyLdapUserForAdmin(formData.get("username"));
  } catch (error) {
    return redirectBackToUsers(formData, {
      createAuthProvider: "LDAP",
      createUser: true,
      feedbackMessage: "Could not verify AD user. Check the username or LDAP configuration.",
      feedbackType: "error",
      ldapVerifiedDisplayName: "",
      ldapVerifiedEmail: "",
      ldapVerifiedUsername: "",
    });
  }

  return redirectBackToUsers(formData, {
    createAuthProvider: "LDAP",
    createUser: true,
    feedbackMessage: `Verified AD user ${profile.username}`,
    feedbackType: "success",
    ldapVerifiedDisplayName: profile.displayName,
    ldapVerifiedEmail: profile.email || "",
    ldapVerifiedUsername: profile.username,
  });
}

export async function updateUserAction(formData: FormData) {
  const userId = String(formData.get("userId") || "");

  try {
    await updateUserFromFormData(formData);
  } catch (error) {
    redirectBackToUsers(formData, {
      editUserId: userId,
      feedbackMessage: `Could not update user: ${messageFromError(error)}`,
      feedbackType: "error",
    });
  }

  revalidatePath("/settings/users");
  redirectBackToUsers(formData, {
    feedbackMessage: "User updated successfully",
    feedbackType: "success",
  });
}

export async function resetUserPasswordAction(formData: FormData) {
  const userId = String(formData.get("userId") || "");

  try {
    await resetUserPasswordFromFormData(formData);
  } catch (error) {
    redirectBackToUsers(formData, {
      feedbackMessage: `Could not reset password: ${messageFromError(error)}`,
      feedbackType: "error",
      resetUserId: userId,
    });
  }

  revalidatePath("/settings/users");
  redirectBackToUsers(formData, {
    feedbackMessage: "Password reset completed",
    feedbackType: "success",
  });
}
