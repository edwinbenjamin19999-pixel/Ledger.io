import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientRevenue } from "@/hooks/useClientRevenue";
import type { FirmClientEnriched } from "@/hooks/useFirmDashboard";

export type BookkeepingStatus = "ok" | "missing" | "error";
export type VatStatus = "ready" | "pending" | "late" | "none";
export type AnnualStatus = "draft" | "ready" | "filed" | "none";

export interface FirmClientOps extends FirmClientEnriched {
  assignedConsultantId: string | null;
  assignedName: string;
  bookkeepingStatus: BookkeepingStatus;
  vatStatus: VatStatus;
  annualStatus: AnnualStatus;
  riskScore: number; // 0–100
  revenue12m: number | null;
  cost12m: number | null;
  profitability: number | null; // revenue - cost
  lastActivity: string | null;
}

interface RawConsultant { user_id: string; profiles: { id: string; full_name: string | null; email: string | null } | null }

/**
 * Heavyweight enrichment for the operations-grade client management table.
 * Adds: assigned consultant, status pillars, AI risk score, revenue/profitability, last activity.
 */
export function useFirmClientsOps(firmId: string, baseClients: FirmClientEnriched[]) {
  const companyIds = baseClients.map((c) => c.id);
  const { data: revenueMap } = useClientRevenue(companyIds);

  return useQuery({
    queryKey: ["firm-clients-ops", firmId, companyIds.sort().join(",")],
    enabled: !!firmId && companyIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<FirmClientOps[]> => {
      // Assigned consultants per client
      const { data: assignments } = await supabase
        .from("firm_clients")
        .select("company_id, assigned_consultant_id")
        .eq("firm_id", firmId)
        .eq("is_active", true)
        .in("company_id", companyIds);

      const consultantIds = Array.from(
        new Set((assignments ?? []).map((a) => a.assigned_consultant_id).filter(Boolean) as string[]),
      );

      const consultantNameMap = new Map<string, string>();
      if (consultantIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", consultantIds);
        (profiles ?? []).forEach((p) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          consultantNameMap.set(p.id, name || p.email || "—");
        });
      }
      const assignedMap = new Map<string, string | null>();
      (assignments ?? []).forEach((a) => assignedMap.set(a.company_id, a.assigned_consultant_id));

      // Per-company supplementary signals (parallel)
      const enriched = await Promise.all(
        baseClients.map(async (c) => {
          const [
            { data: latestVat },
            { data: latestAnnual },
            { data: latestEntry },
            { count: missingDocs },
          ] = await Promise.all([
            supabase
              .from("vat_declarations")
              .select("status, period_year, period_month")
              .eq("company_id", c.id)
              .order("period_year", { ascending: false })
              .order("period_month", { ascending: false, nullsFirst: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("annual_reports")
              .select("status, fiscal_year")
              .eq("company_id", c.id)
              .order("fiscal_year", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("journal_entries")
              .select("created_at, entry_date")
              .eq("company_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("flagged_transactions")
              .select("id", { count: "exact", head: true })
              .eq("company_id", c.id)
              .eq("flag_type", "missing_document")
              .eq("is_reviewed", false),
          ]);

          // Bookkeeping status
          let bookkeepingStatus: BookkeepingStatus = "ok";
          if ((missingDocs ?? 0) > 0 || c.draftEntries > 5) bookkeepingStatus = "missing";
          if (c.draftEntries > 15) bookkeepingStatus = "error";

          // VAT status
          let vatStatus: VatStatus = "none";
          if (latestVat) {
            const s = String(latestVat.status ?? "").toLowerCase();
            if (s.includes("submitted") || s.includes("filed") || s.includes("approved")) vatStatus = "ready";
            else if (s.includes("late") || s.includes("overdue")) vatStatus = "late";
            else vatStatus = "pending";
          }

          // Annual report status
          let annualStatus: AnnualStatus = "none";
          if (latestAnnual) {
            const s = String(latestAnnual.status ?? "").toLowerCase();
            if (s.includes("filed") || s.includes("submitted") || s.includes("approved")) annualStatus = "filed";
            else if (s.includes("ready") || s.includes("review")) annualStatus = "ready";
            else annualStatus = "draft";
          }

          // AI risk score 0–100
          let risk = 0;
          risk += Math.min(40, c.draftEntries * 3);
          risk += Math.min(30, c.overdueInvoices * 5);
          risk += Math.min(15, c.pendingExpenses * 3);
          if (vatStatus === "late") risk += 25;
          else if (vatStatus === "pending") risk += 10;
          if (bookkeepingStatus === "error") risk += 15;
          else if (bookkeepingStatus === "missing") risk += 8;
          if ((missingDocs ?? 0) > 0) risk += Math.min(15, (missingDocs ?? 0) * 3);
          risk = Math.min(100, Math.round(risk));

          // Revenue / profitability (cost = sum of class 4–7 expenses; revenue from RPC)
          const revenue = revenueMap?.get(c.id) ?? null;

          const consultantId = assignedMap.get(c.id) ?? null;
          const lastActivity = latestEntry?.created_at ?? latestEntry?.entry_date ?? null;

          return {
            ...c,
            assignedConsultantId: consultantId,
            assignedName: consultantId ? (consultantNameMap.get(consultantId) ?? "—") : "—",
            bookkeepingStatus,
            vatStatus,
            annualStatus,
            riskScore: risk,
            revenue12m: revenue,
            cost12m: null, // computed lazily below
            profitability: null,
            lastActivity,
          } satisfies FirmClientOps;
        }),
      );

      // Cost via single RPC-like call per company would be heavy; use a single grouped query
      // Simple parallel cost fetch (4xxx-7xxx debits last 12m)
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      const sinceIso = since.toISOString().slice(0, 10);

      await Promise.all(
        enriched.map(async (row) => {
          const { data } = await supabase
            .from("journal_entry_lines")
            .select("debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)")
            .eq("journal_entries.company_id", row.id)
            .gte("journal_entries.entry_date", sinceIso)
            .in("journal_entries.status", ["approved", "posted"])
            .limit(5000);

          if (!data) return;
          // Need account_number — fetch chart_of_accounts mapping for this company
          const accountIds = Array.from(new Set(data.map((d: { account_id: string | null }) => d.account_id).filter(Boolean) as string[]));
          if (accountIds.length === 0) return;
          const { data: coa } = await supabase
            .from("chart_of_accounts")
            .select("id, account_number")
            .in("id", accountIds);
          const numByAcc = new Map((coa ?? []).map((a: { id: string; account_number: string }) => [a.id, a.account_number]));
          let cost = 0;
          data.forEach((line: { debit: number | null; credit: number | null; account_id: string | null }) => {
            const num = line.account_id ? numByAcc.get(line.account_id) : undefined;
            if (!num) return;
            if (/^[4-7]/.test(num)) cost += (Number(line.debit) || 0) - (Number(line.credit) || 0);
          });
          row.cost12m = cost;
          if (row.revenue12m !== null) {
            row.profitability = row.revenue12m - cost;
          }
        }),
      );

      return enriched;
    },
  });
}
