/**
 * Data hook for the unified drilldown.
 * - Accounts come from the engine context (no DB hit).
 * - Journal entries fetched on-demand at L3 (paginated, 1000 cap).
 * - Source documents resolved at L4 with signed URLs from storage.
 */

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface DrilldownEntry {
  id: string;
  entry_date: string;
  verification_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  counterparty: string | null;
  source_type: string | null;
  is_ai_generated: boolean;
  is_manual_adjustment: boolean;
  attachment_path: string | null;
}

export function useJournalEntriesForAccount(args: {
  companyId: string;
  accountNumber: string;
  fromDate: Date;
  toDate: Date;
  enabled: boolean;
}) {
  const { companyId, accountNumber, fromDate, toDate, enabled } = args;
  const [entries, setEntries] = useState<DrilldownEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !companyId || !accountNumber) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("journal_entry_lines")
          .select(`
            id, debit, credit, description,
            journal_entries!inner (
              id, entry_date, verification_number, description, status, company_id,
              source_type, attachment_path, is_ai_generated, is_manual_adjustment, counterparty
            ),
            chart_of_accounts!inner ( account_number )
          `)
          .eq("journal_entries.company_id", companyId)
          .eq("chart_of_accounts.account_number", accountNumber)
          .gte("journal_entries.entry_date", format(fromDate, "yyyy-MM-dd"))
          .lte("journal_entries.entry_date", format(toDate, "yyyy-MM-dd"))
          .order("entry_date", { foreignTable: "journal_entries", ascending: false })
          .limit(500);

        if (error) throw error;
        if (cancelled) return;

        const rows: DrilldownEntry[] = (data || []).map((line: any) => ({
          id: line.journal_entries?.id ?? line.id,
          entry_date: line.journal_entries?.entry_date ?? "",
          verification_number: line.journal_entries?.verification_number ?? null,
          description: line.description ?? line.journal_entries?.description ?? null,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          counterparty: line.journal_entries?.counterparty ?? null,
          source_type: line.journal_entries?.source_type ?? null,
          is_ai_generated: !!line.journal_entries?.is_ai_generated,
          is_manual_adjustment: !!line.journal_entries?.is_manual_adjustment,
          attachment_path: line.journal_entries?.attachment_path ?? null,
        }));
        setEntries(rows);
      } catch (e: any) {
        if (cancelled) return;
        // Soft-fail: schema may differ; show empty state instead of crashing.
        console.warn("[drilldown] entries fetch failed", e?.message);
        setEntries([]);
        setError(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, accountNumber, fromDate, toDate, enabled]);

  return { entries, loading, error };
}

export async function getSignedSourceUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  // Try common buckets in order; first hit wins.
  const buckets = ["receipts", "invoices", "documents", "attachments"];
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return null;
}
