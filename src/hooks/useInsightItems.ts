import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CFOPriority } from "./useCFOPriorities";

export interface InsightItem {
  id: string;
  primary: string;       // headline (e.g. customer name)
  secondary?: string;    // sub-line (e.g. invoice number, days overdue)
  amount?: number;       // SEK
  meta?: string;         // small chip (status, days)
  reference?: string;    // for action payload (invoice_id, journal_id)
}

interface State {
  items: InsightItem[];
  loading: boolean;
  error: string | null;
}

/**
 * Maps an insight to its underlying operational items so the user can
 * inspect and select before executing.
 */
export function useInsightItems(insight: CFOPriority | null, companyId: string | null, enabled: boolean): State {
  const [state, setState] = useState<State>({ items: [], loading: false, error: null });

  useEffect(() => {
    if (!enabled || !insight || !companyId) return;
    let cancelled = false;
    setState({ items: [], loading: true, error: null });

    (async () => {
      try {
        const src = (insight.source || "").toLowerCase();
        const title = (insight.title || "").toLowerCase();
        let items: InsightItem[] = [];

        if (src.includes("overdue") || src.includes("ar") || title.includes("förfall") || title.includes("kund")) {
          const today = new Date().toISOString().slice(0, 10);
          const { data } = await supabase
            .from("invoices" as any)
            .select("id, invoice_number, customer_name, total_amount, due_date, status")
            .eq("company_id", companyId)
            .lt("due_date", today)
            .neq("status", "paid")
            .order("due_date", { ascending: true })
            .limit(20);
          items = (data || []).map((r: any) => {
            const days = r.due_date ? Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000) : 0;
            return {
              id: r.id,
              primary: r.customer_name || "Okänd kund",
              secondary: `${r.invoice_number || ""} · ${days} dagar försenad`,
              amount: Number(r.total_amount) || 0,
              meta: r.status,
              reference: r.id,
            };
          });
        } else if (src.includes("anomaly") || title.includes("anomali")) {
          const { data } = await supabase
            .from("flagged_transactions" as any)
            .select("id, flag_type, journal_entry_id, review_notes, created_at")
            .eq("company_id", companyId)
            .eq("is_reviewed", false)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            primary: r.flag_type || "Avvikelse",
            secondary: r.review_notes || "Granska transaktionen",
            reference: r.journal_entry_id,
          }));
        } else if (src.includes("annual") || title.includes("årsredovisning")) {
          const { data } = await supabase
            .from("annual_report_ai_suggestions" as any)
            .select("id, title, explanation, impact_amount, status")
            .eq("company_id", companyId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            primary: r.title,
            secondary: r.explanation,
            amount: Number(r.impact_amount) || undefined,
            reference: r.id,
          }));
        }

        if (!cancelled) setState({ items, loading: false, error: null });
      } catch (e) {
        if (!cancelled) setState({ items: [], loading: false, error: (e as Error).message });
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, insight?.id, companyId]);

  return state;
}
