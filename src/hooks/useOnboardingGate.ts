import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStoredActiveCompanyId, setStoredActiveCompanyId } from "@/lib/company-selection";

/**
 * Routes that are always allowed regardless of onboarding status.
 * Onboarding flow itself, auth, settings (so user can manage account), and company picker.
 */
const WHITELIST_PREFIXES = [
  "/quick-onboarding",
  "/welcome",
  "/kyc-verification",
  "/agreement-callback",
  "/auth",
  "/settings",
  "/companies",
  "/wl/",
  "/firm/",
  "/admin",
  "/accept-invitation",
];

const isWhitelisted = (path: string) => WHITELIST_PREFIXES.some((p) => path === p || path.startsWith(p));

/**
 * Global onboarding enforcement. If the active company is missing org_number,
 * KYC, or a linked bank account, redirects the user to the appropriate step
 * in /quick-onboarding. Whitelisted routes are always allowed.
 */
export const useOnboardingGate = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (isWhitelisted(location.pathname)) return;

    const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (userMeta.test_account === true || userMeta.is_test_account === true) {
      checkedRef.current = `${user.id}:${location.pathname}`;
      return;
    }

    // Avoid re-checking the same path repeatedly
    const cacheKey = `${user.id}:${location.pathname}`;
    if (checkedRef.current === cacheKey) return;

    let cancelled = false;

    const check = async () => {
      try {
        // 1. Find user's accessible companies
        const { data: roles, error: rolesError } = await (supabase
          .from("user_roles")
          .select("company_id, companies!inner(id, org_number, kyc_status, metadata)")
          .eq("user_id", user.id) as unknown as Promise<{
            data: Array<{ companies: { id: string; org_number: string | null; kyc_status: string | null; metadata: Record<string, unknown> | null } | Array<{ id: string; org_number: string | null; kyc_status: string | null; metadata: Record<string, unknown> | null }> }> | null;
            error: unknown;
          }>);

        if (rolesError) return;

        const companies = (roles || [])
          .map((r: any) => (Array.isArray(r.companies) ? r.companies[0] : r.companies))
          .filter(Boolean);

        if (companies.length === 0) {
          // No company memberships — do NOT push the user into onboarding
          // (they may be a pending invitee). TenantSelectorGate renders the
          // explicit "no access" UI. Just stop gating here.
          checkedRef.current = cacheKey;
          return;
        }

        // 2. Pick active company (stored or first)
        const storedId = getStoredActiveCompanyId();
        const active = companies.find((c: any) => c.id === storedId) ?? companies[0];
        if (!active) return;

        if (!storedId || storedId !== active.id) {
          setStoredActiveCompanyId(active.id);
        }

        const meta = ((active as { metadata?: Record<string, unknown> | null }).metadata as Record<string, unknown> | null) ?? {};

        // SHORT-CIRCUIT: Test accounts skip all onboarding gates.
        if (meta.is_test_account === true) {
          checkedRef.current = cacheKey;
          return;
        }

        // SHORT-CIRCUIT: If onboarding is fully completed, never gate again.
        // This prevents infinite loops when KYC + bank state momentarily lags.
        // Co-signing pending counts as "completed enough" — the account is
        // active in limited mode and feature-level gates handle the rest.
        if (meta.onboarding_completed_at || meta.cosigning_pending) {
          checkedRef.current = cacheKey;
          return;
        }

        // 3. Org number missing or temp → step 1
        const org: string | null = active.org_number;
        if (!org || org.startsWith("TEMP-")) {
          if (!cancelled) navigate("/quick-onboarding?step=1", { replace: true });
          return;
        }

        // 4. KYC missing → step 2
        const kyc: string | null = active.kyc_status;
        if (!kyc || kyc === "not_started") {
          if (!cancelled) navigate("/quick-onboarding?step=2", { replace: true });
          return;
        }

        // 5. Bank not linked AND not explicitly skipped → step 3
        const bankSkipped = meta.onboarding_bank_skipped === true;

        const { count: bankCount } = await supabase
          .from("bank_accounts")
          .select("id", { count: "exact", head: true })
          .eq("company_id", active.id);

        if ((bankCount ?? 0) === 0 && !bankSkipped) {
          if (!cancelled) navigate("/quick-onboarding?step=3", { replace: true });
          return;
        }

        // 6. Agreement not signed → step 5
        if (!meta.agreement_signed_at) {
          if (!cancelled) navigate("/quick-onboarding?step=5", { replace: true });
          return;
        }

        // 7. Activation flow not finished → /welcome (resumable, skippable)
        const activation = (meta.activation as Record<string, unknown> | undefined) ?? {};
        if (!activation.completed_at) {
          if (!cancelled) navigate("/welcome", { replace: true });
          return;
        }

        // All good
        checkedRef.current = cacheKey;
      } catch {
        // Silent — never block UI on gate errors
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [user, loading, location.pathname, navigate]);
};
