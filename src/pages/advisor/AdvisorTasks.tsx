import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Search, ExternalLink, Sparkles, AlertTriangle, Clock, Plus } from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmTasks, useUpdateTaskStatus, type TaskStatus, type TaskPriority } from "@/hooks/useFirmTasks";
import { setStoredActiveCompanyId } from "@/lib/company-selection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WLEmptyState } from "@/components/advisor/wl-ui/WLEmptyState";
import { NewTaskDialog } from "@/components/advisor/workflow/NewTaskDialog";

const STATUS_TABS: Array<{ key: TaskStatus | "all"; label: string }> = [
  { key: "all", label: "Alla" },
  { key: "todo", label: "Att göra" },
  { key: "in_progress", label: "Pågår" },
  { key: "review", label: "Granskning" },
  { key: "done", label: "Klart" },
];

const PRIORITY_META: Record<TaskPriority, { label: string; tone: string }> = {
  urgent: { label: "Akut", tone: "bg-[#FCE8E8] text-[#7A1A1A] ring-rose-200" },
  high: { label: "Hög", tone: "bg-[#FAEEDA] text-[#7A5417] ring-amber-200" },
  medium: { label: "Medel", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
  low: { label: "Låg", tone: "bg-slate-50 text-slate-500 ring-slate-200" },
};

const AdvisorTasks = () => {
  const navigate = useNavigate();
  const { firmId, clients } = useAdvisorContext();
  const { data: tasks = [], isLoading } = useFirmTasks(firmId);

  const [tab, setTab] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tab !== "all" && t.status !== tab) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.client_name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [tasks, tab, priorityFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length };
    tasks.forEach((t) => (c[t.status] = (c[t.status] ?? 0) + 1));
    return c;
  }, [tasks]);

  const dueSoon = useMemo(() => {
    const now = Date.now();
    return tasks.filter(
      (t) =>
        t.due_date &&
        t.status !== "done" &&
        (new Date(t.due_date).getTime() - now) / 86400000 <= 7,
    ).length;
  }, [tasks]);

  const enterClient = (companyId: string) => {
    setStoredActiveCompanyId(companyId);
    navigate("/dashboard");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
            Byråportal · Uppgifter
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">Operativa uppgifter</h1>
          <p className="text-[#64748B] mt-1.5">
            {tasks.length} aktiva uppgifter över {clients.length} klienter.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {(["all", "urgent", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 h-9 rounded-lg text-xs font-semibold border transition-colors ${
                priorityFilter === p
                  ? "border-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary)/0.08)] text-[hsl(var(--brand-primary))]"
                  : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              {p === "all" ? "Alla prio" : PRIORITY_META[p].label}
            </button>
          ))}
          <Button onClick={() => setNewTaskOpen(true)} className="h-9 ml-1">
            <Plus className="h-4 w-4 mr-1" />
            Ny uppgift
          </Button>
        </div>
      </div>

      {firmId && (
        <NewTaskDialog firmId={firmId} open={newTaskOpen} onOpenChange={setNewTaskOpen} />
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totalt", value: tasks.length, icon: CheckSquare },
          { label: "Pågår", value: counts.in_progress ?? 0, icon: Clock },
          { label: "Akut prio", value: tasks.filter((t) => t.priority === "urgent").length, icon: AlertTriangle },
          { label: "Deadline ≤7d", value: dueSoon, icon: AlertTriangle },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white border border-[#E2E8F0] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
              <k.icon className="h-3 w-3" /> {k.label}
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1 tabular-nums">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key ? "text-[#0F172A]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
            style={tab === t.key ? { borderColor: "hsl(var(--brand-primary))" } : undefined}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder="Sök uppgift eller klient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-[#94A3B8]">Laddar uppgifter…</div>
      ) : filtered.length === 0 ? (
        <WLEmptyState
          icon={CheckSquare}
          title="Inga aktiva uppgifter — allt är i ordning"
          description="Uppgifter skapas automatiskt från klientstatus eller manuellt via knappen ovan."
          aiSuggestion="AI föreslår: koppla på auto-generering av återkommande bokslutsuppgifter."
          primaryAction={{ label: "+ Ny uppgift", onClick: () => setNewTaskOpen(true) }}
        />
      ) : (
        <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F8FAFC] grid grid-cols-[1fr_180px_120px_140px_120px_90px] gap-3 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
            <span>Uppgift</span>
            <span>Klient</span>
            <span>Prio</span>
            <span>Deadline</span>
            <span>Tilldelad</span>
            <span></span>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="px-4 py-3 grid grid-cols-[1fr_180px_120px_140px_120px_90px] gap-3 items-center hover:bg-[#F8FAFC] transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0F172A] truncate">{t.title}</div>
                  {t.description && (
                    <div className="text-[11px] text-[#94A3B8] truncate">{t.description}</div>
                  )}
                </div>
                <div className="text-xs text-[#64748B] truncate">{t.client_name}</div>
                <div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${PRIORITY_META[t.priority].tone}`}
                  >
                    {PRIORITY_META[t.priority].label}
                  </span>
                </div>
                <div className="text-xs text-[#64748B] tabular-nums">
                  {t.due_date ?? "—"}
                </div>
                <div className="text-xs text-[#64748B] truncate">{t.assignee_name ?? "—"}</div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => enterClient(t.company_id)}
                    className="opacity-0 group-hover:opacity-100 h-7 px-2 text-[11px]"
                  >
                    Öppna <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI hint */}
      <div className="rounded-2xl border border-[#C8DDF5] bg-blue-50/40 p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5" />
        <div className="text-xs text-[#3b82f6]">
          <strong>AI-prioritering:</strong> {dueSoon} uppgifter har deadline inom 7 dagar — fokusera på dessa först för att undvika eskalering.
        </div>
      </div>
    </div>
  );
};

export default AdvisorTasks;
