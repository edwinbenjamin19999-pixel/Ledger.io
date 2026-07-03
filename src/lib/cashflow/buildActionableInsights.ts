import type { ActionableInsight, ARInvoiceLite, APInvoiceLite } from "./types";
import { rankARInvoices } from "./rankARInvoices";
import { identifyDeferrableAP } from "./identifyDeferrableAP";

interface Inputs {
  arInvoices: ARInvoiceLite[];
  apInvoices: APInvoiceLite[];
  cashBalance: number;
  runwayDays: number;
  avgDailyOutflow: number;
}

export function buildActionableInsights({
  arInvoices,
  apInvoices,
  cashBalance,
  runwayDays,
  avgDailyOutflow,
}: Inputs): ActionableInsight[] {
  const insights: ActionableInsight[] = [];
  const today = new Date();

  // ===== AR — Overdue =====
  const ranked = rankARInvoices(arInvoices.filter((i) => i.status === "overdue" || (i.due_date && new Date(i.due_date) < today)));
  if (ranked.length > 0) {
    const totalOverdue = ranked.reduce((s, r) => s + (r.total_amount || 0), 0);
    const top = ranked.slice(0, 5);
    const highRisk = ranked.filter((r) => r.riskLevel === "high").length;
    const buffer = Math.max(1, cashBalance);
    const score = (totalOverdue / buffer) * 100 + highRisk * 10;
    insights.push({
      id: "ar_overdue",
      kind: "ar_overdue",
      priority: score,
      title: `${ranked.length} förfallna kundfakturor`,
      description: `${Math.round(totalOverdue).toLocaleString("sv-SE")} kr utestående · top: ${top[0]?.counterparty_name ?? "—"}`,
      impactSek: totalOverdue,
      confidence: 0.95,
      riskLevel: highRisk > 0 ? "high" : ranked.length > 3 ? "medium" : "low",
      invoiceIds: ranked.map((r) => r.id),
      customerNames: Array.from(new Set(ranked.map((r) => r.counterparty_name || "").filter(Boolean))).slice(0, 5),
      actions: [
        { type: "send_reminders", label: "Skicka påminnelser", variant: "default", payload: { invoice_ids: ranked.map((r) => r.id), tone: "friendly" } },
        { type: "rank_priority", label: "Prioritera kunder", variant: "secondary" },
        { type: "propose_plan", label: "Avbetalningsplan", variant: "outline", payload: { invoice_id: ranked[0]?.id } },
      ],
    });
  }

  // ===== AP — Pressure =====
  const deferrable = identifyDeferrableAP(apInvoices);
  const upcoming30 = apInvoices.filter((i) => {
    if (!i.due_date) return false;
    const d = new Date(i.due_date);
    const diff = (d.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 30;
  });
  const upcomingTotal = upcoming30.reduce((s, i) => s + (i.total_amount || 0), 0);
  if (upcomingTotal > cashBalance * 0.5 || deferrable.length > 0) {
    const savings = deferrable.reduce((s, d) => s + d.estimatedSavingsSek, 0);
    insights.push({
      id: "ap_pressure",
      kind: "ap_pressure",
      priority: (upcomingTotal / Math.max(1, cashBalance)) * 80 + (savings > 0 ? 25 : 0),
      title: deferrable.length > 0 ? `${deferrable.length} betalningar kan skjutas upp` : "Hög utbetalningsbörda",
      description: `${Math.round(upcomingTotal).toLocaleString("sv-SE")} kr förfaller inom 30d · ${Math.round(savings).toLocaleString("sv-SE")} kr potentiell besparing`,
      impactSek: savings || upcomingTotal,
      confidence: 0.85,
      riskLevel: upcomingTotal > cashBalance ? "high" : "medium",
      invoiceIds: upcoming30.map((i) => i.id),
      supplierNames: Array.from(new Set(upcoming30.map((i) => i.counterparty_name || "").filter(Boolean))).slice(0, 5),
      actions: [
        { type: "defer_payments", label: "Granska betalningar", variant: "default", payload: { invoice_ids: deferrable.map((d) => d.id) } },
        { type: "reschedule_payments", label: "Schemalägg om", variant: "secondary" },
        { type: "view_breakdown", label: "Leverantörsbreakdown", variant: "outline" },
      ],
    });
  }

  // ===== Runway low =====
  if (runwayDays < 90 && avgDailyOutflow > 0) {
    insights.push({
      id: "runway_low",
      kind: "runway_low",
      priority: (90 - runwayDays) * 2,
      title: `Likviditeten räcker ${runwayDays} dagar`,
      description: `Vid nuvarande utflödestakt (${Math.round(avgDailyOutflow).toLocaleString("sv-SE")} kr/dag)`,
      impactSek: cashBalance,
      confidence: 0.9,
      riskLevel: runwayDays < 30 ? "high" : runwayDays < 60 ? "medium" : "low",
      invoiceIds: [],
      actions: [
        { type: "defer_payments", label: "Skjut upp utbetalningar", variant: "default" },
        { type: "send_reminders", label: "Driv in fordringar", variant: "secondary" },
        { type: "negotiate", label: "Förhandla villkor", variant: "outline" },
      ],
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}
