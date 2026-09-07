import {
  resolveCurrentBusinessId,
  resolveCurrentBusinessSlug,
  resolveCurrentBusinessContext,
  resolveBusinessBySlug,
  hasBusinessTenantConfig,
  type CurrentBusinessContext,
  type TenantBusiness,
} from "./business";

export {
  resolveCurrentBusinessId,
  resolveCurrentBusinessSlug,
  resolveCurrentBusinessContext,
  resolveBusinessBySlug,
  hasBusinessTenantConfig,
  type CurrentBusinessContext,
  type TenantBusiness,
};

export function getCurrentTenantContext(): { businessId: string | null; businessSlug: string | null } {
  const businessId = resolveCurrentBusinessId();
  const businessSlug = resolveCurrentBusinessSlug();

  return {
    businessId,
    businessSlug,
  };
}
