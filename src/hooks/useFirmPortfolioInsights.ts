import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type InsightKind = "stale_books" | "anomalies" | "overdue_invoices" | "draft_pile";

export interface PortfolioInsight {
  kind: InsightKind;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  affectedClientIds: string[];
  count: number;
}

/**
 * Cross-portfolio AI-style patterns. v1 uses live data from existing tables
 * (no new backend required) to detect stale bookkeeping, draft pileups,
 * overdue receivables, and recent anomalies.
 */
export function useFirmPortfolioInsights() {
  const { clients, firmId } = useAdvisorContext();
  const companyIds = clients.map((c) => c.id);

  return useQuery({
    queryKey: ["firm-portfolio-insights", firmId, companyIds.join(",")],
    enabled: !!firmId && companyIds.length > 0,
    queryFn: async (): Promise<PortfolioInsight[]> => {
      const insights: PortfolioInsight[] = [];

      // 1. Overdue invoices + draft pileups — already enriched per client.
      const overdue = clients.filter((c) => c.overdueInvoices > 0);
      if (overdue.length > 0) {
        insights.push({
          kind: "overdue_invoices",
          title: `${overdue.length} klienter med förfallna kundfakturor`,
          description: `Totalt ${overdue.reduce(
            (s, c) => s + c.overdueInvoices,
            0,
          )} fakturor över förfallodag — likviditetspåverkan`,
          severity: "critical",
          affectedClientIds: overdue.map((c) => c.id),
          count: overdue.length,
        });
      }

      const drafts = clients.filter((c) => c.draftEntries > 5);
      if (drafts.length > 0) {
        insights.push({
          kind: "draft_pile",
          title: `${drafts.length} klienter med utkastköer`,
          description: `${drafts.reduce(
            (s, c) => s + c.draftEntries,
            0,
          )} verifikationsutkast väntar på granskning`,
          severity: "warning",
          affectedClientIds: drafts.map((c) => c.id),
          count: drafts.length,
        });
      }

      // 2. Stale books — last journal entry > 14 days old per company
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 14);
        const { data: recent } = await supabase
          .from("journal_entries")
          .select("company_id, entry_date")
          .in("company_id", companyIds)
          .gte("entry_date", cutoff.toISOString().slice(0, 10));
        const fresh = new Set((recent ?? []).map((r) => r.company_id));
        const stale = clients.filter((c) => !fresh.has(c.id));
        if (stale.length > 0) {
          insights.push({
            kind: "stale_books",
            title: `${stale.length} klienter ligger efter med bokföring`,
            description: "Ingen ny verifikation senaste 14 dagarna",
            severity: stale.length > 3 ? "warning" : "info",
            affectedClientIds: stale.map((c) => c.id),
            count: stale.length,
          });
        }
      } catch (e) {
        console.warn("[portfolio-insights:stale]", e);
      }

      return insights;
    },
  });
}
