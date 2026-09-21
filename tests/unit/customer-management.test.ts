import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("CRM customer management architecture", () => {
  const crm = read("app/lib/crm.ts");
  const actions = read("app/crm/clients/actions.ts");
  const page = read("app/crm/clients/page.tsx");
  const migration = read(
    "supabase/migrations/038_safe_customer_delete.sql",
  );

  it("keeps customer creation tenant-scoped on the server", () => {
    expect(crm).toContain(
      'export type UpsertCustomerInput = Omit<Customer, "business_id">',
    );
    expect(crm).toContain("const businessId = await getCurrentBusinessId()");
    expect(crm).toContain("business_id: businessId");

    expect(actions).toContain('source: "crm_manual"');
    expect(actions).not.toContain('business_id: ""');
  });

  it("requires explicit delete confirmation in UI and server action", () => {
    expect(page).toContain('name="confirm"');
    expect(page).toContain('value="DELETE"');
    expect(page).toContain("required");

    expect(actions).toContain(
      'const confirmation = value(formData, "confirm")',
    );
    expect(actions).toContain('confirmation !== "DELETE"');
  });

  it("uses only the tenant-scoped safe-delete RPC", () => {
    expect(crm).toContain('"rpc/delete_customer_if_safe"');
    expect(crm).toContain("p_business_id: businessId");
    expect(crm).toContain("p_customer_id: normalizedCustomerId");

    expect(actions).toContain("deleteCustomerIfSafe(customerId)");
  });

  it("locks the customer before evaluating protected history", () => {
    const lockIndex = migration.indexOf("for update;");
    const leadsIndex = migration.indexOf("from public.leads");
    const deleteIndex = migration.indexOf("delete from public.customers");

    expect(lockIndex).toBeGreaterThan(-1);
    expect(leadsIndex).toBeGreaterThan(lockIndex);
    expect(deleteIndex).toBeGreaterThan(leadsIndex);
  });

  it("protects every required business-history table", () => {
    for (const table of [
      "public.leads",
      "public.jobs",
      "public.appointments",
      "public.activity_log",
      "public.crm_subscriptions",
    ]) {
      expect(migration).toContain(`from ${table}`);
    }
  });

  it("only removes disposable records before the customer", () => {
    const identifiers = migration.indexOf(
      "delete from public.customer_identifiers",
    );
    const vehicles = migration.indexOf("delete from public.vehicles");
    const customer = migration.indexOf("delete from public.customers");

    expect(identifiers).toBeGreaterThan(-1);
    expect(vehicles).toBeGreaterThan(identifiers);
    expect(customer).toBeGreaterThan(vehicles);
  });

  it("does not expose the deletion RPC to normal database roles", () => {
    expect(migration).toContain(
      "revoke all on function public.delete_customer_if_safe(uuid, uuid) from public;",
    );
    expect(migration).toContain(
      "revoke all on function public.delete_customer_if_safe(uuid, uuid) from anon;",
    );
    expect(migration).toContain(
      "revoke all on function public.delete_customer_if_safe(uuid, uuid) from authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.delete_customer_if_safe(uuid, uuid) to service_role;",
    );
  });

  it("does not silently cascade protected subscription history", () => {
    const subscriptionCheck = migration.indexOf(
      "from public.crm_subscriptions",
    );
    const customerDelete = migration.indexOf(
      "delete from public.customers",
    );

    expect(subscriptionCheck).toBeGreaterThan(-1);
    expect(customerDelete).toBeGreaterThan(subscriptionCheck);
  });
});
