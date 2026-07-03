import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadTenantAsset } from "@/lib/tenant/uploadTenantAsset";
import { useOnboardingDraft, isValidSlug } from "@/hooks/useOnboardingDraft";
import { OnboardingShell } from "@/components/wl/onboarding/OnboardingShell";
import { Step1BrandIdentity } from "@/components/wl/onboarding/Step1BrandIdentity";
import { Step2Modules } from "@/components/wl/onboarding/Step2Modules";
import { Step3LivePreview } from "@/components/wl/onboarding/Step3LivePreview";
import { Step4GoLive } from "@/components/wl/onboarding/Step4GoLive";
import { toast } from "sonner";

const STEPS = [
  { label: "Brand" },
  { label: "Plattform" },
  { label: "Preview" },
  { label: "Lansera" },
];

const RESERVED_SLUGS = new Set([
  "app", "www", "api", "admin", "auth", "wl", "white-label",
  "preview", "id-preview", "support", "help", "docs", "blog",
]);

export default function WhiteLabelOnboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { draft, update, toggleModule } = useOnboardingDraft();
  const [step, setStep] = useState(1);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [launched, setLaunched] = useState(false);
  const slugCheckTimer = useRef<number | null>(null);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent("/white-label/onboarding")}`);
    }
  }, [authLoading, user, navigate]);

  // Debounced slug uniqueness check
  useEffect(() => {
    if (!draft.slug || !isValidSlug(draft.slug) || RESERVED_SLUGS.has(draft.slug)) {
      setSlugAvailable(draft.slug && RESERVED_SLUGS.has(draft.slug) ? false : null);
      return;
    }
    setCheckingSlug(true);
    if (slugCheckTimer.current) window.clearTimeout(slugCheckTimer.current);
    slugCheckTimer.current = window.setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("tenants")
        .select("id")
        .eq("slug", draft.slug)
        .maybeSingle();
      setSlugAvailable(!data);
      setCheckingSlug(false);
    }, 350);
    return () => {
      if (slugCheckTimer.current) window.clearTimeout(slugCheckTimer.current);
    };
  }, [draft.slug]);

  const loginUrl = useMemo(() => {
    if (!draft.slug) return "";
    return `${window.location.origin}/wl/${draft.slug}/login`;
  }, [draft.slug]);

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return Boolean(
        draft.name.trim() &&
          draft.slug &&
          isValidSlug(draft.slug) &&
          !RESERVED_SLUGS.has(draft.slug) &&
          slugAvailable !== false &&
          !checkingSlug,
      );
    }
    if (step === 2) return Object.values(draft.modules).some(Boolean);
    return true;
  }, [step, draft, slugAvailable, checkingSlug]);

  const handleNext = () => {
    if (step < 4) setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleLaunch = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // 1. Create the tenant — RLS allows insert when created_by=auth.uid()
      // The bootstrap_tenant_defaults trigger auto-creates branding/ai/login/feature_flags + owner membership.
      const { data: tenant, error: tErr } = await (supabase as any)
        .from("tenants")
        .insert({
          name: draft.name.trim(),
          slug: draft.slug,
          created_by: user.id,
          status: "active",
        })
        .select("id, slug")
        .single();
      if (tErr) throw tErr;

      // 2. Upload logo (if any) — now we have a tenant_id and admin role
      let logoUrl: string | null = null;
      if (draft.logo_file) {
        try {
          logoUrl = await uploadTenantAsset(tenant.id, "logo", draft.logo_file);
        } catch (e) {
          console.warn("Logo upload failed, continuing without logo", e);
        }
      }

      // 3. Update branding
      const { error: bErr } = await (supabase as any)
        .from("tenant_branding")
        .update({
          logo_url: logoUrl,
          primary_color: draft.primary_color,
          accent_color: draft.accent_color,
        })
        .eq("tenant_id", tenant.id);
      if (bErr) throw bErr;

      // 4. Update AI config
      const { error: aErr } = await (supabase as any)
        .from("tenant_ai_config")
        .update({
          ai_name: draft.ai_name || "AI Ekonom",
        })
        .eq("tenant_id", tenant.id);
      if (aErr) throw aErr;

      // 5. Update feature flags with selected modules
      const enabledModules = Object.entries(draft.modules)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const { error: fErr } = await (supabase as any)
        .from("tenant_feature_flags")
        .update({ enabled_modules: enabledModules })
        .eq("tenant_id", tenant.id);
      if (fErr) throw fErr;

      setLaunched(true);
      toast.success(`${draft.name} är live!`);
    } catch (e: any) {
      console.error("Launch failed", e);
      toast.error(e.message || "Kunde inte skapa plattformen. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="text-sm text-slate-400">Laddar...</div>
      </div>
    );
  }

  return (
    <OnboardingShell
      step={step}
      totalSteps={4}
      steps={STEPS}
      onBack={handleBack}
      onNext={handleNext}
      canGoNext={canGoNext}
      hideFooter={step === 4}
      loading={false}
      nextLabel={step === 3 ? "Gå till lansering" : "Fortsätt"}
    >
      {step === 1 && (
        <Step1BrandIdentity
          draft={draft}
          update={update}
          slugAvailable={slugAvailable}
          checkingSlug={checkingSlug}
        />
      )}
      {step === 2 && <Step2Modules draft={draft} toggleModule={toggleModule} />}
      {step === 3 && <Step3LivePreview draft={draft} />}
      {step === 4 && (
        <Step4GoLive
          draft={draft}
          onLaunch={handleLaunch}
          loading={submitting}
          launched={launched}
          loginUrl={loginUrl}
        />
      )}
    </OnboardingShell>
  );
}
