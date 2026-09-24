import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("CRM customer management architecture", () => {
  const crm = read("app/lib/crm.ts");
  const actions = read("app/crm/clients/actions.ts");
  const page = read("app/crm/clients/page.tsx");
  const migration = read(
    "supabase/migrations/048_safe_customer_delete.sql",
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

// Source-level regression checks only; these do not prove database atomicity
// or concurrency safety. Those require separate database integration tests.
describe("CRM V2 customer management architecture", () => {
  const actions = read("app/crm-v2/clients/actions.ts");
  const deleteAction = actions.slice(actions.indexOf("export async function deleteV2Customer("));
  const page = read("app/crm-v2/clients/page.tsx");
  const detailPage = read("app/crm-v2/clients/[customerId]/page.tsx");

  it("imports and calls the canonical safe-delete domain helper", () => {
    expect(actions).toMatch(/import\s*\{[^}]*\bdeleteCustomerIfSafe\b[^}]*\}\s*from\s*"\.\.\/\.\.\/lib\/crm"/);
    expect(deleteAction).toContain("result = await deleteCustomerIfSafe(customerId)");
    expect(deleteAction.indexOf("await requireCrmAccess()")).toBeGreaterThan(-1);
    expect(deleteAction.indexOf("await requireCrmAccess()")).toBeLessThan(
      deleteAction.indexOf("await deleteCustomerIfSafe(customerId)"),
    );
    expect(actions).not.toContain("supabaseRest");
    expect(deleteAction).not.toContain("fetch(");
    expect(deleteAction).not.toContain(".delete(");
  });

  it.each(["customers", "vehicles", "customer_identifiers"])(
    "does not directly DELETE %s from the V2 action",
    (table) => {
      expect(deleteAction).not.toMatch(new RegExp(`["']${table}["']\\s*,\\s*["']DELETE["']`));
      expect(deleteAction).not.toMatch(new RegExp(`\\.from\\(\\s*["']${table}["']\\s*\\)\\s*\\.delete\\(`));
    },
  );

  it("does not reproduce protected-history checks in the V2 action", () => {
    for (const table of ["leads", "jobs", "appointments", "activity_log", "crm_subscriptions"]) {
      expect(deleteAction).not.toContain(`"${table}"`);
    }
  });

  it("requires the exact raw DELETE confirmation before calling the domain", () => {
    expect(deleteAction).toContain('const confirmation = formData.get("confirm")');
    const guard = deleteAction.indexOf('confirmation !== "DELETE"');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(deleteAction.indexOf("await deleteCustomerIfSafe(customerId)"));
    expect(deleteAction).toContain('redirect("/crm-v2/clients?error=invalid")');
  });

  it("validates the customer UUID before calling the domain", () => {
    expect(actions).toContain("/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i");
    const guard = deleteAction.indexOf("!UUID_REGEX.test(customerId)");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(deleteAction.indexOf("await deleteCustomerIfSafe(customerId)"));
  });

  it("keeps confirmation required inside the V2 delete form", () => {
    const form = page.match(/<form action=\{deleteV2Customer\}[\s\S]*?<\/form>/)?.[0];
    expect(form).toBeDefined();
    expect(form).toMatch(/<input\b[^>]*type="checkbox"[^>]*name="confirm"[^>]*value="DELETE"[^>]*\brequired\b/);
    expect(form).toContain("La suppression est définitive.");
    expect(form).toContain("historique métier ne peuvent pas être supprimés");
  });

  it.each([
    ["PROTECTED", "protected"],
    ["NOT_FOUND", "not_found"],
  ])("maps %s to its V2 error state", (result, error) => {
    expect(deleteAction).toContain(`if (result === "${result}") {\n    redirect("/crm-v2/clients?error=${error}");`);
    expect(page).toContain(`error === "${error}"`);
  });

  it("maps RPC failures and unexpected results to unavailable before success", () => {
    expect(deleteAction).toMatch(/catch\s*\{\s*redirect\("\/crm-v2\/clients\?error=unavailable"\)/);
    expect(deleteAction).toContain('if (result !== "DELETED") {\n    redirect("/crm-v2/clients?error=unavailable");');
    expect(deleteAction.indexOf('result !== "DELETED"')).toBeLessThan(deleteAction.indexOf('revalidatePath("/crm-v2")'));
    expect(deleteAction).toContain('revalidatePath("/crm-v2/clients")');
    expect(deleteAction).toContain('redirect("/crm-v2/clients?deleted=1")');
    expect(page).toContain('error === "invalid"');
    expect(page).toContain("L'action n'a pas pu être effectuée.");
  });

  it.each([
    ["list", page, "CrmV2Clients", "getCustomersList"],
    ["detail", detailPage, "CustomerV2Page", "getCustomer360"],
  ])("authorizes the V2 %s page before its customer read", (_label, source, component, reader) => {
    expect(source).toMatch(/import\s*\{\s*requireCrmAccess\s*\}\s*from\s*"(?:\.\.\/)+lib\/auth\/dal"/);
    const body = source.slice(source.indexOf(`export default async function ${component}(`));
    const auth = body.indexOf("await requireCrmAccess()");
    const read = body.indexOf(`await ${reader}(`);
    expect(auth).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(auth);
  });

  it("pins the canonical safe customer delete migration to the production-certified SQL bytes", () => {
    const bytes = fs.readFileSync(path.join(root, "supabase/migrations/048_safe_customer_delete.sql"));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "4abbbd1db6226b9ec956597a90b123fa7f2419197b34e9efa90b7a9f7159e384",
    );
    const sql = bytes.toString("utf8");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = pg_catalog, public");
    expect(sql).toContain("where c.business_id = p_business_id");
    expect(sql).toContain("and c.id = p_customer_id");
    for (const result of ["NOT_FOUND", "PROTECTED", "DELETED"]) {
      expect(sql).toContain(`return '${result}';`);
    }
  });
});
