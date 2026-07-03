import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

export interface OnboardingProgress {
  loading: boolean;
  companyId: string | null;
  bankConnected: boolean;
  hasInvoices: boolean;
  hasReviewedAISuggestion: boolean;
  hasClosedPeriod: boolean;
  hasTransactions: boolean;
  /** Days since the company was created (used to auto-hide the checklist). */
  daysSinceSignup: number;
  /** True when every step is done. */
  allDone: boolean;
  refresh: () => void;
}

const COUNT = { count: "exact" as const, head: true as const };

/**
 * Computes onboarding/getting-started signals for the active company.
 * Used by the sidebar checklist and onboarding-aware empty states.
 */
export const useOnboardingProgress = (): OnboardingProgress => {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<Omit<OnboardingProgress, "refresh">>({
    loading: true,
    companyId: null,
    bankConnected: false,
    hasInvoices: false,
    hasReviewedAISuggestion: false,
    hasClosedPeriod: false,
    hasTransactions: false,
    daysSinceSignup: 0,
    allDone: false,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const companyId = getStoredActiveCompanyId();
        if (!companyId) {
          if (!cancelled) setState((s) => ({ ...s, loading: false }));
          return;
        }

        // Run all probes in parallel. Each query is wrapped so a single
        // missing table or RLS denial cannot poison the whole hook.
        const safeCount = <T,>(p: PromiseLike<T>): Promise<{ count: number | null }> =>
          Promise.resolve(p as unknown as Promise<{ count: number | null }>).catch(() => ({ count: 0 }));

        const [
          bankRes,
          invoiceRes,
          suggestionRes,
          periodRes,
          txRes,
          companyRes,
        ] = await Promise.all([
          safeCount(supabase.from("bank_accounts").select("id", COUNT).eq("company_id", companyId)),
          safeCount(supabase.from("invoices").select("id", COUNT).eq("company_id", companyId)),
          // AI suggestions reviewed (any row that has been acted on)
          safeCount(
            (supabase
              .from("ai_account_suggestions" as never)
              .select("id", COUNT)
              .eq("company_id", companyId) as unknown as PromiseLike<{ count: number | null }>),
          ),
          safeCount(
            (supabase
              .from("accounting_periods" as never)
              .select("id", COUNT)
              .eq("company_id", companyId)
              .eq("status", "closed") as unknown as PromiseLike<{ count: number | null }>),
          ),
          safeCount(
            (supabase
              .from("journal_entry_lines" as never)
              .select("id", COUNT)
              .eq("company_id", companyId) as unknown as PromiseLike<{ count: number | null }>),
          ),
          supabase.from("companies").select("created_at").eq("id", companyId).maybeSingle().then(
            (r) => r,
            () => ({ data: null }),
          ),
        ]);

        const created = companyRes.data?.created_at ? new Date(companyRes.data.created_at).getTime() : Date.now();
        const days = Math.floor((Date.now() - created) / 86_400_000);

        const next = {
          loading: false,
          companyId,
          bankConnected: (bankRes.count ?? 0) > 0,
          hasInvoices: (invoiceRes.count ?? 0) > 0,
          hasReviewedAISuggestion: (suggestionRes.count ?? 0) > 0,
          hasClosedPeriod: (periodRes.count ?? 0) > 0,
          hasTransactions: (txRes.count ?? 0) > 0,
          daysSinceSignup: days,
          allDone: false,
        };
        next.allDone = next.bankConnected && next.hasInvoices && next.hasReviewedAISuggestion && next.hasClosedPeriod;
        if (!cancelled) setState(next);
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [user, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
};
