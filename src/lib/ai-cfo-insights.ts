/**
 * AI CFO Insights Engine
 * Pure data-driven insight generator. Pulls from journal entries, invoices, bank
 * transactions and historical aggregates to produce structured, explainable insights.
 *
 * Each insight includes: title, financial impact (SEK), comparison period,
 * data-driven reason, suggested action, and a pedagogical explanation block.
 */
import { supabase } from "@/integrations/supabase/client";
import { getLiquidCash } from "@/lib/cash/getLiquidCash";

export type InsightCategory = "cashflow" | "ar_risk" | "cost" | "vat" | "profitability";
export type InsightSeverity = "action" | "insight" | "info";

export interface InsightExplanation {
  /** Short, human-readable summary (Simple mode) */
  simple: string;
  /** Accounting reasoning with source references (Detailed mode) */
  detailed: string;
  /** Full audit decision trail (Audit mode) */
  audit: string;
  /** Sources used for this insight */
  sources: string[];
  /** Confidence 0-1 */
  confidence: number;
}

export interface CFOInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  /** Priority score (higher = more urgent). Combination of impact, urgency, recency. */
  priority: number;
  title: string;
  /** Financial impact in SEK (signed; negative = cost/risk) */
  impactSEK: number;
  /** e.g. "vs förra månaden" */
  comparisonPeriod: string;
  /** Data-driven reason */
  reason: string;
  /** Recommended next step */
  recommendation: string;
  /** Optional CTA route */
  ctaRoute?: string;
  ctaLabel?: string;
  explanation: InsightExplanation;
  createdAt: Date;
}

function fmtSEK(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n)) + " kr";
}

function startOfMonthISO(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Compute priority score from financial impact, urgency days, severity */
function score(impactSEK: number, urgencyDays: number, severity: InsightSeverity): number {
  const impactWeight = Math.min(Math.abs(impactSEK) / 1000, 200); // cap at 200
  const urgencyWeight = Math.max(0, 30 - urgencyDays) * 3; // sooner = higher
  const severityWeight = severity === "action" ? 100 : severity === "insight" ? 40 : 10;
  return impactWeight + urgencyWeight + severityWeight;
}

/* -------------------------------------------------------------------------- */
/*  Individual analyzers                                                      */
/* -------------------------------------------------------------------------- */

async function analyzeARRisk(companyId: string): Promise<CFOInsight | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("invoices")
    .select("id, counterparty_name, total_amount, due_date, status")
    .eq("company_id", companyId)
    .in("status", ["sent", "overdue"])
    .lt("due_date", today)
    .limit(50);

  if (!data || data.length === 0) return null;
  const totalAtRisk = data.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  if (totalAtRisk <= 0) return null;

  const oldestDue = data.reduce((min, i) => {
    const d = new Date(i.due_date as string).getTime();
    return d < min ? d : min;
  }, Date.now());
  const daysOverdue = Math.floor((Date.now() - oldestDue) / 86400000);

  return {
    id: `ar-risk-${companyId}`,
    category: "ar_risk",
    severity: "action",
    priority: score(totalAtRisk, 0, "action"),
    title: `${data.length} fakturor förfallna`,
    impactSEK: -totalAtRisk,
    comparisonPeriod: `Äldsta ${daysOverdue} dagar`,
    reason: `Sammanlagt ${fmtSEK(totalAtRisk)} i utestående kundfordringar har passerat förfallodatum.`,
    recommendation: "Skicka påminnelser eller koppla in inkasso.",
    ctaRoute: "/ar-agent",
    ctaLabel: "Hantera fordringar",
    explanation: {
      simple: `${data.length} kundfakturor är förfallna och utgör ${fmtSEK(totalAtRisk)} i risk.`,
      detailed: `Baserat på fakturatabellen: ${data.length} fakturor med status sent/overdue där due_date < ${today}. Total summa ${fmtSEK(totalAtRisk)}. Äldsta posten är ${daysOverdue} dagar förfallen.`,
      audit: `Källa: invoices-tabell, filter (status IN sent/overdue) AND due_date < CURRENT_DATE. Aggregering: SUM(total_amount). Tröskel: > 0 SEK. Beräknat ${new Date().toISOString()}.`,
      sources: ["invoices", "due_date", "status"],
      confidence: 0.98,
    },
    createdAt: new Date(),
  };
}

async function analyzeCashFlow(companyId: string): Promise<CFOInsight | null> {
  // Kanonisk källa för likvid kassa (samma som dashboard, Cash Command, AI-assistenten).
  // Fall tillbaka på bank_accounts endast om huvudboken saknar 191x-rörelser.
  let totalCash = await getLiquidCash(companyId);
  if (totalCash === 0) {
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("balance, currency")
      .eq("company_id", companyId)
      .eq("is_active", true);
    totalCash = (accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
  }

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [incomingRes, outgoingRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("company_id", companyId)
      .in("status", ["sent", "draft"])
      .gte("due_date", today)
      .lte("due_date", in30),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("company_id", companyId)
      .eq("status", "sent")
      .gte("due_date", today)
      .lte("due_date", in30),
  ]);

  const incoming = (incomingRes.data || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const outgoing = (outgoingRes.data || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const projected = totalCash + incoming - outgoing;

  if (totalCash === 0 && incoming === 0) return null;

  const isPositive = projected >= totalCash;
  const delta = projected - totalCash;

  return {
    id: `cashflow-${companyId}`,
    category: "cashflow",
    severity: "insight",
    priority: score(delta, 15, "insight"),
    title: isPositive
      ? `Kassaflödet förbättras med ${fmtSEK(Math.abs(delta))}`
      : `Kassaflödet minskar med ${fmtSEK(Math.abs(delta))}`,
    impactSEK: delta,
    comparisonPeriod: "Kommande 30 dagar",
    reason: `Nuvarande kassa ${fmtSEK(totalCash)}. Förväntade inbetalningar ${fmtSEK(incoming)}, utbetalningar ${fmtSEK(outgoing)}.`,
    recommendation: isPositive
      ? "Överväg att placera överskottet eller amortera."
      : "Granska utgifter och påskynda fakturering.",
    ctaRoute: "/cashflow-forecast",
    ctaLabel: "Visa prognos",
    explanation: {
      simple: `Förväntad kassa om 30 dagar: ${fmtSEK(projected)}.`,
      detailed: `Beräknat från bank_accounts.balance (${fmtSEK(totalCash)}) + förväntade inbetalningar baserat på invoices.due_date inom 30 dagar (${fmtSEK(incoming)}) − förväntade utbetalningar (${fmtSEK(outgoing)}).`,
      audit: `Källor: bank_accounts (is_active=true), invoices (status IN sent/draft, due_date BETWEEN ${today} AND ${in30}). Beräknat ${new Date().toISOString()}.`,
      sources: ["bank_accounts", "invoices.due_date", "invoices.status"],
      confidence: 0.92,
    },
    createdAt: new Date(),
  };
}

async function analyzeCosts(companyId: string): Promise<CFOInsight | null> {
  const thisMonth = startOfMonthISO(0);
  const lastMonth = startOfMonthISO(-1);

  // Sum of cost lines (account starts with 4,5,6,7) per month from journal_entry_lines
  const [thisRes, lastRes] = await Promise.all([
    supabase
      .from("journal_entry_lines")
      .select("debit_amount, credit_amount, account_number, journal_entries!inner(entry_date, company_id)")
      .eq("journal_entries.company_id", companyId)
      .gte("journal_entries.entry_date", thisMonth.split("T")[0])
      .like("account_number", "5%"),
    supabase
      .from("journal_entry_lines")
      .select("debit_amount, credit_amount, account_number, journal_entries!inner(entry_date, company_id)")
      .eq("journal_entries.company_id", companyId)
      .gte("journal_entries.entry_date", lastMonth.split("T")[0])
      .lt("journal_entries.entry_date", thisMonth.split("T")[0])
      .like("account_number", "5%"),
  ]);

  const sumDebit = (rows: any[] | null) =>
    (rows || []).reduce((s, r) => s + (Number(r.debit_amount || 0) - Number(r.credit_amount || 0)), 0);

  const thisCosts = sumDebit(thisRes.data);
  const lastCosts = sumDebit(lastRes.data);

  if (lastCosts <= 0) return null;
  const delta = thisCosts - lastCosts;
  const pct = (delta / lastCosts) * 100;

  if (Math.abs(pct) < 5) return null; // not noteworthy

  const isIncrease = delta > 0;

  return {
    id: `cost-${companyId}`,
    category: "cost",
    severity: isIncrease ? "insight" : "info",
    priority: score(delta, 20, isIncrease ? "insight" : "info"),
    title: `Kostnader ${isIncrease ? "ökade" : "minskade"} ${Math.abs(pct).toFixed(0)}% denna månad`,
    impactSEK: -delta,
    comparisonPeriod: "vs förra månaden",
    reason: `Kostnader (kontoklass 5) gick från ${fmtSEK(lastCosts)} till ${fmtSEK(thisCosts)}.`,
    recommendation: isIncrease ? "Granska kostnadsökningar per konto." : "Behåll trenden.",
    ctaRoute: "/account-analysis",
    ctaLabel: "Analysera konton",
    explanation: {
      simple: `Kostnaderna är ${isIncrease ? "uppe" : "nere"} ${Math.abs(pct).toFixed(0)}% jämfört med föregående månad.`,
      detailed: `Beräknat från journal_entry_lines med account_number LIKE '5%'. Denna månad: ${fmtSEK(thisCosts)}. Föregående månad: ${fmtSEK(lastCosts)}. Förändring: ${fmtSEK(delta)} (${pct.toFixed(1)}%).`,
      audit: `Källa: journal_entry_lines JOIN journal_entries WHERE company_id=${companyId} AND account_number LIKE '5%'. Aggregering: SUM(debit - credit) GROUP BY month. Beräknat ${new Date().toISOString()}.`,
      sources: ["journal_entry_lines", "journal_entries.entry_date"],
      confidence: 0.95,
    },
    createdAt: new Date(),
  };
}

async function analyzeVAT(companyId: string): Promise<CFOInsight | null> {
  const monthStart = startOfMonthISO(0).split("T")[0];

  const { data } = await supabase
    .from("journal_entry_lines")
    .select("debit_amount, credit_amount, account_number, journal_entries!inner(entry_date, company_id)")
    .eq("journal_entries.company_id", companyId)
    .gte("journal_entries.entry_date", monthStart)
    .or("account_number.eq.2611,account_number.eq.2641");

  if (!data || data.length === 0) return null;

  let outputVat = 0; // 2611 (credit-side liability)
  let inputVat = 0; // 2641 (debit-side receivable)
  data.forEach((r: any) => {
    if (r.account_number === "2611") outputVat += Number(r.credit_amount || 0) - Number(r.debit_amount || 0);
    if (r.account_number === "2641") inputVat += Number(r.debit_amount || 0) - Number(r.credit_amount || 0);
  });

  const netVat = outputVat - inputVat;
  if (Math.abs(netVat) < 100) return null;

  return {
    id: `vat-${companyId}`,
    category: "vat",
    severity: "insight",
    priority: score(netVat, 25, "insight"),
    title: netVat > 0 ? `Momsskuld byggs upp: ${fmtSEK(netVat)}` : `Momsfordran: ${fmtSEK(Math.abs(netVat))}`,
    impactSEK: -netVat,
    comparisonPeriod: "Innevarande period",
    reason: `Utgående moms ${fmtSEK(outputVat)} − ingående moms ${fmtSEK(inputVat)} = ${fmtSEK(netVat)}.`,
    recommendation: netVat > 0 ? "Reservera kassa för kommande momsbetalning." : "Du har återbetalning att vänta.",
    ctaRoute: "/moms",
    ctaLabel: "Granska moms",
    explanation: {
      simple: `Du ${netVat > 0 ? "är skyldig" : "ska få tillbaka"} ${fmtSEK(Math.abs(netVat))} i moms denna period.`,
      detailed: `Beräknat från journal_entry_lines på konto 2611 (utgående moms) och 2641 (ingående moms) inom innevarande månad. Netto: ${fmtSEK(netVat)}.`,
      audit: `Källa: journal_entry_lines WHERE account_number IN (2611, 2641) AND entry_date >= ${monthStart}. Beräknat ${new Date().toISOString()}.`,
      sources: ["journal_entry_lines", "konto 2611", "konto 2641"],
      confidence: 0.97,
    },
    createdAt: new Date(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Generate all CFO insights for a company, sorted by priority (highest first).
 */
export async function generateCFOInsights(companyId: string): Promise<CFOInsight[]> {
  const results = await Promise.allSettled([
    analyzeARRisk(companyId),
    analyzeCashFlow(companyId),
    analyzeCosts(companyId),
    analyzeVAT(companyId),
  ]);

  const insights: CFOInsight[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) insights.push(r.value);
  }
  return insights.sort((a, b) => b.priority - a.priority);
}
