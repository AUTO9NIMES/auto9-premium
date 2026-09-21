import "server-only";

import { resolveCurrentBusinessContext } from "../business";
import { createAuthServerClient } from "./server";
import { getAuthConfig } from "./config";
import {
  isCrmMembershipRole,
  type CrmMembershipRole,
} from "./roles";

const AUTO9_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

export type CrmAccess = Readonly<{
  userId: string;
  businessId: string;
  role: CrmMembershipRole;
}>;

export class CrmAccessError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "UNAVAILABLE",
  ) {
    super("CRM access denied.");
    this.name = "CrmAccessError";
  }
}

/**
 * Call immediately before every CRM UI data operation.
 * No caller-supplied user ID, business ID or role is trusted.
 * Never replace existing service-to-service API authentication with this.
 * No cross-request caching: membership revocations apply on the next check.
 */
export async function requireCrmAccess(): Promise<CrmAccess> {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || data.user.is_anonymous) {
    throw new CrmAccessError("UNAUTHENTICATED");
  }

  let businessId: string;

  try {
    const business = await resolveCurrentBusinessContext();
    businessId = business.businessId;
  } catch {
    throw new CrmAccessError("UNAVAILABLE");
  }

  if (businessId !== AUTO9_BUSINESS_ID) {
    throw new CrmAccessError("FORBIDDEN");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new CrmAccessError("UNAVAILABLE");
  }

  const { url } = getAuthConfig();
  const endpoint = new URL("/rest/v1/business_memberships", url);

  endpoint.search = new URLSearchParams({
    select: "user_id,business_id,role",
    user_id: "eq." + data.user.id,
    business_id: "eq." + businessId,
    limit: "2",
  }).toString();

  let rows: unknown;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error("Membership lookup failed.");
    }

    rows = await response.json();
  } catch {
    // Do not expose database responses, credentials or tokens.
    throw new CrmAccessError("UNAVAILABLE");
  }

  if (!Array.isArray(rows)) {
    throw new CrmAccessError("UNAVAILABLE");
  }

  if (rows.length !== 1) {
    throw new CrmAccessError("FORBIDDEN");
  }

  const membership: unknown = rows[0];

  if (
    typeof membership !== "object" ||
    membership === null ||
    !("user_id" in membership) ||
    !("business_id" in membership) ||
    !("role" in membership) ||
    membership.user_id !== data.user.id ||
    membership.business_id !== AUTO9_BUSINESS_ID ||
    !isCrmMembershipRole(membership.role)
  ) {
    throw new CrmAccessError("FORBIDDEN");
  }

  return {
    userId: data.user.id,
    businessId,
    role: membership.role,
  };
}
