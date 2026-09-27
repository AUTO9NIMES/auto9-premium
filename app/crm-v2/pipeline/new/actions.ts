"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../../lib/business";
import { supabaseRest } from "../../../lib/supabase";
import {
  createManualLead,
  createManualLeadWithCustomer,
  findCustomerByEmailOrPhone,
  findManualLeadWithCustomerReplay,
  upsertCustomer,
  type ManualLeadResult,
} from "../../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm-v2/pipeline/new?error=${error}`);
}

function parisLocalDateTimeToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const probe = new Date(localAsUtc);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(probe);
  const zone = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0";
  const zoneMatch = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(zone);
  const offsetMinutes = zoneMatch
    ? (zoneMatch[1] === "+" ? 1 : -1) *
      (Number(zoneMatch[2]) * 60 + Number(zoneMatch[3] || 0))
    : 0;

  return new Date(localAsUtc - offsetMinutes * 60_000).toISOString();
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
    let replay: ManualLeadResult | null = null;
    try {
      replay = await findManualLeadWithCustomerReplay(idempotencyKey.trim());
    } catch {
      fail("unavailable");
    }
    if (replay) {
      revalidatePath("/crm-v2/pipeline");
      redirect("/crm-v2/pipeline?created=1&lead=" + replay.leadId);
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
  const performanceDate = formData.get("performanceDate");

  if (
    typeof serviceName !== "string" ||
    typeof basePriceValue !== "string" ||
    typeof estimatedTime !== "string" ||
    typeof customerComment !== "string" ||
    typeof performanceDate !== "string"
  ) {
    fail("invalid");
  }

  const normalizedServiceName = serviceName.trim();
  const normalizedPrice = basePriceValue.trim() ? Number(basePriceValue) : null;
  const normalizedVehicleId =
    typeof vehicleId === "string" && vehicleId.trim() ? vehicleId.trim() : null;
  const performanceDateIso = parisLocalDateTimeToIso(performanceDate.trim());

  if (
    !normalizedServiceName ||
    normalizedServiceName.length > 200 ||
    (normalizedPrice !== null &&
      (!Number.isFinite(normalizedPrice) || normalizedPrice < 0 || normalizedPrice > 10000000)) ||
    (normalizedVehicleId !== null && !UUID_REGEX.test(normalizedVehicleId)) ||
    !performanceDateIso
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

      const existingRows = await findCustomerByEmailOrPhone(
        normalizedEmail,
        normalizedPhone,
      );
      const existingCustomer = Array.isArray(existingRows) ? existingRows[0] : null;

      if (existingCustomer?.id) {
        result = await createManualLead({
          idempotencyKey: idempotencyKey.trim(),
          customerId: existingCustomer.id,
          vehicleId: null,
          serviceName: normalizedServiceName,
          basePrice: normalizedPrice,
          estimatedTime: estimatedTime.trim() || null,
          customerComment: customerComment.trim() || null,
        });
      } else {
        try {
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
        } catch {
          const customer = await upsertCustomer({
            business_id: "",
            full_name: normalizedFullName,
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
            email: normalizedEmail,
            phone: normalizedPhone,
            city: normalizedCity,
            source: "crm_manual",
          });

          if (!customer?.id) {
            fail("unavailable");
          }

          result = await createManualLead({
            idempotencyKey: idempotencyKey.trim(),
            customerId: customer.id,
            vehicleId: null,
            serviceName: normalizedServiceName,
            basePrice: normalizedPrice,
            estimatedTime: estimatedTime.trim() || null,
            customerComment: customerComment.trim() || null,
          });
        }
      }
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

  try {
    const { businessId } = await resolveCurrentBusinessContext();
    await supabaseRest(
      "leads",
      "PATCH",
      {
        created_at: performanceDateIso,
        updated_at: new Date().toISOString(),
      },
      `business_id=eq.${businessId}&id=eq.${result.leadId}`,
    );

    await supabaseRest(
      "activity_log",
      "POST",
      {
        business_id: businessId,
        lead_id: result.leadId,
        event_type: "crm_v2.dossier.date_adjusted",
        event_data: {
          source: "crm_v2_new_dossier",
          new_created_at: performanceDateIso,
        },
      },
      "select=id",
    );
  } catch {
    fail("unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm/pipeline");
  redirect(`/crm-v2/pipeline?created=1&lead=${result.leadId}`);
}
