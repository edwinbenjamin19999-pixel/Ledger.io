import { useMemo } from "react";

export interface InvoiceLite {
  id: string;
  invoice_number?: string;
  counterparty_name: string | null;
  total_amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  reminder_count: number | null;
  created_at: string;
}

export interface CustomerProfile {
  name: string;
  totalOutstanding: number;
  invoiceCount: number;
  paidCount: number;
  onTimeRate: number;
  avgDaysLate: number;
  totalLifetime: number;
  score: "A" | "B" | "C" | "D" | "E" | "F";
  scoreLabel: string;
  scorePoints: number;
  recommendation: string;
  aiPattern: string;
  creditLimit: number;
  currentExposure: number;
  creditExceeded: boolean;
  maxOverdueDays: number;
  relationMonths: number;
  reminderCount: number;
  risk: "low" | "medium" | "high";
  communicationProfile: {
    bestDay: string;
    bestTime: string;
    bestChannel: string;
    responseRate: number;
    reactsTo: string;
  };
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

function computeScore(
  onTimeRate: number,
  avgDaysLate: number,
  maxOverdueDays: number,
  paidCount: number,
  reminderCount: number,
  relationMonths: number
): { score: CustomerProfile["score"]; label: string; points: number } {
  const historyPts = Math.round(onTimeRate * 40 + Math.max(0, 10 - avgDaysLate * 0.3));
  let overduePenalty = 0;
  if (maxOverdueDays > 90) overduePenalty = -40;
  else if (maxOverdueDays > 60) overduePenalty = -30;
  else if (maxOverdueDays > 30) overduePenalty = -20;
  else if (maxOverdueDays > 15) overduePenalty = -10;
  else if (maxOverdueDays > 5) overduePenalty = -5;
  const relationBonus = Math.min(10, Math.round(relationMonths / 3));
  const volumeBonus = Math.min(10, Math.round(paidCount * 1.5));
  const reminderPenalty = Math.min(20, reminderCount * 3);
  const total = Math.max(0, Math.min(100, historyPts + overduePenalty + relationBonus + volumeBonus - reminderPenalty));
  if (total >= 85) return { score: "A", label: "Pålitlig", points: total };
  if (total >= 70) return { score: "B", label: "God", points: total };
  if (total >= 50) return { score: "C", label: "Bevaka", points: total };
  if (total >= 35) return { score: "D", label: "Risk", points: total };
  if (total >= 15) return { score: "E", label: "Inkassokund", points: total };
  return { score: "F", label: "Avskriven", points: total };
}

function computeCreditLimit(totalLifetime: number, score: CustomerProfile["score"]): number {
  const multiplier = score === "A" ? 0.5 : score === "B" ? 0.35 : score === "C" ? 0.25 : score === "D" ? 0.15 : 0.05;
  return Math.round((totalLifetime * multiplier) / 10000) * 10000 || 25000;
}

function generateCommProfile(name: string, score: CustomerProfile["score"]): CustomerProfile["communicationProfile"] {
  const days = ["måndag", "tisdag", "onsdag", "torsdag", "fredag"];
  const bestDay = days[Math.abs(name.charCodeAt(0) % 5)];
  const morningOrAfternoon = name.charCodeAt(1) % 2 === 0 ? "09-11" : "13-15";
  const responseRate = score === "A" ? 0.92 : score === "B" ? 0.78 : score === "C" ? 0.55 : score === "D" ? 0.34 : 0.18;
  const bestChannel = responseRate > 0.6 ? "E-post" : "SMS";
  const reactsTo = score <= "B" ? "vänliga påminnelser" : score === "C" ? "tydliga deadlines" : "direkt språk med konsekvenser";
  return { bestDay, bestTime: morningOrAfternoon, bestChannel, responseRate, reactsTo };
}

function buildRecommendation(p: CustomerProfile): string {
  if (p.score === "A") return `${p.name} betalar alltid i tid med ${p.relationMonths} månaders relation. Inget behov av särskild uppföljning.`;
  if (p.score === "B") return `${p.name} betalar oftast i tid (snitt ${p.avgDaysLate} dagars försening). Bevaka vid högre belopp. Kreditlimit ${fmt(p.creditLimit)} kr.`;
  if (p.score === "C") return `${p.name} har varierad betaltid (snitt ${p.avgDaysLate} dagar sent). Överväg kortare betalningsvillkor (15 dagar). Kreditlimit ${fmt(p.creditLimit)} kr.`;
  if (p.score === "D") return `${p.name} har ${p.maxOverdueDays} dagars aktuell försening. Kräv 50% förskott. Begränsa exponering till ${fmt(p.creditLimit)} kr.`;
  if (p.score === "E") return `${p.name} är kronisk senleverantör med inkassohistorik. Stoppa leverans tills skulden är betald.`;
  return `${p.name} har avskrivna skulder. Avsluta affärsrelationen eller kräv 100% förskott.`;
}

function buildAIPattern(p: CustomerProfile): string {
  if (p.paidCount === 0 && p.invoiceCount > 0) {
    return `${p.name} har ${p.invoiceCount} öppna fakturor men ingen betalningshistorik. Bevaka noggrant.`;
  }
  if (p.maxOverdueDays > 30) {
    return `${p.name} har fakturor som är ${p.maxOverdueDays} dagar förfallna. Historiskt betalas fakturor i snitt ${p.avgDaysLate} dagar efter förfall.`;
  }
  if (p.avgDaysLate > 15) {
    return `${p.name} betalar nästan alltid sent. Mönster: snitt ${p.avgDaysLate} dagars försening.`;
  }
  if (p.onTimeRate >= 0.9) {
    return `${p.name} betalar ${Math.round(p.onTimeRate * 100)}% av fakturor i tid. Pålitlig kund med ${p.relationMonths} månaders relation.`;
  }
  return `${p.name} har blandat betalningsbeteende. ${Math.round(p.onTimeRate * 100)}% i tid, snitt ${p.avgDaysLate} dagars försening.`;
}

function scoreToRisk(score: CustomerProfile["score"]): "low" | "medium" | "high" {
  if (score === "A" || score === "B") return "low";
  if (score === "C") return "medium";
  return "high";
}

export function buildCustomerProfiles(openInvoices: InvoiceLite[], paidInvoices: InvoiceLite[]): CustomerProfile[] {
  const now = new Date();
  const map = new Map<string, {
    outstanding: number; openCount: number; paidCount: number; onTime: number;
    totalLate: number; lifetime: number; maxOverdueDays: number;
    earliestDate: Date; reminderCount: number;
  }>();

  for (const inv of openInvoices) {
    const n = inv.counterparty_name || "Okänd";
    if (!map.has(n)) map.set(n, { outstanding: 0, openCount: 0, paidCount: 0, onTime: 0, totalLate: 0, lifetime: 0, maxOverdueDays: 0, earliestDate: new Date(), reminderCount: 0 });
    const e = map.get(n)!;
    e.outstanding += Number(inv.total_amount);
    e.openCount++;
    e.lifetime += Number(inv.total_amount);
    e.reminderCount += inv.reminder_count || 0;
    const overdueDays = Math.max(0, Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000));
    if (overdueDays > e.maxOverdueDays) e.maxOverdueDays = overdueDays;
    const created = new Date(inv.created_at);
    if (created < e.earliestDate) e.earliestDate = created;
  }

  for (const inv of paidInvoices) {
    const n = inv.counterparty_name || "Okänd";
    if (!map.has(n)) map.set(n, { outstanding: 0, openCount: 0, paidCount: 0, onTime: 0, totalLate: 0, lifetime: 0, maxOverdueDays: 0, earliestDate: new Date(), reminderCount: 0 });
    const e = map.get(n)!;
    e.paidCount++;
    e.lifetime += Number(inv.total_amount);
    e.reminderCount += inv.reminder_count || 0;
    const created = new Date(inv.created_at);
    if (created < e.earliestDate) e.earliestDate = created;
    if (inv.paid_at && inv.due_date) {
      const days = Math.floor((new Date(inv.paid_at).getTime() - new Date(inv.due_date).getTime()) / 86400000);
      if (days <= 0) e.onTime++;
      e.totalLate += Math.max(0, days);
    }
  }

  return Array.from(map.entries()).map(([name, d]) => {
    const onTimeRate = d.paidCount > 0 ? d.onTime / d.paidCount : (d.openCount > 0 ? 0 : 0.5);
    const avgDaysLate = d.paidCount > 0 ? Math.round(d.totalLate / d.paidCount) : (d.maxOverdueDays > 0 ? d.maxOverdueDays : 0);
    const relationMonths = Math.max(1, Math.round((now.getTime() - d.earliestDate.getTime()) / (30 * 86400000)));
    const { score, label, points } = computeScore(onTimeRate, avgDaysLate, d.maxOverdueDays, d.paidCount, d.reminderCount, relationMonths);
    const creditLimit = computeCreditLimit(d.lifetime, score);
    const profile: CustomerProfile = {
      name,
      totalOutstanding: d.outstanding,
      invoiceCount: d.openCount,
      paidCount: d.paidCount,
      onTimeRate,
      avgDaysLate,
      totalLifetime: d.lifetime,
      score,
      scoreLabel: label,
      scorePoints: points,
      recommendation: "",
      aiPattern: "",
      creditLimit,
      currentExposure: d.outstanding,
      creditExceeded: d.outstanding > creditLimit,
      maxOverdueDays: d.maxOverdueDays,
      relationMonths,
      reminderCount: d.reminderCount,
      risk: scoreToRisk(score),
      communicationProfile: generateCommProfile(name, score),
    };
    profile.recommendation = buildRecommendation(profile);
    profile.aiPattern = buildAIPattern(profile);
    return profile;
  }).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
}

export function useCustomerProfiles(openInvoices: InvoiceLite[], paidInvoices: InvoiceLite[]): CustomerProfile[] {
  return useMemo(() => buildCustomerProfiles(openInvoices, paidInvoices), [openInvoices, paidInvoices]);
}

export const SCORE_COLOR: Record<CustomerProfile["score"], string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-cyan-50 text-[#3b82f6] border-cyan-200",
  C: "bg-amber-50 text-amber-700 border-amber-200",
  D: "bg-orange-50 text-orange-700 border-orange-200",
  E: "bg-rose-50 text-rose-700 border-rose-200",
  F: "bg-rose-100 text-rose-800 border-rose-300",
};

export const RISK_COLOR: Record<CustomerProfile["risk"], string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
};

export const RISK_LABEL: Record<CustomerProfile["risk"], string> = {
  low: "Låg risk",
  medium: "Medel risk",
  high: "Hög risk",
};
