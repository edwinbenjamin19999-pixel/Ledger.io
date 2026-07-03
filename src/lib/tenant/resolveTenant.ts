import { supabase } from "@/integrations/supabase/client";

export interface ResolvedTenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  locale: string;
  timezone: string;
  branding: {
    logo_url: string | null;
    logo_dark_url: string | null;
    favicon_url: string | null;
    primary_color: string;
    accent_color: string | null;
    style_preset: string;
    heading_font: string;
    body_font: string;
  };
  ai: {
    ai_name: string;
    ai_tone: string;
    intro_text: string | null;
    explanation_mode_default: string;
  };
  login: {
    headline: string;
    subheadline: string | null;
    trust_bullets: string[];
    show_bankid: boolean;
    show_password_login: boolean;
    support_email: string | null;
    support_url: string | null;
    footer_attribution: string | null;
  };
}

/**
 * Resolve a tenant from:
 *  1. Subdomain (clientname.northledger.se → slug = "clientname")
 *  2. Explicit slug param (e.g. /wl/:slug/login)
 * Standard NorthLedger hosts (northledger.se, app.northledger.se, *.lovable.app) return null.
 */
export function resolveTenantSlugFromHost(hostname: string): string | null {
  const RESERVED = new Set(["app", "www", "api", "admin", "id-preview", "preview"]);
  const host = hostname.toLowerCase();
  if (host === "northledger.se" || host === "localhost") return null;
  if (host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) return null;
  if (host.endsWith(".northledger.se")) {
    const sub = host.replace(".northledger.se", "");
    if (RESERVED.has(sub) || sub.includes(".")) return null;
    return sub;
  }
  return null;
}

async function hydrateTenant(tenant: any): Promise<ResolvedTenant> {
  const [brandingRes, aiRes, loginRes] = await Promise.all([
    (supabase as any).from("tenant_branding").select("*").eq("tenant_id", tenant.id).maybeSingle(),
    (supabase as any).from("tenant_ai_config").select("*").eq("tenant_id", tenant.id).maybeSingle(),
    (supabase as any).from("tenant_login_config").select("*").eq("tenant_id", tenant.id).maybeSingle(),
  ]);
  return {
    ...tenant,
    branding: brandingRes.data ?? {
      logo_url: null, logo_dark_url: null, favicon_url: null,
      primary_color: "#3b82f6", accent_color: null, style_preset: "enterprise",
      heading_font: "Inter", body_font: "Inter",
    },
    ai: aiRes.data ?? {
      ai_name: "AI Ekonom", ai_tone: "advisory",
      intro_text: null, explanation_mode_default: "simple",
    },
    login: loginRes.data ?? {
      headline: `Välkommen till ${tenant.name}`,
      subheadline: "Din AI-drivna ekonomiplattform för kontroll, automation och insikter",
      trust_bullets: ["Automatisk bokföring", "Realtidsanalys", "Full revisionslogg", "Spårbar AI"],
      show_bankid: true, show_password_login: true,
      support_email: null, support_url: null,
      footer_attribution: "Powered by NorthLedger",
    },
  };
}

export async function fetchTenantByDomain(domain: string): Promise<ResolvedTenant | null> {
  const { data: tenant, error } = await (supabase as any)
    .from("tenants")
    .select("id, name, slug, domain, status, locale, timezone")
    .eq("domain", domain.toLowerCase())
    .eq("status", "active")
    .eq("domain_status", "verified")
    .maybeSingle();
  if (error || !tenant) return null;
  return hydrateTenant(tenant);
}

export async function fetchTenantBySlug(slug: string): Promise<ResolvedTenant | null> {
  const { data: tenant, error } = await (supabase as any)
    .from("tenants")
    .select("id, name, slug, domain, status, locale, timezone")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !tenant) return null;
  return hydrateTenant(tenant);
}

import { deriveTenantTheme, applyTenantTheme } from "./tenantTheme";

/**
 * Apply tenant brand tokens — delegates to the system-wide theme engine.
 * Writes ~20 CSS variables on :root, sets data-tenant attribute, updates favicon.
 */
export function applyTenantBrandTokens(tenant: ResolvedTenant) {
  const theme = deriveTenantTheme(tenant.branding.primary_color, tenant.branding.accent_color);
  applyTenantTheme(theme, {
    tenantSlug: tenant.slug,
    logoUrl: tenant.branding.logo_url,
    faviconUrl: tenant.branding.favicon_url,
  });
}
