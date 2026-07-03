import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Brain, Loader2, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, Shield,
  Bell, FileText, MessageSquare, Presentation, Sparkles, Lightbulb, Target, ArrowRight,
  Receipt, Settings, BarChart3,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { CFOWeeklyBriefing } from "./CFOWeeklyBriefing";
import { CFOChat } from "./CFOChat";
import { CFOBoardPresentation } from "./CFOBoardPresentation";
import { CFOAlerts } from "./CFOAlerts";
import { useCFODashboard } from "@/hooks/useCFODashboard";
import { formatSEK, formatPercent } from "@/lib/formatNumber";

interface CFODashboardProps { companyId: string;
  userName?: string;
}

export interface FinancialSnapshot { cashBalance: number;
  cashChange: number;
  openReceivables: number;
  openReceivablesCount: number;
  revenue: number;
  expenses: number;
  ebitdaMargin: number;
  yearResult: number;
  overdueInvoices: { customer: string; amount: number; daysOverdue: number }[];
  runwayDays: number;
  monthlyResults?: number[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

function generateCFOSummary(data: NonNullable<ReturnType<typeof useCFODashboard>['data']>) {
  const lines: string[] = [];

  if (data.revenueGrowth > 0) {
    lines.push(`Intäkterna ökade med ${Math.abs(data.revenueGrowth).toFixed(1)}% jämfört med föregående månad — bra momentum.`);
  } else if (data.revenueGrowth < 0) {
    lines.push(`Intäkterna minskade med ${Math.abs(data.revenueGrowth).toFixed(1)}% jämfört med föregående månad — analysera orsaken.`);
  } else {
    lines.push("Intäkterna är stabila jämfört med föregående månad.");
  }

  if (data.ebitdaMargin > 20) {
    lines.push(`EBITDA-marginalen på ${data.ebitdaMargin.toFixed(1)}% ligger över branschsnittet — stark lönsamhet.`);
  } else if (data.ebitdaMargin > 10) {
    lines.push(`EBITDA-marginalen på ${data.ebitdaMargin.toFixed(1)}% är acceptabel men har förbättringspotential.`);
  } else {
    lines.push(`EBITDA-marginalen på ${data.ebitdaMargin.toFixed(1)}% är låg — överväg kostnadsoptimering.`);
  }

  if (data.runway < 3) {
    lines.push(`Med nuvarande burn rate räcker kassan ${data.runway} månader — prioritera likviditeten omedelbart.`);
  } else if (data.runway < 6) {
    lines.push(`Med nuvarande burn rate räcker kassan ${data.runway} månader — överväg att optimera fasta kostnader.`);
  } else {
    lines.push(`Kassan räcker ${data.runway} månader — bra finansiell stabilitet.`);
  }

  return lines;
}

function buildOpportunities(data: NonNullable<ReturnType<typeof useCFODashboard>['data']>) {
  const items: { icon: typeof Lightbulb; text: string }[] = [];
  if (data.yearResult > 0) {
    const fond = Math.round(data.yearResult * 0.25);
    items.push({ icon: Target, text: `Avsätt periodiseringsfond — spara upp till ${fmt(Math.round(fond * 0.206))} kr i skatt` });
  }
  if (data.revenueGrowth > 0) {
    items.push({ icon: TrendingUp, text: "Intäktstillväxt — överväg prisoptimering" });
  }
  items.push({ icon: Settings, text: "Granska ökade kostnader och identifiera besparingar" });
  return items.slice(0, 3);
}

function buildRisks(data: NonNullable<ReturnType<typeof useCFODashboard>['data']>) {
  const items: { icon: typeof AlertTriangle; text: string }[] = [];
  if (data.runway < 6) {
    items.push({ icon: AlertTriangle, text: `Kassareserv räcker ${data.runway} månader — bygg likviditetsbuffert` });
  }
  if (data.yearResult < 0) {
    items.push({ icon: TrendingDown, text: "Negativt årsresultat — analysera kostnadsdrivare" });
  }
  if (data.ebitdaMargin < 10) {
    items.push({ icon: Shield, text: "Låg EBITDA-marginal — risk vid konjunkturnedgång" });
  }
  if (items.length === 0) {
    items.push({ icon: Shield, text: "Inga identifierade risker just nu — fortsätt bevaka" });
  }
  return items.slice(0, 3);
}

function buildNextActions(data: NonNullable<ReturnType<typeof useCFODashboard>['data']>) {
  const actions: string[] = [];
  if (data.yearResult > 0) actions.push("Avsätt skattereserv");
  actions.push("Granska stora utgifter");
  actions.push("Följ upp obetalda fakturor");
  if (data.runway < 6) actions.push("Optimera fasta kostnader");
  return actions.slice(0, 4);
}

const TABS = [
  { key: "alerts", label: "Varningar", shortLabel: "Varningar", icon: Bell },
  { key: "briefing", label: "Veckobriefing", shortLabel: "Briefing", icon: FileText },
  { key: "chat", label: "CFO-chatt", shortLabel: "Chatt", icon: MessageSquare },
  { key: "board", label: "Styrelsepresentation", shortLabel: "Styrelse", icon: Presentation },
] as const;

export const CFODashboard = ({ companyId, userName = "du" }: CFODashboardProps) => {
  const { data: cfoData, isLoading: cfoLoading } = useCFODashboard(companyId);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<string>("alerts");

  // Build snapshot from hook data for child components
  const liveSnapshot: FinancialSnapshot | null = cfoData ? {
    cashBalance: cfoData.cash,
    cashChange: 0,
    openReceivables: 0,
    openReceivablesCount: 0,
    revenue: cfoData.yearRevenue,
    expenses: cfoData.yearCosts,
    ebitdaMargin: cfoData.ebitdaMargin,
    yearResult: cfoData.yearResult,
    overdueInvoices: [],
    runwayDays: cfoData.runway * 30,
    monthlyResults: cfoData.sparkline.map(s => s.result),
  } : null;

  const effectiveSnapshot = liveSnapshot;

  if (cfoLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!cfoData?.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">AI CFO</h2>
            <p className="text-sm text-muted-foreground">Din autonoma finansiella rådgivare</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-medium">Ingen bokförd data</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Börja bokföra transaktioner för att se CFO-analysen med EBITDA, kassaflöde och runway.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runwayMonths = cfoData.runway;
  const runwayPct = Math.min((runwayMonths / 12) * 100, 100);
  const runwayColor = runwayMonths < 3 ? "destructive" : runwayMonths < 6 ? "warning" : "ok";

  const gaugeMarginColor = cfoData.ebitdaMargin < 10 ? "#ef4444" : cfoData.ebitdaMargin < 20 ? "#f59e0b" : "#10b981";

  const alertCount = effectiveSnapshot ? (
    (runwayMonths < 3 ? 1 : 0) +
    (cfoData.ebitdaMargin < 5 ? 1 : 0) +
    (cfoData.yearResult < 0 ? 1 : 0)
  ) : 0;

  const summaryLines = generateCFOSummary(cfoData);
  const opportunities = buildOpportunities(cfoData);
  const risks = buildRisks(cfoData);
  const nextActions = buildNextActions(cfoData);

  // Compute expense change for micro-text
  const sparkLen = cfoData.sparkline.length;
  const expenseChange = sparkLen >= 2
    ? ((cfoData.sparkline[sparkLen - 1]?.costs ?? 0) - (cfoData.sparkline[sparkLen - 2]?.costs ?? 0))
      / Math.max(cfoData.sparkline[sparkLen - 2]?.costs ?? 1, 1) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">AI CFO</h2>
          <p className="text-sm text-muted-foreground">Din autonoma finansiella rådgivare</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* KASSABALANS */}
        <Card className="relative overflow-hidden group hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] hover:-translate-y-0.5 transition-all duration-200 animate-fade-in bg-[#0F1F3D] border border-white/60 dark:border-white/10">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={cn("h-4 w-4", runwayColor === "destructive" ? "text-destructive" : "text-[#085041]")} />
              <span className="text-xs text-muted-foreground">Kassabalans</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold tabular-nums">{formatSEK(cfoData.cash)}</p>
              <span className={cn("text-xs font-medium", runwayColor === "destructive" ? "text-destructive" : "text-[#085041]")}>
                {runwayMonths >= 6 ? "↑" : "↓"}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Runway</span>
                <span className={cn("font-medium", runwayColor === "destructive" ? "text-destructive" : runwayColor === "warning" ? "text-[#7A5417]" : "text-[#085041]")}>
                  {runwayMonths} månader
                </span>
              </div>
              <Progress value={runwayPct} className={cn("h-1.5", runwayColor === "destructive" && "[&>div]:bg-destructive", runwayColor === "warning" && "[&>div]:bg-amber-500")} />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2 text-[10px] text-muted-foreground bg-white/50 dark:bg-white/5 rounded px-2 py-1">
              {runwayMonths < 6 ? "Likviditeten kräver uppmärksamhet" : "God likviditetsbuffert"}
            </div>
          </CardContent>
        </Card>

        {/* OMSÄTTNING */}
        <Card className="relative overflow-hidden group hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] hover:-translate-y-0.5 transition-all duration-200 animate-fade-in bg-[#0F1F3D] border border-white/60 dark:border-white/10" style={{ animationDelay: '50ms' }}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-[#3b82f6]" />
              <span className="text-xs text-muted-foreground">Omsättning (mån)</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold tabular-nums">{formatSEK(cfoData.currentRevenue)}</p>
              {cfoData.revenueGrowth !== 0 && (
                <span className={cn("text-xs font-medium", cfoData.revenueGrowth > 0 ? "text-[#085041]" : "text-destructive")}>
                  {cfoData.revenueGrowth > 0 ? "↑" : "↓"} {Math.abs(cfoData.revenueGrowth).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-2 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cfoData.sparkline}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 text-[10px] text-muted-foreground bg-white/50 dark:bg-white/5 rounded px-2 py-1">
              {cfoData.revenueGrowth > 5 ? "Stark tillväxt — överväg skalning" : "Analysera intäktsdrivare"}
            </div>
          </CardContent>
        </Card>

        {/* EBITDA-MARGINAL */}
        <Card className="relative overflow-hidden group hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] hover:-translate-y-0.5 transition-all duration-200 animate-fade-in bg-[#0F1F3D] border border-white/60 dark:border-white/10" style={{ animationDelay: '100ms' }}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4" style={{ color: gaugeMarginColor }} />
              <span className="text-xs text-muted-foreground">EBITDA-marginal</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold tabular-nums">{formatPercent(cfoData.ebitdaMargin)}</p>
              <span className={cn("text-xs font-medium", cfoData.ebitdaMargin >= 20 ? "text-[#085041]" : cfoData.ebitdaMargin >= 10 ? "text-[#7A5417]" : "text-destructive")}>
                {cfoData.ebitdaMargin >= 20 ? "↑" : cfoData.ebitdaMargin >= 10 ? "→" : "↓"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-center">
              <svg width="80" height="44" viewBox="0 0 80 44">
                <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" strokeLinecap="round" />
                <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke={gaugeMarginColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.min(Math.abs(cfoData.ebitdaMargin), 100) / 100 * 100.5} 100.5`} />
                <text x="40" y="38" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))" fontFamily="system-ui">{cfoData.ebitdaMargin.toFixed(1)}%</text>
              </svg>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 text-[10px] text-muted-foreground bg-white/50 dark:bg-white/5 rounded px-2 py-1">
              {cfoData.ebitdaMargin > 20 ? "Över branschsnittet — stark lönsamhet" : "Under branschsnittet — optimera kostnader"}
            </div>
          </CardContent>
        </Card>

        {/* ÅRETS RESULTAT */}
        <Card className="relative overflow-hidden group hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] hover:-translate-y-0.5 transition-all duration-200 animate-fade-in bg-[#0F1F3D] border border-white/60 dark:border-white/10" style={{ animationDelay: '150ms' }}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-[#7A5417]" />
              <span className="text-xs text-muted-foreground">Årets resultat</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold tabular-nums">{formatSEK(cfoData.yearResult)}</p>
              <span className={cn("text-xs font-medium", cfoData.yearResult >= 0 ? "text-[#085041]" : "text-destructive")}>
                {cfoData.yearResult >= 0 ? "↑" : "↓"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Max periodfond: {formatSEK(Math.round(Math.max(cfoData.yearResult, 0) * 0.25))}
            </p>
            <div className="mt-2 flex items-end gap-[2px] h-6">
              {cfoData.sparkline.map((d, i) => {
                const maxAbs = Math.max(...cfoData.sparkline.map(s => Math.abs(s.result)), 1);
                return (
                  <div key={i} className={cn("flex-1 rounded-t-sm min-h-[2px]", d.result >= 0 ? "bg-primary/60" : "bg-destructive/60")} style={{ height: `${Math.max(Math.abs(d.result) / maxAbs * 24, 2)}px` }} />
                );
              })}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 text-[10px] text-muted-foreground bg-white/50 dark:bg-white/5 rounded px-2 py-1">
              {cfoData.yearResult > 0 ? "Överväg periodiseringsfond för skatteoptimering" : "Analysera kostnadsposter"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary Card — Centerpiece */}
      <div className="bg-[#0F1F3D] dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-200/40 dark:border-indigo-800/30 rounded-2xl p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-[#0F1F3D] flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.25)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">AI Analys</span>
        </div>
        <div className="space-y-2">
          {summaryLines.map((line, i) => {
            const icons = [Brain, TrendingUp, Shield];
            const LineIcon = icons[i % icons.length];
            return (
              <div key={i} className="flex items-start gap-3 bg-white/50 dark:bg-white/5 rounded-lg p-3 border border-indigo-100/30 dark:border-indigo-800/20">
                <LineIcon className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-sm text-indigo-800/90 dark:text-indigo-200/80">{line}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Opportunity & Risk Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
        {/* Opportunities */}
        <div className="border border-emerald-200/50 bg-[#0F1F3D] dark:from-emerald-950/20 dark:to-green-950/10 rounded-2xl p-4 shadow-[0_0_16px_rgba(16,185,129,0.08)]">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-[#085041]" />
            <span className="text-sm font-semibold text-[#085041] dark:text-emerald-300">Möjligheter</span>
          </div>
          <div className="space-y-2">
            {opportunities.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white/60 dark:bg-white/5 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30 hover:scale-[1.01] transition-transform">
                  <Icon className="h-3.5 w-3.5 text-[#085041] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#085041] dark:text-emerald-300">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risks */}
        <div className="border border-rose-200/50 bg-[#0F1F3D] dark:from-rose-950/20 dark:to-red-950/10 rounded-2xl p-4 shadow-[0_0_16px_rgba(244,63,94,0.06)]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-[#7A1A1A]" />
            <span className="text-sm font-semibold text-[#7A1A1A] dark:text-rose-300">Risker</span>
          </div>
          <div className="space-y-2">
            {risks.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white/60 dark:bg-white/5 rounded-lg border border-rose-100/50 dark:border-rose-800/30 hover:scale-[1.01] transition-transform">
                  <Icon className="h-3.5 w-3.5 text-[#7A1A1A] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#7A1A1A] dark:text-rose-300">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Next Actions Strip */}
      <div className="flex items-center gap-3 flex-wrap animate-fade-in">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nästa steg</span>
        {nextActions.map((action, i) => (
          <button
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-blue-200/30 bg-[#EFF6FF] dark:bg-blue-950/20 text-[#3b82f6] dark:text-[#3b82f6] hover:shadow-[0_0_12px_rgba(37,99,235,0.15)] hover:scale-[1.02] transition-all duration-200"
          >
            <ArrowRight className="h-3 w-3" />
            {action}
          </button>
        ))}
      </div>

      {/* Pill Tab Navigation */}
      <div className="flex gap-1.5 p-1 bg-muted/50 rounded-full overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch]">
        {TABS.map((tab) => { const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap min-h-[44px]",
                isActive
                  ? "bg-[#0F1F3D] text-white shadow-[0_0_12px_rgba(37,99,235,0.25)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-[#EFF6FF]"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.key === "alerts" && alertCount > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
                  "bg-destructive text-white animate-pulse"
                )}>
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "alerts" && <CFOAlerts snapshot={effectiveSnapshot} companyId={companyId} />}
        {activeTab === "briefing" && <CFOWeeklyBriefing companyId={companyId} userName={userName} snapshot={effectiveSnapshot} />}
        {activeTab === "chat" && <CFOChat companyId={companyId} snapshot={effectiveSnapshot} />}
        {activeTab === "board" && <CFOBoardPresentation companyId={companyId} snapshot={effectiveSnapshot} />}
      </div>
    </div>
  );
};
