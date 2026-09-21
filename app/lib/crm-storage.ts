import "server-only";

import {
  hasSupabaseWriteConfig,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./supabase";

const BUCKET = "crm-vehicle-photos";

function storageHeaders(contentType?: string) {
  const headers = new Headers({
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  });
  if (contentType) headers.set("Content-Type", contentType);
  return headers;
}

export async function uploadVehiclePhoto(input: {
  businessId: string;
  vehicleId: string;
  file: File;
}) {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase storage is not configured.");
  }

  const allowed: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const ext = allowed[input.file.type];
  if (!ext) {
    throw new Error("Unsupported image type.");
  }

  if (input.file.size <= 0 || input.file.size > 8 * 1024 * 1024) {
    throw new Error("Image size is invalid.");
  }

  const objectPath = `${input.businessId}/${input.vehicleId}/${crypto.randomUUID()}.${ext}`;
  const body = new Uint8Array(await input.file.arrayBuffer());

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: storageHeaders(input.file.type),
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Vehicle photo upload failed: ${response.status}`);
  }

  return objectPath;
}

export async function createVehiclePhotoSignedUrl(
  objectPath?: string | null,
  expiresIn = 60 * 60,
) {
  if (!objectPath || !hasSupabaseWriteConfig()) return null;

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: storageHeaders("application/json"),
      body: JSON.stringify({ expiresIn }),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as { signedURL?: string };
  if (!data.signedURL) return null;

  return `${supabaseUrl}/storage/v1${data.signedURL}`;
}
