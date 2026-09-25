"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import {
  createManualLead,
  createManualLeadWithCustomer,
  findManualLeadWithCustomerReplay,
  type ManualLeadResult,
} from "../../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm-v2/pipeline/new?error=${error}`);
}

export async function createV2ManualLeadAction(formData: FormData) {
  const intakeMode = formData.get("intakeMode");
  const customerId = formData.get("customerId");
  const idempotencyKey = formData.get("idempotencyKey");

  if (
    (intakeMode !== "existing" && intakeMode !== "new") ||
    (intakeMode !== "new" &&
      (typeof customerId !== "string" || !UUID_REGEX.test(customerId.trim()))) ||
    typeof idempotencyKey !== "string" ||
    !UUID_REGEX.test(idempotencyKey.trim())
  ) {
    fail("invalid");
  }

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError && error.code === "FORBIDDEN") fail("access");
    if (error instanceof CrmAccessError && error.code === "UNAUTHENTICATED") {
      redirect("/crm/login?next=/crm-v2/pipeline/new");
    }
    fail("unavailable");
  }

  if (intakeMode === "new") {
    try {
      const replay = await findManualLeadWithCustomerReplay(idempotencyKey.trim());
      if (replay) {
        revalidatePath("/crm-v2/pipeline");
        redirect("/crm-v2/pipeline?created=1");
      }
    } catch {
      fail("unavailable");
    }
  }

  const vehicleId = formData.get("vehicleId");
  const fullName = formData.get("fullName");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const city = formData.get("city");
  const serviceName = formData.get("serviceName");
  const basePriceValue = formData.get("basePrice");
  const estimatedTime = formData.get("estimatedTime");
  const customerComment = formData.get("customerComment");

  if (
    typeof serviceName !== "string" ||
    typeof basePriceValue !== "string" ||
    typeof estimatedTime !== "string" ||
    typeof customerComment !== "string"
  ) {
    fail("invalid");
  }

  const normalizedServiceName = serviceName.trim();
  const normalizedPrice = basePriceValue.trim() ? Number(basePriceValue) : null;
  const normalizedVehicleId =
    typeof vehicleId === "string" && vehicleId.trim() ? vehicleId.trim() : null;

  if (
    !normalizedServiceName ||
    normalizedServiceName.length > 200 ||
    (normalizedPrice !== null &&
      (!Number.isFinite(normalizedPrice) || normalizedPrice < 0 || normalizedPrice > 10000000)) ||
    (normalizedVehicleId !== null && !UUID_REGEX.test(normalizedVehicleId))
  ) {
    fail("invalid");
  }

  let result: ManualLeadResult;

  try {
    if (intakeMode === "new") {
      const normalizedFullName = typeof fullName === "string" ? fullName.trim() : "";
      const normalizedFirstName =
        typeof firstName === "string" ? firstName.trim() || null : null;
      const normalizedLastName =
        typeof lastName === "string" ? lastName.trim() || null : null;
      const normalizedEmail =
        typeof email === "string" ? email.trim().toLowerCase() || null : null;
      const rawPhone = typeof phone === "string" ? phone.trim() : "";
      const normalizedPhone =
        typeof phone === "string" ? phone.replace(/\D/g, "") || null : null;
      const normalizedCity =
        typeof city === "string" ? city.trim() || null : null;

      if (
        !normalizedFullName ||
        (!normalizedEmail && !normalizedPhone) ||
        (normalizedEmail !== null &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) ||
        rawPhone.length > 40
      ) {
        fail("invalid");
      }

      result = await createManualLeadWithCustomer({
        idempotencyKey: idempotencyKey.trim(),
        fullName: normalizedFullName,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        phone: normalizedPhone,
        city: normalizedCity,
        serviceName: normalizedServiceName,
        basePrice: normalizedPrice,
        estimatedTime: estimatedTime.trim() || null,
        customerComment: customerComment.trim() || null,
      });
    } else {
      result = await createManualLead({
        idempotencyKey: idempotencyKey.trim(),
        customerId: (customerId as string).trim(),
        vehicleId: normalizedVehicleId,
        serviceName: normalizedServiceName,
        basePrice: normalizedPrice,
        estimatedTime: estimatedTime.trim() || null,
        customerComment: customerComment.trim() || null,
      });
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    fail("unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm/pipeline");
  redirect(`/crm-v2/pipeline?created=1&lead=${result.leadId}`);
}
