import { describe, expect, it } from "vitest";

import {
  canAccessAutomation,
  isCrmMembershipRole,
} from "../../app/lib/auth/roles";

describe("CRM membership roles", () => {
  it.each(["member", "owner", "operator"])(
    "accepts supported role %s",
    (role) => {
      expect(isCrmMembershipRole(role)).toBe(true);
    },
  );

  it.each(["admin", "viewer", "", null, undefined, 1])(
    "rejects unsupported role %s",
    (role) => {
      expect(isCrmMembershipRole(role)).toBe(false);
    },
  );

  it("keeps legacy member access to automation during migration", () => {
    expect(canAccessAutomation("member")).toBe(true);
  });

  it("allows owners to access automation", () => {
    expect(canAccessAutomation("owner")).toBe(true);
  });

  it("denies operators access to automation", () => {
    expect(canAccessAutomation("operator")).toBe(false);
  });
});
