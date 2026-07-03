import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResolvedTenant, fetchTenantBySlug, applyTenantBrandTokens } from "@/lib/tenant/resolveTenant";
import { toast } from "sonner";

export interface BrandDraft {
  // identity
  name: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  // colors
  primary_color: string;
  accent_color: string | null;
  // ai
  ai_name: string;
  ai_tone: string;
  intro_text: string | null;
  // login
  headline: string;
  subheadline: string | null;
  trust_bullets: string[];
  show_bankid: boolean;
  show_password_login: boolean;
  footer_attribution: string | null;
  support_email: string | null;
  support_url: string | null;
}

export function tenantToDraft(t: ResolvedTenant): BrandDraft {
  return {
    name: t.name,
    logo_url: t.branding.logo_url,
    logo_dark_url: t.branding.logo_dark_url,
    favicon_url: t.branding.favicon_url,
    primary_color: t.branding.primary_color,
    accent_color: t.branding.accent_color,
    ai_name: t.ai.ai_name,
    ai_tone: t.ai.ai_tone,
    intro_text: t.ai.intro_text,
    headline: t.login.headline,
    subheadline: t.login.subheadline,
    trust_bullets: t.login.trust_bullets,
    show_bankid: t.login.show_bankid,
    show_password_login: t.login.show_password_login,
    footer_attribution: t.login.footer_attribution,
    support_email: t.login.support_email,
    support_url: t.login.support_url,
  };
}

export function useTenantBrandDraft(slug: string | null) {
  const [tenant, setTenant] = useState<ResolvedTenant | null>(null);
  const [draft, setDraft] = useState<BrandDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    fetchTenantBySlug(slug).then((t) => {
      if (t) {
        setTenant(t);
        setDraft(tenantToDraft(t));
      }
      setLoading(false);
    });
  }, [slug]);

  const update = useCallback(<K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!tenant || !draft) return;
    setSaving(true);
    try {
      const [b, a, l] = await Promise.all([
        (supabase as any).from("tenant_branding").upsert({
          tenant_id: tenant.id,
          logo_url: draft.logo_url,
          logo_dark_url: draft.logo_dark_url,
          favicon_url: draft.favicon_url,
          primary_color: draft.primary_color,
          accent_color: draft.accent_color,
        }, { onConflict: "tenant_id" }),
        (supabase as any).from("tenant_ai_config").upsert({
          tenant_id: tenant.id,
          ai_name: draft.ai_name,
          ai_tone: draft.ai_tone,
          intro_text: draft.intro_text,
        }, { onConflict: "tenant_id" }),
        (supabase as any).from("tenant_login_config").upsert({
          tenant_id: tenant.id,
          headline: draft.headline,
          subheadline: draft.subheadline,
          trust_bullets: draft.trust_bullets,
          show_bankid: draft.show_bankid,
          show_password_login: draft.show_password_login,
          footer_attribution: draft.footer_attribution,
          support_email: draft.support_email,
          support_url: draft.support_url,
        }, { onConflict: "tenant_id" }),
      ]);
      if (b.error) throw b.error;
      if (a.error) throw a.error;
      if (l.error) throw l.error;

      // Re-apply brand tokens live
      const refreshed = await fetchTenantBySlug(tenant.slug);
      if (refreshed) {
        setTenant(refreshed);
        applyTenantBrandTokens(refreshed);
      }
      setDirty(false);
      toast.success("Varumärket uppdaterat");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }, [tenant, draft]);

  return { tenant, draft, update, save, loading, saving, dirty };
}
