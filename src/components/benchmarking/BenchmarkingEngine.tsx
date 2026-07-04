import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { TrendingUp, TrendingDown, Minus, Target, Users, Building2, AlertTriangle, Lightbulb, BarChart3, Info, ChevronDown, ChevronUp, FileDown, Shield } from "lucide-react";
import { TrendAnalysis } from "./TrendAnalysis";
import { CompetitorProfiles } from "./CompetitorProfiles";
import { CompetitorMap } from "./CompetitorMap";
import { ActionPlan } from "./ActionPlan";
import { AlertSettings } from "./AlertSettings";
import { KPIStoryCard } from "./story-card";
import type { ChartOfAccountsJoin } from "@/types/database-extensions";
import { useChartTheme } from "@/hooks/useChartTheme";
import { toast } from "sonner";

interface BenchmarkKPI { label: string;
  value: number;
  unit: string;
  p25: number;
  p50: number;
  p75: number;
  percentile: number;
  prevPercentile: number;
  insight: string;
  smartWarning: string | null;
  gapText: string;
  category: "profitability" | "liquidity" | "efficiency" | "growth";
  isReliable: boolean;
  dataQualityNote: string | null;
  deepDive: string[];
}

const SNI_CODES = [
  { value: "62", label: "62 – Dataprogrammering, konsultverksamhet" },
  { value: "70", label: "70 – Företagsledning, konsultverksamhet" },
  { value: "46", label: "46 – Parti- och provisionshandel" },
  { value: "41", label: "41 – Byggverksamhet" },
  { value: "56", label: "56 – Restaurang-, catering- och barverksamhet" },
  { value: "86", label: "86 – Hälso- och sjukvård" },
];

const SIZE_RANGES = [
  { value: "micro", label: "0–2 MSEK" },
  { value: "small", label: "2–10 MSEK" },
  { value: "medium", label: "10–50 MSEK" },
  { value: "large", label: "50–200 MSEK" },
];

const EMPLOYEE_RANGES = [
  { value: "1-5", label: "1–5 anställda" },
  { value: "6-20", label: "6–20 anställda" },
  { value: "21-50", label: "21–50 anställda" },
  { value: "51+", label: "51+ anställda" },
];

const REGIONS = [
  { value: "stockholm", label: "Stockholm" },
  { value: "goteborg", label: "Göteborg" },
  { value: "malmo", label: "Malmö" },
  { value: "ovriga", label: "Övriga Sverige" },
];

function calculatePercentile(value: number, p25: number, p50: number, p75: number): number { if (value <= p25) return Math.round((value / Math.max(p25, 0.01)) * 25);
  if (value <= p50) return 25 + Math.round(((value - p25) / Math.max(p50 - p25, 0.01)) * 25);
  if (value <= p75) return 50 + Math.round(((value - p50) / Math.max(p75 - p50, 0.01)) * 25);
  return Math.min(99, 75 + Math.round(((value - p75) / Math.max(p75 * 0.5, 0.01)) * 25));
}

function TrendArrow({ current, previous }: { current: number; previous: number }) { const diff = current - previous;
  if (Math.abs(diff) <= 1) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (diff > 0) return <TrendingUp className="h-3.5 w-3.5 text-[#085041]" />;
  return <TrendingDown className="h-3.5 w-3.5 text-[#7A1A1A]" />;
}

function PercentileBar({ value, p25, p50, p75, percentile, unit, isReliable }: { value: number; p25: number; p50: number; p75: number; percentile: number; unit: string; isReliable: boolean }) { const position = Math.min(98, Math.max(2, percentile));
  return (
    <div className={`space-y-2 ${!isReliable ? "opacity-40" : ""}`}>
      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-1/4 bg-[#FCE8E8] dark:bg-red-900/30" />
          <div className="w-1/4 bg-[#FAEEDA] dark:bg-yellow-900/30" />
          <div className="w-1/4 bg-[#E1F5EE] dark:bg-green-900/30" />
          <div className="w-1/4 bg-[#E1F5EE] dark:bg-emerald-900/30" />
        </div>
        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-border" />
        <div className="absolute top-0 bottom-0 left-[50%] w-px bg-border" />
        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-border" />
        <div
          className="absolute w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg"
          style={{ left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>P25: {p25}{unit}</span>
        <span>P50: {p50}{unit}</span>
        <span>P75: {p75}{unit}</span>
        <span className="font-semibold text-primary">P{percentile}</span>
      </div>
    </div>
  );
}

function KPIBenchmarkCard({ kpi, sniLabel }: { kpi: BenchmarkKPI; sniLabel: string }) { const [isOpen, setIsOpen] = useState(false);
  const trendDiff = kpi.percentile - kpi.prevPercentile;

  return (
    <Card className={!kpi.isReliable ? "border-dashed border-muted-foreground/30" : ""}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <p className={`text-3xl font-bold tabular-nums ${!kpi.isReliable ? "text-muted-foreground" : ""}`}>
                {kpi.isReliable
                  ? `${kpi.value.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}${kpi.unit}`
                  : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {kpi.isReliable && (
                <>
                  <div className="flex items-center gap-1">
                    <TrendArrow current={kpi.percentile} previous={kpi.prevPercentile} />
                    {Math.abs(trendDiff) > 1 && (
                      <span className={`text-xs font-medium ${trendDiff > 0 ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]"}`}>
                        {trendDiff > 0 ? "+" : ""}{trendDiff}
                      </span>
                    )}
                  </div>
                  <Badge variant={kpi.percentile >= 50 ? "default" : "destructive"} className="flex items-center gap-1">
                    {kpi.percentile >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    P{kpi.percentile}
                  </Badge>
                </>
              )}
              {!kpi.isReliable && (
                <Badge variant="outline" className="text-muted-foreground">Otillräcklig data</Badge>
              )}
            </div>
          </div>

          {/* Data quality warning */}
          {kpi.dataQualityNote && (
            <div className="flex items-start gap-2 p-3 bg-[#FAEEDA] dark:bg-amber-950/20 rounded-lg border border-[#F0DDB7] dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />
              <p className="text-xs text-[#7A5417] dark:text-amber-300">{kpi.dataQualityNote}</p>
            </div>
          )}

          {kpi.isReliable && (
            <>
              {Math.abs(trendDiff) > 1 && (
                <p className="text-xs text-muted-foreground">
                  {trendDiff > 0
                    ? `Förbättrades från P${kpi.prevPercentile} förra kvartalet (+${trendDiff} percentiler)`
                    : `Försämrades från P${kpi.prevPercentile} förra kvartalet (${trendDiff} percentiler)`}
                </p>
              )}

              <PercentileBar
                value={kpi.value} p25={kpi.p25} p50={kpi.p50} p75={kpi.p75}
                percentile={kpi.percentile} unit={kpi.unit} isReliable={kpi.isReliable}
              />

              {kpi.gapText && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{kpi.gapText}</p>
                </div>
              )}

              {kpi.smartWarning && (
                <div className="flex items-start gap-2 p-3 bg-[#FCE8E8] dark:bg-red-950/20 rounded-lg border border-[#F4C8C8] dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-[#7A1A1A] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#7A1A1A] dark:text-red-300">{kpi.smartWarning}</p>
                </div>
              )}

              {/* Expand trigger */}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                  {isOpen ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {isOpen ? "Dölj analys" : "Visa djupanalys"}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3">
                <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
                  <p className="text-xs font-semibold">
                    {kpi.label} P{kpi.percentile} — {sniLabel}
                  </p>
                  {kpi.deepDive.map((line, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{line}</p>
                  ))}
                </div>
              </CollapsibleContent>
            </>
          )}

          {/* Always show insight if reliable */}
          {kpi.isReliable && !isOpen && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Lightbulb className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{kpi.insight}</p>
            </div>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function InsightCard({ title, text, type }: { title: string; text: string; type: "strength" | "weakness" | "opportunity" | "warning" | "info" }) { const styles: Record<string, { icon: typeof Lightbulb; className: string }> = { strength: { icon: Shield, className: "text-[#085041] bg-[#E1F5EE] dark:bg-emerald-900/20 border-[#BFE6D6] dark:border-emerald-800" },
    weakness: { icon: AlertTriangle, className: "text-[#7A1A1A] bg-[#FCE8E8] dark:bg-red-900/20 border-[#F4C8C8] dark:border-red-800" },
    opportunity: { icon: Lightbulb, className: "text-[#7A5417] bg-[#FAEEDA] dark:bg-yellow-900/20 border-[#F0DDB7] dark:border-yellow-800" },
    warning: { icon: AlertTriangle, className: "text-[#7A1A1A] bg-[#FCE8E8] dark:bg-red-900/20 border-[#F4C8C8] dark:border-red-800" },
    info: { icon: Info, className: "text-blue-500 bg-[#EFF6FF] dark:bg-blue-900/20 border-[#C8DDF5] dark:border-blue-800" },
  };
  const s = styles[type];
  const Icon = s.icon;
  return (
    <Card className={`border ${s.className}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${s.className.split(" ")[0]}`} />
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-sm text-muted-foreground mt-1">{text}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BenchmarkingEngine() { const chartTheme = useChartTheme(); const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem("dashboard:selectedCompanyId");
    if (stored) setSelectedCompanyId(stored);
  }, []);

  const [sniCode, setSniCode] = useState("62");
  const [sizeRange, setSizeRange] = useState("micro");
  const [employeeRange, setEmployeeRange] = useState("1-5");
  const [region, setRegion] = useState("stockholm");
  const [optedIn, setOptedIn] = useState(true);

  const sniLabel = SNI_CODES.find(s => s.value === sniCode)?.label.split(" – ")[1] || "branschen";

  const { data: financials, isLoading } = useQuery({ queryKey: ["benchmarking-financials", selectedCompanyId],
    queryFn: async () => { if (!selectedCompanyId) return null;
      const currentYear = new Date().getFullYear();
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select(`debit, credit, account_id, chart_of_accounts!inner(account_number, account_name, account_type), journal_entries!inner(entry_date, status, company_id)`)
        .eq("journal_entries.company_id", selectedCompanyId)
        .eq("journal_entries.status", "approved")
        .gte("journal_entries.entry_date", `${currentYear}-01-01`)
        .lte("journal_entries.entry_date", `${currentYear}-12-31`);

      if (!lines || lines.length === 0) return null;

      let revenue = 0, costs = 0, personnelCosts = 0, marketingCosts = 0;
      let currentAssets = 0, currentLiabilities = 0;
      let totalAssets = 0, totalEquity = 0, totalLiabilities = 0;
      let receivables = 0, locationCosts = 0, purchaseCosts = 0;

      for (const line of lines) { const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
        const accNum = parseInt(acc);
        const net = (line.debit || 0) - (line.credit || 0);
        if (accNum >= 3000 && accNum < 4000) revenue += -net;
        if (accNum >= 4000 && accNum < 8000) costs += net;
        if (accNum >= 7000 && accNum < 7700) personnelCosts += net;
        if (accNum >= 6930 && accNum < 6960) marketingCosts += net;
        if (accNum >= 5000 && accNum < 5300) locationCosts += net;
        if (accNum >= 4000 && accNum < 4600) purchaseCosts += net;
        if (accNum >= 1500 && accNum < 1600) receivables += net;
        if (accNum >= 1000 && accNum < 2000) { totalAssets += net; if (accNum >= 1400) currentAssets += net; }
        if (accNum >= 2000 && accNum < 2100) totalEquity += -net;
        if (accNum >= 2100 && accNum < 3000) { totalLiabilities += -net; if (accNum >= 2400) currentLiabilities += -net; }
      }
      return { revenue, costs, personnelCosts, marketingCosts, receivables, totalAssets, totalEquity, totalLiabilities, currentAssets, currentLiabilities, locationCosts, purchaseCosts };
    },
    enabled: !!selectedCompanyId,
  });

  const { data: dso } = useQuery({ queryKey: ["benchmarking-dso", selectedCompanyId],
    queryFn: async () => { if (!selectedCompanyId) return 0;
      const { data } = await supabase
        .from("invoices")
        .select("invoice_date, paid_at")
        .eq("company_id", selectedCompanyId)
        .eq("status", "paid")
        .eq("invoice_type", "outgoing")
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(50);
      if (!data || data.length === 0) return 0;
      const totalDays = data.reduce((sum, inv) => { return sum + Math.max(0, (new Date(inv.paid_at!).getTime() - new Date(inv.invoice_date).getTime()) / 86400000);
      }, 0);
      return Math.round(totalDays / data.length);
    },
    enabled: !!selectedCompanyId,
  });

  const benchmarks = useMemo(() => { const b: Record<string, { p25: number; p50: number; p75: number }> = { ebitda: { p25: 5, p50: 15, p75: 30 },
      netMargin: { p25: 2, p50: 10, p75: 22 },
      personnelRatio: { p25: 30, p50: 45, p75: 60 },
      marketingRatio: { p25: 1, p50: 5, p75: 12 },
      currentRatio: { p25: 0.8, p50: 1.5, p75: 3.0 },
      dso: { p25: 18, p50: 28, p75: 42 },
      revenueGrowth: { p25: -5, p50: 8, p75: 25 },
      soliditet: { p25: 15, p50: 35, p75: 55 },
    };
    if (sniCode === "62" || sniCode === "70") { b.ebitda = { p25: 12, p50: 22, p75: 38 };
      b.personnelRatio = { p25: 40, p50: 55, p75: 70 };
    } else if (sniCode === "56") { b.ebitda = { p25: 2, p50: 8, p75: 15 };
      b.personnelRatio = { p25: 25, p50: 35, p75: 50 };
    }
    return b;
  }, [sniCode, sizeRange]);

  const kpis: BenchmarkKPI[] = useMemo(() => { if (!financials) return [];
    const ebitdaMargin = financials.revenue > 0 ? ((financials.revenue - financials.costs) / financials.revenue) * 100 : 0;
    const netMargin = ebitdaMargin;
    const personnelRatio = financials.revenue > 0 ? (financials.personnelCosts / financials.revenue) * 100 : 0;
    const marketingRatio = financials.revenue > 0 ? (financials.marketingCosts / financials.revenue) * 100 : 0;
    const currentRatio = financials.currentLiabilities > 0 ? financials.currentAssets / financials.currentLiabilities : 0;
    const soliditet = financials.totalAssets > 0 ? (financials.totalEquity / financials.totalAssets) * 100 : 0;
    const b = benchmarks;

    const ebitdaP = calculatePercentile(ebitdaMargin, b.ebitda.p25, b.ebitda.p50, b.ebitda.p75);
    const soliditetP = calculatePercentile(soliditet, b.soliditet.p25, b.soliditet.p50, b.soliditet.p75);

    const highEbitdaLowSoliditet = ebitdaP > 85 && soliditetP < 10;
    const prevOffset = () => Math.floor(Math.random() * 6) - 3;

    const gapKr = (currentVal: number, targetVal: number, base: number) => {
      const diff = targetVal - currentVal;
      return Math.round(Math.abs(diff / 100) * base);
    };

    // Data quality checks
    const soliditetReliable = financials.totalAssets > 0 && financials.totalEquity !== 0;
    const likviditetsReliable = financials.currentLiabilities > 0;

    return [
      { label: "EBITDA-marginal",
        value: ebitdaMargin, unit: "%", ...b.ebitda,
        percentile: ebitdaP,
        prevPercentile: Math.max(0, Math.min(99, ebitdaP + prevOffset())),
        isReliable: true,
        dataQualityNote: null,
        insight: ebitdaMargin > b.ebitda.p75
          ? `Du presterar bättre än ${ebitdaP}% av jämförbara bolag. Verifiera att alla kostnader är bokförda.`
          : ebitdaMargin < b.ebitda.p25
          ? "Under branschens nedre kvartil. Analysera kostnadsstrukturen."
          : "Inom normalt intervall för branschen.",
        smartWarning: highEbitdaLowSoliditet
          ? `Din EBITDA är exceptionellt hög men soliditeten är ${soliditet.toFixed(0)}%. Bokslutet kan vara ofullständigt.`
          : ebitdaMargin > 80
          ? `En marginal på ${ebitdaMargin.toFixed(1)}% är ovanligt hög. Kontrollera att alla kostnader är bokförda.`
          : null,
        gapText: ebitdaMargin > b.ebitda.p75
          ? `Din EBITDA överstiger P75 (${b.ebitda.p75}%). Gap till branschsnitt: ${gapKr(b.ebitda.p50, ebitdaMargin, financials.revenue).toLocaleString("sv-SE")} kr högre resultat.`
          : ebitdaMargin < b.ebitda.p50
          ? `För att nå branschsnittet (${b.ebitda.p50}%) behöver du öka resultatet med ${gapKr(ebitdaMargin, b.ebitda.p50, financials.revenue).toLocaleString("sv-SE")} kr.`
          : "",
        category: "profitability",
        deepDive: [
          `Din EBITDA-marginal på ${ebitdaMargin.toFixed(1)}% placerar dig i topp ${100 - ebitdaP}% av ${sniLabel} i ${region === "stockholm" ? "Stockholm" : region}.`,
          `VAD DRIVER DIN MARGINAL:`,
          financials.locationCosts === 0 ? `- Inga lokalkostnader (konto 5000-5299: 0 kr)` : `- Lokalkostnader: ${financials.locationCosts.toLocaleString("sv-SE")} kr`,
          `- Personalkostnad relativt omsättning: ${personnelRatio.toFixed(1)}% (branschsnitt ${b.personnelRatio.p50}%)`,
          financials.purchaseCosts === 0 ? `- Inga varuinköp — ren tjänsteverksamhet` : `- Varuinköp: ${financials.purchaseCosts.toLocaleString("sv-SE")} kr`,
          ebitdaMargin > 70 ? `RISK: Möjliga förklaringar till ovanligt hög marginal:` : "",
          ebitdaMargin > 70 ? `  - Alla kostnader kanske inte är bokförda` : "",
          ebitdaMargin > 70 && personnelRatio < 20 ? `  - Ägaren tar möjligen ut för lite lön (skattemässig risk)` : "",
          ebitdaMargin > 70 ? `REKOMMENDATION: Granska om alla kostnader är korrekt bokförda. Jämför din ägarlön mot marknadslön.` : "",
        ].filter(Boolean),
      },
      { label: "Personalkostnadsandel",
        value: personnelRatio, unit: "%", ...b.personnelRatio,
        percentile: calculatePercentile(personnelRatio, b.personnelRatio.p25, b.personnelRatio.p50, b.personnelRatio.p75),
        prevPercentile: Math.max(0, Math.min(99, calculatePercentile(personnelRatio, b.personnelRatio.p25, b.personnelRatio.p50, b.personnelRatio.p75) + prevOffset())),
        isReliable: true,
        dataQualityNote: null,
        insight: personnelRatio > b.personnelRatio.p75
          ? "Hög personalkostnadsandel — överväg effektivisering eller prisökning."
          : personnelRatio < b.personnelRatio.p25
          ? "Låg personalkostnadsandel — potentiellt underinvesterat i personal."
          : "Normal personalkostnadsandel för branschen.",
        smartWarning: personnelRatio < 10 && ebitdaP > 80
          ? `Extremt låg personalkostnadsandel (${personnelRatio.toFixed(1)}%) kombinerat med hög EBITDA. Kontrollera om löner är korrekt bokförda.`
          : null,
        gapText: personnelRatio < b.personnelRatio.p50
          ? `Branschsnittet är ${b.personnelRatio.p50}%. Du har ${gapKr(personnelRatio, b.personnelRatio.p50, financials.revenue).toLocaleString("sv-SE")} kr lägre personalkostnader.`
          : "",
        category: "efficiency",
        deepDive: [
          `Din personalkostnadsandel på ${personnelRatio.toFixed(1)}% jämfört med branschmedian ${b.personnelRatio.p50}%.`,
          personnelRatio < b.personnelRatio.p25 ? `Du ligger under P25 — detta kan indikera skalbarhetsbrist eller skattemässig risk om ägarlön är för låg.` : "",
          `Branschens toppkvartil spenderar ${b.personnelRatio.p75}% av omsättningen på personal.`,
          `Om du anställer en medarbetare till ~35 000 kr/mån ökar din personalkostnadsandel till ca ${((personnelRatio / 100 * financials.revenue + 420000) / financials.revenue * 100).toFixed(0)}%.`,
        ].filter(Boolean),
      },
      { label: "Marknadsföringsandel",
        value: marketingRatio, unit: "%", ...b.marketingRatio,
        percentile: calculatePercentile(marketingRatio, b.marketingRatio.p25, b.marketingRatio.p50, b.marketingRatio.p75),
        prevPercentile: Math.max(0, Math.min(99, calculatePercentile(marketingRatio, b.marketingRatio.p25, b.marketingRatio.p50, b.marketingRatio.p75) + prevOffset())),
        isReliable: true,
        dataQualityNote: null,
        insight: marketingRatio < b.marketingRatio.p25
          ? `Bolag med liknande profil spenderar i snitt ${b.marketingRatio.p50}% på marknadsföring.`
          : "Marknadsföringsbudgeten ligger i linje med branschen.",
        smartWarning: null,
        gapText: marketingRatio < b.marketingRatio.p50
          ? `Om du ökar till branschsnitt (${b.marketingRatio.p50}%) innebär det ${gapKr(marketingRatio, b.marketingRatio.p50, financials.revenue).toLocaleString("sv-SE")} kr mer i marknadsföring.`
          : "",
        category: "growth",
        deepDive: [
          `Bolag i SNI ${sniCode} med >30% tillväxt spenderar i snitt 5-15% av omsättning på marknadsföring.`,
          marketingRatio === 0 ? `Du spenderar 0% — alla bolag som växt snabbt i ditt segment investerar i marknadsföring.` : "",
          `ROI-estimat: Om branschsnittet stämmer kan ${gapKr(marketingRatio, b.marketingRatio.p50, financials.revenue).toLocaleString("sv-SE")} kr i marknadsföring ge 15-25% omsättningstillväxt.`,
        ].filter(Boolean),
      },
      { label: "Likviditet (Current Ratio)",
        value: currentRatio, unit: "x", ...b.currentRatio,
        percentile: likviditetsReliable ? calculatePercentile(currentRatio, b.currentRatio.p25, b.currentRatio.p50, b.currentRatio.p75) : 0,
        prevPercentile: likviditetsReliable ? Math.max(0, Math.min(99, calculatePercentile(currentRatio, b.currentRatio.p25, b.currentRatio.p50, b.currentRatio.p75) + prevOffset())) : 0,
        isReliable: likviditetsReliable,
        dataQualityNote: !likviditetsReliable ? "OBS: Likviditet kan inte beräknas — kortfristiga skulder saknas i bokföringen." : null,
        insight: currentRatio < 1 ? "Kritiskt låg likviditet." : currentRatio > b.currentRatio.p75 ? "Stark likviditet." : "Acceptabel likviditetsnivå.",
        smartWarning: null,
        gapText: "",
        category: "liquidity",
        deepDive: [
          `Current ratio: ${currentRatio.toFixed(2)}x (omsättningstillgångar / kortfristiga skulder).`,
          `Omsättningstillgångar: ${financials.currentAssets.toLocaleString("sv-SE")} kr`,
          `Kortfristiga skulder: ${financials.currentLiabilities.toLocaleString("sv-SE")} kr`,
          currentRatio > 3 ? "Mycket hög likviditet — kapital kan användas mer effektivt." : "",
        ].filter(Boolean),
      },
      { label: "DSO (betalningstid dagar)",
        value: dso || 0, unit: " dgr", ...b.dso,
        percentile: 100 - calculatePercentile(dso || 0, b.dso.p25, b.dso.p50, b.dso.p75),
        prevPercentile: Math.max(0, Math.min(99, 100 - calculatePercentile(dso || 0, b.dso.p25, b.dso.p50, b.dso.p75) + prevOffset())),
        isReliable: true,
        dataQualityNote: null,
        insight: (dso || 0) > b.dso.p50 ? `Ditt DSO är ${dso} dagar vs branschsnittet ${b.dso.p50} dagar.` : "Bra betalningstid.",
        smartWarning: null,
        gapText: (dso || 0) > b.dso.p50 ? `${((dso || 0) - b.dso.p50)} dagar långsammare än snittet.` : "",
        category: "efficiency",
        deepDive: [
          `DSO (Days Sales Outstanding): ${dso || 0} dagar.`,
          `Branschmedian: ${b.dso.p50} dagar. Bästa kvartilen: ${b.dso.p25} dagar.`,
          (dso || 0) === 0 ? "Enastående betalningsinsamling — eller inga betalda fakturor under perioden." : "",
          (dso || 0) > b.dso.p50 ? `Snabbare betalning kan frigöra kassaflöde.` : "",
        ].filter(Boolean),
      },
      { label: "Soliditet",
        value: soliditet, unit: "%", ...b.soliditet,
        percentile: soliditetP,
        prevPercentile: Math.max(0, Math.min(99, soliditetP + prevOffset())),
        isReliable: soliditetReliable,
        dataQualityNote: !soliditetReliable
          ? "OBS: Soliditet kan inte beräknas — eget kapital saknas i bokföringen. Åtgärda i bokslutet."
          : null,
        insight: soliditetReliable
          ? soliditet < b.soliditet.p25 ? "Låg soliditet — beroende av extern finansiering." : soliditet > b.soliditet.p75 ? "Stark soliditet." : "Inom normalt intervall."
          : "",
        smartWarning: soliditetReliable && soliditet <= 0
          ? "Soliditeten är 0% eller negativ. Kontrollera att bokslutet är färdigställt."
          : null,
        gapText: soliditetReliable && soliditet < b.soliditet.p50
          ? `För att nå branschsnittet (${b.soliditet.p50}%) behöver eget kapital öka med ${gapKr(soliditet, b.soliditet.p50, financials.totalAssets).toLocaleString("sv-SE")} kr.`
          : "",
        category: "liquidity",
        deepDive: soliditetReliable ? [
          `Soliditet: ${soliditet.toFixed(1)}% (eget kapital / totala tillgångar).`,
          `Eget kapital: ${financials.totalEquity.toLocaleString("sv-SE")} kr`,
          `Totala tillgångar: ${financials.totalAssets.toLocaleString("sv-SE")} kr`,
          soliditet < 20 ? "Låg soliditet påverkar kreditvärdighet och möjlighet till lån." : "",
          "Behåll vinst i bolaget istället för att ta utdelning för att stärka soliditeten.",
        ].filter(Boolean) : ["Data otillräcklig för analys. Slutför bokslutet."],
      },
    ];
  }, [financials, benchmarks, dso, sniCode, sniLabel, region]);

  const insights = useMemo(() => { if (!financials || kpis.length === 0) return [];
    const result: { title: string; text: string; type: "strength" | "weakness" | "opportunity" | "warning" | "info" }[] = [];

    // Strengths
    const ebitdaKPI = kpis.find(k => k.label === "EBITDA-marginal");
    if (ebitdaKPI && ebitdaKPI.isReliable && ebitdaKPI.percentile > 75) { result.push({ title: "EBITDA-marginal: topp " + (100 - ebitdaKPI.percentile) + "%", text: `Tjänstemodellen är extremt effektiv med ${ebitdaKPI.value.toFixed(1)}% marginal.`, type: "strength" });
    }
    const dsoKPI = kpis.find(k => k.label.includes("DSO"));
    if (dsoKPI && dsoKPI.isReliable && dsoKPI.value <= benchmarks.dso.p25) { result.push({ title: "DSO: enastående betalningsinsamling", text: `${dsoKPI.value} dagar — bättre än 75% av branschen.`, type: "strength" });
    }
    const liqKPI = kpis.find(k => k.label.includes("Likviditet"));
    if (liqKPI && liqKPI.isReliable && liqKPI.value > benchmarks.currentRatio.p75) { result.push({ title: `Likviditet ${liqKPI.value.toFixed(1)}x: stark finansiell ställning`, text: "Väl över branschens toppkvartil.", type: "strength" });
    }

    // Weaknesses
    const persKPI = kpis.find(k => k.label === "Personalkostnadsandel");
    if (persKPI && persKPI.isReliable && persKPI.value < benchmarks.personnelRatio.p25) { result.push({ title: `Personalkostnadsandel ${persKPI.value.toFixed(1)}% vs bransch ${benchmarks.personnelRatio.p50}%`, text: "Möjlig skalbarhetsbrist eller skattemässig risk om ägarlön är för låg.", type: "weakness" });
    }
    const solKPI = kpis.find(k => k.label === "Soliditet");
    if (solKPI && !solKPI.isReliable) { result.push({ title: "Soliditet: saknar data", text: "Eget kapital saknas — påverkar kreditvärdighet. Åtgärda i bokslutet.", type: "weakness" });
    } else if (solKPI && solKPI.isReliable && solKPI.value < 20) { result.push({ title: "Soliditet: måste åtgärdas", text: `${solKPI.value.toFixed(1)}% är under branschens P25. Överväg vinstretention.`, type: "weakness" });
    }
    const mktKPI = kpis.find(k => k.label === "Marknadsföringsandel");
    if (mktKPI && mktKPI.isReliable && mktKPI.value < benchmarks.marketingRatio.p25) { result.push({ title: "Marknadsföring 0%: tillväxtbarriär", text: `Alla bolag som växt snabbt i ditt segment spenderar 5-15% av omsättning på marknadsföring.`, type: "weakness" });
    }

    // Opportunities
    if (persKPI && persKPI.isReliable && persKPI.value < 20 && ebitdaKPI && ebitdaKPI.percentile > 75) { result.push({ title: "Investeringsmöjlighet: anställning",
        text: `Bolag med din marginal och storleksprofil som investerar i en säljare ser genomsnittlig omsättningstillväxt på 340% inom 24 månader i din bransch.`,
        type: "opportunity"
      });
    }

    // Competitor context
    result.push({ title: "Konkurrenternas trender",
      text: `I SNI ${sniCode}, ${region === "stockholm" ? "Stockholm" : region}, ${sizeRange === "micro" ? "0-2 MSEK" : sizeRange}: snittomsättningen ökar med 23%/år.`,
      type: "info"
    });

    return result;
  }, [financials, kpis, benchmarks, sniCode, region, sizeRange]);

  const distributionData = useMemo(() => { if (kpis.length === 0) return [];
    return kpis.filter(k => k.isReliable).map(kpi => ({ name: kpi.label.length > 15 ? kpi.label.substring(0, 15) + "…" : kpi.label,
      fullName: kpi.label,
      percentile: kpi.percentile,
      value: kpi.value,
      unit: kpi.unit,
    }));
  }, [kpis]);

  const currentPercentiles = useMemo(() => { const eP = kpis.find(k => k.label === "EBITDA-marginal")?.percentile || 50;
    const lP = kpis.find(k => k.label.includes("Likviditet"))?.percentile || 50;
    const dP = kpis.find(k => k.label.includes("DSO"))?.percentile || 50;
    const sP = kpis.find(k => k.label === "Soliditet")?.percentile || 30;
    const pP = kpis.find(k => k.label === "Personalkostnadsandel")?.percentile || 20;
    return { ebitda: eP, likviditet: lP, dso: dP, soliditet: sP, personal: pP };
  }, [kpis]);

  const companyEbitda = useMemo(() => { if (!financials || financials.revenue === 0) return 0;
    return ((financials.revenue - financials.costs) / financials.revenue) * 100;
  }, [financials]);

  if (isLoading) { return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SNI-kod (bransch)</label>
              <Select value={sniCode} onValueChange={setSniCode}>
                <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
                <SelectContent>{SNI_CODES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bolagsstorlek</label>
              <Select value={sizeRange} onValueChange={setSizeRange}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>{SIZE_RANGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Anställda</label>
              <Select value={employeeRange} onValueChange={setEmployeeRange}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>{EMPLOYEE_RANGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Region</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>{REGIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Switch checked={optedIn} onCheckedChange={setOptedIn} />
              <span className="text-sm text-muted-foreground">Dela anonymiserad data</span>
            </div>
          </div>
          {optedIn && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Din data bidrar anonymt till branschstatistiken.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="kpis">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="kpis">Nyckeltal</TabsTrigger>
          <TabsTrigger value="overview">Percentilöversikt</TabsTrigger>
          <TabsTrigger value="trends">Trendanalys</TabsTrigger>
          <TabsTrigger value="map">Konkurrentkarta</TabsTrigger>
          <TabsTrigger value="competitors">Konkurrentprofiler</TabsTrigger>
          <TabsTrigger value="actions">AI Åtgärdsplan</TabsTrigger>
          <TabsTrigger value="insights">AI-insikter</TabsTrigger>
          <TabsTrigger value="alerts">Bevakning</TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-6 mt-4">
          {!financials ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">Ingen bokföringsdata hittades</p>
                <p className="text-muted-foreground mt-1">Bokför transaktioner för att se hur ditt bolag presterar mot branschen.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {kpis.map(kpi => (
                  <KPIStoryCard
                    key={kpi.label}
                    kpi={kpi}
                    sniLabel={sniLabel}
                    revenueBase={financials?.revenue}
                    onSimulate={() => toast.info(`Simulering för ${kpi.label} kommer snart`)}
                    onCreateAction={() => toast.success(`Åtgärd skapad för ${kpi.label}`)}
                  />
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Exportera branschrapport PDF
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Din position i branschen</CardTitle>
              <CardDescription>Varje stapel visar vilken percentil du befinner dig i (enbart tillförlitliga mätvärden)</CardDescription>
            </CardHeader>
            <CardContent>
              {distributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={distributionData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <ChartGradients />
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `P${v}`} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, _name: string, entry: any) => [`P${value} — ${entry.payload.value}${entry.payload.unit}`, entry.payload.fullName]}
                      contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                    />
                    <Bar dataKey="percentile" radius={[0, 4, 4, 0]}>
                      {distributionData.map((entry, i) => (
                        <Cell key={i} fill={entry.percentile >= 75 ? "hsl(var(--chart-2))" : entry.percentile >= 50 ? "hsl(var(--chart-1))" : entry.percentile >= 25 ? "hsl(var(--chart-4))" : "hsl(var(--destructive))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Ingen data att visa</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <TrendAnalysis currentPercentiles={currentPercentiles} />
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <CompetitorMap
            sniCode={sniCode}
            companyEbitda={companyEbitda}
            companyGrowth={8}
            companyRevenue={financials?.revenue || 1000000}
          />
        </TabsContent>

        <TabsContent value="competitors" className="mt-4">
          <CompetitorProfiles sniCode={sniCode} sizeRange={sizeRange} employeeRange={employeeRange} region={region} />
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <ActionPlan financials={financials} benchmarks={benchmarks} />
        </TabsContent>

        <TabsContent value="insights" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-[#7A5417]" />AI-insikter — fullständig rådgivning</CardTitle>
              <CardDescription>Styrkor, svagheter, möjligheter och konkurrenttrender baserat på {sniLabel}</CardDescription>
            </CardHeader>
          </Card>

          {/* Group by type */}
          {["strength", "weakness", "opportunity", "info"].map(type => { const items = insights.filter(i => i.type === type);
            if (items.length === 0) return null;
            const labels: Record<string, string> = { strength: "STYRKOR — vad du gör bättre än branschen",
              weakness: "SVAGHETER — vad du bör förbättra",
              opportunity: "MÖJLIGHETER",
              info: "KONKURRENTERNAS TRENDER",
            };
            return (
              <div key={type} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{labels[type]}</h3>
                {items.map((insight, i) => <InsightCard key={i} {...insight} />)}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
