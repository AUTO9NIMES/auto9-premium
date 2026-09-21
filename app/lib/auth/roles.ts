export const crmMembershipRoles = ["member", "owner", "operator"] as const;

export type CrmMembershipRole = (typeof crmMembershipRoles)[number];

export function isCrmMembershipRole(value: unknown): value is CrmMembershipRole {
  return (
    typeof value === "string" &&
    crmMembershipRoles.includes(value as CrmMembershipRole)
  );
}

export function canAccessAutomation(role: CrmMembershipRole): boolean {
  return role === "member" || role === "owner";
}
