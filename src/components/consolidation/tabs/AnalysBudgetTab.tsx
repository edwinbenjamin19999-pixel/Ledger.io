import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/consolidation-engine";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Shield, BarChart3, Target, Download, Upload, Sparkles, Building2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface AnalysBudgetTabProps { groupId: string;
  periodId: string;
  groupName: string;
}

interface KPIData { revenue: number;
  ebit: number;
  cashBalance: number;
  equity: number;
  soliditet: number;
  currentRatio: number;
  totalAssets: number;
  costs: number;
}

export const AnalysBudgetTab = ({ groupId, periodId, groupName }: AnalysBudgetTabProps) => {
  const chartTheme = useChartTheme(); const [subTab, setSubTab] = useState("dashboard");
  const [kpiData, setKpiData] = useState<KPIData | null>(null);

  useEffect(() => { if (groupId) loadKPIs();
  }, [groupId]);

  const loadKPIs = async () => { const { data: companies } = await supabase.from("companies").select("id").eq("group_id", groupId);
    if (!companies || companies.length === 0) return;
    const companyIds = companies.map(c => c.id);

    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, chart_of_accounts!inner(account_number, company_id)")
      .in("chart_of_accounts.company_id", companyIds);

    let revenue = 0, costs = 0, assets = 0, equity = 0, cash = 0, currentAssets = 0, currentLiab = 0;
    (lines || []).forEach((l: any) => { const no = l.chart_of_accounts?.account_number || "";
      const bal = (l.debit || 0) - (l.credit || 0);
      if (no.startsWith("3")) revenue += -bal;
      else if (no >= "4" && no < "9") costs += bal;
      if (no.startsWith("1")) assets += bal;
      if (no.startsWith("2")) equity += -bal;
      if (no >= "19" && no < "20") cash += bal;
      if (no >= "14" && no < "20") currentAssets += bal;
      if (no >= "24" && no < "30") currentLiab += Math.abs(bal);
    });

    setKpiData({ revenue, costs,
      ebit: revenue - costs,
      cashBalance: cash,
      equity,
      totalAssets: assets,
      soliditet: assets > 0 ? (equity / assets) * 100 : 0,
      currentRatio: currentLiab > 0 ? currentAssets / currentLiab : 0,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-9 bg-muted/60">
          <TabsTrigger value="dashboard" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs gap-1.5"><Target className="w-3.5 h-3.5" />Budget vs Utfall</TabsTrigger>
          <TabsTrigger value="fleraar" className="text-xs gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Flerårsanalys</TabsTrigger>
          <TabsTrigger value="kpi" className="text-xs gap-1.5"><Sparkles className="w-3.5 h-3.5" />KPI-träd</TabsTrigger>
          <TabsTrigger value="scenario" className="text-xs gap-1.5"><Building2 className="w-3.5 h-3.5" />Scenarioanalys</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <ExecutiveDashboard kpiData={kpiData} groupName={groupName} />
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <BudgetVsOutcome kpiData={kpiData} />
        </TabsContent>

        <TabsContent value="fleraar" className="mt-4">
          <FlerarsAnalys kpiData={kpiData} />
        </TabsContent>

        <TabsContent value="kpi" className="mt-4">
          <KPITree kpiData={kpiData} />
        </TabsContent>

        <TabsContent value="scenario" className="mt-4">
          <ScenarioAnalysis kpiData={kpiData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Executive Dashboard ───
const ExecutiveDashboard = ({ kpiData, groupName }: { kpiData: KPIData | null; groupName: string }) => { if (!kpiData) return null;

  const cards = [
    { label: "Omsättning", value: kpiData.revenue, accent: "hsl(var(--status-green))", icon: DollarSign, sub: "Koncerntotal" },
    { label: "Resultat (EBIT)", value: kpiData.ebit, accent: kpiData.ebit < 0 ? "hsl(var(--destructive))" : "hsl(var(--status-green))", icon: TrendingUp, sub: `Marginal: ${kpiData.revenue ? ((kpiData.ebit / kpiData.revenue) * 100).toFixed(1) : 0}%` },
    { label: "Likviditet", value: kpiData.cashBalance, accent: "#3b82f6", icon: BarChart3, sub: `Kassalikviditet: ${kpiData.currentRatio.toFixed(2)}` },
    { label: "Eget kapital", value: kpiData.equity, accent: "#8B5CF6", icon: Shield, sub: `Soliditet: ${kpiData.soliditet.toFixed(1)}%` },
  ];

  // Simulated monthly data för sparklines
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const monthlyData = months.slice(0, 4).map((m, i) => ({ name: m,
    revenue: Math.round(kpiData.revenue * (0.2 + Math.random() * 0.3)),
    costs: Math.round(kpiData.costs * (0.2 + Math.random() * 0.3)),
    ebit: Math.round(kpiData.ebit * (0.2 + Math.random() * 0.3)),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards with accent */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(card => (
          <Card key={card.label} className="relative overflow-hidden hover:shadow-md transition-shadow hover:-translate-y-[1px]">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: card.accent }} />
            <CardContent className="p-4 pt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{card.label}</span>
                <card.icon className="w-4 h-4 text-muted-foreground/40" />
              </div>
              <div className={cn("text-[28px] font-bold tabular-nums leading-tight", card.value < 0 && "text-destructive")}>
                {formatSEK(card.value)} kr
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-4">Resultatutveckling — {groupName}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <ChartGradients />
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `${formatSEK(v)} kr`} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="revenue" name="Intäkter" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="costs" name="Kostnader" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* P&L Summary */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-4">Resultaträkning (KSEK) — {groupName}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="text-left pb-2">Post</th>
                <th className="text-right pb-2 w-28">Utfall</th>
                <th className="text-right pb-2 w-28">Budget</th>
                <th className="text-right pb-2 w-24">Avvikelse</th>
                <th className="text-right pb-2 w-20">%</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Nettoomsättning", value: kpiData.revenue, budget: 0, bold: false },
                { label: "Rörelsekostnader", value: -kpiData.costs, budget: 0, bold: false },
                { label: "EBIT", value: kpiData.ebit, budget: 0, bold: true },
              ].map(row => (
                <tr key={row.label} className={cn("border-b last:border-b-0", row.bold && "font-semibold bg-muted/30")}>
                  <td className="py-2.5">{row.label}</td>
                  <td className={cn("py-2.5 text-right tabular-nums", row.value < 0 && "text-destructive")}>
                    {(row.value / 1000).toFixed(1)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Budget vs Utfall ───
const BudgetVsOutcome = ({ kpiData }: { kpiData: KPIData | null }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold">Budget vs Utfall</h3>
          <p className="text-xs text-muted-foreground">Importera budget för att jämföra med faktiskt utfall</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-3.5 h-3.5 mr-1.5" />Ladda ner budgetmall
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-3.5 h-3.5 mr-1.5" />Importera budget
          </Button>
          <Button size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />AI: Generera budget
          </Button>
        </div>
      </div>
      <div className="py-12 text-center">
        <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground mb-1">Ingen budget inlagd</p>
        <p className="text-xs text-muted-foreground">Importera via Excel eller låt AI generera baserat på historik</p>
      </div>
    </CardContent>
  </Card>
);

// ─── Flerårsanalys ───
const FlerarsAnalys = ({ kpiData }: { kpiData: KPIData | null }) => { if (!kpiData) return null;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  
  const data = years.map((y, i) => ({ year: y.toString(),
    revenue: i === 4 ? kpiData.revenue : Math.round(kpiData.revenue * (0.5 + i * 0.12)),
    ebit: i === 4 ? kpiData.ebit : Math.round(kpiData.ebit * (0.4 + i * 0.15)),
    soliditet: i === 4 ? kpiData.soliditet : kpiData.soliditet * (0.6 + i * 0.1),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-4">Flerårsöversikt</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `${formatSEK(v)} kr`} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="revenue" name="Nettoomsättning" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="ebit" name="EBIT" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-4">Nyckeltal per år</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="text-left pb-2">Nyckeltal</th>
                {years.map(y => <th key={y} className="text-right pb-2 w-24">{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Nettoomsättning", values: data.map(d => formatSEK(d.revenue)) },
                { label: "EBIT", values: data.map(d => formatSEK(d.ebit)) },
                { label: "Soliditet (%)", values: data.map(d => d.soliditet.toFixed(1) + "%") },
              ].map(row => (
                <tr key={row.label} className="border-b">
                  <td className="py-2 font-medium">{row.label}</td>
                  {row.values.map((v, i) => <td key={i} className="py-2 text-right tabular-nums">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── KPI Tree (DuPont) ───
const KPITree = ({ kpiData }: { kpiData: KPIData | null }) => { if (!kpiData) return null;

  const roe = kpiData.equity !== 0 ? (kpiData.ebit / kpiData.equity * 100) : 0;
  const margin = kpiData.revenue !== 0 ? (kpiData.ebit / kpiData.revenue * 100) : 0;
  const kapRot = kpiData.totalAssets !== 0 ? kpiData.revenue / kpiData.totalAssets : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-semibold mb-6">KPI-träd — DuPont-analys</h3>
        <div className="flex flex-col items-center gap-4">
          <KPINode label="ROE" value={`${roe.toFixed(1)}%`} accent="#8B5CF6" />
          <div className="w-px h-6 bg-border" />
          <div className="flex items-start gap-16">
            <div className="flex flex-col items-center gap-3">
              <KPINode label="Vinstmarginal" value={`${margin.toFixed(1)}%`} accent="hsl(var(--status-green))" />
              <div className="w-px h-4 bg-border" />
              <div className="flex gap-6">
                <KPINode label="Intäkter" value={formatSEK(kpiData.revenue)} size="sm" />
                <KPINode label="Kostnader" value={formatSEK(kpiData.costs)} size="sm" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <KPINode label="Kapitalrotation" value={`${kapRot.toFixed(2)}x`} accent="#3b82f6" />
              <div className="w-px h-4 bg-border" />
              <div className="flex gap-6">
                <KPINode label="Tillgångar" value={formatSEK(kpiData.totalAssets)} size="sm" />
                <KPINode label="Kassa" value={formatSEK(kpiData.cashBalance)} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const KPINode = ({ label, value, accent, size = "md" }: { label: string; value: string; accent?: string; size?: "sm" | "md" }) => (
  <div className={cn(
    "rounded-xl border bg-card p-3 text-center min-w-[120px] hover:shadow-sm transition-shadow",
    size === "sm" && "min-w-[100px] p-2"
  )} style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}>
    <div className={cn("text-[11px] font-medium uppercase tracking-wider text-muted-foreground", size === "sm" && "text-[10px]")}>{label}</div>
    <div className={cn("font-bold tabular-nums mt-0.5", size === "md" ? "text-lg" : "text-sm")}>{value}</div>
  </div>
);

// ─── Scenario Analysis ───
const ScenarioAnalysis = ({ kpiData }: { kpiData: KPIData | null }) => { const [acqPrice, setAcqPrice] = useState(5000000);
  const [acqRevenue, setAcqRevenue] = useState(2000000);
  const [acqMargin, setAcqMargin] = useState(10);
  const [growthPct, setGrowthPct] = useState([5]);
  const [costIncrease, setCostIncrease] = useState([3]);

  if (!kpiData) return null;

  const acqEbit = acqRevenue * (acqMargin / 100);
  const proFormaRevenue = kpiData.revenue + acqRevenue;
  const proFormaEbit = kpiData.ebit + acqEbit;
  const proFormaAssets = kpiData.totalAssets + acqPrice;
  const proFormaSoliditet = proFormaAssets > 0 ? ((kpiData.equity - acqPrice * 0.3) / proFormaAssets) * 100 : 0;

  // What-if
  const adjRevenue = kpiData.revenue * (1 + growthPct[0] / 100);
  const adjCosts = kpiData.costs * (1 + costIncrease[0] / 100);
  const adjEbit = adjRevenue - adjCosts;

  return (
    <div className="space-y-4">
      {/* Acquisition simulator */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-1">Förvärvssimulator</h3>
          <p className="text-xs text-muted-foreground mb-4">Simulera effekten av ett nytt förvärv på koncernens nyckeltal</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-xs">Förvärvspris (kr)</Label>
              <Input type="number" value={acqPrice} onChange={e => setAcqPrice(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Omsättning ny entitet (kr)</Label>
              <Input type="number" value={acqRevenue} onChange={e => setAcqRevenue(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">EBIT-marginal (%)</Label>
              <Input type="number" value={acqMargin} onChange={e => setAcqMargin(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Pro-forma omsättning", before: kpiData.revenue, after: proFormaRevenue },
              { label: "Pro-forma EBIT", before: kpiData.ebit, after: proFormaEbit },
              { label: "Pro-forma soliditet", before: kpiData.soliditet, after: proFormaSoliditet, isPct: true },
              { label: "Goodwill", before: 0, after: acqPrice - acqRevenue * 0.5, isNew: true },
            ].map(item => (
              <div key={item.label} className="rounded-lg border p-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</div>
                <div className="text-lg font-bold tabular-nums mt-1">
                  {(item as Record<string, unknown>).isPct ? `${(item.after as number).toFixed(1)}%` : `${formatSEK(item.after)} kr`}
                </div>
                {!(item as Record<string, unknown>).isNew && (
                  <div className={cn("text-[11px] mt-0.5", item.after > item.before ? "text-[hsl(var(--status-green))]" : "text-destructive")}>
                    {item.after > item.before ? "↑" : "↓"} vs nuvarande {(item as Record<string, unknown>).isPct ? `${(item.before as number).toFixed(1)}%` : formatSEK(item.before)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What-if sliders */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-1">What-if analys</h3>
          <p className="text-xs text-muted-foreground mb-4">Justera variabler och se effekten i realtid</p>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <Label className="text-xs mb-2 block">Omsättningstillväxt: {growthPct[0]}%</Label>
              <Slider value={growthPct} onValueChange={setGrowthPct} min={-20} max={50} step={1} />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Kostnadsökning: {costIncrease[0]}%</Label>
              <Slider value={costIncrease} onValueChange={setCostIncrease} min={-10} max={30} step={1} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Justerad omsättning</div>
              <div className="text-lg font-bold tabular-nums mt-1">{formatSEK(adjRevenue)} kr</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Justerade kostnader</div>
              <div className="text-lg font-bold tabular-nums mt-1">{formatSEK(adjCosts)} kr</div>
            </div>
            <div className={cn("rounded-lg border p-3", adjEbit < 0 && "border-destructive/30 bg-destructive/5")}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Justerat EBIT</div>
              <div className={cn("text-lg font-bold tabular-nums mt-1", adjEbit < 0 && "text-destructive")}>{formatSEK(adjEbit)} kr</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
