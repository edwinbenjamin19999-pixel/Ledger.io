/**
 * Account-level budget AI suggestions with 6h cache against `ai_account_suggestions`.
 * - Returns suggestions in the AccountMonthMatrix shape: { account_number, yearly, reasoning, confidence }.
 * - Reads cache first; if fresh (<6h) and non-empty for the period_hash, returns it.
 * - Otherwise calls budget-planning-ai (mode: "suggest"), persists rows, then returns.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BudgetRowData } from "@/lib/budget/budgetEngine";
import { MONTH_KEYS } from "@/lib/budget/budgetEngine";

export interface BudgetAccountSuggestion {
  account_number: string;
  yearly: number;
  reasoning?: string;
  confidence?: number;
}

interface Args {
  companyId: string | null;
  budgetId: string | null;
  fiscalYear: number;
  rows: BudgetRowData[];
  ytdActuals: Record<string, number>;
  enabled?: boolean;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function rowYearTotal(r: BudgetRowData): number {
  return MONTH_KEYS.reduce((s, m) => s + (Number(r[m]) || 0), 0);
}

export function useBudgetAccountSuggestions({
  companyId, budgetId, fiscalYear, rows, ytdActuals, enabled = true,
}: Args) {
  const periodHash = `budget:${budgetId ?? "none"}:${fiscalYear}`;

  return useQuery({
    queryKey: ["budget-account-suggestions", companyId, budgetId, fiscalYear],
    enabled: enabled && !!companyId && !!budgetId && rows.length > 0,
    staleTime: SIX_HOURS_MS,
    queryFn: async (): Promise<BudgetAccountSuggestion[]> => {
      if (!companyId || !budgetId) return [];

      // 1. Try cache
      const cutoff = new Date(Date.now() - SIX_HOURS_MS).toISOString();
      const { data: cached } = await supabase
        .from("ai_account_suggestions")
        .select("account_number,suggested_value,reason,confidence,created_at")
        .eq("company_id", companyId)
        .eq("period_hash", periodHash)
        .gt("created_at", cutoff)
        .gt("expires_at", new Date().toISOString());

      if (cached && cached.length > 0) {
        return cached.map(c => ({
          account_number: c.account_number,
          yearly: Number(c.suggested_value) || 0,
          reasoning: c.reason ?? undefined,
          confidence: c.confidence ?? undefined,
        }));
      }

      // 2. Call AI (only top movers / non-zero accounts to keep payload small)
      const accounts = rows
        .filter(r => rowYearTotal(r) !== 0 || (ytdActuals[r.account_number] ?? 0) !== 0)
        .map(r => ({
          account_number: r.account_number,
          account_name: r.account_name,
          budget_year: rowYearTotal(r),
          actual_ytd: ytdActuals[r.account_number] ?? 0,
        }))
        .slice(0, 80);

      if (accounts.length === 0) return [];

      const { data: aiRes, error } = await supabase.functions.invoke("budget-planning-ai", {
        body: {
          mode: "suggest",
          company_id: companyId,
          context: { fiscal_year: fiscalYear, accounts },
        },
      });

      if (error || !aiRes?.suggestions) {
        console.error("budget-account-suggestions ai error", error);
        return [];
      }

      const suggestions = (aiRes.suggestions as Array<{
        account_number: string;
        suggested_value: number;
        reason?: string;
        expected_impact_sek?: number;
        confidence?: number;
      }>).filter(s => s.account_number && Number.isFinite(s.suggested_value));

      // 3. Persist (best-effort)
      if (suggestions.length > 0) {
        const expires = new Date(Date.now() + SIX_HOURS_MS).toISOString();
        await supabase.from("ai_account_suggestions").upsert(
          suggestions.map(s => ({
            company_id: companyId,
            period_hash: periodHash,
            account_number: s.account_number,
            suggested_value: s.suggested_value,
            reason: s.reason ?? null,
            expected_impact_sek: s.expected_impact_sek ?? null,
            confidence: s.confidence ?? null,
            expires_at: expires,
          })),
          { onConflict: "company_id,period_hash,account_number" } as any
        );
      }

      return suggestions.map(s => ({
        account_number: s.account_number,
        yearly: s.suggested_value,
        reasoning: s.reason,
        confidence: s.confidence,
      }));
    },
  });
}
