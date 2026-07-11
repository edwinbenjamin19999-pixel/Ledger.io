import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirmDeadlineRadar, type FirmDeadlineItem } from "@/hooks/useFirmDeadlineRadar";
import { CalendarClock, ListIcon, CalendarDays, BarChart3, Sparkles, Calculator, FileText, BookOpen, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { sv } from "date-fns/locale";

type ViewMode = "list" | "calendar" | "timeline";

const KIND_META: Record<FirmDeadlineItem["kind"], { label: string; bg: string; text: string; icon: any; action: string; route: (cid: string) => string }> = {
  vat:    { label: "Moms",          bg: "bg-[#0B1929]",   text: "text-white",         icon: Calculator, action: "Beräkna moms",  route: (cid) => `/wl/app/moms?client=${cid}&action=calculate` },
  agi:    { label: "AGI",           bg: "bg-[#0040CC]",   text: "text-white",         icon: FileText,   action: "Förbered AGI",  route: (cid) => `/wl/app/agi?client=${cid}` },
  ink2:   { label: "Bokslut",       bg: "bg-purple-600",  text: "text-white",         icon: BookOpen,   action: "Öppna bokslut", route: (cid) => `/wl/app/clients/${cid}/workspace/closing` },
  annual: { label: "Årsredovisning", bg: "bg-amber-500",   text: "text-white",         icon: Send,       action: "Lämna in",      route: (cid) => `/wl/app/clients/${cid}/workspace/closing` },
};

const daysCellColor = (d: number) =>
  d < 0 ? "text-red-600 font-medium"
  : d === 0 ? "text-amber-600 font-medium"
  : d <= 3 ? "text-amber-600"
  : d <= 7 ? "text-slate-700"
  : "text-slate-500";

export default function AdvisorDeadlines() {
  const { items = [], isLoading } = useFirmDeadlineRadar();
  const navigate = useNavigate();

  const [view, setView] = useState<ViewMode>("list");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [done, setDone] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (typeFilter !== "all" && d.kind !== typeFilter) return false;
      if (statusFilter === "done" && !done.has(deadKey(d))) return false;
      if (statusFilter === "today" && !isToday(d.due_date)) return false;
      if (statusFilter === "overdue" && d.daysLeft >= 0) return false;
      if (statusFilter === "upcoming" && d.daysLeft < 0) return false;
      return true;
    });
  }, [items, typeFilter, statusFilter, done]);

  const overdueCount = filtered.filter((i) => i.daysLeft < 0).length;
  const weekCount = filtered.filter((i) => isThisWeek(i.due_date, { weekStartsOn: 1 })).length;
  const estHours = weekCount * 1.5;

  const toggleDone = (d: FirmDeadlineItem) => {
    setDone((s) => {
      const n = new Set(s);
      const k = deadKey(d);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-slate-900 flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Deadlines
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">Alla klienter — samlad vy</p>
        </div>
        <div className="inline-flex border border-slate-200 rounded-lg p-0.5 text-[12px] bg-white">
          {([
            { k: "list", label: "Lista", icon: ListIcon },
            { k: "calendar", label: "Kalender", icon: CalendarDays },
            { k: "timeline", label: "Tidslinje", icon: BarChart3 },
          ] as const).map((v) => (
            <button
              key={v.k}
              onClick={() => setView(v.k)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                view === v.k ? "bg-[#0052FF] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-[160px] text-[12px]"><SelectValue placeholder="Typ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="vat">Moms</SelectItem>
            <SelectItem value="agi">AGI</SelectItem>
            <SelectItem value="ink2">Bokslut</SelectItem>
            <SelectItem value="annual">Årsredovisning</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] text-[12px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla</SelectItem>
            <SelectItem value="upcoming">Kommande</SelectItem>
            <SelectItem value="today">Idag</SelectItem>
            <SelectItem value="overdue">Försenade</SelectItem>
            <SelectItem value="done">Klara</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || statusFilter !== "all") && (
          <button
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
            className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Rensa
          </button>
        )}
      </div>

      {/* MAIN VIEW */}
      {view === "list" && (
        <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-[12px] text-slate-400">Laddar…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-slate-400">Inga deadlines.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 w-8"></th>
                  <th className="text-left px-4 py-2">Datum</th>
                  <th className="text-left px-4 py-2">Klient</th>
                  <th className="text-left px-4 py-2">Typ</th>
                  <th className="text-left px-4 py-2">Dagar kvar</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const k = deadKey(d);
                  const isDone = done.has(k);
                  const meta = KIND_META[d.kind];
                  const Icon = meta.icon;
                  const rowBg = isDone ? "bg-white text-[#94A3B8]"
                    : d.daysLeft < 0 ? "bg-[#FFF8F8]"
                    : d.daysLeft === 0 ? "bg-[#FFFBF0]"
                    : isThisWeek(d.due_date, { weekStartsOn: 1 }) ? "bg-white border-l-2 border-l-amber-400"
                    : "bg-white";
                  return (
                    <tr key={k} className={`border-t border-slate-100 ${rowBg}`}>
                      <td className="px-4 py-2.5">
                        <Checkbox checked={isDone} onCheckedChange={() => toggleDone(d)} />
                      </td>
                      <td className={`px-4 py-2.5 tabular-nums ${isDone ? "line-through" : ""}`}>
                        {format(d.due_date, "yyyy-MM-dd")}
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => navigate(`/wl/app/clients/${d.client_id}`)} className="font-medium text-slate-900 hover:text-blue-600">
                          {d.client_name}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${meta.bg} ${meta.text}`}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 tabular-nums ${daysCellColor(d.daysLeft)}`}>
                        {d.daysLeft < 0 ? `${d.daysLeft} dagar` : d.daysLeft === 0 ? "Idag" : `${d.daysLeft} dagar`}
                      </td>
                      <td className="px-4 py-2.5">
                        {(() => {
                          if (d.daysLeft < 0) {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-[#FCEBEB] text-[#501313] text-[10px] font-medium">
                                FÖRSENAD
                              </span>
                            );
                          }
                          if (isDone) {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-[#E1F5EE] text-[#085041] text-[10px] font-medium">
                                Inlämnad
                              </span>
                            );
                          }
                          if (d.daysLeft <= 3) {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-[#FAEEDA] text-[#412402] text-[10px] font-medium">
                                Klar för granskning
                              </span>
                            );
                          }
                          if (d.daysLeft <= 14) {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#0C447C] text-[10px] font-medium">
                                Pågår
                              </span>
                            );
                          }
                          return (
                            <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[10px] font-medium">
                              Ej påbörjad
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => navigate(meta.route(d.client_id))}
                          className="bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[11px] font-medium px-[12px] h-[28px] inline-flex items-center"
                        >
                          {meta.action}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === "calendar" && (
        <CalendarView items={filtered} />
      )}

      {view === "timeline" && (
        <TimelineView items={filtered} />
      )}

      {/* AI ASSISTANT */}
      {(() => {
        const upcoming = filtered.filter((i) => i.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft);
        const next = upcoming[0];
        const weekClients = new Set(filtered.filter((i) => isThisWeek(i.due_date, { weekStartsOn: 1 })).map((i) => i.client_id)).size;
        return (
          <div className="bg-[#EFF6FF] border border-[#B5D4F4] rounded-[12px] p-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
            <div className="text-[13px] text-slate-800 space-y-1.5 flex-1">
              {weekCount > 0 ? (
                <>
                  <p>
                    <strong>Denna vecka:</strong> {weekCount} deadlines för {weekClients} klienter.
                  </p>
                  {next && (
                    <p className="text-slate-700">
                      Närmast: <strong>{next.client_name}</strong> — {KIND_META[next.kind].label} förfaller {format(next.due_date, "d MMM", { locale: sv })} (om {next.daysLeft} dagar)
                    </p>
                  )}
                  <p className="text-slate-600">Estimerad byråtid: ~{(weekCount * 1.5).toFixed(1)} timmar baserat på historik</p>
                </>
              ) : upcoming.length > 0 ? (
                <>
                  <p>
                    <strong>Inga deadlines denna vecka.</strong> Nästa: {format(next!.due_date, "d MMM", { locale: sv })} för {next!.client_name} ({KIND_META[next!.kind].label}, om {next!.daysLeft} dagar).
                  </p>
                  <p className="text-slate-600">
                    Totalt {upcoming.length} kommande deadlines för {new Set(upcoming.map((i) => i.client_id)).size} klienter.
                  </p>
                </>
              ) : (
                <p>Inga kommande deadlines att visa.</p>
              )}
              {overdueCount > 0 && (
                <p className="text-red-700">⚠ {overdueCount} deadlines är försenade. Prioritera dessa idag.</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function deadKey(d: FirmDeadlineItem) {
  return `${d.client_id}-${d.kind}-${d.due_date.toISOString()}`;
}

const CalendarView = ({ items }: { items: FirmDeadlineItem[] }) => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Mon=0

  const cells: ({ date: Date; items: FirmDeadlineItem[] } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(today.getFullYear(), today.getMonth(), d);
    cells.push({
      date,
      items: items.filter((it) => it.due_date.toDateString() === date.toDateString()),
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[12px] p-4">
      <p className="text-[14px] font-medium mb-3">{format(monthStart, "MMMM yyyy", { locale: sv })}</p>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase text-slate-400 mb-1">
        {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={`min-h-[72px] border border-slate-100 rounded-md p-1.5 text-[11px] ${
            c && isToday(c.date) ? "bg-blue-50/40 border-blue-200" : "bg-white"
          }`}>
            {c && (
              <>
                <p className={`text-[11px] mb-1 ${isToday(c.date) ? "text-blue-700 font-semibold" : "text-slate-500"}`}>
                  {c.date.getDate()}
                </p>
                <div className="space-y-0.5">
                  {c.items.slice(0, 2).map((it, j) => {
                    const meta = KIND_META[it.kind];
                    const initials = it.client_name.split(" ").map((s) => s[0]).slice(0, 2).join("");
                    return (
                      <div key={j} className={`truncate px-1 py-0.5 rounded text-[9px] font-medium ${meta.bg} ${meta.text}`}>
                        {initials} {meta.label}
                      </div>
                    );
                  })}
                  {c.items.length > 2 && (
                    <p className="text-[9px] text-slate-400">+{c.items.length - 2} till</p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-[10px]">
        {Object.entries(KIND_META).map(([k, m]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${m.bg}`} /> {m.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const TimelineView = ({ items }: { items: FirmDeadlineItem[] }) => {
  const byClient = new Map<string, FirmDeadlineItem[]>();
  items.forEach((i) => {
    if (!byClient.has(i.client_name)) byClient.set(i.client_name, []);
    byClient.get(i.client_name)!.push(i);
  });
  const minDate = items.length ? Math.min(...items.map((i) => i.due_date.getTime())) : Date.now();
  const maxDate = items.length ? Math.max(...items.map((i) => i.due_date.getTime())) : Date.now() + 30 * 86400000;
  const range = Math.max(maxDate - minDate, 30 * 86400000);
  const todayPct = ((Date.now() - minDate) / range) * 100;

  return (
    <div className="bg-white border border-slate-200 rounded-[12px] p-4">
      <p className="text-[12px] uppercase tracking-wider text-slate-500 mb-3">Tidslinje</p>
      <div className="space-y-2">
        {Array.from(byClient.entries()).map(([name, list]) => (
          <div key={name} className="flex items-center gap-3">
            <div className="w-32 shrink-0 text-[12px] truncate text-slate-700">{name}</div>
            <div className="relative flex-1 h-7 bg-slate-50 rounded-md">
              {todayPct >= 0 && todayPct <= 100 && (
                <div className="absolute top-0 bottom-0 w-px bg-[#0052FF]" style={{ left: `${todayPct}%` }} />
              )}
              {list.map((it, j) => {
                const pct = ((it.due_date.getTime() - minDate) / range) * 100;
                const meta = KIND_META[it.kind];
                return (
                  <div key={j}
                    className={`absolute top-1.5 h-4 w-4 rounded-full ${meta.bg} border-2 border-white shadow`}
                    style={{ left: `calc(${pct}% - 8px)` }}
                    title={`${meta.label} ${format(it.due_date, "yyyy-MM-dd")}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-3">Vertikal linje markerar idag.</p>
    </div>
  );
};
