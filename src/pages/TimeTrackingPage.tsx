import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CalendarDays, Settings2, Receipt, Briefcase, DollarSign, AlertTriangle, Play, Square, Plus } from "lucide-react";
import { TimeTracker } from "@/components/timetracking/TimeTracker";
import { ProductivityDashboard } from "@/components/timetracking/ProductivityDashboard";
import { UnbilledBanner } from "@/components/timetracking/UnbilledBanner";
import { PricingIntelligence } from "@/components/timetracking/PricingIntelligence";
import { BillingAssistant } from "@/components/timetracking/BillingAssistant";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useProjects, Project, useProjectTransactions } from "@/hooks/useProjects";
import { useTimeEntries, useTimer, useTimeRates, formatHours, formatKr, TimeEntry } from "@/hooks/useTimeTracking";
import { useAuth } from "@/hooks/useAuth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { sv } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

// ── Animated number ────────────────────────
function AnimatedNumber({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 700;
    const start = performance.now();
    const from = display;
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(from + (value - from) * t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className="tabular-nums">{prefix}{new Intl.NumberFormat("sv-SE").format(display)}{suffix}</span>;
}

// ── Mini donut SVG ─────────────────────────
function MiniDonut({ percent }: { percent: number }) {
  const r = 16, c = 2 * Math.PI * r;
  const filled = (percent / 100) * c;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="flex-shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="5" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="white" strokeWidth="5"
        strokeDasharray={`${filled} ${c - filled}`} strokeDashoffset={c * 0.25}
        strokeLinecap="round" className="transition-all duration-700" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="central"
        className="fill-white text-[9px] font-bold">{percent}%</text>
    </svg>
  );
}

// ── KPI Card ───────────────────────────────
function KPICard({ gradient, icon: Icon, value, label, subtitle, badge, extra }: {
  gradient: string; icon: any; value: React.ReactNode; label: string;
  subtitle: string; badge?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className={cn("relative rounded-2xl p-5 text-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] bg-gradient-to-br", gradient)}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-medium text-white/70 whitespace-nowrap">{label}</p>
          <p className="text-2xl font-bold whitespace-nowrap">{value}</p>
          <p className="text-[11px] text-white/60">{subtitle}</p>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project Card ───────────────────────────
const PROJECT_GRADIENTS = [
  "from-violet-500 to-purple-600", "from-blue-500 to-indigo-600",
  "from-emerald-500 to-blue-600", "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-[#3b82f6] to-blue-600",
];

function ProjectCard({ project, index, timeEntries }: { project: Project; index: number; timeEntries: TimeEntry[] }) {
  const gradient = PROJECT_GRADIENTS[index % PROJECT_GRADIENTS.length];
  const logged = project.logged_hours || 0;
  const estimated = project.estimated_hours || 0;
  const progressPct = estimated > 0 ? Math.min((logged / estimated) * 100, 100) : 0;
  const budgetRemaining = (project.budget_revenue || 0) - timeEntries
    .filter(e => e.project_id === project.id && e.is_billable)
    .reduce((s, e) => s + (e.duration_minutes / 60) * (e.hourly_rate || 0), 0);

  const statusColors: Record<string, string> = {
    active: "bg-[#E1F5EE] text-[#085041] dark:text-[#1D9E75]",
    paused: "bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B]",
    completed: "bg-[#EFF6FF] text-blue-700 dark:text-[#1E3A5F]",
    offer: "bg-[#F1F5F9] text-violet-700 dark:text-[#1E3A5F]",
  };
  const statusLabel: Record<string, string> = {
    active: "Aktiv", paused: "Pausat", completed: "Avslutat", offer: "Offertfas",
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-border hover:shadow-lg transition-shadow duration-200">
      <div className={cn("h-2 bg-gradient-to-r", gradient)} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{project.name}</h3>
            {project.client_name && <p className="text-xs text-muted-foreground truncate">{project.client_name}</p>}
          </div>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", statusColors[project.status] || statusColors.active)}>
            {statusLabel[project.status] || project.status}
          </span>
        </div>

        {estimated > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{logged.toFixed(0)}/{estimated} timmar</span>
              <span>{progressPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", progressPct > 100 ? "bg-rose-500" : progressPct > 80 ? "bg-amber-500" : "bg-emerald-500")}
                style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Team initials */}
        <div className="flex items-center gap-1">
          {["A", "B"].map((init, i) => (
            <div key={i} className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", i === 0 ? "bg-violet-500" : "bg-blue-500")}>
              {init}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-2">
          <span>{project.start_date ? format(new Date(project.start_date), "d MMM", { locale: sv }) : "—"} → {project.end_date ? format(new Date(project.end_date), "d MMM", { locale: sv }) : "—"}</span>
          {(project.budget_revenue || 0) > 0 && (
            <span className="font-medium">{formatKr(Math.max(budgetRemaining, 0))} kvar</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Time entry row ─────────────────────────
function TimeEntryRow({ entry }: { entry: TimeEntry }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-muted/30 rounded-lg transition-colors">
      <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", entry.is_billable ? "bg-emerald-500" : "bg-muted-foreground/30")} />
      <span className="text-xs text-muted-foreground font-mono w-14 flex-shrink-0 text-violet-500 dark:text-[#1E3A5F]">{formatHours(entry.duration_minutes)}h</span>
      <span className="text-sm truncate flex-1">{entry.description || entry.client_name || "Ingen beskrivning"}</span>
      {entry.client_name && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.client_name}</span>}
    </div>
  );
}

// ── Profitability chart ────────────────────
function ProfitabilityChart({ projects, entries }: { projects: Project[]; entries: TimeEntry[] }) {
  const data = useMemo(() => {
    return projects
      .filter(p => p.status === "active")
      .map(p => {
        const projEntries = entries.filter(e => e.project_id === p.id && e.is_billable);
        const revenue = projEntries.reduce((s, e) => s + (e.duration_minutes / 60) * (e.hourly_rate || 0), 0);
        const cost = revenue * 0.55; // simplified cost estimate
        const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
        return { name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name, revenue: Math.round(revenue), cost: Math.round(cost), margin: Math.round(margin) };
      })
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 8);
  }, [projects, entries]);

  if (data.length === 0) return null;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Projektlönsamhet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4" style={{ height: Math.max(200, data.length * 45 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={100} />
              <Tooltip
                contentStyle={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                formatter={(v: number, name: string) => [formatKr(v), name === "revenue" ? "Intäkt" : "Kostnad"]}
              />
              <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[0, 6, 6, 0]} barSize={14}>
                <LabelList dataKey="margin" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              </Bar>
              <Bar dataKey="cost" fill="hsl(350, 89%, 60%)" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════
const TimeTrackingPage = () => {
  const { user } = useAuth();
  const displayName = useDisplayName();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY) || "";
  const { projects } = useProjects();
  const activeProjects = useMemo(() => (projects || []).filter(p => p.status === "active"), [projects]);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { entries: weekEntries } = useTimeEntries(weekStart, weekEnd);
  const { entries: allEntries } = useTimeEntries();

  const prevWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const prevWeekEnd = format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { entries: prevWeekEntries } = useTimeEntries(prevWeekStart, prevWeekEnd);

  const weekHours = weekEntries.reduce((s, e) => s + e.duration_minutes, 0) / 60;
  const prevWeekHours = prevWeekEntries.reduce((s, e) => s + e.duration_minutes, 0) / 60;
  const weekTrend = prevWeekHours > 0 ? Math.round(((weekHours - prevWeekHours) / prevWeekHours) * 100) : 0;

  const billableMinutes = weekEntries.filter(e => e.is_billable).reduce((s, e) => s + e.duration_minutes, 0);
  const totalMinutes = weekEntries.reduce((s, e) => s + e.duration_minutes, 0);
  const billablePct = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  // Hours over budget across projects
  const overBudgetHours = useMemo(() => {
    return activeProjects.reduce((total, p) => {
      if (p.estimated_hours && p.logged_hours && p.logged_hours > p.estimated_hours) {
        return total + (p.logged_hours - p.estimated_hours);
      }
      return total;
    }, 0);
  }, [activeProjects]);

  // Group recent entries by date
  const recentByDate = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    const recent = [...allEntries]
      .filter(e => e.duration_minutes > 0 && (e.description?.trim() || e.client_name?.trim()))
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
      .slice(0, 30);
    recent.forEach(e => {
      if (!map[e.entry_date]) map[e.entry_date] = [];
      map[e.entry_date].push(e);
    });
    return Object.entries(map).slice(0, 5);
  }, [allEntries]);

  return (
    <div>
      <PageHeader
        icon={Clock}
        title="Projekt & Tidrapportering"
        subtitle="Hantera projekt, logga tid och följ lönsamhet"
      />
      <div className="px-8 space-y-6">
        {/* ── HERO KPI ROW ───────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            gradient="from-violet-600 to-purple-700"
            icon={Briefcase}
            value={<AnimatedNumber value={activeProjects.length} />}
            label="Aktiva projekt"
            subtitle="Pågående uppdrag"
          />
          <KPICard
            gradient="from-blue-500 to-indigo-600"
            icon={Clock}
            value={<AnimatedNumber value={Math.round(weekHours * 10) / 10} suffix="h" />}
            label="Timmar denna vecka"
            subtitle={`Av ${displayName || "dig"} och team`}
            badge={weekTrend !== 0 ? (
              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block",
                weekTrend > 0 ? "bg-[#E1F5EE] text-emerald-300" : "bg-[#FCE8E8] text-rose-300")}>
                {weekTrend > 0 ? "+" : ""}{weekTrend}% vs förra veckan
              </span>
            ) : undefined}
          />
          <KPICard
            gradient="from-emerald-500 to-blue-600"
            icon={DollarSign}
            value={<AnimatedNumber value={billablePct} suffix="%" />}
            label="Fakturerbar tid"
            subtitle="Av total rapporterad tid"
            extra={<MiniDonut percent={billablePct} />}
          />
          <KPICard
            gradient="from-amber-500 to-orange-600"
            icon={AlertTriangle}
            value={<AnimatedNumber value={Math.round(overBudgetHours)} suffix="h" />}
            label="Obudgeterade timmar"
            subtitle="Riskprojekt kräver åtgärd"
            badge={overBudgetHours > 0 ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block bg-white/20 animate-pulse">
                {activeProjects.filter(p => (p.logged_hours || 0) > (p.estimated_hours || Infinity)).length} projekt
              </span>
            ) : undefined}
          />
        </div>

        <UnbilledBanner />

        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Projekt
            </TabsTrigger>
            <TabsTrigger value="timer" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Timer
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Veckoöversikt
            </TabsTrigger>
            <TabsTrigger value="rates" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Timpriser
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Faktureringsassistent
            </TabsTrigger>
          </TabsList>

          {/* ── PROJECTS TAB ─────────────── */}
          <TabsContent value="projects" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProjects.length > 0 ? activeProjects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} timeEntries={allEntries} />
              )) : (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-muted-foreground">Inga aktiva projekt. Skapa ett nytt projekt för att komma igång.</p>
                </Card>
              )}
            </div>

            {/* Time entries grouped by day */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Senaste tidregistreringar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentByDate.map(([date, entries]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      {format(new Date(date), "EEEE d MMMM", { locale: sv })}
                      <span className="ml-2 font-normal">{formatHours(entries.reduce((s, e) => s + e.duration_minutes, 0))}h</span>
                    </p>
                    <div className="space-y-0.5">
                      {entries.map(e => <TimeEntryRow key={e.id} entry={e} />)}
                    </div>
                  </div>
                ))}
                {recentByDate.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Ingen tid registrerad ännu</p>}
              </CardContent>
            </Card>

            {/* Profitability chart */}
            <ProfitabilityChart projects={projects || []} entries={allEntries} />
          </TabsContent>

          <TabsContent value="timer">
            <TimeTracker />
          </TabsContent>
          <TabsContent value="week">
            <ProductivityDashboard />
          </TabsContent>
          <TabsContent value="rates">
            <PricingIntelligence />
          </TabsContent>
          <TabsContent value="billing">
            <BillingAssistant />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TimeTrackingPage;
