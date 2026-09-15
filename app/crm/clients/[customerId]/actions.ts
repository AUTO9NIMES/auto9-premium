"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../../lib/auth/dal";
import { updateCustomerProfile, type UpdateCustomerProfileResult } from "../../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectWithError(customerId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/clients/${customerId}?profile_error=${error}`);
}

export async function updateCustomerProfileAction(formData: FormData) {
  const customerId = formData.get("customerId");

  if (typeof customerId !== "string" || !UUID_REGEX.test(customerId.trim())) {
    redirect("/crm/clients");
  }

  const normalizedCustomerId = customerId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithError(normalizedCustomerId, "access");
    }
    redirectWithError(normalizedCustomerId, "unavailable");
  }

  const fullName = formData.get("full_name");
  const firstName = formData.get("first_name");
  const lastName = formData.get("last_name");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const city = formData.get("city");

  if (
    typeof fullName !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    typeof city !== "string"
  ) {
    redirectWithError(normalizedCustomerId, "invalid");
  }

  const normalizedFullName = fullName.trim();
  const normalizedFirstName = firstName.trim() || null;
  const normalizedLastName = lastName.trim() || null;
  const normalizedEmail = email.trim().toLowerCase() || null;
  const normalizedPhoneRaw = phone.trim();
  const normalizedPhone = normalizedPhoneRaw.replace(/\D/g, "") || null;
  const normalizedCity = city.trim() || null;

  if (
    !normalizedFullName || normalizedFullName.length > 200 ||
    (normalizedFirstName !== null && normalizedFirstName.length > 100) ||
    (normalizedLastName !== null && normalizedLastName.length > 100) ||
    (normalizedEmail !== null && (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail))) ||
    normalizedPhoneRaw.length > 40 ||
    (normalizedPhoneRaw.length > 0 && (!normalizedPhone || normalizedPhone.length < 7 || normalizedPhone.length > 15)) ||
    (normalizedCity !== null && normalizedCity.length > 120)
  ) {
    redirectWithError(normalizedCustomerId, "invalid");
  }

  let result: UpdateCustomerProfileResult;
  try {
    result = await updateCustomerProfile({
      customerId: normalizedCustomerId,
      fullName: normalizedFullName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      phone: normalizedPhoneRaw || null,
      city: normalizedCity,
    });
  } catch {
    redirectWithError(normalizedCustomerId, "unavailable");
  }

  revalidatePath(`/crm/clients/${normalizedCustomerId}`);
  revalidatePath("/crm/clients");
  revalidatePath("/crm");
  redirect(`/crm/clients/${normalizedCustomerId}?profile=${result.noOp ? "unchanged" : "updated"}`);
}
