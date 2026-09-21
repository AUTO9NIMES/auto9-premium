"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../lib/auth/dal";
import {
  deleteCustomerIfSafe,
  upsertCustomer,
} from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function value(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function redirectCreateError(
  error: "invalid" | "access" | "unavailable",
): never {
  redirect(`/crm/clients?new=1&create_error=${error}`);
}

function redirectDeleteError(
  error: "invalid" | "access" | "protected" | "not_found" | "unavailable",
): never {
  redirect(`/crm/clients?delete_error=${error}`);
}

export async function createCustomerAction(formData: FormData) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/crm/login");
      }

      if (error.code === "FORBIDDEN") {
        redirectCreateError("access");
      }
    }

    redirectCreateError("unavailable");
  }

  const firstName = value(formData, "first_name");
  const lastName = value(formData, "last_name");
  const emailRaw = value(formData, "email");
  const phoneRaw = value(formData, "phone");
  const city = value(formData, "city");

  const email = emailRaw.toLowerCase() || null;
  const phoneDigits = phoneRaw.replace(/\D/g, "");
  const phone = phoneRaw || null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (
    !fullName ||
    fullName.length > 200 ||
    firstName.length > 100 ||
    lastName.length > 100 ||
    (email !== null && (email.length > 254 || !EMAIL_REGEX.test(email))) ||
    phoneRaw.length > 40 ||
    (phone !== null && (phoneDigits.length < 7 || phoneDigits.length > 15)) ||
    city.length > 120
  ) {
    redirectCreateError("invalid");
  }

  try {
    const customer = await upsertCustomer({
      full_name: fullName,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone,
      city: city || null,
      source: "crm_manual",
    });

    if (!customer?.id) {
      redirectCreateError("unavailable");
    }
  } catch {
    redirectCreateError("unavailable");
  }

  revalidatePath("/crm");
  revalidatePath("/crm/clients");
  redirect("/crm/clients?created=1");
}

export async function deleteCustomerAction(formData: FormData) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/crm/login");
      }

      if (error.code === "FORBIDDEN") {
        redirectDeleteError("access");
      }
    }

    redirectDeleteError("unavailable");
  }

  const customerId = value(formData, "customerId");
  const confirmation = value(formData, "confirm");

  if (!UUID_REGEX.test(customerId) || confirmation !== "DELETE") {
    redirectDeleteError("invalid");
  }

  let result;

  try {
    result = await deleteCustomerIfSafe(customerId);
  } catch {
    redirectDeleteError("unavailable");
  }

  if (result === "PROTECTED") {
    redirectDeleteError("protected");
  }

  if (result === "NOT_FOUND") {
    redirectDeleteError("not_found");
  }

  revalidatePath("/crm");
  revalidatePath("/crm/clients");
  redirect("/crm/clients?deleted=1");
}
