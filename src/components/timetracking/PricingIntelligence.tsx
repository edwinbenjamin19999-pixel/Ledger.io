import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, TrendingUp, TrendingDown, ArrowUp, AlertTriangle } from "lucide-react";
import { useTimeRates, useTimeEntries, useUnbilledSummary, formatKr, formatHours } from "@/hooks/useTimeTracking";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { cn } from "@/lib/utils";

export function PricingIntelligence() { const { rates, upsertRate } = useTimeRates();
  const { entries } = useTimeEntries();
  const { unbilled } = useUnbilledSummary();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const [newLabel, setNewLabel] = useState("Standard");
  const [newRate, setNewRate] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newDefault, setNewDefault] = useState(false);

  // Aggregate stats per client
  const clientStats = useMemo(() => { const stats: Record<string, { totalMinutes: number; totalValue: number; entryCount: number; avgRate: number }> = {};
    entries.forEach((e) => { const client = e.client_name || "Okänd";
      if (!stats[client]) stats[client] = { totalMinutes: 0, totalValue: 0, entryCount: 0, avgRate: 0 };
      stats[client].totalMinutes += e.duration_minutes;
      stats[client].totalValue += (e.duration_minutes / 60) * (e.hourly_rate || 0);
      stats[client].entryCount++;
    });
    // Calc avg rate
    Object.keys(stats).forEach((k) => { const hours = stats[k].totalMinutes / 60;
      stats[k].avgRate = hours > 0 ? Math.round(stats[k].totalValue / hours) : 0;
    });
    return stats;
  }, [entries]);

  // Per-client profitability chart data
  const profitabilityData = useMemo(() => { const assumedCostPerHour = 800; // User's own cost
    return Object.entries(clientStats)
      .filter(([, s]) => s.totalMinutes > 60)
      .map(([client, s]) => { const hours = s.totalMinutes / 60;
        const revenue = s.avgRate;
        const profit = revenue - assumedCostPerHour;
        return { client: client.length > 15 ? client.slice(0, 14) + "…" : client,
          fullClient: client,
          rate: revenue,
          profit,
          hours: Math.round(hours),
          isProfitable: profit >= 0,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [clientStats]);

  const handleAdd = () => {
    if (!companyId || !newRate) return;
    upsertRate.mutate({ company_id: companyId,
      rate_label: newLabel,
      hourly_rate: parseFloat(newRate),
      client_name: newClient || null,
      project_id: null,
      is_default: newDefault,
    });
    setNewLabel("Standard");
    setNewRate("");
    setNewClient("");
    setNewDefault(false);
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Per-client profitability */}
      {profitabilityData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              <CardTitle className="text-base">Lönsamhet per kund (kr/h)</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Faktiskt timpris vs din uppskattade kostnad (800 kr/h). Röda staplar = olönsamma uppdrag.
            </p>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitabilityData} layout="vertical">
              <ChartGradients />
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kr`} />
                  <YAxis dataKey="client" type="category" width={110} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                    formatter={(v: number, name: string) => [`${v} kr/h`, name === "rate" ? "Timpris" : "Nettoresultat"]}
                    labelFormatter={(label) => { const item = profitabilityData.find((d) => d.client === label);
                      return `${item?.fullClient} (${item?.hours}h totalt)`;
                    }}
                  />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                    {profitabilityData.map((d, i) => (
                      <Cell key={i} fill={d.isProfitable ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Warnings för unprofitable clients */}
            {profitabilityData.filter((d) => !d.isProfitable).map((d) => (
              <div key={d.fullClient} className="mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-destructive">{d.fullClient}</span> ger {d.profit} kr/h netto — höj priset eller avsluta uppdraget.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Existing rates with AI analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timpriser & AI-analys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rates.length > 0 ? (
            rates.map((rate) => { const stats = rate.client_name ? clientStats[rate.client_name] : null;
              const totalHours = stats ? stats.totalMinutes / 60 : 0;
              const marketLow = Math.round(rate.hourly_rate * 0.85);
              const marketHigh = Math.round(rate.hourly_rate * 1.3);
              const suggestedIncrease = Math.round(rate.hourly_rate * 1.1);

              return (
                <div key={rate.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {rate.rate_label}
                        {rate.is_default && (
                          <span className="ml-2 text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] px-1.5 py-0.5 rounded-full font-semibold">
                            Standard
                          </span>
                        )}
                      </p>
                      {rate.client_name && (
                        <p className="text-xs text-muted-foreground">{rate.client_name}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold">{formatKr(rate.hourly_rate)}/tim</span>
                  </div>

                  <div className="bg-accent/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#3b82f6]" />
                      <span className="text-xs font-medium text-muted-foreground">AI-analys</span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p>
                        Genomsnittlig marknadsnivå: {formatKr(marketLow)}–{formatKr(marketHigh)}/tim
                      </p>
                      {stats && totalHours > 0 && (
                        <>
                          <p>Tid spenderad: {totalHours.toFixed(0)}h ({stats.entryCount} poster)</p>
                          <p>Total intäkt: {formatKr(stats.totalValue)}</p>
                        </>
                      )}
                    </div>

                    {rate.hourly_rate < suggestedIncrease && (
                      <div className="flex items-start gap-1.5 pt-1">
                        <ArrowUp className="h-3.5 w-3.5 text-[#085041] mt-0.5 flex-shrink-0" />
                        <p className="text-xs">
                          Rekommendation: Testa <span className="font-bold">{formatKr(suggestedIncrease)}/tim</span> (+10%) på nästa projekt — låg avslagsrisk.
                        </p>
                      </div>
                    )}

                    {stats && totalHours > 80 && (
                      <div className="flex items-start gap-1.5 pt-1 border-t border-border/50 mt-1">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {rate.client_name} har anlitat dig för {totalHours.toFixed(0)}h totalt. 
                          Förslag: Erbjud 5% rabatt vid &gt;100h/kvartal för att behålla kunden och öka volym.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Inga timpriser konfigurerade</p>
          )}

          {/* Add new rate */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Lägg till timpris</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Benämning</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="T.ex. Senior, Junior" />
              </div>
              <div>
                <Label className="text-xs">Timpris (kr)</Label>
                <Input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Kund (valfritt)</Label>
              <Input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Kundnamn" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newDefault} onCheckedChange={setNewDefault} id="is-default-new" />
              <Label htmlFor="is-default-new" className="text-sm cursor-pointer">Standardpris</Label>
            </div>
            <Button onClick={handleAdd} disabled={!newRate} className="gap-1.5 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground">
              <Plus className="h-4 w-4" />
              Lägg till
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
