import { useMemo } from "react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmClients, type FirmClientEnriched } from "@/hooks/useFirmDashboard";
import { useFirmClientsOps, type FirmClientOps } from "@/hooks/useFirmClientsOps";
import { useFirmDeadlines, type FirmDeadline } from "@/hooks/useFirmDeadlines";
import { useFirmApprovalQueue } from "@/hooks/useFirmApprovalQueue";

/**
 * AI-driven prioritization engine.
 *
 * Ranks clients by combining:
 *  - deadline proximity   (firm_deadlines)
 *  - overdue approvals    (firm approval queue)
 *  - anomalies / risk     (FirmClientOps.riskScore)
 *  - missing data         (draftEntries, missing-document flags via riskScore)
 *  - financial risk       (negative profitability)
 *  - recent activity      (lastActivity decay)
 *
 * Output is the canonical input for:
 *  - the "🔴 Today's Priorities" batch panel
 *  - the priority-sorted ClientSwitcher
 *  - the AI command-bar batch intents
 */

export type PriorityTier = "critical" | "warning" | "stable";

export interface PriorityReason {
  kind:
    | "deadline_today"
    | "deadline_soon"
    | "deadline_overdue"
    | "approvals_pending"
    | "vat_risk"
    | "missing_data"
    | "anomaly"
    | "financial_risk"
    | "stale";
  label: string;          // human-readable Swedish label
  weight: number;         // contribution to score
  module?: "vat" | "approvals" | "tasks" | "annual" | "agi" | "bookkeeping" | "supplier_invoices";
  count?: number;
  daysUntil?: number;
}

export interface ClientPriority {
  client: FirmClientOps;
  score: number;                // 0..100
  tier: PriorityTier;
  reasons: PriorityReason[];
  topReason: PriorityReason | null;
  primaryAction: PrimaryAction | null;
}

export interface PrimaryAction {
  label: string;
  module: NonNullable<PriorityReason["module"]>;
  /** Route to land on after activating client (defaults to /dashboard) */
  route: string;
}

const MODULE_ROUTE: Record<NonNullable<PriorityReason["module"]>, string> = {
  vat: "/vat",
  approvals: "/approvals",
  tasks: "/tasks",
  annual: "/annual-report",
  agi: "/agi",
  bookkeeping: "/dashboard",
  supplier_invoices: "/supplier-invoices",
};

function daysFromNow(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.round((target - now) / 86400000);
}

function actionForReason(r: PriorityReason): PrimaryAction | null {
  if (!r.module) return null;
  const labels: Record<string, string> = {
    vat: "Granska moms",
    approvals: "Hantera attest",
    tasks: "Öppna uppgifter",
    annual: "Öppna årsredovisning",
    agi: "Öppna AGI",
    bookkeeping: "Öppna bokföring",
    supplier_invoices: "Granska leverantörsfakturor",
  };
  return { label: labels[r.module] ?? "Öppna klient", module: r.module, route: MODULE_ROUTE[r.module] };
}

interface EngineState {
  clients: ClientPriority[];
  byId: Map<string, ClientPriority>;
  critical: ClientPriority[];
  warning: ClientPriority[];
  stable: ClientPriority[];
  topBatch: ClientPriority[];   // top 3-5 for the priority panel
  isLoading: boolean;
}

export function useClientPriorityEngine(): EngineState {
  const { firmId, isLoading: ctxLoading } = useAdvisorContext();
  const { data: baseClients = [], isLoading: clientsLoading } = useFirmClients(firmId ?? "");
  const { data: ops = [], isLoading: opsLoading } = useFirmClientsOps(firmId ?? "", baseClients);
  const { data: deadlines = [], isLoading: dlLoading } = useFirmDeadlines();
  const { data: approvals = [], isLoading: apLoading } = useFirmApprovalQueue();

  const isLoading = ctxLoading || clientsLoading || opsLoading || dlLoading || apLoading;

  return useMemo<EngineState>(() => {
    if (ops.length === 0) {
      return {
        clients: [],
        byId: new Map(),
        critical: [],
        warning: [],
        stable: [],
        topBatch: [],
        isLoading,
      };
    }

    // Index deadlines by company
    const dlByCompany = new Map<string, FirmDeadline[]>();
    deadlines.forEach((d) => {
      const key = d.company_id ?? d.client_id ?? "";
      if (!key) return;
      const list = dlByCompany.get(key) ?? [];
      list.push(d);
      dlByCompany.set(key, list);
    });

    // Index approvals by company
    const apCountByCompany = new Map<string, number>();
    (approvals as Array<{ company_id?: string | null }>).forEach((a) => {
      const key = a.company_id;
      if (!key) return;
      apCountByCompany.set(key, (apCountByCompany.get(key) ?? 0) + 1);
    });

    const enriched: ClientPriority[] = ops.map((c) => {
      const reasons: PriorityReason[] = [];
      let score = 0;

      // 1. Deadlines (proximity-weighted)
      const clientDeadlines = dlByCompany.get(c.id) ?? [];
      let nextDeadline: FirmDeadline | null = null;
      let nextDaysUntil = Infinity;
      clientDeadlines.forEach((d) => {
        const days = daysFromNow(d.due_date);
        const overdue = days < 0;
        const today = days === 0;
        const soon = days > 0 && days <= 3;
        const week = days > 3 && days <= 7;

        let weight = 0;
        let kind: PriorityReason["kind"] = "deadline_soon";
        if (overdue) {
          weight = 35 + Math.min(15, Math.abs(days) * 2);
          kind = "deadline_overdue";
        } else if (today) {
          weight = 30;
          kind = "deadline_today";
        } else if (soon) {
          weight = 22;
          kind = "deadline_soon";
        } else if (week) {
          weight = 10;
          kind = "deadline_soon";
        }

        if (weight > 0) {
          score += weight;
          // Map deadline_type → module
          const t = d.deadline_type.toLowerCase();
          const module: PriorityReason["module"] =
            t.includes("vat") || t.includes("moms")
              ? "vat"
              : t.includes("agi") || t.includes("payroll") || t.includes("skatt")
              ? "agi"
              : t.includes("annual") || t.includes("ar") || t.includes("year")
              ? "annual"
              : "tasks";
          reasons.push({
            kind,
            label:
              kind === "deadline_overdue"
                ? `${d.label} – försenad ${Math.abs(days)}d`
                : kind === "deadline_today"
                ? `${d.label} – idag`
                : `${d.label} – om ${days}d`,
            weight,
            module,
            daysUntil: days,
          });
        }
        if (days >= 0 && days < nextDaysUntil) {
          nextDaysUntil = days;
          nextDeadline = d;
        }
      });

      // 2. Approvals pending
      const apCount = apCountByCompany.get(c.id) ?? 0;
      if (apCount > 0) {
        const w = Math.min(40, 8 + apCount * 6);
        score += w;
        reasons.push({
          kind: "approvals_pending",
          label: `${apCount} attest väntar`,
          weight: w,
          module: "approvals",
          count: apCount,
        });
      }

      // 3. VAT specific risk
      if (c.vatStatus === "late") {
        score += 25;
        reasons.push({ kind: "vat_risk", label: "Moms försenad", weight: 25, module: "vat" });
      } else if (c.vatStatus === "pending" && nextDaysUntil <= 7) {
        score += 12;
        reasons.push({
          kind: "vat_risk",
          label: "Moms väntar på inlämning",
          weight: 12,
          module: "vat",
        });
      }

      // 4. Missing data / draft entries
      if (c.draftEntries > 5) {
        const w = Math.min(20, c.draftEntries);
        score += w;
        reasons.push({
          kind: "missing_data",
          label: `${c.draftEntries} ej bokförda verifikat`,
          weight: w,
          module: "bookkeeping",
          count: c.draftEntries,
        });
      }

      // 5. AI risk score (anomalies / overdue invoices etc.)
      if (c.riskScore >= 70) {
        score += 20;
        reasons.push({
          kind: "anomaly",
          label: `Hög riskpoäng (${c.riskScore})`,
          weight: 20,
        });
      } else if (c.riskScore >= 50) {
        score += 10;
        reasons.push({
          kind: "anomaly",
          label: `Förhöjd risk (${c.riskScore})`,
          weight: 10,
        });
      }

      // 6. Financial risk
      if (c.profitability !== null && c.profitability < 0) {
        score += 12;
        reasons.push({
          kind: "financial_risk",
          label: "Negativt resultat 12m",
          weight: 12,
        });
      }

      // 7. Stale activity (no entries in 60+ days = blocker)
      if (c.lastActivity) {
        const since = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
        if (since > 60) {
          score += 8;
          reasons.push({
            kind: "stale",
            label: `Ingen aktivitet på ${Math.round(since)}d`,
            weight: 8,
            module: "bookkeeping",
          });
        }
      }

      // Sort reasons by weight desc
      reasons.sort((a, b) => b.weight - a.weight);
      const topReason = reasons[0] ?? null;

      // Tier
      const tier: PriorityTier = score >= 50 ? "critical" : score >= 20 ? "warning" : "stable";

      return {
        client: c,
        score: Math.min(100, Math.round(score)),
        tier,
        reasons,
        topReason,
        primaryAction: topReason ? actionForReason(topReason) : null,
      };
    });

    // Sort: highest score first
    enriched.sort((a, b) => b.score - a.score);

    const critical = enriched.filter((e) => e.tier === "critical");
    const warning = enriched.filter((e) => e.tier === "warning");
    const stable = enriched.filter((e) => e.tier === "stable");

    // Top batch: critical first, then top warnings, capped at 5 / min 3 if available
    const topBatch = [...critical, ...warning].slice(0, 5);

    const byId = new Map(enriched.map((e) => [e.client.id, e]));

    return { clients: enriched, byId, critical, warning, stable, topBatch, isLoading };
  }, [ops, deadlines, approvals, isLoading]);
}

/**
 * Lightweight intent matcher mapping a free-text query to a relevant
 * priority reason kind. Used by the AI command bar to return a *batch*
 * of clients that match the intent (e.g. "fix VAT" → all clients with
 * vat_risk or vat-deadline reasons).
 */
export type IntentMatch = "vat" | "approvals" | "deadlines" | "missing" | "risk" | null;

export function matchIntent(query: string): IntentMatch {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  if (/\b(moms|vat|skattedek)\b/.test(q)) return "vat";
  if (/\b(attest|approv|godk[aä]nn)\b/.test(q)) return "approvals";
  if (/\b(deadline|frist|f[oö]rfall|sista)\b/.test(q)) return "deadlines";
  if (/\b(saknas|missing|underlag|kvitto)\b/.test(q)) return "missing";
  if (/\b(risk|anomali|fel|misst[aä]nk)\b/.test(q)) return "risk";
  return null;
}

export function filterByIntent(
  clients: ClientPriority[],
  intent: IntentMatch,
): ClientPriority[] {
  if (!intent) return [];
  return clients.filter((c) => {
    return c.reasons.some((r) => {
      if (intent === "vat") return r.module === "vat" || r.kind === "vat_risk";
      if (intent === "approvals") return r.module === "approvals";
      if (intent === "deadlines")
        return r.kind === "deadline_today" || r.kind === "deadline_overdue" || r.kind === "deadline_soon";
      if (intent === "missing") return r.kind === "missing_data";
      if (intent === "risk") return r.kind === "anomaly" || r.kind === "financial_risk";
      return false;
    });
  });
}
