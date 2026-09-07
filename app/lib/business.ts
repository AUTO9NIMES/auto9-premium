import { hasSupabaseWriteConfig, supabaseRest } from "./supabase";

export type TenantBusiness = {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
};

export type CurrentBusinessContext = {
  businessId: string;
  slug: string;
};

export function resolveCurrentBusinessSlug(): string | null {
  const configuredSlug =
    process.env.AUTO9_BUSINESS_SLUG || process.env.DEFAULT_BUSINESS_SLUG || "auto9";

  if (!configuredSlug || !configuredSlug.trim()) {
    return null;
  }

  return configuredSlug.trim().toLowerCase();
}

export function resolveCurrentBusinessId(): string | null {
  const configuredId = process.env.AUTO9_BUSINESS_ID || process.env.DEFAULT_BUSINESS_ID;

  if (configuredId && configuredId.trim()) {
    return configuredId.trim();
  }

  return null;
}

export async function resolveBusinessBySlug(slug: string): Promise<TenantBusiness | null> {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const query = `slug=eq.${encodeURIComponent(slug)}&select=id,name,slug`;
  const rows = (await supabaseRest<TenantBusiness[]>("businesses", "GET", null, query)) as TenantBusiness[] | null;

  if (!rows || rows.length === 0) {
    return null;
  }

  return rows[0];
}

export async function resolveCurrentBusinessContext(): Promise<CurrentBusinessContext> {
  const configuredBusinessId = resolveCurrentBusinessId();
  const configuredSlug = resolveCurrentBusinessSlug();

  if (!configuredBusinessId && !configuredSlug) {
    throw new Error("No valid business tenant configuration could be resolved.");
  }

  if (configuredBusinessId && configuredBusinessId.trim()) {
    if (configuredSlug && configuredSlug.trim()) {
      const resolvedBusiness = await resolveBusinessBySlug(configuredSlug);
      if (resolvedBusiness && resolvedBusiness.id) {
        return {
          businessId: resolvedBusiness.id,
          slug: resolvedBusiness.slug,
        };
      }
    }

    return {
      businessId: configuredBusinessId.trim(),
      slug: configuredSlug || "auto9",
    };
  }

  const resolvedBusiness = await resolveBusinessBySlug(configuredSlug || "auto9");

  if (!resolvedBusiness || !resolvedBusiness.id) {
    throw new Error(`Unable to resolve business tenant for slug: ${configuredSlug || "auto9"}`);
  }

  return {
    businessId: resolvedBusiness.id,
    slug: resolvedBusiness.slug,
  };
}

export function hasBusinessTenantConfig(): boolean {
  return Boolean(resolveCurrentBusinessId() || resolveCurrentBusinessSlug());
}
