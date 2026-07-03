import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import type { FirmClientEnriched } from "@/hooks/useFirmDashboard";

export type InsightSeverity = "critical" | "watch" | "opportunity";
export type InsightActionType = "fix" | "assign" | "notify";

export interface FirmAIInsight {
  id: string;
  severity: InsightSeverity;
  category: string;
  title: string;
  description: string;
  affected: { id: string; name: string; orgNumber: string }[];
  /** Suggested route for the primary "Fix" action (relative to active client). */
  fixRoute?: string;
  /** Recommended task title when advisor "Assigns" it. */
  taskTitle?: string;
  /** Recommended task type for assignment. */
  taskType?: "vat" | "bookkeeping" | "agi" | "annual_report" | "reconciliation" | "other";
  /** Notification message when advisor "Notifies" client. */
  notifyMessage?: string;
}

const STALE_DAYS = 14;
const DRAFT_THRESHOLD = 5;
const MARGIN_LOW_ALERTS = 0; // healthy
const PRICING_OPP_MIN_REVENUE = 100_000;

function buildAffected(clients: FirmClientEnriched[]) {
  return clients.map((c) => ({ id: c.id, name: c.name, orgNumber: c.org_number }));
}

/**
 * Firm-wide AI Insight Engine — scans all clients in the portfolio and emits
 * categorised insights (CRITICAL / WATCH / OPPORTUNITY). Each insight carries
 * action metadata so the UI can render Fix / Assign / Notify directly.
 */
export function useFirmAIInsights() {
  const { clients, firmId } = useAdvisorContext();
  const companyIds = clients.map((c) => c.id);

  return useQuery({
    queryKey: ["firm-ai-insights", firmId, companyIds.join(",")],
    enabled: !!firmId && companyIds.length > 0,
    queryFn: async (): Promise<FirmAIInsight[]> => {
      const insights: FirmAIInsight[] = [];

      // ---------- CRITICAL: Overdue invoices (cash flow risk) ----------
      const overdue = clients.filter((c) => c.overdueInvoices > 0);
      if (overdue.length > 0) {
        insights.push({
          id: "overdue-invoices",
          severity: "critical",
          category: "Likviditet",
          title: `${overdue.length} klienter med förfallna kundfakturor`,
          description: `Totalt ${overdue.reduce(
            (s, c) => s + c.overdueInvoices,
            0,
          )} fakturor över förfallodag — direkt påverkan på kassaflöde`,
          affected: buildAffected(overdue),
          fixRoute: "/finance",
          taskTitle: "Skicka påminnelser för förfallna fakturor",
          taskType: "other",
          notifyMessage:
            "Du har förfallna kundfakturor som påverkar likviditeten. Vi rekommenderar uppföljning omgående.",
        });
      }

      // ---------- CRITICAL: Stale books > 30 days (VAT risk) ----------
      try {
        const cutoff30 = new Date();
        cutoff30.setDate(cutoff30.getDate() - 30);
        const { data: recent30 } = await supabase
          .from("journal_entries")
          .select("company_id, entry_date")
          .in("company_id", companyIds)
          .gte("entry_date", cutoff30.toISOString().slice(0, 10));
        const fresh30 = new Set((recent30 ?? []).map((r) => r.company_id));
        const veryStale = clients.filter((c) => !fresh30.has(c.id));
        if (veryStale.length > 0) {
          insights.push({
            id: "vat-risk-stale",
            severity: "critical",
            category: "Moms",
            title: `${veryStale.length} klienter riskerar felaktig moms`,
            description:
              "Ingen bokföring senaste 30 dagarna — momsdeklarationen kan bli felaktig",
            affected: buildAffected(veryStale),
            fixRoute: "/moms",
            taskTitle: "Uppdatera bokföring inför momsdeklaration",
            taskType: "vat",
            notifyMessage:
              "Bokföringen behöver uppdateras inför nästa momsperiod. Vänligen ladda upp underlag.",
          });
        }
      } catch (e) {
        console.warn("[ai-insights:vat-risk]", e);
      }

      // ---------- WATCH: Stale books 14–30 days ----------
      try {
        const cutoff14 = new Date();
        cutoff14.setDate(cutoff14.getDate() - STALE_DAYS);
        const { data: recent14 } = await supabase
          .from("journal_entries")
          .select("company_id, entry_date")
          .in("company_id", companyIds)
          .gte("entry_date", cutoff14.toISOString().slice(0, 10));
        const fresh14 = new Set((recent14 ?? []).map((r) => r.company_id));
        const stale = clients.filter((c) => !fresh14.has(c.id));
        if (stale.length > 0) {
          insights.push({
            id: "stale-books",
            severity: "watch",
            category: "Bokföring",
            title: `Bokföring släpar för ${stale.length} klienter`,
            description: `Ingen ny verifikation senaste ${STALE_DAYS} dagarna`,
            affected: buildAffected(stale),
            fixRoute: "/dashboard",
            taskTitle: "Boka ikapp månadens transaktioner",
            taskType: "bookkeeping",
            notifyMessage:
              "Det saknas bokföring för senaste perioden. Ladda upp kvitton och kontoutdrag.",
          });
        }
      } catch (e) {
        console.warn("[ai-insights:stale]", e);
      }

      // ---------- WATCH: Draft pile (review backlog) ----------
      const drafts = clients.filter((c) => c.draftEntries > DRAFT_THRESHOLD);
      if (drafts.length > 0) {
        insights.push({
          id: "draft-pile",
          severity: "watch",
          category: "Granskning",
          title: `${drafts.length} klienter med utkastköer`,
          description: `${drafts.reduce(
            (s, c) => s + c.draftEntries,
            0,
          )} verifikationer väntar på granskning`,
          affected: buildAffected(drafts),
          fixRoute: "/verifikationer",
          taskTitle: "Granska och godkänn verifikationsutkast",
          taskType: "bookkeeping",
          notifyMessage: undefined,
        });
      }

      // ---------- WATCH: High alert clients (cashflow instability) ----------
      const unstable = clients.filter((c) => c.alerts >= 3 && c.alerts <= 5);
      if (unstable.length > 0) {
        insights.push({
          id: "cashflow-unstable",
          severity: "watch",
          category: "Kassaflöde",
          title: `Instabilt kassaflöde hos ${unstable.length} klienter`,
          description: "Flera signaler (utkast, förfallna fakturor, utlägg) samtidigt",
          affected: buildAffected(unstable),
          fixRoute: "/cashflow-forecast",
          taskTitle: "Granska kassaflöde och lös flaskhalsar",
          taskType: "reconciliation",
          notifyMessage:
            "Vi ser flera signaler om instabilt kassaflöde. Vi behöver gå igenom situationen tillsammans.",
        });
      }

      // ---------- OPPORTUNITY: Healthy clients with growth potential ----------
      try {
        const cutoff90 = new Date();
        cutoff90.setDate(cutoff90.getDate() - 90);
        const { data: revenueLines } = await supabase
          .from("journal_entry_lines")
          .select(
            "credit, account_number, journal_entries!inner(company_id, entry_date)",
          )
          .in("journal_entries.company_id", companyIds)
          .gte("journal_entries.entry_date", cutoff90.toISOString().slice(0, 10))
          .gte("account_number", "3000")
          .lt("account_number", "4000");

        const revenueByCompany = new Map<string, number>();
        for (const line of revenueLines ?? []) {
          const je = (line as any).journal_entries;
          const cid = je?.company_id;
          if (!cid) continue;
          revenueByCompany.set(
            cid,
            (revenueByCompany.get(cid) ?? 0) + Number((line as any).credit ?? 0),
          );
        }

        const pricingCandidates = clients.filter((c) => {
          const rev = revenueByCompany.get(c.id) ?? 0;
          return rev > PRICING_OPP_MIN_REVENUE && c.alerts === MARGIN_LOW_ALERTS;
        });
        if (pricingCandidates.length > 0) {
          insights.push({
            id: "pricing-opportunity",
            severity: "opportunity",
            category: "Tillväxt",
            title:
              pricingCandidates.length === 1
                ? "Höj priser hos 1 klient med stark tillväxt"
                : `Prismöjlighet hos ${pricingCandidates.length} klienter`,
            description:
              "Hög omsättning senaste 90 dagarna och stabil drift — utrymme för prisjustering",
            affected: buildAffected(pricingCandidates),
            fixRoute: "/cfo",
            taskTitle: "Föreslå prisjustering till klient",
            taskType: "other",
            notifyMessage:
              "Bolaget visar stark tillväxt — vi rekommenderar att se över prissättningen för att maximera marginalen.",
          });
        }
      } catch (e) {
        console.warn("[ai-insights:pricing]", e);
      }

      // ---------- WATCH: Cross-client personnel cost outliers (§5B) ----------
      // Compares personnel-cost ratio (7xxx ÷ 3xxx revenue) for each client
      // against the portfolio median over the last 90 days. Flags any client
      // whose ratio is ≥40 % above the median — i.e. structurally heavier
      // payroll burden than peers in the same firm. Pure portfolio analytics,
      // no extra LLM call.
      try {
        const cutoff90 = new Date();
        cutoff90.setDate(cutoff90.getDate() - 90);
        const since = cutoff90.toISOString().slice(0, 10);

        const [{ data: revLines }, { data: payrollLines }] = await Promise.all([
          supabase
            .from("journal_entry_lines")
            .select("credit, account_number, journal_entries!inner(company_id, entry_date)")
            .in("journal_entries.company_id", companyIds)
            .gte("journal_entries.entry_date", since)
            .gte("account_number", "3000")
            .lt("account_number", "4000"),
          supabase
            .from("journal_entry_lines")
            .select("debit, account_number, journal_entries!inner(company_id, entry_date)")
            .in("journal_entries.company_id", companyIds)
            .gte("journal_entries.entry_date", since)
            .gte("account_number", "7000")
            .lt("account_number", "8000"),
        ]);

        const revByCo = new Map<string, number>();
        for (const line of revLines ?? []) {
          const cid = (line as any).journal_entries?.company_id;
          if (!cid) continue;
          revByCo.set(cid, (revByCo.get(cid) ?? 0) + Number((line as any).credit ?? 0));
        }
        const payrollByCo = new Map<string, number>();
        for (const line of payrollLines ?? []) {
          const cid = (line as any).journal_entries?.company_id;
          if (!cid) continue;
          payrollByCo.set(cid, (payrollByCo.get(cid) ?? 0) + Number((line as any).debit ?? 0));
        }

        // Compute ratio per client (only those with both signals)
        const ratios: Array<{ id: string; name: string; orgNumber: string; ratio: number; pct: number }> = [];
        for (const c of clients) {
          const rev = revByCo.get(c.id) ?? 0;
          const pay = payrollByCo.get(c.id) ?? 0;
          if (rev > 50_000 && pay > 0) {
            ratios.push({ id: c.id, name: c.name, orgNumber: c.org_number, ratio: pay / rev, pct: (pay / rev) * 100 });
          }
        }

        if (ratios.length >= 4) {
          // Portfolio median
          const sorted = [...ratios].sort((a, b) => a.ratio - b.ratio);
          const median = sorted[Math.floor(sorted.length / 2)].ratio;
          if (median > 0) {
            const outliers = ratios
              .map((r) => ({ ...r, deviation: ((r.ratio - median) / median) * 100 }))
              .filter((r) => r.deviation >= 40)
              .sort((a, b) => b.deviation - a.deviation);

            if (outliers.length > 0) {
              const lead = outliers[0];
              insights.push({
                id: "cost-outlier-personnel",
                severity: "watch",
                category: "Benchmarking",
                title:
                  outliers.length === 1
                    ? `${lead.name} har ${Math.round(lead.deviation)}% högre personalkostnad än portföljen`
                    : `${outliers.length} klienter med personalkostnad över portföljmedian`,
                description: `Portföljens medianpersonalkostnadsandel är ${median.toFixed(0).slice(0, 4)}${(median * 100).toFixed(0)}% av omsättningen. ${lead.name} ligger på ${lead.pct.toFixed(0)}% (+${Math.round(lead.deviation)}%).`,
                affected: outliers.map((o) => ({ id: o.id, name: o.name, orgNumber: o.orgNumber })),
                fixRoute: "/cfo",
                taskTitle: "Granska personalkostnadens andel av omsättningen",
                taskType: "other",
                notifyMessage:
                  "Vi ser att personalkostnaden står för en större andel av omsättningen än hos jämförbara bolag. Vi rekommenderar en genomgång av lönestruktur och beläggning.",
              });
            }
          }
        }
      } catch (e) {
        console.warn("[ai-insights:cost-outlier]", e);
      }

      // ---------- OPPORTUNITY: Automation gain (zero alerts → upsell) ----------
      const automationReady = clients.filter((c) => c.alerts === 0 && c.draftEntries === 0);
      if (automationReady.length >= 3) {
        insights.push({
          id: "automation-upsell",
          severity: "opportunity",
          category: "Automation",
          title: `${automationReady.length} klienter redo för full automation`,
          description: "Inga avvikelser eller utkast — kandidater för auto-bokföringspaket",
          affected: buildAffected(automationReady),
          fixRoute: "/automation",
          taskTitle: "Erbjud automation-uppgradering",
          taskType: "other",
          notifyMessage:
            "Din bokföring rullar smidigt — låt oss aktivera fullt automatiserad bokföring för ännu mindre administration.",
        });
      }

      return insights;
    },
    staleTime: 60_000,
  });
}
