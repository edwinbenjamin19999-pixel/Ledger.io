import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { applyTenantBrandTokens, fetchTenantByDomain, fetchTenantBySlug, resolveTenantSlugFromHost, ResolvedTenant } from "@/lib/tenant/resolveTenant";
import { applyDefaultTheme } from "@/lib/tenant/tenantTheme";
import { getActiveTenantSlug } from "@/hooks/useUserTenants";

interface TenantContextValue {
  tenant: ResolvedTenant | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue>({ tenant: null, loading: false, error: null });

export const useTenant = () => useContext(TenantContext);

const isStandardHost = (host: string) =>
  host === "cogniq.se" || host === "localhost" ||
  host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") ||
  host === "app.cogniq.se" || host === "www.cogniq.se";

export const TenantProvider = ({ slug: explicitSlug, children }: { slug?: string; children: ReactNode }) => {
  const [tenant, setTenant] = useState<ResolvedTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
      let resolved: ResolvedTenant | null = null;

      // 1. Custom verified domain (e.g. portal.client.com)
      if (host && !isStandardHost(host)) {
        resolved = await fetchTenantByDomain(host);
      }
      // 2. Subdomain on cogniq.se (e.g. clientname.cogniq.se)
      if (!resolved) {
        const slugFromHost = resolveTenantSlugFromHost(host);
        if (slugFromHost) resolved = await fetchTenantBySlug(slugFromHost);
      }
      // 3. Explicit slug prop (e.g. /wl/:slug/login route)
      if (!resolved && explicitSlug) {
        resolved = await fetchTenantBySlug(explicitSlug);
      }
      // 4. Persisted slug from prior session (post-login on standard host)
      if (!resolved) {
        const persisted = getActiveTenantSlug();
        if (persisted) resolved = await fetchTenantBySlug(persisted);
      }

      if (!mounted) return;
      if (!resolved) {
        // Standard host or unresolved — apply Cogniq default theme
        // (prevents leaked branding from a previous tenant via persisted state)
        applyDefaultTheme();
        setLoading(false);
        return;
      }
      setTenant(resolved);
      applyTenantBrandTokens(resolved);
      document.title = `${resolved.name} — Ekonomiplattform`;
      setLoading(false);
    })().catch((e) => { if (mounted) { setError(e.message); setLoading(false); } });

    return () => { mounted = false; };
  }, [explicitSlug]);

  return <TenantContext.Provider value={{ tenant, loading, error }}>{children}</TenantContext.Provider>;
};
