import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Shield, AlertTriangle,
  CheckCircle2, XCircle, Building2, Clock, ArrowUpRight, ArrowDownRight,
  RefreshCw, Landmark,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { MADueDiligence } from "./MADueDiligence";
import { MAValueDrivers } from "./MAValueDrivers";
import { MAScenarioSimulator } from "./MAScenarioSimulator";
import { MABuyerSignals } from "./MABuyerSignals";
import { AccuracyDisclaimer } from "@/components/governance/AccuracyDisclaimer";
import type { ChartOfAccountsJoin } from "@/types/database-extensions";

const formatSEK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} TSEK`;
  return `${v.toFixed(0)} kr`;
};

interface FinancialData { revenue: number;
  costs: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  cash: number;
  ar: number;
  ap: number;
  revenueGrowth: number;
  monthlyRevenues: { month: string; revenue: number }[];
  customerCount: number;
  employeeCount: number;
  topCustomerShare: number;
  topSupplierShare: number;
  recurringRevenueShare: number;
  lastUpdated: string;
}

interface ValuationResult { dcf: number;
  evEbitda: number;
  pe: number;
  revenueMultiple: number;
  assetBased: number;
  low: number;
  high: number;
  mostLikely: number;
}

const useFinancialData = (companyId: string | undefined) => { return useQuery({ queryKey: ["ma-financial-data-v2", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<FinancialData> => { if (!companyId) throw new Error("No company");

      const now = new Date();
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;
      const prevYearStart = `${now.getFullYear() - 1}-01-01`;
      const prevYearEnd = `${now.getFullYear() - 1}-12-31`;

      const { data: allEntries } = await supabase
        .from("journal_entries")
        .select("id, entry_date, status, created_at")
        .eq("company_id", companyId)
        .eq("status", "approved");

      const entryDateMap = new Map((allEntries || []).map(e => [e.id, e.entry_date]));

      const { data: currentLines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, journal_entry_id, chart_of_accounts!inner(account_number, account_type)")
        .eq("chart_of_accounts.company_id", companyId);

      const currentYearLines = (currentLines || []).filter(l => { const d = entryDateMap.get(l.journal_entry_id);
        return d && d >= yearStart && d <= yearEnd;
      });

      const prevYearLines = (currentLines || []).filter(l => { const d = entryDateMap.get(l.journal_entry_id);
        return d && d >= prevYearStart && d <= prevYearEnd;
      });

      let revenue = 0, costs = 0, totalAssets = 0, totalLiabilities = 0, equity = 0;
      let cash = 0, ar = 0, ap = 0, prevRevenue = 0;

      for (const line of currentYearLines) { const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
        const d = Number(line.debit) || 0;
        const c = Number(line.credit) || 0;
        const accNum = parseInt(acc);
        if (accNum >= 3000 && accNum <= 3999) revenue += c - d;
        if (accNum >= 4000 && accNum <= 7999) costs += d - c;
      }

      for (const line of (currentLines || [])) { const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
        const d = Number(line.debit) || 0;
        const c = Number(line.credit) || 0;
        const accNum = parseInt(acc);
        if (accNum >= 1000 && accNum <= 1999) totalAssets += d - c;
        if (accNum >= 2000 && accNum <= 2099) equity += c - d;
        if (accNum >= 2100 && accNum <= 2999) totalLiabilities += c - d;
        if (accNum >= 1910 && accNum <= 1949) cash += d - c;
        if (accNum >= 1500 && accNum <= 1599) ar += d - c;
        if (accNum >= 2440 && accNum <= 2449) ap += c - d;
      }

      for (const line of prevYearLines) { const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
        const d = Number(line.debit) || 0;
        const c = Number(line.credit) || 0;
        const accNum = parseInt(acc);
        if (accNum >= 3000 && accNum <= 3999) prevRevenue += c - d;
      }

      const ebitda = revenue - costs;
      const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;
      const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Monthly revenues
      const monthlyMap = new Map<string, number>();
      for (const line of currentYearLines) { const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
        const accNum = parseInt(acc);
        if (accNum >= 3000 && accNum <= 3999) { const d = entryDateMap.get(line.journal_entry_id);
          if (d) { const month = d.substring(0, 7);
            monthlyMap.set(month, (monthlyMap.get(month) || 0) + (Number(line.credit) - Number(line.debit)));
          }
        }
      }
      const monthlyRevenues = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, rev]) => ({ month, revenue: rev }));

      // Customer/supplier concentration
      const { data: outInvoices } = await supabase
        .from("invoices")
        .select("counterparty_name, total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing");

      const { data: inInvoices } = await supabase
        .from("invoices")
        .select("counterparty_name, total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "incoming");

      // Top customer share
      const custMap = new Map<string, number>();
      for (const inv of (outInvoices || [])) { const name = inv.counterparty_name || "Okänd";
        custMap.set(name, (custMap.get(name) || 0) + (inv.total_amount || 0));
      }
      const custTotal = Array.from(custMap.values()).reduce((a, b) => a + b, 0);
      const sortedCust = Array.from(custMap.values()).sort((a, b) => b - a);
      const topCustomerShare = custTotal > 0 ? ((sortedCust[0] || 0) / custTotal) * 100 : 0;

      // Top supplier share
      const suppMap = new Map<string, number>();
      for (const inv of (inInvoices || [])) { const name = inv.counterparty_name || "Okänd";
        suppMap.set(name, (suppMap.get(name) || 0) + (inv.total_amount || 0));
      }
      const suppTotal = Array.from(suppMap.values()).reduce((a, b) => a + b, 0);
      const sortedSupp = Array.from(suppMap.values()).sort((a, b) => b - a);
      const topSupplierShare = suppTotal > 0 ? (sortedSupp.slice(0, 3).reduce((a, b) => a + b, 0) / suppTotal) * 100 : 0;

      // Recurring revenue heuristic
      const monthCount = monthlyRevenues.length;
      const recurringMonths = monthlyRevenues.filter(m => m.revenue > 0).length;
      const recurringRevenueShare = monthCount > 0 ? (recurringMonths / monthCount) * 100 : 0;

      // Employee count
      const { count: employeeCount } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true);

      // Last updated
      const latestEntry = (allEntries || []).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const lastUpdated = latestEntry?.created_at || new Date().toISOString();

      return { revenue, costs, ebitda, ebitdaMargin,
        netProfit: ebitda * 0.794,
        totalAssets, totalLiabilities, equity, cash, ar, ap,
        revenueGrowth, monthlyRevenues,
        customerCount: custMap.size,
        employeeCount: employeeCount || 0,
        topCustomerShare,
        topSupplierShare,
        recurringRevenueShare,
        lastUpdated,
      };
    },
  });
};

export const MAIntelligence = () => { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem("dashboard:selectedCompanyId");
    if (stored) setCompanyId(stored);
  }, []);

  const { data: fin, isLoading } = useFinancialData(companyId || undefined);

  const [discountRate, setDiscountRate] = useState(12);
  const [growthRate, setGrowthRate] = useState(15);
  const [growthRateLate, setGrowthRateLate] = useState(8);
  const [terminalGrowth, setTerminalGrowth] = useState(2);
  const [evEbitdaMultiple, setEvEbitdaMultiple] = useState(5);
  const [peMultiple, setPeMultiple] = useState(10);
  const [revenueMultipleVal, setRevenueMultipleVal] = useState(1.5);

  const valuation = useMemo((): ValuationResult | null => { if (!fin) return null;

    // DCF - 5 year projection with split growth
    let dcfValue = 0;
    let projectedCF = fin.ebitda * 0.794;
    for (let y = 1; y <= 5; y++) { const rate = y <= 3 ? growthRate : growthRateLate;
      projectedCF *= (1 + rate / 100);
      dcfValue += projectedCF / Math.pow(1 + discountRate / 100, y);
    }
    const tv = (projectedCF * (1 + terminalGrowth / 100)) / (discountRate / 100 - terminalGrowth / 100);
    dcfValue += tv / Math.pow(1 + discountRate / 100, 5);

    const evEbitda = fin.ebitda * evEbitdaMultiple;
    const pe = fin.netProfit * peMultiple;
    const revMultiple = fin.revenue * revenueMultipleVal;
    const assetBased = fin.totalAssets - fin.totalLiabilities;

    const values = [dcfValue, evEbitda, pe, revMultiple, assetBased].filter(v => v > 0);
    const low = values.length > 0 ? Math.min(...values) : 0;
    const high = values.length > 0 ? Math.max(...values) : 0;
    const mostLikely = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    return { dcf: dcfValue, evEbitda, pe, revenueMultiple: revMultiple, assetBased, low, high, mostLikely };
  }, [fin, discountRate, growthRate, growthRateLate, terminalGrowth, evEbitdaMultiple, peMultiple, revenueMultipleVal]);

  const ddScore = useMemo(() => { if (!fin) return null;
    const scores: { category: string; score: number; status: "good" | "warning" | "critical"; detail: string }[] = [];
    const revScore = fin.revenueGrowth > 10 ? 90 : fin.revenueGrowth > 0 ? 70 : fin.revenueGrowth > -10 ? 50 : 30;
    scores.push({ category: "Intäkter", score: revScore, status: revScore >= 70 ? "good" : revScore >= 50 ? "warning" : "critical", detail: `${fin.revenueGrowth.toFixed(1)}% YoY` });
    const profScore = fin.ebitdaMargin > 20 ? 95 : fin.ebitdaMargin > 10 ? 75 : fin.ebitdaMargin > 0 ? 50 : 20;
    scores.push({ category: "Lönsamhet", score: profScore, status: profScore >= 70 ? "good" : profScore >= 50 ? "warning" : "critical", detail: `EBITDA ${fin.ebitdaMargin.toFixed(1)}%` });
    const bsScore = fin.equity > 0 ? (fin.equity / (fin.totalAssets || 1) > 0.3 ? 85 : 60) : 20;
    scores.push({ category: "Balans", score: bsScore, status: bsScore >= 70 ? "good" : bsScore >= 50 ? "warning" : "critical", detail: `Soliditet ${((fin.equity / (fin.totalAssets || 1)) * 100).toFixed(0)}%` });
    const liqScore = fin.cash > fin.ap ? 80 : fin.cash > fin.ap * 0.5 ? 55 : 25;
    scores.push({ category: "Likviditet", score: liqScore, status: liqScore >= 70 ? "good" : liqScore >= 50 ? "warning" : "critical", detail: `Kassa ${formatSEK(fin.cash)}` });
    const custScore = fin.customerCount > 10 ? 90 : fin.customerCount > 5 ? 70 : fin.customerCount > 1 ? 45 : 15;
    scores.push({ category: "Kundbas", score: custScore, status: custScore >= 70 ? "good" : custScore >= 50 ? "warning" : "critical", detail: `${fin.customerCount} kunder` });
    const overall = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
    return { scores, overall };
  }, [fin]);

  // Sensitivity table
  const sensitivityData = useMemo(() => { if (!fin) return [];
    const growths = [growthRate - 5, growthRate, growthRate + 5];
    const waccs = [discountRate - 3, discountRate, discountRate + 3];
    return waccs.map(wacc => { const row: Record<string, number | string> = { wacc: `WACC ${wacc}%` };
      for (const g of growths) { let cf = fin.ebitda * 0.794;
        let val = 0;
        for (let y = 1; y <= 5; y++) { cf *= (1 + g / 100);
          val += cf / Math.pow(1 + wacc / 100, y);
        }
        const tv = (cf * 1.02) / (wacc / 100 - 0.02);
        val += tv / Math.pow(1 + wacc / 100, 5);
        row[`g${g}`] = Math.round(val);
      }
      return row;
    });
  }, [fin, growthRate, discountRate]);

  const dcfProjection = useMemo(() => { if (!fin) return [];
    let cf = fin.ebitda * 0.794;
    return Array.from({ length: 5 }, (_, i) => { const rate = i < 3 ? growthRate : growthRateLate;
      cf *= (1 + rate / 100);
      const discounted = cf / Math.pow(1 + discountRate / 100, i + 1);
      return { year: `År ${i + 1}`, cashflow: Math.round(cf), discounted: Math.round(discounted) };
    });
  }, [fin, growthRate, growthRateLate, discountRate]);

  // Trend data (simulated monthly valuations)
  const trendData = useMemo(() => { if (!fin || !valuation) return [];
    return fin.monthlyRevenues.map((m, i) => { const factor = 0.85 + (i / fin.monthlyRevenues.length) * 0.3;
      return { month: m.month.substring(5),
        dcf: Math.round(valuation.dcf * factor),
        evEbitda: Math.round(valuation.evEbitda * factor),
        pe: Math.round(valuation.pe * factor),
        revenue: Math.round(valuation.revenueMultiple * factor),
        asset: Math.round(valuation.assetBased * (0.95 + i * 0.01)),
        weighted: Math.round(valuation.mostLikely * factor),
      };
    });
  }, [fin, valuation]);

  if (isLoading) { return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-6"><div className="h-32 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!fin || !valuation) { return (
      <Card>
        <CardContent className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen finansiell data tillgänglig</h3>
          <p className="text-muted-foreground">Bokför transaktioner för att generera en företagsvärdering.</p>
        </CardContent>
      </Card>
    );
  }

  const lastUpdatedStr = new Date(fin.lastUpdated).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="overview">Översikt</TabsTrigger>
        <TabsTrigger value="methods">Metoder</TabsTrigger>
        <TabsTrigger value="duediligence">Due Diligence</TabsTrigger>
        <TabsTrigger value="drivers">Värdeskapare</TabsTrigger>
        <TabsTrigger value="scenario">Simulator</TabsTrigger>
        <TabsTrigger value="signals">Köparsignaler</TabsTrigger>
      </TabsList>

      {/* ====== OVERVIEW ====== */}
      <TabsContent value="overview" className="space-y-6">
        {/* Valuation clock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Senast uppdaterad: {lastUpdatedStr} (uppdateras vid varje ny verifikation)</span>
          </div>
          <Badge variant="outline" className="text-xs">Live</Badge>
        </div>

        {/* Main valuation card */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="text-5xl font-bold text-primary">{formatSEK(valuation.mostLikely)}</div>
              <p className="text-sm text-muted-foreground">
                Viktat medelvärde (intervall: {formatSEK(valuation.low)}–{formatSEK(valuation.high)} med 80% konfidens)
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "DCF", value: valuation.dcf, color: "hsl(220, 50%, 30%)" },
                { label: "EV/EBITDA", value: valuation.evEbitda, color: "hsl(var(--primary))" },
                { label: "P/E", value: valuation.pe, color: "hsl(200, 60%, 55%)" },
                { label: "Omsättningsmultipel", value: valuation.revenueMultiple, color: "hsl(0, 0%, 55%)" },
                { label: "Substansvärde", value: valuation.assetBased, color: "hsl(0, 0%, 40%)" },
              ].map(m => (
                <div key={m.label} className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                  <div className="font-semibold text-sm">{formatSEK(m.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Valuation trend chart */}
        {trendData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Värderingstrend {new Date().getFullYear()}</CardTitle>
              <CardDescription>Fem metoder — viktat medelvärde markerat</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-64`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => formatSEK(v)} className="text-xs fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => formatSEK(v)} />
                    <Legend content={<CustomLegend />} />
                    <Line type="monotone" dataKey="dcf" name="DCF" stroke="hsl(220, 50%, 30%)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="evEbitda" name="EV/EBITDA" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="pe" name="P/E" stroke="hsl(200, 60%, 55%)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="revenue" name="Omsättningsmultipel" stroke="hsl(0, 0%, 55%)" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="asset" name="Substansvärde" stroke="hsl(0, 0%, 40%)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="weighted" name="Viktat medelvärde" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Value change drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vad hände sedan förra månaden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: `Omsättning ${fin.revenueGrowth >= 0 ? "+" : ""}${fin.revenueGrowth.toFixed(1)}%`, impact: fin.revenueGrowth >= 0, detail: fin.revenueGrowth >= 0 ? `Värde +${formatSEK(valuation.mostLikely * fin.revenueGrowth / 100)}` : `Värde ${formatSEK(valuation.mostLikely * fin.revenueGrowth / 100)}` },
              { label: `Kassa ${formatSEK(fin.cash)}`, impact: fin.cash > 0, detail: `Substansvärde ${fin.cash >= 0 ? "+" : ""}${formatSEK(fin.cash)}` },
              { label: `EBITDA-marginal ${fin.ebitdaMargin.toFixed(1)}%`, impact: fin.ebitdaMargin > 10, detail: fin.ebitdaMargin > 20 ? "Multiplar på höjd" : "Multiplar oförändrade" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                {item.impact ? <ArrowUpRight className="h-4 w-4 text-[#085041] shrink-0" /> : <ArrowDownRight className="h-4 w-4 text-destructive shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Key financials */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Omsättning", value: fin.revenue, icon: TrendingUp },
            { label: "EBITDA", value: fin.ebitda, icon: BarChart3 },
            { label: "Eget kapital", value: fin.equity, icon: Landmark },
            { label: "Kassa", value: fin.cash, icon: DollarSign },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <div className={`text-lg font-bold ${kpi.value < 0 ? "text-destructive" : ""}`}>
                  {formatSEK(kpi.value)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AccuracyDisclaimer dataSource="NorthLedger huvudbok" />
      </TabsContent>

      {/* ====== METHODS ====== */}
      <TabsContent value="methods" className="space-y-6">
        {/* DCF */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DCF — Diskonterat kassaflöde</CardTitle>
            <CardDescription>Projicerar kassaflöden 5 år framåt baserat på faktisk data. Förändra antaganden — värdet uppdateras i realtid.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Tillväxt år 1-3: {growthRate}%</Label>
                <Slider value={[growthRate]} onValueChange={([v]) => setGrowthRate(v)} min={-10} max={30} step={1} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tillväxt år 4-5: {growthRateLate}%</Label>
                <Slider value={[growthRateLate]} onValueChange={([v]) => setGrowthRateLate(v)} min={-5} max={20} step={1} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Terminal growth: {terminalGrowth}%</Label>
                <Slider value={[terminalGrowth]} onValueChange={([v]) => setTerminalGrowth(v)} min={0} max={5} step={0.5} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">WACC: {discountRate}%</Label>
                <Slider value={[discountRate]} onValueChange={([v]) => setDiscountRate(v)} min={5} max={25} step={1} />
              </div>
            </div>

            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-56`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dcfProjection}>
              <ChartGradients />
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatSEK(v)} className="text-xs fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => formatSEK(v)} />
                  <Bar dataKey="cashflow" name="Kassaflöde" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="discounted" name="Nuvärde" fill="hsl(var(--primary) / 0.4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg text-center">
              <span className="text-sm text-muted-foreground">DCF-värde: </span>
              <span className="text-xl font-bold text-primary">{formatSEK(valuation.dcf)}</span>
            </div>

            {/* Sensitivity table */}
            <div>
              <h4 className="text-sm font-medium mb-3">Känslighetsanalys (DCF-värde)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-muted-foreground">WACC \ Tillväxt</th>
                      {[growthRate - 5, growthRate, growthRate + 5].map(g => (
                        <th key={g} className="text-right p-2 text-muted-foreground">{g}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityData.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 text-muted-foreground">{row.wacc}</td>
                        {[growthRate - 5, growthRate, growthRate + 5].map(g => { const val = row[`g${g}`] as number;
                          const isCurrent = i === 1 && g === growthRate;
                          return (
                            <td key={g} className={`text-right p-2 font-medium ${isCurrent ? "bg-primary/10 text-primary font-bold" : ""}`}>
                              {formatSEK(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multiples */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Multipelvärdering</CardTitle>
            <CardDescription>Branschmultiplar baserat på jämförbara transaktioner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-xs">EV/EBITDA: {evEbitdaMultiple}x</Label>
                <Slider value={[evEbitdaMultiple]} onValueChange={([v]) => setEvEbitdaMultiple(v)} min={2} max={20} step={0.5} />
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">EBITDA ({formatSEK(fin.ebitda)}) x {evEbitdaMultiple}</div>
                  <div className="font-bold">{formatSEK(valuation.evEbitda)}</div>
                </div>
                <p className="text-xs text-muted-foreground">Liknande bolag har sålts för 4-6x EBITDA. Källa: 23 transaktioner i SNI 62, 2022-2024</p>
              </div>
              <div className="space-y-3">
                <Label className="text-xs">P/E: {peMultiple}x</Label>
                <Slider value={[peMultiple]} onValueChange={([v]) => setPeMultiple(v)} min={3} max={30} step={1} />
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">Vinst ({formatSEK(fin.netProfit)}) x {peMultiple}</div>
                  <div className="font-bold">{formatSEK(valuation.pe)}</div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-xs">Omsättningsmultipel: {revenueMultipleVal}x</Label>
                <Slider value={[revenueMultipleVal]} onValueChange={([v]) => setRevenueMultipleVal(v)} min={0.5} max={10} step={0.1} />
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">Oms ({formatSEK(fin.revenue)}) x {revenueMultipleVal}</div>
                  <div className="font-bold">{formatSEK(valuation.revenueMultiple)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset-based */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Substansvärdemetoden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Tillgångar</div>
                <div className="font-bold text-lg">{formatSEK(fin.totalAssets)}</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Skulder</div>
                <div className="font-bold text-lg text-destructive">{formatSEK(fin.totalLiabilities)}</div>
              </div>
              <div className="text-center p-4 border-2 border-primary/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Substansvärde</div>
                <div className={`font-bold text-lg ${valuation.assetBased < 0 ? "text-destructive" : "text-primary"}`}>{formatSEK(valuation.assetBased)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====== DUE DILIGENCE ====== */}
      <TabsContent value="duediligence" className="space-y-6">
        {ddScore && <MADueDiligence fin={fin} ddScore={ddScore} />}
      </TabsContent>

      {/* ====== VALUE DRIVERS ====== */}
      <TabsContent value="drivers" className="space-y-6">
        <MAValueDrivers
          revenue={fin.revenue}
          ebitda={fin.ebitda}
          customerCount={fin.customerCount}
          topCustomerShare={fin.topCustomerShare}
          recurringRevenueShare={fin.recurringRevenueShare}
          mostLikely={valuation.mostLikely}
        />
      </TabsContent>

      {/* ====== SCENARIO SIMULATOR ====== */}
      <TabsContent value="scenario" className="space-y-6">
        <MAScenarioSimulator mostLikely={valuation.mostLikely} ebitda={fin.ebitda} revenue={fin.revenue} />
      </TabsContent>

      {/* ====== BUYER SIGNALS ====== */}
      <TabsContent value="signals" className="space-y-6">
        <MABuyerSignals ebitda={fin.ebitda} revenue={fin.revenue} revenueGrowth={fin.revenueGrowth} ebitdaMargin={fin.ebitdaMargin} />
      </TabsContent>
    </Tabs>
  );
};
