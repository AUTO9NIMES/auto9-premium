import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const migration = readMigration(
  "20260928013000_manual_intake_replay_ownership.sql",
);

const cases = [
  {
    historical: "011_manual_lead_intake.sql",
    functionName: "create_manual_lead",
    needle:
      "return jsonb_build_object('lead_id', v_existing_lead.id, 'no_op', true);",
    replacement: `if v_existing_lead.customer_id is distinct from p_customer_id
       or v_existing_lead.vehicle_id is distinct from p_vehicle_id then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key belongs to a different manual intake';
    end if;

    return jsonb_build_object('lead_id', v_existing_lead.id, 'no_op', true);`,
  },
  {
    historical: "012_manual_new_customer_intake.sql",
    functionName: "create_manual_lead_with_customer",
    needle:
      "return jsonb_build_object('lead_id', v_lead.id, 'customer_id', v_existing_customer.id, 'no_op', true);",
    replacement: `if v_lead.customer_id is distinct from v_existing_customer.id then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key has inconsistent customer ownership';
    end if;

    return jsonb_build_object('lead_id', v_lead.id, 'customer_id', v_existing_customer.id, 'no_op', true);`,
  },
] as const;

describe("manual intake replay ownership migration", () => {
  it.each(cases)(
    "preserves $functionName except for the two replay guards",
    ({ historical, functionName, needle, replacement }) => {
      const original = readMigration(historical);

      expect(original.split(needle)).toHaveLength(3);

      const patched = original.split(needle).join(replacement);
      const marker = `create or replace function public.${functionName}(`;
      const fragment = patched.slice(patched.indexOf(marker)).trim();

      expect(migration.split(marker)).toHaveLength(2);
      expect(migration).toContain(fragment);
      expect(fragment).toContain("security invoker");
      expect(fragment).toContain("grant execute on function");
      expect(fragment.split("Idempotency key")).toHaveLength(3);
    },
  );

  it("contains exactly two function definitions in a transaction", () => {
    expect(migration.trimStart().startsWith("begin;")).toBe(true);
    expect(migration.trimEnd().endsWith("commit;")).toBe(true);
    expect(
      migration.split("create or replace function public.").length - 1,
    ).toBe(2);
  });

  it("does not introduce retrospective date mutations", () => {
    expect(migration).not.toMatch(/\bset\s+created_at\s*=/i);
    expect(migration).not.toContain("p_created_at");
    expect(migration).not.toContain("update_v2_dossier_atomically");
  });
});
