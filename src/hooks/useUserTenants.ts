import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserTenant {
  tenant_id: string;
  role: string;
  slug: string;
  name: string;
  domain: string | null;
  domain_status: string | null;
  primary_color: string | null;
}

/**
 * Returns all tenants the current user is an active member of,
 * joined with basic tenant + branding metadata.
 */
export function useUserTenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<UserTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setTenants([]); setLoading(false); return; }
    let mounted = true;

    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("tenant_members")
        .select(`
          tenant_id, role,
          tenants!inner ( id, slug, name, domain, domain_status, status,
            tenant_branding ( primary_color )
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!mounted) return;
      if (error) { setError(error.message); setTenants([]); setLoading(false); return; }

      const rows: UserTenant[] = (data ?? [])
        .filter((r: any) => r.tenants?.status === "active")
        .map((r: any) => ({
          tenant_id: r.tenant_id,
          role: r.role,
          slug: r.tenants.slug,
          name: r.tenants.name,
          domain: r.tenants.domain ?? null,
          domain_status: r.tenants.domain_status ?? null,
          primary_color: r.tenants.tenant_branding?.[0]?.primary_color ?? null,
        }));

      setTenants(rows);
      setError(null);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [user]);

  return { tenants, loading, error };
}

const STORAGE_KEY = "activeTenantSlug";
export const getActiveTenantSlug = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
export const setActiveTenantSlug = (slug: string | null) => {
  if (typeof window === "undefined") return;
  if (slug) localStorage.setItem(STORAGE_KEY, slug);
  else localStorage.removeItem(STORAGE_KEY);
};
