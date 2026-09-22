import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("canonical CRM subscriptions", () => {
  const actions = read("app/crm/subscriptions/actions.ts");
  const page = read("app/crm/subscriptions/page.tsx");
  const layout = read("app/crm/layout.tsx");

  it("uses only canonical CRM routes", () => {
    expect(actions).not.toContain("/crm-v2/");
    expect(page).not.toContain("/crm-v2/");

    expect(actions).toContain(
      'revalidatePath("/crm/subscriptions")',
    );
    expect(page).toContain('href="/crm/calendar"');
  });

  it("exposes subscriptions in canonical CRM navigation", () => {
    expect(layout).toContain(
      '{ href: "/crm/subscriptions", label: "Abonnements" },',
    );
  });

  it("requires CRM access for every subscription mutation", () => {
    const accessChecks =
      actions.match(/await requireCrmAccess\(\);/g) ?? [];

    expect(accessChecks).toHaveLength(3);
  });

  it("validates subscription ids before mutation", () => {
    const uuidMutationGuards =
      actions.match(/UUID_REGEX\.test\(id\)/g) ?? [];

    expect(uuidMutationGuards).toHaveLength(2);
  });

  it("keeps subscription writes tenant scoped", () => {
    expect(actions).toContain(
      "`business_id=eq.${businessId}&id=eq.${id}&select=*`",
    );

    const tenantScopedPatches =
      actions.match(
        /business_id=eq\.\$\{businessId\}&id=eq\.\$\{id\}&select=\*/g,
      ) ?? [];

    expect(tenantScopedPatches).toHaveLength(2);
  });

  it("validates customer ownership before subscription creation", () => {
    expect(actions).toContain(
      "`business_id=eq.${businessId}&id=eq.${customerId}&select=id&limit=1`",
    );
    expect(actions).toContain(
      "if (!customer || customer.id !== customerId)",
    );
  });

  it("uses the reconciled subscription table without introducing schema work", () => {
    expect(actions).toContain('"crm_subscriptions"');
  });
});
