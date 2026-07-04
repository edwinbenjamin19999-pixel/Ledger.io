import { useMemo } from "react";
import { Project, useProjectTransactions } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, ZAxis, Cell
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

function useMultiProjectData(projects: Project[]) {
  const chartTheme = useChartTheme(); const p0 = useProjectTransactions(projects[0]?.id);
  const p1 = useProjectTransactions(projects[1]?.id);
  const p2 = useProjectTransactions(projects[2]?.id);
  const p3 = useProjectTransactions(projects[3]?.id);
  const p4 = useProjectTransactions(projects[4]?.id);
  const p5 = useProjectTransactions(projects[5]?.id);
  const p6 = useProjectTransactions(projects[6]?.id);
  const p7 = useProjectTransactions(projects[7]?.id);
  const p8 = useProjectTransactions(projects[8]?.id);
  const p9 = useProjectTransactions(projects[9]?.id);

  const all = [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9];

  return projects.map((proj, i) => { const d = all[i] || { totalRevenue: 0, totalCost: 0 };
    const hours = proj.logged_hours || 0;
    const margin = d.totalRevenue > 0 ? ((d.totalRevenue - d.totalCost) / d.totalRevenue) * 100 : 0;
    const perHour = hours > 0 ? (d.totalRevenue - d.totalCost) / hours : 0;
    return { name: proj.name.length > 20 ? proj.name.slice(0, 18) + "..." : proj.name,
      fullName: proj.name,
      clientName: proj.client_name || "",
      revenue: d.totalRevenue,
      cost: d.totalCost,
      result: d.totalRevenue - d.totalCost,
      margin,
      hours,
      perHour,
      status: proj.status,
      estimatedHours: proj.estimated_hours || 0,
      budgetRevenue: proj.budget_revenue || 0,
    };
  });
}

interface Props { projects: Project[];
}

export function ProjectPortfolioTab({ projects }: Props) { const activeProjects = projects.filter((p) => p.status === "active" || p.status === "completed");
  return (
    <div className="space-y-6 mt-4">
      <PortfolioContent projects={activeProjects} />
    </div>
  );
}

function PortfolioContent({ projects }: { projects: Project[] }) { const data = useMultiProjectData(projects.slice(0, 10));
  const { entries } = useTimeEntries();

  // Capacity calculation
  const monthlyCapacity = 160; // hours
  const thisMonthHours = useMemo(() => { const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return entries
      .filter((e) => e.entry_date >= monthStart)
      .reduce((s, e) => s + e.duration_minutes / 60, 0);
  }, [entries]);

  const availableHours = Math.max(0, monthlyCapacity - thisMonthHours);
  const utilizationPct = Math.min(100, (thisMonthHours / monthlyCapacity) * 100);

  // Pipeline value
  const totalRemainingRevenue = data.reduce((s, d) => { const remaining = d.budgetRevenue > 0 ? Math.max(0, d.budgetRevenue - d.revenue) : 0;
    return s + remaining;
  }, 0);

  // Profitability ranking
  const ranked = [...data].filter((d) => d.revenue > 0 || d.cost > 0).sort((a, b) => b.perHour - a.perHour);

  const barData = data.filter((d) => d.revenue > 0 || d.cost > 0);

  if (data.length === 0) { return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          Inga projekt att jämföra ännu
        </CardContent>
      </Card>
    );
  }

  const bestPerHour = ranked.length > 0 ? ranked[0] : null;
  const worstPerHour = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  return (
    <>
      {/* Capacity & Pipeline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Kapacitet denna månad</p>
            <p className="text-xl font-bold">{Math.round(thisMonthHours)}h <span className="text-sm font-normal text-muted-foreground">/ {monthlyCapacity}h</span></p>
            <Progress value={utilizationPct} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Tillgängligt</p>
            <p className={cn("text-xl font-bold", availableHours < 20 ? "text-orange-500" : "text-[#085041]")}>
              {Math.round(availableHours)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Pipeline-värde</p>
            <p className="text-xl font-bold">{fmt(totalRemainingRevenue)} kr</p>
            <p className="text-[10px] text-muted-foreground">Kvar att fakturera</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Aktiva projekt</p>
            <p className="text-xl font-bold">{data.filter((d) => d.status === "active").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Capacity warning */}
      {availableHours < 10 && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Du är nästan fullbokad denna månad ({Math.round(utilizationPct)}% beläggning). 
              Om ett projekt vill utöka scopet saknas kapacitet — överväg att skjuta på start eller anlita underkonsult.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profitability ranking */}
      {ranked.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" />
              Lönsamhetsrankning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ranked.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center",
                      i === 0 ? "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]" :
                      i === ranked.length - 1 && ranked.length > 1 ? "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{d.fullName}</p>
                      {d.clientName && <p className="text-[10px] text-muted-foreground">{d.clientName}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <p className="text-muted-foreground">Marginal</p>
                      <p className={cn("font-semibold", d.margin >= 50 ? "text-[#085041]" : d.margin >= 20 ? "text-[#7A5417]" : "text-destructive")}>
                        {d.margin.toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">kr/h</p>
                      <p className="font-semibold">{d.perHour > 0 ? fmt(Math.round(d.perHour)) : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar chart */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projektjämförelse — Intäkter, Kostnader & Resultat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-80`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={4}>
              <ChartGradients />
                  <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}angle={-20} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v) + " kr"} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="revenue" name="Intäkter" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cost" name="Kostnader" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} opacity={0.5} />
                  <Bar dataKey="result" name="Resultat" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI insight */}
      {bestPerHour && (
        <Card className="border-l-4 border-l-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">
                Ditt mest lönsamma projekt per nedlagd timme: {bestPerHour.fullName} ({fmt(Math.round(bestPerHour.perHour))} kr/h)
              </p>
              {worstPerHour && worstPerHour.fullName !== bestPerHour.fullName && (
                <p className="text-muted-foreground text-xs mt-1">
                  Ditt minst lönsamma: {worstPerHour.fullName} ({fmt(Math.round(worstPerHour.perHour))} kr/h) — överväg att höja timpriset
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed table */}
      {data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detaljerad jämförelse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="py-2 pr-4">Projekt</th>
                    <th className="py-2 pr-4 text-right">Intäkter</th>
                    <th className="py-2 pr-4 text-right">Kostnader</th>
                    <th className="py-2 pr-4 text-right">Resultat</th>
                    <th className="py-2 pr-4 text-right">Marginal</th>
                    <th className="py-2 pr-4 text-right">Timmar</th>
                    <th className="py-2 text-right">kr/h</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{d.fullName}</td>
                      <td className="py-2 pr-4 text-right">{fmt(d.revenue)} kr</td>
                      <td className="py-2 pr-4 text-right">{fmt(d.cost)} kr</td>
                      <td className={cn("py-2 pr-4 text-right font-medium", d.result >= 0 ? "text-[#085041]" : "text-destructive")}>
                        {fmt(d.result)} kr
                      </td>
                      <td className={cn("py-2 pr-4 text-right", d.margin >= 50 ? "text-[#085041]" : d.margin >= 20 ? "text-[#7A5417]" : "text-destructive")}>
                        {d.margin.toFixed(0)}%
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{d.hours}</td>
                      <td className="py-2 text-right text-muted-foreground">{d.perHour > 0 ? Math.round(d.perHour) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
