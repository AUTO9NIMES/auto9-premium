import { NextResponse } from "next/server";
import { requireCrmAccess } from "../../../../../lib/auth/dal";
import {
  hasSupabaseWriteConfig,
  supabaseRest,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "../../../../../lib/supabase";

export const runtime = "nodejs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function extension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ vehicleId?: string }> },
) {
  if (!hasSupabaseWriteConfig()) {
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  const access = await requireCrmAccess();
  const { vehicleId } = await context.params;
  const id = vehicleId?.trim();

  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "invalid_vehicle" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const customerId = String(form.get("customerId") || "").trim();

  if (!(file instanceof File) || !UUID_REGEX.test(customerId)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const rows = await supabaseRest<Array<{ id: string }>>(
    "vehicles",
    "GET",
    null,
    `business_id=eq.${access.businessId}&customer_id=eq.${customerId}&id=eq.${id}&select=id&limit=1`,
  );

  if (!((rows as Array<{ id: string }> | null)?.length)) {
    return NextResponse.json({ error: "vehicle_not_found" }, { status: 404 });
  }

  const storagePath = `${access.businessId}/${customerId}/${id}/${crypto.randomUUID()}.${extension(file.type)}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/crm-vehicle-photos/${storagePath}`;

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!upload.ok) {
    return NextResponse.json({ error: "upload_failed" }, { status: 502 });
  }

  const photoUrl = `${supabaseUrl}/storage/v1/object/public/crm-vehicle-photos/${storagePath}`;

  await supabaseRest(
    "vehicles",
    "PATCH",
    { photo_url: photoUrl, updated_at: new Date().toISOString() },
    `business_id=eq.${access.businessId}&customer_id=eq.${customerId}&id=eq.${id}`,
  );

  return NextResponse.json({ photoUrl });
}
