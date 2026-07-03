import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

const STICKY_PREFIX = "landing:reachedAIEkonom:";
const AI_EKONOM = "/ai-ekonom";
const DASHBOARD = "/dashboard";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const stickyKey = (companyId: string) => `${STICKY_PREFIX}${companyId}`;

const readSticky = (companyId: string): boolean => {
  try { return window.localStorage.getItem(stickyKey(companyId)) === "1"; } catch { return false; }
};

const writeSticky = (companyId: string) => {
  try { window.localStorage.setItem(stickyKey(companyId), "1"); } catch { /* ignore */ }
};

/**
 * Decide the default landing route after login.
 *
 * State 1 — no bank connected OR < 7 days of transaction data → /dashboard
 * State 2 — bank connected AND 7+ days of transaction data    → /ai-ekonom
 *
 * Once State 2 is reached for a company, it persists locally so a
 * temporarily broken bank connection doesn't downgrade the user.
 */
export async function resolveDefaultLanding(companyIdArg?: string | null): Promise<string> {
  const companyId = companyIdArg ?? getStoredActiveCompanyId();
  if (!companyId) return DASHBOARD;

  if (readSticky(companyId)) return AI_EKONOM;

  try {
    const [{ count: bankCount }, { data: firstTx }] = await Promise.all([
      supabase
        .from("bank_accounts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
      supabase
        .from("journal_entry_lines" as never)
        .select("created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle() as unknown as Promise<{ data: { created_at: string } | null }>,
    ]);

    const bankConnected = (bankCount ?? 0) > 0;
    const earliest = firstTx?.created_at ? new Date(firstTx.created_at).getTime() : 0;
    const hasSevenDays = earliest > 0 && (Date.now() - earliest) >= SEVEN_DAYS_MS;

    if (bankConnected && hasSevenDays) {
      writeSticky(companyId);
      return AI_EKONOM;
    }
    return DASHBOARD;
  } catch {
    return DASHBOARD;
  }
}
