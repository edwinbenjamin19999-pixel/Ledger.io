import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, Calendar } from "lucide-react";
import { useTimeEntries, useUnbilledSummary, formatHours, formatKr, TimeEntry } from "@/hooks/useTimeTracking";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isToday, subWeeks } from "date-fns";
import { sv } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

const BLOCK_COLORS: Record<string, string> = { billable: "bg-[#E1F5EE] border-[#BFE6D6] text-[#085041] dark:text-[#1D9E75]",
  internal: "bg-muted border-border text-muted-foreground",
  meeting: "bg-[#EFF6FF] border-[#C8DDF5] text-blue-700 dark:text-[#1E3A5F]",
};

export function ProductivityDashboard() {
  const chartTheme = useChartTheme(); const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = useMemo(() => { const now = addWeeks(new Date(), weekOffset);
    return startOfWeek(now, { weekStartsOn: 1 });
  }, [weekOffset]);

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const { entries } = useTimeEntries(
    format(currentWeekStart, "yyyy-MM-dd"),
    format(currentWeekEnd, "yyyy-MM-dd")
  );

  // Fetch wider range för trend (12 weeks)
  const trendStart = useMemo(() => subWeeks(new Date(), 11), []);
  const { entries: allEntries } = useTimeEntries(
    format(startOfWeek(trendStart, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );

  const { unbilled } = useUnbilledSummary();

  const weekTotal = entries.reduce((s, e) => s + e.duration_minutes, 0);
  const weekBillable = entries.filter((e) => e.is_billable).reduce((s, e) => s + e.duration_minutes, 0);
  const weekNonBillable = weekTotal - weekBillable;
  const billablePercent = weekTotal > 0 ? Math.round((weekBillable / weekTotal) * 100) : 0;

  const weekRevenue = entries
    .filter((e) => e.is_billable)
    .reduce((s, e) => s + (e.duration_minutes / 60) * (e.hourly_rate || 0), 0);
  const unbilledRevenue = weekRevenue - entries
    .filter((e) => e.is_billable && e.is_billed)
    .reduce((s, e) => s + (e.duration_minutes / 60) * (e.hourly_rate || 0), 0);

  // Category breakdown
  const categoryBreakdown = useMemo(() => { const cats: Record<string, number> = {};
    entries.forEach((e) => { const desc = (e.description || "").toLowerCase();
      let cat = "Övrigt arbete";
      if (desc.includes("möte") || desc.includes("meeting")) cat = "Möten";
      else if (desc.includes("e-post") || desc.includes("mail")) cat = "E-post & kommunikation";
      else if (desc.includes("faktura") || desc.includes("admin")) cat = "Administration";
      else if (e.is_billable) cat = "Fakturerbart arbete";
      cats[cat] = (cats[cat] || 0) + e.duration_minutes;
    });
    return Object.entries(cats)
      .map(([label, minutes]) => ({ label, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [entries]);

  // Weekly trend data (12 weeks)
  const weeklyTrend = useMemo(() => { const weeks: Record<string, { total: number; billable: number }> = {};
    allEntries.forEach((e) => { const ws = format(startOfWeek(new Date(e.entry_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      if (!weeks[ws]) weeks[ws] = { total: 0, billable: 0 };
      weeks[ws].total += e.duration_minutes;
      if (e.is_billable) weeks[ws].billable += e.duration_minutes;
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ws, d]) => ({ week: `v${format(new Date(ws), "w", { locale: sv })}`,
        rate: d.total > 0 ? Math.round((d.billable / d.total) * 100) : 0,
        hours: Math.round(d.total / 60),
      }));
  }, [allEntries]);

  // Day-of-week performance
  const dayPerformance = useMemo(() => { const dayMap: Record<string, { total: number; billable: number; count: number }> = {};
    const dayNames = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"];
    dayNames.forEach((d) => (dayMap[d] = { total: 0, billable: 0, count: 0 }));
    allEntries.forEach((e) => { const dayIdx = (new Date(e.entry_date).getDay() + 6) % 7;
      const key = dayNames[dayIdx];
      dayMap[key].total += e.duration_minutes;
      if (e.is_billable) dayMap[key].billable += e.duration_minutes;
      dayMap[key].count++;
    });
    return dayNames.map((d) => ({ day: d.charAt(0).toUpperCase() + d.slice(1),
      avgHours: dayMap[d].count > 0 ? Math.round((dayMap[d].total / dayMap[d].count / 60) * 10) / 10 : 0,
      billableRate: dayMap[d].total > 0 ? Math.round((dayMap[d].billable / dayMap[d].total) * 100) : 0,
    }));
  }, [allEntries]);

  // Revenue forecast
  const monthlyForecast = useMemo(() => { const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEntries = allEntries.filter((e) => e.entry_date.startsWith(format(now, "yyyy-MM")));
    const monthHours = monthEntries.reduce((s, e) => s + e.duration_minutes, 0) / 60;
    const monthRevenue = monthEntries
      .filter((e) => e.is_billable)
      .reduce((s, e) => s + (e.duration_minutes / 60) * (e.hourly_rate || 0), 0);
    const dailyRate = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
    const projected = dailyRate * daysInMonth;
    return { monthHours: Math.round(monthHours), monthRevenue, projected: Math.round(projected), remaining: Math.round(projected - monthRevenue) };
  }, [allEntries]);

  const entriesByDay = useMemo(() => { const map: Record<string, TimeEntry[]> = {};
    days.forEach((d) => { const key = format(d, "yyyy-MM-dd");
      map[key] = entries.filter((e) => e.entry_date === key);
    });
    return map;
  }, [entries, days]);

  return (
    <div className="space-y-4 mt-4">
      {/* Weekly KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Total tid</p>
            <p className="text-xl font-bold">{formatHours(weekTotal)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Fakturerbar</p>
            <p className="text-xl font-bold">{formatHours(weekBillable)}h
              <span className={cn(
                "ml-1.5 text-xs font-semibold",
                billablePercent >= 80 ? "text-[#085041]" : billablePercent >= 60 ? "text-orange-500" : "text-[#7A1A1A]"
              )}>
                ({billablePercent}%)
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Ej fakturerbar</p>
            <p className="text-xl font-bold">{formatHours(weekNonBillable)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Intäktspotential</p>
            <p className="text-xl font-bold">{formatKr(weekRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground">Månadsprognos</p>
            <p className="text-xl font-bold">{formatKr(monthlyForecast.projected)}</p>
            <p className="text-[10px] text-muted-foreground">Hittills: {formatKr(monthlyForecast.monthRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Billable rate trend */}
      {weeklyTrend.length > 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              Faktureringsgrad — 12 veckors trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                    formatter={(v: number) => [`${v}%`, "Faktureringsgrad"]}
                  />
                  <ReferenceLine y={80} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Mål 80%", position: "right", className: "text-[10px] fill-muted-foreground" }} />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day-of-week performance */}
      {dayPerformance.some((d) => d.avgHours > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Produktivitet per veckodag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-40`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayPerformance}>
              <ChartGradients />
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                    formatter={(v: number, name: string) => [name === "avgHours" ? `${v}h snitt` : `${v}%`, name === "avgHours" ? "Timmar" : "Faktureringsgrad"]}
                  />
                  <Bar dataKey="avgHours" radius={[6, 6, 0, 0]}>
                    {dayPerformance.map((d, i) => (
                      <Cell key={i} fill={d.billableRate >= 80 ? "#10b981" : d.billableRate >= 60 ? "#f59e0b" : "hsl(var(--muted-foreground))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {(() => { const best = [...dayPerformance].sort((a, b) => b.avgHours - a.avgHours);
                const top3 = best.filter((d) => d.avgHours > 0).slice(0, 3);
                if (top3.length === 0) return null;
                return (
                  <p>
                    Bästa dagar: {top3.map((d) => d.day).join(", ")} —{" "}
                    lägst faktureringsgrad: {best.filter((d) => d.avgHours > 0).reverse()[0]?.day || "—"}
                  </p>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar grid */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">
                v.{format(currentWeekStart, "w", { locale: sv })} — {format(currentWeekStart, "d MMM", { locale: sv })} till {format(currentWeekEnd, "d MMM yyyy", { locale: sv })}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {weekOffset !== 0 && (
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} className="text-xs h-7">Idag</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => { const key = format(day, "yyyy-MM-dd");
              const dayEntries = entriesByDay[key] || [];
              const dayTotal = dayEntries.reduce((s, e) => s + e.duration_minutes, 0);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border p-2 min-h-[120px] flex flex-col",
                    today ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-medium", today ? "text-[hsl(var(--primary))]" : "text-muted-foreground")}>
                      {format(day, "EEE", { locale: sv })}
                    </span>
                    <span className={cn("text-[10px]", today ? "text-[hsl(var(--primary))] font-bold" : "text-muted-foreground")}>
                      {format(day, "d")}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    {dayEntries.map((entry) => { const desc = (entry.description || "").toLowerCase();
                      let colorKey = "internal";
                      if (entry.is_billable) colorKey = "billable";
                      if (desc.includes("möte") || desc.includes("meeting")) colorKey = "meeting";

                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] border truncate",
                            entry.is_billed ? "opacity-50" : "",
                            BLOCK_COLORS[colorKey]
                          )}
                          title={`${entry.client_name || "Okänd"}: ${formatHours(entry.duration_minutes)}h — ${entry.description || ""}`}
                        >
                          <span className="font-medium">{formatHours(entry.duration_minutes)}h</span>
                          {entry.client_name && <span className="ml-1">{entry.client_name}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {dayTotal > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1 text-right font-medium">
                      {formatHours(dayTotal)}h
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Fakturerbar</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Intern/admin</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Möten</span>
          </div>
        </CardContent>
      </Card>

      {/* AI Productivity Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            AI Produktivitetsinsikter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Billable gap warning */}
          {weekNonBillable > 0 && (
            <div className="p-3 rounded-lg bg-accent/50 border border-border space-y-2">
              <p className="text-sm">
                Denna vecka: <span className="font-bold">{formatHours(weekTotal)}h</span> loggat |{" "}
                <span className="font-bold">{formatHours(weekBillable)}h</span> fakturerbart
              </p>
              <p className="text-sm text-muted-foreground">
                Ofakturerbar tid: {formatHours(weekNonBillable)}h ({100 - billablePercent}%) — fördelning:
              </p>
              <ul className="space-y-0.5">
                {categoryBreakdown.filter(c => c.label !== "Fakturerbart arbete").slice(0, 4).map((c) => (
                  <li key={c.label} className="text-xs text-muted-foreground flex justify-between">
                    <span>{c.label}</span>
                    <span className="font-medium">{formatHours(c.minutes)}h</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Revenue forecast */}
          {monthlyForecast.monthRevenue > 0 && (
            <div className="p-3 rounded-lg bg-accent/50 border border-border">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-[#085041] mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">Intäktsprognos denna månad</p>
                  <p className="text-muted-foreground">
                    Hittills: {formatKr(monthlyForecast.monthRevenue)} ({monthlyForecast.monthHours}h loggat)
                  </p>
                  <p>
                    Prognos: <span className="font-bold">{formatKr(monthlyForecast.projected)}</span>
                    {monthlyForecast.remaining > 0 && (
                      <span className="text-muted-foreground"> (kvar: ~{formatKr(monthlyForecast.remaining)})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Billable rate assessment */}
          <div className="p-3 rounded-lg bg-accent/50 border border-border">
            <p className="text-sm">
              Din faktureringsgrad är{" "}
              <span className={cn("font-bold", billablePercent >= 80 ? "text-[#085041]" : "text-orange-500")}>
                {billablePercent}%
              </span>
              {billablePercent < 80
                ? " — målet bör vara >80% för optimal lönsamhet."
                : " — bra! Du ligger över målnivån."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Integration Banner */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Koppla Google Kalender / Outlook</p>
              <p className="text-xs text-muted-foreground">
                AI skapar tidsposter automatiskt från dina möten. Mötets titel matchas mot projekt.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="text-xs">Inte nu</Button>
            <Button size="sm" className="text-xs bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground">Aktivera</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
