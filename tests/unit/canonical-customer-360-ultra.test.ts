import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("canonical Customer 360 birthday contract", () => {
  const actions = read("app/crm/clients/[customerId]/actions.ts");
  const crm = read("app/lib/crm.ts");
  const migration = read("supabase/migrations/20260922000100_customer_profile_birth_date.sql");

  it("passes birthday through the canonical profile RPC", () => {
    expect(actions).toContain("birthDate: normalizedBirthDate");
    expect(crm).toContain("birthDate?: string | null");
    expect(crm).toContain("p_birth_date: input.birthDate ?? null");
  });

  it("does not perform a second direct customer PATCH for birthday", () => {
    expect(actions).not.toContain('supabaseRest(\n      "customers",\n      "PATCH"');
    expect(actions).not.toContain("{ birth_date: normalizedBirthDate");
  });

  it("extends the RPC with birth_date and records it as a changed field", () => {
    expect(migration).toContain("p_birth_date date default null");
    expect(migration).toContain("v_customer.birth_date is distinct from v_birth_date");
    expect(migration).toContain("array_append(v_changed_fields, 'birth_date')");
    expect(migration).toContain("birth_date = v_birth_date");
  });

  it("keeps the customer row locked inside the same RPC transaction", () => {
    const lock = migration.indexOf("for update;");
    const update = migration.indexOf("update public.customers");
    expect(lock).toBeGreaterThan(-1);
    expect(update).toBeGreaterThan(lock);
  });

  it("keeps the expanded RPC service-role only", () => {
    expect(migration).toContain("revoke all on function public.update_customer_profile");
    expect(migration).toContain("from authenticated");
    expect(migration).toContain("grant execute on function public.update_customer_profile");
    expect(migration).toContain("to service_role");
  });
});

describe("canonical Customer 360 vehicle photo contract", () => {
  const actions = read("app/crm/clients/[customerId]/actions.ts");
  const storage = read("app/lib/crm-storage.ts");

  it("requires CRM access and verifies tenant/customer vehicle ownership before upload", () => {
    expect(actions).toContain("await requireCrmAccess()");
    expect(actions).toContain('"vehicles",');
    expect(actions).toContain("business_id=eq.");
    expect(actions).toContain("vehicle.customer_id !== normalizedCustomerId");
    expect(actions).toContain("uploadVehiclePhoto");
  });

  it("limits vehicle photos to supported image types and 8 MiB", () => {
    expect(storage).toContain('"image/jpeg": "jpg"');
    expect(storage).toContain('"image/png": "png"');
    expect(storage).toContain('"image/webp": "webp"');
    expect(storage).toContain("8 * 1024 * 1024");
  });

  it("stores photos under tenant and vehicle scoped paths", () => {
    expect(storage).toContain("input.businessId");
    expect(storage).toContain("input.vehicleId");
  });

  it("uses signed URLs for private vehicle photos", () => {
    expect(storage).toContain("/storage/v1/object/sign/");
    expect(storage).toContain("createVehiclePhotoSignedUrl");
  });
});
