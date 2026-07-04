import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldAlert, AlertTriangle, Copy, TrendingUp, UserX, ShoppingCart,
  Clock, BookOpen, Loader2, CheckCircle, XCircle, Eye,
  ChevronDown, ChevronRight, FileText, History, CalendarDays,
  Radio, BarChart3,
} from "lucide-react";
import { AnomalyResolveSheet, IgnoreReasonSheet } from "./AnomalyResolveSheet";
import { FraudFingerprint } from "./FraudFingerprint";
import { AnomalyThresholdEditor } from "./AnomalyThresholdEditor";
import { AnomalyTrendDashboard } from "./AnomalyTrendDashboard";
import { AnomalyBenchmark } from "./AnomalyBenchmark";
import {
  escalateAnomaly,
  getResolvedAnomalyIds,
  subscribeEscalations,
} from "@/lib/ai/escalatedAnomalies";


interface AnomalyDetectionProps {
  companyId: string;
}

export interface Anomaly {
  id: string;
  category: "duplicate" | "unusual_amount" | "round_number" | "ghost_vendor" | "personal_expense" | "timing" | "account_misuse" | "price_increase" | "new_vendor_high" | "account_direction" | "vat_mismatch" | "missing_period" | "revenue_drop";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  details: string[];
  status: "pending" | "ignored" | "corrected" | "investigating";
  crossRefs?: { type: "invoice" | "history" | "tax_deadline"; label: string }[];
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  duplicate: { icon: Copy, label: "Dubbletter", color: "text-[#F97316]" },
  unusual_amount: { icon: TrendingUp, label: "Ovanligt belopp", color: "text-[#EF4444]" },
  round_number: { icon: AlertTriangle, label: "Jämna belopp", color: "text-[#EAB308]" },
  ghost_vendor: { icon: UserX, label: "Spökleverantör", color: "text-[#EF4444]" },
  personal_expense: { icon: ShoppingCart, label: "Privat kostnad", color: "text-purple-500" },
  timing: { icon: Clock, label: "Tidpunktsavvikelse", color: "text-[#3B82F6]" },
  account_misuse: { icon: BookOpen, label: "Kontomissbruk", color: "text-[#7A5417]" },
  price_increase: { icon: TrendingUp, label: "Prisavvikelse", color: "text-[#F97316]" },
  new_vendor_high: { icon: UserX, label: "Ny leverantör, högt belopp", color: "text-[#EF4444]" },
  account_direction: { icon: BookOpen, label: "Konteringsavvikelse", color: "text-[#EF4444]" },
  vat_mismatch: { icon: AlertTriangle, label: "Momsavstämningsfel", color: "text-[#EAB308]" },
  missing_period: { icon: CalendarDays, label: "Saknad post", color: "text-[#3B82F6]" },
  revenue_drop: { icon: TrendingUp, label: "Intäktsavvikelse", color: "text-[#EF4444]" },
};

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Thresholds {
  duplicateTimeDays: number;
  duplicateAmountDiffPct: number;
  unusualAmountMultiplier: number;
  roundNumberMinAmount: number;
  personalKeywords: string;
}

const getThresholds = (): Thresholds => {
  try {
    const s = localStorage.getItem("anomaly_thresholds");
    if (s) return JSON.parse(s);
  } catch {}
  return {
    duplicateTimeDays: 7,
    duplicateAmountDiffPct: 5,
    unusualAmountMultiplier: 200,
    roundNumberMinAmount: 5000,
    personalKeywords: "ica, coop, hemköp, willys, systembolaget, gym, sats, spotify, netflix, hm, zara, stadium, apoteket",
  };
};

interface JournalLine {
  debit: number;
  credit: number;
  chart_of_accounts: { account_number: string; account_name: string } | null;
}

interface JournalEntry {
  id: string;
  description: string | null;
  entry_date: string;
  created_at: string;
  journal_number: string | null;
  journal_entry_lines: JournalLine[];
}

export const AnomalyDetection = ({ companyId }: AnomalyDetectionProps) => {
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyScore, setAnomalyScore] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Anomaly | null>(null);
  const [ignoreTarget, setIgnoreTarget] = useState<Anomaly | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    runDetection();
  }, [companyId]);

  // Live polling
  useEffect(() => {
    if (liveMode) {
      intervalRef.current = setInterval(() => { runDetection(true); }, 60000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [liveMode, companyId]);

  const runDetection = async (silent = false) => {
    if (!silent) setLoading(true);
    const thresholds = getThresholds();
    const personalKw = thresholds.personalKeywords.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

    try {
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, description, entry_date, created_at, journal_number, journal_entry_lines(debit, credit, chart_of_accounts(account_number, account_name))")
        .eq("company_id", companyId)
        .order("entry_date", { ascending: false })
        .limit(500);

      if (!entries) { setLoading(false); return; }

      const typedEntries = entries as unknown as JournalEntry[];

      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, due_date, status")
        .eq("company_id", companyId)
        .limit(200);

      // Load previous resolutions to exclude already-resolved anomalies
      const { data: pastResolutions } = await supabase
        .from("anomaly_resolutions")
        .select("anomaly_key")
        .eq("company_id", companyId);
      const resolvedKeys = new Set((pastResolutions || []).map((r: Record<string, unknown>) => r.anomaly_key as string));

      const found: Anomaly[] = [];

      const now = new Date();
      const nextTaxDay = (() => {
        const d = new Date(now.getFullYear(), now.getMonth(), 12);
        if (d <= now) d.setMonth(d.getMonth() + 1);
        return d;
      })();
      const daysToTax = Math.ceil((nextTaxDay.getTime() - now.getTime()) / 86400000);

      // 1. DUPLICATE DETECTION
      const amountVendorMap = new Map<string, { date: string; id: string; desc: string; amount: number; journalNum?: string }[]>();
      for (const e of typedEntries) {
        const lines = e.journal_entry_lines || [];
        for (const l of lines) {
          const amt = l.debit || l.credit || 0;
          const desc = (e.description || "").toLowerCase().trim();
          if (amt <= 0 || !desc) continue;
          const key = `${amt}-${desc.slice(0, 20)}`;
          if (!amountVendorMap.has(key)) amountVendorMap.set(key, []);
          amountVendorMap.get(key)!.push({ date: e.entry_date, id: e.id, desc: e.description || "", amount: amt, journalNum: e.journal_number || undefined });
        }
      }
      for (const [, items] of amountVendorMap) {
        if (items.length < 2) continue;
        for (let i = 0; i < items.length - 1; i++) {
          const d1 = new Date(items[i].date);
          const d2 = new Date(items[i + 1].date);
          const daysDiff = Math.abs(d1.getTime() - d2.getTime()) / 86400000;
          if (daysDiff <= thresholds.duplicateTimeDays) {
            const amt = items[i].amount;
            const crossRefs = buildCrossRefs(amt, items[i].desc, invoices || [], daysToTax, items);
            const anomalyId = `dup-${items[i].id}-${items[i + 1].id}`;
            found.push({
              id: anomalyId,
              category: "duplicate", severity: "high",
              title: `Möjlig dubbelbetalning: ${items[i].desc.slice(0, 30)}`,
              description: `${fmt(amt)} kr bokfördes 2 gånger (${items[i].date} + ${items[i + 1].date})`,
              details: [
                `Datum: ${items[i].date}`,
                `Belopp: ${fmt(amt)} kr`,
                `Motpart: ${items[i].desc}`,
                items[i].journalNum ? `Verifikation: ${items[i].journalNum}` : "",
                `Matchad mot: ${items[i + 1].date} (${Math.round(daysDiff)} dagar senare)`,
              ].filter(Boolean),
              status: resolvedKeys.has(anomalyId) ? "corrected" : "pending",
              crossRefs,
            });
            break;
          }
        }
      }

      // 2. UNUSUAL AMOUNTS
      const vendorAmounts = new Map<string, number[]>();
      for (const e of typedEntries) {
        const desc = (e.description || "").toLowerCase().trim().slice(0, 25);
        if (!desc) continue;
        const lines = e.journal_entry_lines || [];
        const total = lines.reduce((s: number, l: JournalLine) => s + (l.debit || 0), 0);
        if (total <= 0) continue;
        if (!vendorAmounts.has(desc)) vendorAmounts.set(desc, []);
        vendorAmounts.get(desc)!.push(total);
      }
      for (const [vendor, amounts] of vendorAmounts) {
        if (amounts.length < 3) continue;
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const latest = amounts[0];
        const multiplier = thresholds.unusualAmountMultiplier / 100;
        if (latest > avg * multiplier && latest > 5000) {
          const anomalyId = `unusual-${vendor}`;
          found.push({
            id: anomalyId, category: "unusual_amount", severity: "high",
            title: `Ovanligt stort belopp: ${vendor}`,
            description: `${fmt(latest)} kr -- normalt ~${fmt(Math.round(avg))} kr`,
            details: [`Senaste: ${fmt(latest)} kr`, `Genomsnitt: ${fmt(Math.round(avg))} kr`, `Historiska transaktioner: ${amounts.length}`, `Avvikelse: ${Math.round((latest / avg) * 100)}%`],
            status: resolvedKeys.has(anomalyId) ? "corrected" : "pending",
            crossRefs: buildCrossRefs(latest, vendor, invoices || [], daysToTax, []),
          });
        }
      }

      // 3. ROUND NUMBER
      const roundMap = new Map<string, { count: number; dates: string[] }>();
      for (const e of typedEntries) {
        const lines = e.journal_entry_lines || [];
        for (const l of lines) {
          const amt = l.debit || 0;
          if (amt >= thresholds.roundNumberMinAmount && amt % 1000 === 0) {
            const key = `${amt}`;
            if (!roundMap.has(key)) roundMap.set(key, { count: 0, dates: [] });
            roundMap.get(key)!.count++;
            roundMap.get(key)!.dates.push(e.entry_date);
          }
        }
      }
      for (const [amt, data] of roundMap) {
        if (data.count >= 3) {
          const dates = data.dates.slice(0, 3);
          const span = Math.abs(new Date(dates[0]).getTime() - new Date(dates[dates.length - 1]).getTime()) / 86400000;
          if (span <= 30) {
            const anomalyId = `round-${amt}`;
            found.push({
              id: anomalyId, category: "round_number", severity: "medium",
              title: `${data.count} betalningar a ${fmt(parseInt(amt))} kr`,
              description: `Jämna belopp inom ${Math.round(span)} dagar`,
              details: dates.map(d => `Datum: ${d}`),
              status: resolvedKeys.has(anomalyId) ? "corrected" : "pending",
            });
          }
        }
      }

      // 4. PERSONAL EXPENSE
      for (const e of typedEntries) {
        const desc = (e.description || "").toLowerCase();
        for (const kw of personalKw) {
          if (desc.includes(kw)) {
            const lines = e.journal_entry_lines || [];
            const amt = lines.reduce((s: number, l: JournalLine) => s + (l.debit || 0), 0);
            const acct = lines[0]?.chart_of_accounts?.account_number || "?";
            const acctName = lines[0]?.chart_of_accounts?.account_name || "";
            const anomalyId = `personal-${e.id}`;
            found.push({
              id: anomalyId, category: "personal_expense", severity: "medium",
              title: `Potentiell privat kostnad: ${e.description?.slice(0, 40)}`,
              description: `${fmt(amt)} kr mot konto ${acct}`,
              details: [`Beskrivning: ${e.description}`, `Belopp: ${fmt(amt)} kr`, `Konto: ${acct} ${acctName}`, `Datum: ${e.entry_date}`],
              status: resolvedKeys.has(anomalyId) ? "corrected" : "pending",
            });
            break;
          }
        }
      }

      // 5. TIMING
      const oddTiming: { id: string; desc: string; time: string; day: string }[] = [];
      for (const e of typedEntries) {
        if (!e.created_at) continue;
        const dt = new Date(e.created_at);
        const hour = dt.getUTCHours();
        if (hour >= 0 && hour < 5) {
          const day = dt.getUTCDay();
          oddTiming.push({ id: e.id, desc: e.description || "", time: `${hour}:00`, day: ["son", "man", "tis", "ons", "tor", "fre", "lor"][day] });
        }
      }
      if (oddTiming.length >= 3) {
        found.push({
          id: "timing-night", category: "timing", severity: "low",
          title: `${oddTiming.length} transaktioner bokförda nattetid`,
          description: `Bokfördes 00:00-05:00`,
          details: oddTiming.slice(0, 5).map(t => `${t.desc.slice(0, 30)} -- kl ${t.time} (${t.day})`),
          status: resolvedKeys.has("timing-night") ? "corrected" : "pending",
        });
      }

      // 6. ACCOUNT MISUSE
      const acctUsage = new Map<string, { name: string; count: number }>();
      for (const e of typedEntries) {
        const lines = e.journal_entry_lines || [];
        for (const l of lines) {
          const acct = l.chart_of_accounts?.account_number;
          const name = l.chart_of_accounts?.account_name || "";
          if (!acct) continue;
          if (!acctUsage.has(acct)) acctUsage.set(acct, { name, count: 0 });
          acctUsage.get(acct)!.count++;
        }
      }
      for (const acct of ["6999", "3999", "4999", "7699"]) {
        const usage = acctUsage.get(acct);
        if (usage && usage.count > 10) {
          const anomalyId = `misuse-${acct}`;
          found.push({
            id: anomalyId, category: "account_misuse", severity: "medium",
            title: `Konto ${acct} ${usage.name} överanvänt`,
            description: `${usage.count} transaktioner`,
            details: [`Konto: ${acct} ${usage.name}`, `Antal: ${usage.count}`, `Rekommendation: Omfördela`],
            status: resolvedKeys.has(anomalyId) ? "corrected" : "pending",
          });
        }
      }

      // 7. ROUND NUMBER FROM UNKNOWN COUNTERPARTY (>10k)
      const knownVendors = new Set<string>();
      for (const e of typedEntries) {
        const d = (e.description || "").toLowerCase().trim();
        if (d) knownVendors.add(d.slice(0, 25));
      }
      // Count occurrences per vendor
      const vendorCounts = new Map<string, number>();
      for (const e of typedEntries) {
        const d = (e.description || "").toLowerCase().trim().slice(0, 25);
        if (!d) continue;
        vendorCounts.set(d, (vendorCounts.get(d) || 0) + 1);
      }
      for (const e of typedEntries.slice(0, 100)) {
        const lines = e.journal_entry_lines || [];
        const total = lines.reduce((s: number, l: JournalLine) => s + (l.debit || 0), 0);
        const desc = (e.description || "").toLowerCase().trim().slice(0, 25);
        if (total >= 10000 && total % 1000 === 0 && desc && (vendorCounts.get(desc) || 0) <= 1) {
          const anomalyId = `round-unknown-${e.id}`;
          if (resolvedKeys.has(anomalyId)) continue;
          found.push({
            id: anomalyId, category: "round_number", severity: "medium",
            title: `Kontrollera ursprung: ${fmt(total)} kr`,
            description: `Jämnt belopp från okänd motpart "${e.description?.slice(0, 30) || "?"}"`,
            details: [`Belopp: ${fmt(total)} kr`, `Motpart: ${e.description}`, `Datum: ${e.entry_date}`, `Tidigare transaktioner från motpart: 0`],
            status: "pending",
          });
        }
      }

      // 8. SUPPLIER PRICE INCREASE (>40% vs avg of last 3)
      const vendorHistory = new Map<string, { date: string; amount: number; id: string }[]>();
      for (const e of typedEntries) {
        const desc = (e.description || "").toLowerCase().trim().slice(0, 25);
        if (!desc) continue;
        const lines = e.journal_entry_lines || [];
        const total = lines.reduce((s: number, l: JournalLine) => s + (l.debit || 0), 0);
        if (total <= 0) continue;
        if (!vendorHistory.has(desc)) vendorHistory.set(desc, []);
        vendorHistory.get(desc)!.push({ date: e.entry_date, amount: total, id: e.id });
      }
      for (const [vendor, items] of vendorHistory) {
        if (items.length < 4) continue;
        const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
        const latest = sorted[0];
        const prev3 = sorted.slice(1, 4);
        const avg = prev3.reduce((s, x) => s + x.amount, 0) / prev3.length;
        if (avg > 0 && latest.amount > avg * 1.4 && latest.amount > 2000) {
          const anomalyId = `price-${latest.id}`;
          if (resolvedKeys.has(anomalyId)) continue;
          const pct = Math.round((latest.amount / avg - 1) * 100);
          found.push({
            id: anomalyId, category: "price_increase", severity: "medium",
            title: `Prisavvikelse — ${vendor}`,
            description: `${fmt(latest.amount)} kr — ${pct}% högre än snitt`,
            details: [`Senaste: ${fmt(latest.amount)} kr (${latest.date})`, `Snitt 3 senaste: ${fmt(Math.round(avg))} kr`, `Avvikelse: +${pct}%`, `Rekommendation: Kontrollera fakturan`],
            status: "pending",
          });
        }
      }

      // 9. NEW VENDOR HIGH PAYMENT (>25k, no prior history)
      for (const e of typedEntries) {
        const desc = (e.description || "").toLowerCase().trim().slice(0, 25);
        if (!desc) continue;
        const history = vendorHistory.get(desc) || [];
        const lines = e.journal_entry_lines || [];
        const total = lines.reduce((s: number, l: JournalLine) => s + (l.debit || 0), 0);
        if (total >= 25000 && history.length === 1) {
          const anomalyId = `newvendor-${e.id}`;
          if (resolvedKeys.has(anomalyId)) continue;
          found.push({
            id: anomalyId, category: "new_vendor_high", severity: "high",
            title: `Ny leverantör, högt belopp: ${e.description?.slice(0, 30)}`,
            description: `${fmt(total)} kr — ingen tidigare historik`,
            details: [`Belopp: ${fmt(total)} kr`, `Motpart: ${e.description}`, `Datum: ${e.entry_date}`, `Rekommendation: Verifiera leverantörens identitet och bankuppgifter`],
            status: "pending",
          });
        }
      }

      // 10. ACCOUNT DIRECTION ANOMALIES (cost on revenue acct or vice versa)
      for (const e of typedEntries) {
        const lines = e.journal_entry_lines || [];
        for (const l of lines) {
          const acct = l.chart_of_accounts?.account_number;
          if (!acct) continue;
          const first = acct[0];
          // Revenue (3xxx) should be credit; if posted as debit (>0) without offsetting credit on revenue, flag
          if (first === "3" && l.debit > 0 && l.credit === 0) {
            const anomalyId = `dir-rev-debit-${e.id}-${acct}`;
            if (resolvedKeys.has(anomalyId)) continue;
            found.push({
              id: anomalyId, category: "account_direction", severity: "high",
              title: `Fel kontoklass: kostnad på intäktskonto ${acct}`,
              description: `${fmt(l.debit)} kr debet på intäktskonto`,
              details: [`Konto: ${acct} ${l.chart_of_accounts?.account_name || ""}`, `Belopp debet: ${fmt(l.debit)} kr`, `Verifikation: ${e.journal_number || e.id}`, `Datum: ${e.entry_date}`],
              status: "pending",
            });
          }
          // Cost (4-7xxx) should be debit; if posted as large credit, flag
          if (["4", "5", "6", "7"].includes(first) && l.credit > 0 && l.debit === 0 && l.credit > 1000) {
            const anomalyId = `dir-cost-credit-${e.id}-${acct}`;
            if (resolvedKeys.has(anomalyId)) continue;
            found.push({
              id: anomalyId, category: "account_direction", severity: "medium",
              title: `Fel kontoklass: intäkt på kostnadskonto ${acct}`,
              description: `${fmt(l.credit)} kr kredit på kostnadskonto`,
              details: [`Konto: ${acct} ${l.chart_of_accounts?.account_name || ""}`, `Belopp kredit: ${fmt(l.credit)} kr`, `Verifikation: ${e.journal_number || e.id}`, `Datum: ${e.entry_date}`],
              status: "pending",
            });
          }
        }
      }

      // 11. VAT WITHOUT BASE
      for (const e of typedEntries) {
        const lines = e.journal_entry_lines || [];
        const vatLines = lines.filter(l => {
          const a = l.chart_of_accounts?.account_number || "";
          return a.startsWith("261") || a.startsWith("264") || a.startsWith("265");
        });
        const baseLines = lines.filter(l => {
          const a = l.chart_of_accounts?.account_number || "";
          const f = a[0];
          return f === "3" || f === "4" || f === "5" || f === "6" || f === "7";
        });
        if (vatLines.length > 0 && baseLines.length === 0) {
          const vatTotal = vatLines.reduce((s, l) => s + (l.debit || l.credit || 0), 0);
          if (vatTotal < 50) continue;
          const anomalyId = `vat-nobase-${e.id}`;
          if (resolvedKeys.has(anomalyId)) continue;
          found.push({
            id: anomalyId, category: "vat_mismatch", severity: "high",
            title: `Momsavstämningsfel — saknar basbelopp`,
            description: `${fmt(vatTotal)} kr moms utan motsvarande intäkt/kostnad`,
            details: [`Verifikation: ${e.journal_number || e.id}`, `Beskrivning: ${e.description}`, `Momsbelopp: ${fmt(vatTotal)} kr`, `Datum: ${e.entry_date}`],
            status: "pending",
          });
        }
      }

      // 12. REVENUE DROP MoM (>30%)
      const monthlyRevenue = new Map<string, number>();
      for (const e of typedEntries) {
        const ym = e.entry_date.slice(0, 7);
        const lines = e.journal_entry_lines || [];
        for (const l of lines) {
          const acct = l.chart_of_accounts?.account_number || "";
          if (acct[0] === "3") {
            monthlyRevenue.set(ym, (monthlyRevenue.get(ym) || 0) + (l.credit || 0));
          }
        }
      }
      const months = [...monthlyRevenue.keys()].sort().reverse();
      if (months.length >= 2) {
        const cur = monthlyRevenue.get(months[0]) || 0;
        const prev = monthlyRevenue.get(months[1]) || 0;
        if (prev > 5000 && cur < prev * 0.7) {
          const drop = Math.round((1 - cur / prev) * 100);
          const anomalyId = `revdrop-${months[0]}`;
          if (!resolvedKeys.has(anomalyId)) {
            found.push({
              id: anomalyId, category: "revenue_drop", severity: "high",
              title: `Intäktsavvikelse: ${months[0]}`,
              description: `Intäkter -${drop}% jämfört med ${months[1]}`,
              details: [`${months[0]}: ${fmt(cur)} kr`, `${months[1]}: ${fmt(prev)} kr`, `Förändring: -${drop}%`, `Rekommendation: Kontrollera om fakturor missats eller periodiserats fel`],
              status: "pending",
            });
          }
        }
      }

      // 13. MISSING PERIODIC ACTIVITY (cost account active >=3 months, zero current month)
      const acctMonthly = new Map<string, Map<string, number>>();
      for (const e of typedEntries) {
        const ym = e.entry_date.slice(0, 7);
        const lines = e.journal_entry_lines || [];
        for (const l of lines) {
          const acct = l.chart_of_accounts?.account_number || "";
          const f = acct[0];
          if (f !== "5" && f !== "6" && f !== "7") continue;
          if (!acctMonthly.has(acct)) acctMonthly.set(acct, new Map());
          const m = acctMonthly.get(acct)!;
          m.set(ym, (m.get(ym) || 0) + (l.debit || 0));
        }
      }
      const curYm = new Date().toISOString().slice(0, 7);
      for (const [acct, m] of acctMonthly) {
        const activeMonths = [...m.entries()].filter(([, v]) => v > 0).map(([k]) => k);
        if (activeMonths.length >= 3 && !m.has(curYm)) {
          const anomalyId = `missing-${acct}-${curYm}`;
          if (resolvedKeys.has(anomalyId)) continue;
          found.push({
            id: anomalyId, category: "missing_period", severity: "low",
            title: `Saknad post på konto ${acct}`,
            description: `Aktivt ${activeMonths.length} tidigare månader — inget bokfört ${curYm}`,
            details: [`Konto: ${acct}`, `Aktiv historik: ${activeMonths.length} månader`, `Aktuell månad: ${curYm} (0 kr)`, `Kontrollera om kostnaden ska periodiseras eller saknas`],
            status: "pending",
          });
        }
      }

      // Deduplicate
      const seen = new Set<string>();
      const unique = found.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });

      // If live mode and new anomalies appeared, show notification
      if (silent && unique.filter(a => a.status === "pending").length > prevCountRef.current) {
        const newCount = unique.filter(a => a.status === "pending").length - prevCountRef.current;
        toast.info(`${newCount} ny(a) anomali(er) detekterade`);
      }
      prevCountRef.current = unique.filter(a => a.status === "pending").length;

      setAnomalies(unique);
      setAnomalyScore(Math.min(100, unique.filter(a => a.status === "pending").reduce((s, a) => s + (a.severity === "high" ? 25 : a.severity === "medium" ? 10 : 3), 0)));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleResolve = (id: string, reason: string, actions: string[], type: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: type === "false_positive" ? "ignored" as const : "corrected" as const } : a));
    toast.success(type === "false_positive" ? "Markerad som falsk positiv -- AI lär sig" : `Anomali löst: ${reason}`);
  };

  const handleIgnore = (id: string, reason: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: "ignored" as const } : a));
    toast.success("Ignorerad -- AI lär sig av ditt val");
  };

  const handleEscalate = (id: string) => {
    const a = anomalies.find((x) => x.id === id);
    if (!a) return;
    const suggestionByCategory: Record<string, string> = {
      duplicate: `Reversera möjlig dubblett: ${a.title}`,
      unusual_amount: `Granska avvikande belopp: ${a.title}`,
      round_number: `Verifiera jämnt belopp: ${a.title}`,
      ghost_vendor: `Spärra/utred spökleverantör: ${a.title}`,
      personal_expense: `Omklassificera privat kostnad: ${a.title}`,
      timing: `Justera period: ${a.title}`,
      account_misuse: `Korrigera kontering: ${a.title}`,
      price_increase: `Granska prisförändring: ${a.title}`,
      new_vendor_high: `KYC/granska ny leverantör: ${a.title}`,
      account_direction: `Korrigera kontotyp/riktning: ${a.title}`,
      vat_mismatch: `Stäm av moms: ${a.title}`,
      missing_period: `Komplettera saknad post: ${a.title}`,
      revenue_drop: `Utred intäktsavvikelse: ${a.title}`,
    };
    escalateAnomaly({
      anomalyId: id,
      title: a.title,
      description: a.description,
      severity: a.severity,
      category: a.category,
      suggestedAction: suggestionByCategory[a.category] ?? `Granska anomali: ${a.title}`,
    });
    setAnomalies((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "investigating" as const } : x)),
    );
    toast.success("Eskalerad till granskningskön", {
      description: "Skapad som review-post i Att granska.",
      action: {
        label: "Visa",
        onClick: () => {
          window.location.href = "/agents/review";
        },
      },
    });
  };

  // Bidirectional sync: when an escalated review item is resolved on the
  // review side, mark the anomaly as corrected here.
  useEffect(() => {
    const applyResolved = () => {
      const resolved = new Set(getResolvedAnomalyIds());
      setAnomalies((prev) =>
        prev.map((a) =>
          resolved.has(a.id) && a.status !== "corrected"
            ? { ...a, status: "corrected" as const }
            : a,
        ),
      );
    };
    applyResolved();
    return subscribeEscalations(applyResolved);
  }, []);

  const pendingCount = anomalies.filter(a => a.status === "pending").length;
  const highCount = anomalies.filter(a => a.severity === "high" && a.status === "pending").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">AI Anomali & Fraud Detection</h2>
            <p className="text-sm text-muted-foreground">Automatisk övervakning av alla transaktioner</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Live toggle */}
          <div className="flex items-center gap-2">
            {liveMode && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]" />
              </span>
            )}
            <span className="text-xs text-muted-foreground">Live</span>
            <Switch checked={liveMode} onCheckedChange={setLiveMode} />
          </div>
          <AnomalyThresholdEditor onSave={() => runDetection()} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={anomalyScore > 50 ? "border-[#EF4444]/30" : anomalyScore > 20 ? "border-[#EAB308]/30" : "border-[#22c55e]/30"}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Anomalipoäng</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold">{anomalyScore}</p>
              <p className="text-sm text-muted-foreground mb-1">/ 100</p>
            </div>
            <Progress value={anomalyScore} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {anomalyScore <= 20 ? "Låg risk" : anomalyScore <= 50 ? "Medel risk" : "Hög risk -- åtgärd krävs"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Att granska</p>
            <p className="text-3xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">anomalier väntar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Hög prioritet</p>
            <p className="text-3xl font-bold text-[#EF4444]">{highCount}</p>
            <p className="text-xs text-muted-foreground mt-1">omedelbar granskning</p>
          </CardContent>
        </Card>
      </div>

      {/* Category badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const count = anomalies.filter(a => a.category === key && a.status === "pending").length;
          if (count === 0) return null;
          const Icon = cfg.icon;
          return (
            <Badge key={key} variant="outline" className="gap-1 py-1">
              <Icon className={`h-3 w-3 ${cfg.color}`} />
              {cfg.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Att granska ({pendingCount})</TabsTrigger>
          <TabsTrigger value="all">Alla ({anomalies.length})</TabsTrigger>
          <TabsTrigger value="trends" className="gap-1">Trender</TabsTrigger>
          <TabsTrigger value="fingerprint">Riskprofil</TabsTrigger>
          <TabsTrigger value="benchmark">Branschjämförelse</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 mt-4">
          {anomalies.filter(a => a.status === "pending").length === 0 ? (
            <Card><CardContent className="py-10 text-center">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-[#22c55e]" />
              <p className="text-sm text-muted-foreground">Inga avvikelser -- bra jobbat!</p>
            </CardContent></Card>
          ) : (
            anomalies.filter(a => a.status === "pending").map(a => (
              <AnomalyCard key={a.id} anomaly={a} expanded={expandedId === a.id}
                onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                onResolve={() => setResolveTarget(a)}
                onIgnore={() => setIgnoreTarget(a)}
                onEscalate={() => handleEscalate(a.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-2 mt-4">
          {anomalies.map(a => (
            <AnomalyCard key={a.id} anomaly={a} expanded={expandedId === a.id}
              onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onResolve={() => setResolveTarget(a)}
              onIgnore={() => setIgnoreTarget(a)}
              onEscalate={() => handleEscalate(a.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <AnomalyTrendDashboard companyId={companyId} anomalies={anomalies} />
        </TabsContent>

        <TabsContent value="fingerprint" className="mt-4">
          <FraudFingerprint anomalies={anomalies} />
        </TabsContent>

        <TabsContent value="benchmark" className="mt-4">
          <AnomalyBenchmark anomalies={anomalies} />
        </TabsContent>
      </Tabs>

      {/* Sheets */}
      <AnomalyResolveSheet
        anomaly={resolveTarget}
        open={!!resolveTarget}
        companyId={companyId}
        onClose={() => setResolveTarget(null)}
        onResolve={handleResolve}
      />
      <IgnoreReasonSheet anomaly={ignoreTarget} open={!!ignoreTarget} onClose={() => setIgnoreTarget(null)} onIgnore={handleIgnore} />
    </div>
  );
};

// Cross-reference builder
function buildCrossRefs(
  amount: number, desc: string, invoices: Record<string, unknown>[], daysToTax: number, duplicateItems: Record<string, unknown>[]
): Anomaly["crossRefs"] {
  const refs: NonNullable<Anomaly["crossRefs"]> = [];
  const matchedInv = invoices.find(inv => Math.abs((inv.total_amount as number) - amount) < 1);
  if (matchedInv) refs.push({ type: "invoice", label: `Faktura #${matchedInv.invoice_number || "?"}` });
  if (duplicateItems.length > 2) refs.push({ type: "history", label: `${duplicateItems.length - 1} tidigare liknande` });
  if (daysToTax <= 7) refs.push({ type: "tax_deadline", label: `${daysToTax}d till skattedag` });
  return refs.length > 0 ? refs : undefined;
}

// Card component
function AnomalyCard({ anomaly, expanded, onToggle, onResolve, onIgnore, onEscalate }: {
  anomaly: Anomaly; expanded: boolean;
  onToggle: () => void; onResolve: () => void; onIgnore: () => void; onEscalate: () => void;
}) {
  const cfg = CATEGORY_CONFIG[anomaly.category];
  const Icon = cfg.icon;

  const severityStyle = anomaly.severity === "high"
    ? "border-[#EF4444]/20"
    : anomaly.severity === "medium"
      ? "border-[#EAB308]/20"
      : "";

  return (
    <Card className={`${anomaly.status !== "pending" ? "opacity-60" : ""} ${severityStyle} transition-all`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3 cursor-pointer" onClick={onToggle}>
          <Icon className={`h-5 w-5 ${cfg.color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{anomaly.title}</p>
              <Badge className={`text-[10px] ${
                anomaly.severity === "high" ? "bg-[#EF4444] text-white" :
                anomaly.severity === "medium" ? "bg-[#EAB308] text-white" :
                "bg-[#3B82F6] text-white"
              }`}>
                {anomaly.severity === "high" ? "Kritisk" : anomaly.severity === "medium" ? "Medium" : "Info"}
              </Badge>
              {anomaly.status !== "pending" && (
                <Badge variant="outline" className="text-[10px]">
                  {anomaly.status === "ignored" ? "Falsk positiv" : anomaly.status === "corrected" ? "Löst" : "Under utredning"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{anomaly.description}</p>

            {anomaly.crossRefs && anomaly.crossRefs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {anomaly.crossRefs.map((ref, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] gap-1 font-normal">
                    {ref.type === "invoice" && <FileText className="h-2.5 w-2.5" />}
                    {ref.type === "history" && <History className="h-2.5 w-2.5" />}
                    {ref.type === "tax_deadline" && <CalendarDays className="h-2.5 w-2.5" />}
                    {ref.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        </div>

        {expanded && (
          <div className="mt-3 ml-8 space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              {anomaly.details.map((d, i) => (
                <p key={i} className="text-xs text-muted-foreground">{d}</p>
              ))}
            </div>
            {anomaly.status === "pending" && (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="default" onClick={onResolve}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Granska
                </Button>
                <Button size="sm" variant="outline" onClick={onIgnore}>
                  <XCircle className="h-3 w-3 mr-1" /> Ignorera
                </Button>
                <Button size="sm" variant="destructive" onClick={onEscalate}>
                  <Eye className="h-3 w-3 mr-1" /> Eskalera
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
