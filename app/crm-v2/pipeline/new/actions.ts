"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import { createManualDossierHybrid } from "../../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm-v2/pipeline/new?error=${error}`);
}

function optionalText(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function validBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

export async function createV2ManualLeadAction(formData: FormData) {
  const intakeMode = formData.get("intakeMode");
  const customerId = optionalText(formData.get("customerId"));
  const idempotencyKey = optionalText(formData.get("idempotencyKey"));
  const vehicleId = optionalText(formData.get("vehicleId"));
  const serviceName = optionalText(formData.get("serviceName"));
  const basePriceValue = formData.get("basePrice");
  const estimatedTime = formData.get("estimatedTime");
  const customerComment = formData.get("customerComment");
  const performanceDateValue = formData.get("performanceDate");
  const performanceTimeValue = formData.get("performanceTime");

  if (
    (intakeMode !== "existing" && intakeMode !== "new") ||
    !idempotencyKey ||
    !UUID_REGEX.test(idempotencyKey) ||
    (intakeMode === "existing" && (!customerId || !UUID_REGEX.test(customerId))) ||
    !serviceName ||
    serviceName.length > 200 ||
    typeof basePriceValue !== "string" ||
    typeof estimatedTime !== "string" ||
    typeof customerComment !== "string" ||
    (performanceDateValue !== null && typeof performanceDateValue !== "string") ||
    (performanceTimeValue !== null && typeof performanceTimeValue !== "string") ||
    (vehicleId !== null && !UUID_REGEX.test(vehicleId))
  ) {
    fail("invalid");
  }

  const basePrice = basePriceValue.trim() ? Number(basePriceValue) : null;
  const performanceDate = optionalText(performanceDateValue);
  const performanceTime = optionalText(performanceTimeValue);

  if (
    (basePrice !== null &&
      (!Number.isFinite(basePrice) || basePrice < 0 || basePrice > 10000000)) ||
    (performanceDate !== null && !validBusinessDate(performanceDate)) ||
    (performanceTime !== null &&
      (!performanceDate || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(performanceTime))) ||
    (intakeMode === "new" && vehicleId !== null)
  ) {
    fail("invalid");
  }

  let newCustomerFullName: string | null = null;
  let newCustomerFirstName: string | null = null;
  let newCustomerLastName: string | null = null;
  let newCustomerEmail: string | null = null;
  let newCustomerPhone: string | null = null;
  let newCustomerCity: string | null = null;

  if (intakeMode === "new") {
    newCustomerFullName = optionalText(formData.get("fullName"));
    newCustomerFirstName = optionalText(formData.get("firstName"));
    newCustomerLastName = optionalText(formData.get("lastName"));
    newCustomerEmail = optionalText(formData.get("email"))?.toLowerCase() || null;
    const rawPhone = optionalText(formData.get("phone")) || "";
    newCustomerPhone = rawPhone.replace(/\D/g, "") || null;
    newCustomerCity = optionalText(formData.get("city"));

    if (
      !newCustomerFullName ||
      newCustomerFullName.length > 200 ||
      (!newCustomerEmail && !newCustomerPhone) ||
      (newCustomerEmail !== null &&
        (newCustomerEmail.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerEmail))) ||
      rawPhone.length > 40 ||
      (newCustomerFirstName !== null && newCustomerFirstName.length > 100) ||
      (newCustomerLastName !== null && newCustomerLastName.length > 100) ||
      (newCustomerCity !== null && newCustomerCity.length > 120)
    ) {
      fail("invalid");
    }
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

  let leadId: string;
  try {
    const result = await createManualDossierHybrid({
      idempotencyKey,
      serviceName,
      customerId: intakeMode === "existing" ? customerId : null,
      vehicleId: intakeMode === "existing" ? vehicleId : null,
      newCustomerFullName,
      newCustomerFirstName,
      newCustomerLastName,
      newCustomerEmail,
      newCustomerPhone,
      newCustomerCity,
      basePrice,
      estimatedTime: estimatedTime.trim() || null,
      customerComment: customerComment.trim() || null,
      performanceDate,
      performanceTime,
    });
    leadId = result.leadId;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    fail("unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm/pipeline");
  redirect(`/crm-v2/pipeline?created=1&lead=${leadId}`);
}
