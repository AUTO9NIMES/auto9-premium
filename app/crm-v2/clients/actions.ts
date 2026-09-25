"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { deleteCustomerIfSafe, findCustomerByEmailOrPhone, upsertCustomer } from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function createV2Customer(formData: FormData) {
  await requireCrmAccess();

  const fullName = value(formData, "fullName");
  if (!fullName) redirect("/crm-v2/clients?new=1&error=name");

  const parts = fullName.split(/\s+/);
  const firstName = value(formData, "firstName") || parts[0] || "";
  const lastName = value(formData, "lastName") || parts.slice(1).join(" ");
  const email = value(formData, "email") || null;
  const phone = value(formData, "phone") || null;
  const city = value(formData, "city") || null;

  try {
    const existing = await findCustomerByEmailOrPhone(email, phone);
    if (existing?.id) {
      redirect("/crm-v2/clients/" + existing.id + "?existing=1");
    }

    const customer = await upsertCustomer({
      business_id: "",
      full_name: fullName,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone,
      city,
      source: "crm_manual",
    });

    if (!customer?.id) {
      redirect("/crm-v2/clients?new=1&error=create");
    }

    revalidatePath("/crm-v2");
    revalidatePath("/crm-v2/clients");
    redirect("/crm-v2/clients/" + customer.id + "?created=1");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }

    try {
      const existing = await findCustomerByEmailOrPhone(email, phone);
      if (existing?.id) {
        redirect("/crm-v2/clients/" + existing.id + "?existing=1");
      }
    } catch (nestedError) {
      if (nestedError && typeof nestedError === "object" && "digest" in nestedError) {
        throw nestedError;
      }
    }

    redirect("/crm-v2/clients?new=1&error=create");
  }
}

export async function deleteV2Customer(formData: FormData) {
  await requireCrmAccess();

  const customerId = value(formData, "customerId");
  const confirmation = formData.get("confirm");

  if (!UUID_REGEX.test(customerId) || confirmation !== "DELETE") {
    redirect("/crm-v2/clients?error=invalid");
  }

  let result;

  try {
    result = await deleteCustomerIfSafe(customerId);
  } catch {
    redirect("/crm-v2/clients?error=unavailable");
  }

  if (result === "PROTECTED") {
    redirect("/crm-v2/clients?error=protected");
  }

  if (result === "NOT_FOUND") {
    redirect("/crm-v2/clients?error=not_found");
  }

  if (result !== "DELETED") {
    redirect("/crm-v2/clients?error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/clients");
  revalidatePath(`/crm-v2/clients/${customerId}`);
  redirect("/crm-v2/clients?deleted=1");
}
