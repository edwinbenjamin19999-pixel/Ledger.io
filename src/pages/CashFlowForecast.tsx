import { useEffect, useState, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useForecast13w, type ManualScenarioItem, type ForecastWeek } from "@/hooks/useForecast13w";
import { useCashflowForecast } from "@/hooks/useCashflowForecast";
import { formatSEK } from "@/lib/formatNumber";
import { TrendingUp, AlertTriangle, Plus, Trash2, ChevronDown, ChevronRight,
  Wallet, ArrowUpRight, ArrowDownRight, Activity, X, Settings, Calendar,
} from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";
interface Company { id: string; name: string; }

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

/* ─── Status pill ─────────────────────────────────────── */
function StatusPill({ status }: { status: ForecastWeek["status"] }) { const map = { ok: { label: "Ok ✓", cls: "bg-[#ECFDF5] text-[#059669]" },
    low: { label: "Låg ⚠", cls: "bg-[#FFFBEB] text-[#D97706]" },
    deficit: { label: "Underskott ✗", cls: "bg-[#FEF2F2] text-[#DC2626]" },
    recovery: { label: "Återhämtning ↑", cls: "bg-[#EFF6FF] text-[#0052FF]" },
  };
  const s = map[status];
  return <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

/* ─── Custom chart tooltip ────────────────────────────── */
function ChartTooltipContent({ active, payload, label }: any) { if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[200px]">
      <div className="font-semibold text-foreground mb-1">{label} ({data.dateRange})</div>
      <div className="border-t border-border pt-1 space-y-0.5">
        <div className="flex justify-between"><span className="text-[#22C55E]">Inbetalningar</span><span className="font-mono">+{fmt(data.inflows)} kr</span></div>
        <div className="flex justify-between"><span className="text-[#EF4444]">Utbetalningar</span><span className="font-mono">−{fmt(data.outflows)} kr</span></div>
      </div>
      <div className="border-t border-border pt-1 space-y-0.5">
        <div className="flex justify-between font-medium"><span>Netto</span><span className={`font-mono ${data.net >= 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>{data.net >= 0 ? "+" : ""}{fmt(data.net)} kr</span></div>
        <div className="flex justify-between"><span>Ingående</span><span className="font-mono">{fmt(data.opening)} kr</span></div>
        <div className="flex justify-between font-semibold"><span>Utgående</span><span className="font-mono">{fmt(data.closing)} kr</span></div>
      </div>
    </div>
  );
}

/* ─── Category bar ────────────────────────────────────── */
function CategoryBar({ label, amount, pct, color }: { label: string; amount: number; pct: number; color: string }) { return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular-nums">{fmt(amount)} kr <span className="text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────── */
const CashFlowForecast = () => {
  const chartTheme = useChartTheme(); const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(searchParams.get("company") || "");
  const [showScenario, setShowScenario] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);

  const { weeks, kpi, alerts, inflowBreakdown, outflowBreakdown,
    loading, threshold, setThreshold, manualItems, setManualItems, lastUpdated,
  } = useForecast13w(selectedCompany || undefined);

  const { data: monthlyData, isLoading: monthlyLoading } = useCashflowForecast(12, selectedCompany);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (!user) return;
    supabase.from("companies").select("id, name").order("name").then(({ data }) => { if (data?.length) { setCompanies(data); if (!selectedCompany) setSelectedCompany(data[0].id); }
    });
  }, [user]);

  const handleCompanyChange = (id: string) => { setSelectedCompany(id);
    setSearchParams(prev => { prev.set("company", id); return prev; });
  };

  const toggleWeek = (idx: number) => { setExpandedWeeks(prev => { const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const addManualItem = () => { const d = new Date();
    d.setDate(d.getDate() + 14);
    setManualItems([...manualItems, { id: String(Date.now()),
      type: "outflow",
      description: "",
      amount: 50000,
      date: d.toISOString().split("T")[0],
      recurring: "none",
    }]);
  };

  const updateManualItem = (id: string, field: keyof ManualScenarioItem, value: any) => { setManualItems(manualItems.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeManualItem = (id: string) => { setManualItems(manualItems.filter(m => m.id !== id));
  };

  const chartData = weeks.map(w => ({ name: w.label,
    dateRange: w.dateRange,
    inflows: w.inflows,
    outflows: w.outflows,
    net: w.net,
    closing: w.closing,
    opening: w.opening,
    threshold,
    bandHigh: w.closing * (1 + (w.weekIdx <= 2 ? 0.05 : w.weekIdx <= 6 ? 0.15 : 0.25)),
    bandLow: w.closing * (1 - (w.weekIdx <= 2 ? 0.05 : w.weekIdx <= 6 ? 0.15 : 0.25)),
  }));

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  if (!user) return null;

  const deficitWeeks = weeks.filter(w => w.status === "deficit" || w.status === "low");

  return (
    <div className="relative">
      <main className="container mx-auto px-4 py-5 space-y-4 max-w-[1400px]">
        {/* ── HEADER ────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold">Kassaflödesprognos — 13 veckor</h1>
              <p className="text-xs text-muted-foreground">Rullande likviditetsprognos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={handleCompanyChange}>
                <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Välj bolag" /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Min.nivå:</span>
              <Input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-28 h-8 text-xs" />
              <span className="text-xs text-muted-foreground">kr</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowScenario(!showScenario)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Scenario
            </Button>
          </div>
        </div>

        {/* ── ALERT BANNER ──────────────────────── */}
        {alerts.length > 0 && (
          <div className="rounded-[10px] border border-destructive/20 bg-destructive/[0.04] overflow-hidden" style={{ borderLeft: "3px solid #DC2626" }}>
            <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer" onClick={() => setShowAlertDetails(!showAlertDetails)}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm font-medium">{alerts[0].title}</span>
                {deficitWeeks.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Lägsta punkt: {kpi ? `${fmt(kpi.lowestPoint)} kr (${kpi.lowestWeekLabel})` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={e => { e.stopPropagation(); setShowAlertDetails(!showAlertDetails); }}>
                  {showAlertDetails ? "Dölj" : "Visa åtgärder"} <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showAlertDetails ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>
            {showAlertDetails && (
              <div className="px-4 pb-3 space-y-2 border-t border-destructive/10">
                {/* Week pills */}
                <div className="flex gap-1.5 flex-wrap pt-2">
                  {weeks.map(w => (
                    <button key={w.weekIdx} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ backgroundColor: w.status === "deficit" ? "#FEF2F2" : w.status === "low" ? "#FFFBEB" : w.status === "recovery" ? "#EFF6FF" : "#ECFDF5",
                      borderColor: w.status === "deficit" ? "#FECACA" : w.status === "low" ? "#FDE68A" : "transparent",
                      color: w.status === "deficit" ? "#DC2626" : w.status === "low" ? "#D97706" : w.status === "recovery" ? "#0052FF" : "#059669",
                    }} onClick={() => { setExpandedWeeks(new Set([w.weekIdx])); }}>
                      {w.label}
                    </button>
                  ))}
                </div>
                {/* Alert items */}
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border" style={{ borderLeft: `3px solid ${alert.severity === "critical" ? "#DC2626" : alert.severity === "warning" ? "#F59E0B" : alert.severity === "opportunity" ? "#0052FF" : "#6B7280"}`,
                  }}>
                    <div className="flex-1">
                      <div className="text-xs font-semibold">{alert.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{alert.description}</div>
                    </div>
                    {alert.actionLink && (
                      <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" onClick={() => navigate(alert.actionLink!)}>
                        {alert.action}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── KPI CARDS ─────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}</div>
        ) : kpi ? (
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: "balance", icon: <Wallet className="w-5 h-5" style={{ color: "#3b82f6" }} />,
                  label: "KASSASALDO IDAG", value: `${fmt(kpi.cashBalance)} kr`,
                  valueColor: kpi.cashBalance >= threshold ? "text-foreground" : "text-[#DC2626]",
                  sub: lastUpdated ? `Uppdaterad: ${lastUpdated.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "",
                  accent: "#3b82f6", tooltip: "Summa konto 1910–1940 idag",
                },
                { id: "inflows", icon: <ArrowUpRight className="w-5 h-5" style={{ color: "#22C55E" }} />,
                  label: "INBETALNINGAR 13V", value: `${fmt(kpi.totalInflows13w)} kr`,
                  valueColor: "text-[#059669]",
                  sub: `från ${kpi.inflowInvoiceCount} kundfakturor`,
                  accent: "#22C55E", tooltip: "Summa förväntade inbetalningar kommande 13 veckor",
                },
                { id: "outflows", icon: <ArrowDownRight className="w-5 h-5" style={{ color: "#EF4444" }} />,
                  label: "UTBETALNINGAR 13V", value: `${fmt(kpi.totalOutflows13w)} kr`,
                  valueColor: "text-foreground",
                  sub: outflowBreakdown.slice(0, 3).map(b => `${b.label} ${fmt(b.amount)}`).join(" • "),
                  accent: "#EF4444", tooltip: "Summa förväntade utbetalningar kommande 13 veckor",
                },
                { id: "lowest", icon: <Activity className="w-5 h-5" style={{ color: kpi.lowestPoint < threshold ? "#DC2626" : "#8B5CF6" }} />,
                  label: "LÄGSTA KASSAPUNKT", value: `${fmt(kpi.lowestPoint)} kr`,
                  valueColor: kpi.lowestPoint < 0 ? "text-[#DC2626]" : kpi.lowestPoint < threshold ? "text-[#D97706]" : "text-foreground",
                  sub: `${kpi.lowestWeekLabel} · Buffert: ${fmt(kpi.lowestPoint - threshold)} kr`,
                  accent: kpi.lowestPoint < threshold ? "#DC2626" : "#8B5CF6",
                  tooltip: "Lägsta beräknade kassasaldo under 13-veckorsperioden",
                },
              ].map(card => (
                <Tooltip key={card.id}>
                  <TooltipTrigger asChild>
                    <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: `3px solid ${card.accent}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        {card.icon}
                        <span className="text-[11px] font-medium text-muted-foreground tracking-wider">{card.label}</span>
                      </div>
                      <div className={`text-xl font-bold tabular-nums ${card.valueColor}`}>{card.value}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 truncate">{card.sub}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p className="text-xs max-w-[200px]">{card.tooltip}</p></TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        ) : null}

        {/* ── SCENARIO PANEL ────────────────────── */}
        {showScenario && (
          <Card className="border-[#F0DDB7] bg-amber-50/30 dark:bg-amber-950/10">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Scenariosimulator</CardTitle>
                <p className="text-xs text-muted-foreground">Se hur förändringar påverkar din kassa</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowScenario(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {manualItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 flex-wrap">
                  <Select value={item.type} onValueChange={v => updateManualItem(item.id, "type", v)}>
                    <SelectTrigger className="w-36 h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inflow" className="text-xs">Inbetalning</SelectItem>
                      <SelectItem value="outflow" className="text-xs">Utbetalning</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={item.description} onChange={e => updateManualItem(item.id, "description", e.target.value)} placeholder="Beskrivning" className="flex-1 min-w-[120px] h-8 text-xs bg-card" />
                  <Input type="number" value={item.amount} onChange={e => updateManualItem(item.id, "amount", Number(e.target.value))} className="w-28 h-8 text-xs bg-card" />
                  <span className="text-xs text-muted-foreground">kr</span>
                  <Input type="date" value={item.date} onChange={e => updateManualItem(item.id, "date", e.target.value)} className="w-36 h-8 text-xs bg-card" />
                  <Select value={item.recurring} onValueChange={v => updateManualItem(item.id, "recurring", v)}>
                    <SelectTrigger className="w-28 h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Engång</SelectItem>
                      <SelectItem value="weekly" className="text-xs">Veckovis</SelectItem>
                      <SelectItem value="monthly" className="text-xs">Månadsvis</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeManualItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={addManualItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Lägg till post
                </Button>
                {manualItems.length > 0 && (
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setManualItems([])}>Nollställ</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── CHART ─────────────────────────────── */}
        {loading ? <Skeleton className="h-[400px] rounded-xl" /> : (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">13-veckors prognos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-[380px]`}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
              <ChartGradients />
                    <defs>
                      <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0052FF" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#0052FF" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <RTooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <ReferenceLine y={threshold} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: "Miniminivå", fontSize: 10, fill: "#F59E0B" }} />
                    {/* Confidence band */}
                    <Area type="monotone" dataKey="bandHigh" stroke="none" fill="url(#bandGrad)" legendType="none" />
                    <Area type="monotone" dataKey="bandLow" stroke="none" fill="transparent" legendType="none" />
                    <Bar dataKey="inflows" name="Inbetalningar" fill="#22C55E" fillOpacity={0.75} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="outflows" name="Utbetalningar" fill="#EF4444" fillOpacity={0.75} radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="closing" name="Kassasaldo" stroke="#0052FF" strokeWidth={2.5} dot={{ r: 3, fill: "#0052FF" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── CATEGORY BREAKDOWN ────────────────── */}
        {!loading && (inflowBreakdown.length > 0 || outflowBreakdown.length > 0) && (
          <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Vad driver kassaflödet?</CardTitle>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showBreakdown ? "rotate-180" : ""}`} />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-[#059669] tracking-wider">INBETALNINGAR (13V)</div>
                      {inflowBreakdown.map(b => <CategoryBar key={b.category} {...b} />)}
                      {inflowBreakdown.length === 0 && <p className="text-xs text-muted-foreground">Inga förväntade inbetalningar</p>}
                    </div>
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-[#DC2626] tracking-wider">UTBETALNINGAR (13V)</div>
                      {outflowBreakdown.map(b => <CategoryBar key={b.category} {...b} />)}
                      {outflowBreakdown.length === 0 && <p className="text-xs text-muted-foreground">Inga förväntade utbetalningar</p>}
                      {outflowBreakdown[0]?.pct > 60 && (
                        <div className="flex items-center gap-1.5 text-xs text-[#D97706] bg-[#FFFBEB] px-2 py-1 rounded-md">
                          <AlertTriangle className="w-3 h-3" />
                          {outflowBreakdown[0].pct}% av utflödet: {outflowBreakdown[0].label.toLowerCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* ── WEEKLY TABLE ──────────────────────── */}
        {loading ? <Skeleton className="h-[300px] rounded-xl" /> : (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Kassaflöde per vecka</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 pl-4 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-8"></th>
                      <th className="p-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Vecka</th>
                      <th className="p-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Ingående</th>
                      <th className="p-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Inbetalningar</th>
                      <th className="p-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Utbetalningar</th>
                      <th className="p-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Netto</th>
                      <th className="p-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Utgående</th>
                      <th className="p-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map(w => { const expanded = expandedWeeks.has(w.weekIdx);
                      const rowBg = w.status === "deficit" ? "bg-[rgba(239,68,68,0.06)]" : w.status === "low" ? "bg-[rgba(245,158,11,0.04)]" : "";
                      const inflowItems = w.items.filter(i => i.type === "inflow");
                      const outflowItems = w.items.filter(i => i.type === "outflow");
                      return (
                        <Fragment key={w.weekIdx}>
                          <tr
                            className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${rowBg} ${expanded ? "bg-primary/[0.03]" : ""}`}
                            style={expanded ? { borderLeft: "3px solid #3b82f6" } : {}}
                            onClick={() => toggleWeek(w.weekIdx)}
                          >
                            <td className="p-2 pl-4">{expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}</td>
                            <td className="p-2">
                              <span className="font-mono font-semibold">{w.label}</span>
                              <span className="text-[11px] text-muted-foreground ml-2">{w.dateRange}</span>
                            </td>
                            <td className="p-2 text-right font-mono tabular-nums">{fmt(w.opening)}</td>
                            <td className="p-2 text-right font-mono tabular-nums text-[#059669]">{w.inflows > 0 ? `+${fmt(w.inflows)}` : "—"}</td>
                            <td className="p-2 text-right font-mono tabular-nums text-[#DC2626]">{w.outflows > 0 ? `−${fmt(w.outflows)}` : "—"}</td>
                            <td className={`p-2 text-right font-mono tabular-nums font-medium ${w.net >= 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                              {w.net >= 0 ? `+${fmt(w.net)}` : `−${fmt(Math.abs(w.net))}`}
                            </td>
                            <td className={`p-2 text-right font-mono tabular-nums font-semibold ${w.closing < 0 ? "text-[#DC2626]" : ""}`}>{fmt(w.closing)}</td>
                            <td className="p-2 text-center"><StatusPill status={w.status} /></td>
                          </tr>
                          {expanded && (
                            <tr className="bg-primary/[0.02]" style={{ borderLeft: "3px solid #3b82f6" }}>
                              <td colSpan={8} className="px-6 py-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Inflows */}
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-semibold text-[#059669] uppercase tracking-wider mb-1.5">Inbetalningar</div>
                                    {inflowItems.length === 0 && <p className="text-xs text-muted-foreground italic">Inga förväntade inbetalningar</p>}
                                    {inflowItems.map(item => (
                                      <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                          <span>{item.description}</span>
                                          {item.overdueDays && <span className="text-[#DC2626] italic text-[10px]">FÖRFALLEN {item.overdueDays}d</span>}
                                          {item.source === "manual" && <span className="text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] px-1.5 rounded">Manuell</span>}
                                          {item.source === "pattern" && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 rounded">Mönster</span>}
                                        </div>
                                        <span className="font-mono tabular-nums text-[#059669]">+{fmt(item.amount)}</span>
                                      </div>
                                    ))}
                                    {inflowItems.length > 0 && (
                                      <div className="flex justify-end text-xs font-semibold pt-1 border-t text-[#059669] font-mono tabular-nums">
                                        Total: +{fmt(w.inflows)} kr
                                      </div>
                                    )}
                                  </div>
                                  {/* Outflows */}
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wider mb-1.5">Utbetalningar</div>
                                    {outflowItems.length === 0 && <p className="text-xs text-muted-foreground italic">Inga förväntade utbetalningar</p>}
                                    {outflowItems.map(item => (
                                      <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                          <span>{item.description}</span>
                                          {item.source === "manual" && <span className="text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] px-1.5 rounded">Manuell</span>}
                                          {item.source === "pattern" && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 rounded">Mönster</span>}
                                        </div>
                                        <span className="font-mono tabular-nums text-[#DC2626]">−{fmt(item.amount)}</span>
                                      </div>
                                    ))}
                                    {outflowItems.length > 0 && (
                                      <div className="flex justify-end text-xs font-semibold pt-1 border-t text-[#DC2626] font-mono tabular-nums">
                                        Total: −{fmt(w.outflows)} kr
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── EMPTY STATE ───────────────────────── */}
        {!loading && weeks.length > 0 && weeks.every(w => w.inflows === 0 && w.outflows === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Inga öppna fakturor eller förpliktelser hittades.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setShowScenario(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Lägg till post
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/invoices")}>
                  Gå till fakturor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── MONTHLY FORECAST (12 MONTHS) ───── */}
        <Collapsible open={showMonthly} onOpenChange={setShowMonthly}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">12-månaders scenarioprognos</CardTitle>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showMonthly ? "rotate-180" : ""}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {monthlyLoading ? (
                  <Skeleton className="h-[300px] rounded-xl" />
                ) : monthlyData ? (
                  <>
                    {/* Monthly KPIs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="text-[11px] text-muted-foreground">Kassasaldo idag</div>
                        <div className="text-lg font-bold tabular-nums">{formatSEK(monthlyData.currentCash)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="text-[11px] text-muted-foreground">Gns. månadsflöde</div>
                        <div className={`text-lg font-bold tabular-nums ${monthlyData.avgMonthlyFlow >= 0 ? 'text-[#085041]' : 'text-destructive'}`}>
                          {formatSEK(monthlyData.avgMonthlyFlow)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="text-[11px] text-muted-foreground">Runway (pessimistiskt)</div>
                        <Badge variant={monthlyData.runway < 3 ? 'destructive' : monthlyData.runway <= 6 ? 'secondary' : 'default'}>
                          {monthlyData.runway} månader
                        </Badge>
                      </div>
                    </div>

                    {/* Scenario chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-6 h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyData.forecast}>
                          <ChartGradients />
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                          <RTooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
                          <Legend content={<CustomLegend />} />
                          <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" label={{ value: "Kritisk gräns", fontSize: 10, fill: "#DC2626" }} />
                          <Line type="monotone" dataKey="base" name="Basfall" stroke="#0052FF" strokeWidth={2.5} dot={{ r: 3, fill: "#0052FF" }} {...LINE_ANIMATION} />
                          <Line type="monotone" dataKey="optimistic" name="Optimistiskt" stroke="#22C55E" strokeWidth={1.5} strokeDasharray="6 3" dot={false} {...LINE_ANIMATION} />
                          <Line type="monotone" dataKey="pessimistic" name="Pessimistiskt" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="6 3" dot={false} {...LINE_ANIMATION} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {!monthlyData.hasData && (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Inga historiska kassaflöden hittades. Prognosen baseras på aktuellt saldo och öppna fakturor.
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── FOOTER ────────────────────────────── */}
        {lastUpdated && (
          <div className="text-[11px] text-muted-foreground text-center py-2">
            Senast uppdaterad: {lastUpdated.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
          </div>
        )}
      </main>
    </div>
  );
};


export default CashFlowForecast;
