import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCrmAccess: vi.fn(),
  resolveCurrentBusinessContext: vi.fn(),
  supabaseRest: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`redirect:${location}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: mocks.requireCrmAccess }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: mocks.resolveCurrentBusinessContext }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: mocks.supabaseRest }));

import { createSubscription } from "../../app/crm-v2/subscriptions/actions";

const root = process.cwd();
const migrationPath = "supabase/migrations/042_crm_tenant_storage_hardening.sql";
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const hash = (file: string) => createHash("sha256")
  .update(fs.readFileSync(path.join(root, file))).digest("hex");

// These inspect migration structure and execute a mocked server action.
// They do not apply SQL or establish the state of any live database.
describe("CRM tenant/storage migration architecture", () => {
  const sql = read(migrationPath).replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();

  it("provides migration 042 as one transaction", () => {
    expect(fs.existsSync(path.join(root, migrationPath))).toBe(true);
    expect(sql).toMatch(/^begin;.*commit;$/);
  });

  it("enforces subscription customer ownership with a composite FK", () => {
    expect(sql).toMatch(/alter table public\.crm_subscriptions add constraint fk_crm_subscriptions_customer_tenant foreign key\s*\(\s*business_id\s*,\s*customer_id\s*\) references public\.customers\s*\(\s*business_id\s*,\s*id\s*\) on delete cascade;/);
  });

  it("establishes the unique subscription identity before the booking reference", () => {
    const key = sql.match(/alter table public\.crm_subscriptions add constraint uq_crm_subscriptions_business_customer_id unique\s*\(\s*business_id\s*,\s*customer_id\s*,\s*id\s*\);/);
    expect(key).not.toBeNull();
    expect(key!.index).toBeLessThan(sql.indexOf("add constraint fk_crm_booking_requests_subscription_identity"));
  });

  it("binds booking requests to the exact business/customer/subscription tuple", () => {
    expect(sql).toMatch(/alter table public\.crm_subscription_booking_requests add constraint fk_crm_booking_requests_subscription_identity foreign key\s*\(\s*business_id\s*,\s*customer_id\s*,\s*subscription_id\s*\) references public\.crm_subscriptions\s*\(\s*business_id\s*,\s*customer_id\s*,\s*id\s*\) on delete cascade;/);
    expect(sql.match(/foreign key/gi)).toHaveLength(2);
    expect(sql).not.toMatch(/not valid|disable trigger|disable row level security|drop policy|grant /i);
  });

  it("locks all affected identity tables before fail-closed preflight and DDL", () => {
    const lock = sql.match(/lock table public\.customers\s*,\s*public\.crm_subscriptions\s*,\s*public\.crm_subscription_booking_requests in share row exclusive mode;/);
    const preflight = sql.match(/do \$preflight\$.*?\$preflight\$;/);
    expect(lock).not.toBeNull();
    expect(preflight).not.toBeNull();
    expect(lock!.index).toBeLessThan(preflight!.index!);
    expect(preflight!.index! + preflight![0].length).toBeLessThan(sql.indexOf("alter table"));
    expect(preflight![0].match(/if exists\s*\(/g)).toHaveLength(2);
    expect(preflight![0].match(/raise exception/g)).toHaveLength(2);
    expect(preflight![0].match(/errcode = '23514'/g)).toHaveLength(2);
    expect(preflight![0]).toMatch(/left join public\.customers c on c\.id = s\.customer_id where c\.id is null or s\.business_id is distinct from c\.business_id/);
    expect(preflight![0]).toMatch(/left join public\.crm_subscriptions s on s\.id = br\.subscription_id/);
    expect(preflight![0]).toContain("s.id is null");
    expect(preflight![0]).toContain("br.business_id is distinct from s.business_id");
    expect(preflight![0]).toContain("br.customer_id is distinct from s.customer_id");
    expect(preflight![0]).toContain("br.business_id is distinct from c.business_id");
    expect(preflight![0]).not.toMatch(/full_name|email|phone|raise notice|exception when/i);
  });

  it("does not repair, delete, or reassign historical business rows", () => {
    expect(sql).not.toMatch(/\b(?:delete\s+from|update|insert\s+into)\s+(?:public\.)?(?:customers|crm_subscriptions|crm_subscription_booking_requests)\b/i);
    expect(sql).not.toMatch(/\btruncate\b|\bdrop\s+(?:table|constraint)\b/i);
    expect(sql).not.toMatch(/\bset\s+(?:business_id|customer_id|subscription_id)\s*=/i);
  });

  it("only forces the existing photo bucket private and fails if it is missing", () => {
    const updates = sql.match(/\bupdate\s+[^;]+;/gi);
    expect(updates).toHaveLength(1);
    expect(updates![0]).toMatch(/^update storage\.buckets set public = false where id = 'crm-vehicle-photos';$/);
    expect(sql).toMatch(/if not found then raise exception '042 privacy: expected crm-vehicle-photos bucket is missing';/);
    expect(sql).not.toMatch(/public\s*=\s*true|insert into storage\.|delete from storage\.|storage\.objects|file_size_limit\s*=|allowed_mime_types\s*=/i);
  });

  it.each([
    ["040_crm_v2_customer_enrichment.sql", "dfcd23200f48eea605d879daffec437e41ec8843fe911eeaaed4dce4d6d7297b"],
    ["041_crm_v2_calendar_event_pipeline_link.sql", "756527e5996d10176ca9c5ea28aa8980b3152adcb255ff9d006c1353e7e631ea"],
    ["048_safe_customer_delete.sql", "4abbbd1db6226b9ec956597a90b123fa7f2419197b34e9efa90b7a9f7159e384"],
  ])("preserves the historical bytes of %s", (file, expected) => {
    expect(hash(`supabase/migrations/${file}`)).toBe(expected);
  });
});

describe("createSubscription tenant guard", () => {
  const businessId = "00000000-0000-0000-0000-000000000001";
  const customerId = "11111111-1111-4111-8111-111111111111";

  function form() {
    const data = new FormData();
    data.set("customerId", customerId);
    data.set("serviceName", "Entretien");
    data.set("price", "49,90");
    data.set("frequencyMonths", "2");
    data.set("nextDueOn", "2026-10-01");
    data.set("notes", "Suivi");
    return data;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.redirect.mockImplementation((location: string): never => { throw new Error(`redirect:${location}`); });
    mocks.requireCrmAccess.mockResolvedValue({ businessId });
    mocks.resolveCurrentBusinessContext.mockResolvedValue({ businessId });
    mocks.supabaseRest.mockResolvedValueOnce([{ id: customerId }]).mockResolvedValue({ id: "subscription-id" });
  });

  it("authorizes and looks up the current tenant's customer before POSTing", async () => {
    await expect(createSubscription(form())).rejects.toThrow("redirect:/crm-v2/subscriptions?created=1");
    expect(mocks.requireCrmAccess).toHaveBeenCalledOnce();
    expect(mocks.resolveCurrentBusinessContext).toHaveBeenCalledOnce();
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(2);
    expect(mocks.supabaseRest).toHaveBeenNthCalledWith(1, "customers", "GET", null,
      `business_id=eq.${businessId}&id=eq.${customerId}&select=id&limit=1`);
    expect(mocks.supabaseRest).toHaveBeenNthCalledWith(2, "crm_subscriptions", "POST", {
      business_id: businessId, customer_id: customerId, service_name: "Entretien",
      price: 49.9, frequency_months: 2, next_due_on: "2026-10-01", active: true, notes: "Suivi",
    }, "select=*");
    expect(mocks.requireCrmAccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.supabaseRest.mock.invocationCallOrder[0]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/crm-v2/subscriptions");
  });

  it("ignores a forged business_id and never reads tenant identity from FormData", async () => {
    const data = form();
    data.set("business_id", "22222222-2222-4222-8222-222222222222");
    const get = vi.spyOn(data, "get");
    await expect(createSubscription(data)).rejects.toThrow("?created=1");
    expect(get).not.toHaveBeenCalledWith("business_id");
    expect(mocks.supabaseRest.mock.calls[0][3]).toContain(`business_id=eq.${businessId}`);
    expect(mocks.supabaseRest.mock.calls[1][2].business_id).toBe(businessId);
  });

  it("accepts uppercase UUID input when the database returns its lowercase identity", async () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const data = form();
    data.set("customerId", id.toUpperCase());
    mocks.supabaseRest.mockReset().mockResolvedValueOnce([{ id }]).mockResolvedValue({ id: "subscription-id" });
    await expect(createSubscription(data)).rejects.toThrow("?created=1");
    expect(mocks.supabaseRest.mock.calls[0][3]).toContain(`&id=eq.${id}&`);
    expect(mocks.supabaseRest.mock.calls[1][2].customer_id).toBe(id);
  });

  it.each(["absent", "foreign-tenant"])("rejects an %s customer without swallowing the invalid redirect", async () => {
    // Both are deliberately indistinguishable in a tenant-filtered lookup.
    mocks.supabaseRest.mockReset().mockResolvedValue([]);
    await expect(createSubscription(form())).rejects.toThrow("redirect:/crm-v2/subscriptions?new=1&error=invalid");
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a customer lookup failure to storage without inserting", async () => {
    mocks.supabaseRest.mockReset().mockRejectedValue(new Error("backend failed"));
    await expect(createSubscription(form())).rejects.toThrow("?new=1&error=storage");
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([null, { id: customerId }])("fails closed on an unavailable or malformed lookup response: %j", async (response) => {
    mocks.supabaseRest.mockReset().mockResolvedValue(response);
    await expect(createSubscription(form())).rejects.toThrow("?new=1&error=storage");
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
  });

  it("preserves the storage redirect when subscription insertion fails", async () => {
    mocks.supabaseRest.mockReset().mockResolvedValueOnce([{ id: customerId }]).mockRejectedValueOnce(new Error("FK rejected"));
    await expect(createSubscription(form())).rejects.toThrow("?new=1&error=storage");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("performs no lookup or insert when CRM access is denied", async () => {
    mocks.requireCrmAccess.mockRejectedValue(new Error("access denied"));
    await expect(createSubscription(form())).rejects.toThrow("access denied");
    expect(mocks.resolveCurrentBusinessContext).not.toHaveBeenCalled();
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it.each([
    ["customerId", ""], ["customerId", "not-a-uuid"],
    ["customerId", `${customerId}&business_id=eq.other`],
    ["serviceName", ""], ["nextDueOn", "invalid"],
    ["frequencyMonths", "0"], ["frequencyMonths", "1.5"],
  ])("rejects invalid %s=%s before persistence", async (key, value) => {
    const data = form();
    data.set(key, value);
    await expect(createSubscription(data)).rejects.toThrow("?new=1&error=invalid");
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });
});
