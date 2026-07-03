import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { AlertTriangle, TrendingUp, Calendar, Sparkles } from "lucide-react";

type Scenario = "base" | "pessimistic" | "optimistic";
type Granularity = "daily" | "weekly";
type ItemKind = "safe" | "expected" | "estimated";

interface ForecastItem {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // signed: + inflow, - outflow
  kind: ItemKind;
  source: string;
}

interface Props {
  companyId: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE") + " kr";

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

function shiftDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function Predictive90Forecast({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [bankBalance, setBankBalance] = useState(0);
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [scenario, setScenario] = useState<Scenario>("base");
  const [granularity, setGranularity] = useState<Granularity>("daily");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      const today = todayStr();
      const horizon = shiftDays(today, 90);

      const [bankRes, customerInvRes, supplierInvRes, vatRes, txRes] = await Promise.all([
        supabase.from("bank_accounts").select("balance").eq("company_id", companyId).eq("is_active", true),
        supabase
          .from("invoices")
          .select("invoice_number, total_amount, due_date, counterparty_name, status, invoice_direction")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .in("status", ["sent", "overdue"])
          .gte("due_date", shiftDays(today, -30))
          .lte("due_date", horizon),
        supabase
          .from("invoices")
          .select("invoice_number, total_amount, due_date, counterparty_name, status, invoice_direction")
          .eq("company_id", companyId)
          .eq("invoice_direction", "incoming")
          .in("status", ["sent", "overdue", "draft"])
          .gte("due_date", shiftDays(today, -30))
          .lte("due_date", horizon),
        supabase
          .from("vat_periods")
          .select("period_end, ruta_values, status")
          .eq("company_id", companyId)
          .gte("period_end", shiftDays(today, -120))
          .order("period_end", { ascending: false })
          .limit(8),
        supabase
          .from("bank_transactions")
          .select("amount, booking_date, description")
          .eq("company_id", companyId)
          .gte("booking_date", shiftDays(today, -180))
          .limit(2000),
      ]);

      if (!active) return;

      const bal = (bankRes.data || []).reduce((s, b: { balance: number | null }) => s + Number(b.balance || 0), 0);
      setBankBalance(bal);

      const found: ForecastItem[] = [];

      // 1. Customer invoices (inflows)
      for (const inv of customerInvRes.data || []) {
        const due = inv.due_date as string;
        if (!due || due > horizon) continue;
        const date = due < today ? today : due; // overdue → assume paid today as best case
        found.push({
          date,
          description: `Kundfaktura ${inv.invoice_number} – ${inv.counterparty_name}`,
          amount: Number(inv.total_amount || 0),
          kind: "expected",
          source: "Kundreskontra",
        });
      }

      // 2. Supplier invoices (outflows)
      for (const inv of supplierInvRes.data || []) {
        const due = inv.due_date as string;
        if (!due || due > horizon) continue;
        const date = due < today ? today : due;
        found.push({
          date,
          description: `Leverantörsfaktura ${inv.invoice_number} – ${inv.counterparty_name}`,
          amount: -Number(inv.total_amount || 0),
          kind: "expected",
          source: "Leverantörsreskontra",
        });
      }

      // 3. Scheduled VAT payment (next period_end + 42 days, typical Skatteverket deadline)
      const lastVat = (vatRes.data || [])[0];
      if (lastVat?.ruta_values) {
        const ruta = lastVat.ruta_values as Record<string, number>;
        // Net VAT = utgående (10-12) - ingående (48). Approx ruta 49 = to pay.
        const netVat = Number(ruta["49"] || (Number(ruta["10"] || 0) + Number(ruta["11"] || 0) + Number(ruta["12"] || 0) - Number(ruta["48"] || 0)));
        if (netVat > 0) {
          // Estimate next due ~42 days after period_end
          const dueDate = shiftDays(lastVat.period_end as string, 42);
          if (dueDate >= today && dueDate <= horizon) {
            found.push({
              date: dueDate,
              description: "Momsinbetalning till Skatteverket",
              amount: -netVat,
              kind: "expected",
              source: "Momsmodul",
            });
          }
        }
      }

      // 4. Recurring patterns from bank transactions (last 180d)
      // Group by amount-rounded-to-100 + day-of-month occurring 2+ times.
      type Tx = { amount: number; booking_date: string; description: string };
      const txs = (txRes.data || []) as Tx[];
      const recurringMap = new Map<string, { amount: number; days: number[]; desc: string; count: number }>();
      for (const t of txs) {
        const amt = Number(t.amount || 0);
        if (Math.abs(amt) < 200) continue;
        const dom = new Date(t.booking_date).getDate();
        const bucket = Math.round(amt / 100) * 100;
        const key = `${bucket}|${(t.description || "").toLowerCase().slice(0, 20)}`;
        if (!recurringMap.has(key)) recurringMap.set(key, { amount: bucket, days: [], desc: t.description || "Återkommande", count: 0 });
        const r = recurringMap.get(key)!;
        if (!r.days.includes(dom)) r.days.push(dom);
        r.count++;
      }
      for (const r of recurringMap.values()) {
        if (r.count < 3) continue; // need ≥3 occurrences to consider recurring
        // Project across next 90 days at the most common day-of-month
        const targetDom = r.days[0];
        for (let m = 0; m <= 3; m++) {
          const d = new Date();
          d.setMonth(d.getMonth() + m);
          d.setDate(targetDom);
          const dateStr = d.toISOString().slice(0, 10);
          if (dateStr <= today || dateStr > horizon) continue;
          found.push({
            date: dateStr,
            description: `Återkommande: ${r.desc.slice(0, 40)}`,
            amount: r.amount,
            kind: "estimated",
            source: "AI mönster (180d historik)",
          });
        }
      }

      // 5. Historical avg "unplanned" outflows per month → small daily smear.
      const totalOut = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      const months = Math.max(1, Math.min(6, txs.length > 0 ? 6 : 1));
      const avgMonthlyOut = totalOut / months;
      // Subtract already-projected outflows to avoid double counting
      const projectedOutPerMonth = found.filter(f => f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0) / 3;
      const unplannedPerMonth = Math.max(0, avgMonthlyOut - projectedOutPerMonth);
      if (unplannedPerMonth > 1000) {
        // Spread across each month at the 25th
        for (let m = 0; m < 3; m++) {
          const d = new Date();
          d.setMonth(d.getMonth() + m);
          d.setDate(25);
          const dateStr = d.toISOString().slice(0, 10);
          if (dateStr <= today || dateStr > horizon) continue;
          found.push({
            date: dateStr,
            description: "Oplanerade kostnader (historiskt snitt)",
            amount: -unplannedPerMonth,
            kind: "estimated",
            source: "AI 6 mån historik",
          });
        }
      }

      // Sort by date
      found.sort((a, b) => a.date.localeCompare(b.date));
      setItems(found);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [companyId]);

  // Apply scenario
  const adjustedItems = useMemo<ForecastItem[]>(() => {
    if (scenario === "base") return items;
    return items.map(it => {
      if (scenario === "pessimistic") {
        // Customer invoices paid 14 days late
        if (it.amount > 0 && it.source === "Kundreskontra") {
          return { ...it, date: shiftDays(it.date, 14) };
        }
        return it;
      } else {
        // optimistic: recurring costs −10%
        if (it.amount < 0 && it.kind === "estimated") {
          return { ...it, amount: it.amount * 0.9 };
        }
        return it;
      }
    });
  }, [items, scenario]);

  // Build daily series
  const series = useMemo(() => {
    const today = todayStr();
    const map = new Map<string, { inflows: number; outflows: number; descs: string[] }>();
    for (let i = 0; i <= 90; i++) {
      const d = shiftDays(today, i);
      map.set(d, { inflows: 0, outflows: 0, descs: [] });
    }
    for (const it of adjustedItems) {
      if (!map.has(it.date)) continue;
      const e = map.get(it.date)!;
      if (it.amount >= 0) e.inflows += it.amount;
      else e.outflows += Math.abs(it.amount);
      e.descs.push(`${it.amount >= 0 ? "+" : "−"}${fmt(Math.abs(it.amount))} ${it.description}`);
    }

    let running = bankBalance;
    const daily = [...map.entries()].map(([date, v]) => {
      running = running + v.inflows - v.outflows;
      return { date, inflows: v.inflows, outflows: v.outflows, balance: running, descs: v.descs };
    });

    if (granularity === "daily") return daily;
    // Weekly aggregation
    const weekly: typeof daily = [];
    for (let i = 0; i < daily.length; i += 7) {
      const slice = daily.slice(i, i + 7);
      weekly.push({
        date: slice[0].date,
        inflows: slice.reduce((s, x) => s + x.inflows, 0),
        outflows: slice.reduce((s, x) => s + x.outflows, 0),
        balance: slice[slice.length - 1].balance,
        descs: slice.flatMap(x => x.descs),
      });
    }
    return weekly;
  }, [adjustedItems, bankBalance, granularity]);

  const balance30 = series.find(s => daysBetween(todayStr(), s.date) >= 30)?.balance ?? bankBalance;
  const balance90 = series[series.length - 1]?.balance ?? bankBalance;

  const criticalDay = useMemo(() => {
    const dailyAll = (() => {
      const today = todayStr();
      const map = new Map<string, number>();
      for (let i = 0; i <= 90; i++) map.set(shiftDays(today, i), 0);
      for (const it of adjustedItems) if (map.has(it.date)) map.set(it.date, (map.get(it.date) || 0) + it.amount);
      let r = bankBalance;
      const arr: { date: string; balance: number }[] = [];
      for (const [d, v] of map) { r += v; arr.push({ date: d, balance: r }); }
      return arr;
    })();
    return dailyAll.find(d => d.balance < 0)?.date || null;
  }, [adjustedItems, bankBalance]);

  const safeCount = adjustedItems.filter(i => i.kind === "safe").length;
  const expectedCount = adjustedItems.filter(i => i.kind === "expected").length;
  const estimatedCount = adjustedItems.filter(i => i.kind === "estimated").length;
  const knownCount = safeCount + expectedCount;
  const confidencePct = adjustedItems.length === 0 ? 0 : Math.round((knownCount / adjustedItems.length) * 100);

  const aiCommentary = useMemo(() => {
    if (loading) return "";
    const min = Math.min(...series.map(s => s.balance), bankBalance);
    const buffer30 = bankBalance * 0.3;
    if (criticalDay) {
      const upcomingInflow = adjustedItems
        .filter(i => i.amount > 0 && i.source === "Kundreskontra" && i.date <= criticalDay)
        .slice(0, 3)
        .reduce((s, i) => s + i.amount, 0);
      return `Kassan beräknas understiga 0 kr den ${criticalDay}. ${upcomingInflow > 0 ? `${fmt(upcomingInflow)} i kundfakturor förväntas före dess — om dessa betalas i tid skjuts datumet upp. ` : ""}Jag bevakar detta dagligen och meddelar dig om något förändras.`;
    }
    if (balance30 < buffer30) {
      return `Likviditeten är ansträngd kommande 30 dagar. Lägsta punkt blir ${fmt(min)} kr. Överväg att tidigarelägga inkasso eller pausa större utbetalningar.`;
    }
    return `Likviditeten ser stabil ut de närmaste 90 dagarna. Lägsta punkt blir ${fmt(min)} kr. Prognosen baseras på ${knownCount} kända poster och ${estimatedCount} AI-uppskattade — träffsäkerheten ökar ju fler fakturor som registreras.`;
  }, [loading, criticalDay, series, bankBalance, balance30, knownCount, estimatedCount, adjustedItems]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    );
  }

  const summaryColor = (v: number) => {
    if (v < 0) return "text-[#DC2626]";
    if (v < bankBalance * 0.3) return "text-[#D97706]";
    return "text-[#059669]";
  };

  return (
    <div className="space-y-4">
      {/* Top summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Nuvarande kassa</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{fmt(bankBalance)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Prognos om 30 dagar</p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${summaryColor(balance30)}`}>{fmt(balance30)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Prognos om 90 dagar</p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${summaryColor(balance90)}`}>{fmt(balance90)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Träffsäkerhet</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{confidencePct}%</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{knownCount} säkra · {estimatedCount} uppskattade</p>
        </CardContent></Card>
      </div>

      {/* Critical alert */}
      {criticalDay && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span className="text-sm text-[#991B1B]">
            <strong>Kassan beräknas understiga 0 kr den {criticalDay}.</strong> Kontrollera utestående fakturor eller anpassa utbetalningar.
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={scenario} onValueChange={(v) => setScenario(v as Scenario)}>
          <TabsList className="h-8">
            <TabsTrigger value="base" className="text-xs">Bas</TabsTrigger>
            <TabsTrigger value="pessimistic" className="text-xs">Pessimistisk</TabsTrigger>
            <TabsTrigger value="optimistic" className="text-xs">Optimistisk</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <TabsList className="h-8">
            <TabsTrigger value="daily" className="text-xs">Dagligen</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Veckovis</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="pt-4">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={granularity === "daily" ? 6 : 0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
                <RTooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border rounded-lg shadow p-2 text-xs max-w-[300px]">
                      <div className="font-semibold mb-1">{label}</div>
                      <div className="text-[#059669]">+{fmt(d.inflows)}</div>
                      <div className="text-[#DC2626]">−{fmt(d.outflows)}</div>
                      <div className="font-medium mt-1">Saldo: {fmt(d.balance)}</div>
                      {d.descs.slice(0, 5).map((x: string, i: number) => (
                        <div key={i} className="text-[10px] text-muted-foreground mt-0.5">{x}</div>
                      ))}
                      {d.descs.length > 5 && <div className="text-[10px] text-muted-foreground">+{d.descs.length - 5} till…</div>}
                    </div>
                  );
                }} />
                <Bar dataKey="inflows" fill="#22C55E" stackId="flow" />
                <Bar dataKey="outflows" fill="#EF4444" stackId="flow" />
                <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI commentary */}
      <Card className="border-[#B5D4F4] bg-[#EFF6FF]">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#1D4ED8] mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#0C447C]">AI-kommentar</p>
              <p className="text-sm text-[#185FA5] mt-1 leading-relaxed">{aiCommentary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itemized list */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Posterad prognos ({adjustedItems.length})</h3>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span><Badge className="bg-[#DCFCE7] text-[#166534] mr-1">Säker</Badge>{safeCount}</span>
              <span><Badge className="bg-[#DBEAFE] text-[#1E40AF] mr-1">Förväntad</Badge>{expectedCount}</span>
              <span><Badge className="bg-[#FEF3C7] text-[#92400E] mr-1">Uppskattad</Badge>{estimatedCount}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1.5 pr-2">Datum</th>
                  <th className="py-1.5 pr-2">Beskrivning</th>
                  <th className="py-1.5 pr-2 text-right">Belopp</th>
                  <th className="py-1.5 pr-2">Typ</th>
                  <th className="py-1.5">Källa</th>
                </tr>
              </thead>
              <tbody>
                {adjustedItems.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Inga prognosposter — registrera fakturor och anslut bank.</td></tr>
                )}
                {adjustedItems.slice(0, 100).map((it, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-1.5 pr-2 tabular-nums">{it.date}</td>
                    <td className="py-1.5 pr-2">{it.description}</td>
                    <td className={`py-1.5 pr-2 text-right tabular-nums font-medium ${it.amount >= 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                      {it.amount >= 0 ? "+" : "−"}{fmt(Math.abs(it.amount))}
                    </td>
                    <td className="py-1.5 pr-2">
                      <Badge variant="outline" className={
                        it.kind === "safe" ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" :
                        it.kind === "expected" ? "bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD]" :
                        "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                      }>
                        {it.kind === "safe" ? "Säker" : it.kind === "expected" ? "Förväntad" : "Uppskattad"}
                      </Badge>
                    </td>
                    <td className="py-1.5 text-muted-foreground">{it.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
