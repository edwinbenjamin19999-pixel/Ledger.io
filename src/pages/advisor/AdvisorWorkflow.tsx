import { useMemo, useState } from "react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmTasks } from "@/hooks/useFirmTasks";
import { useWorkflowAIInsights } from "@/hooks/useWorkflowAIInsights";
import { useAutoGenerateTasks } from "@/hooks/useAutoGenerateTasks";
import { useAutoTasks } from "@/hooks/useAutoTasks";
import { WorkflowKanban } from "@/components/advisor/workflow/WorkflowKanban";
import { NewTaskDialog } from "@/components/advisor/workflow/NewTaskDialog";
import { AutoTaskCard } from "@/components/advisor/workflow/AutoTaskCard";
import { AIWorkflowAnalysisPanel } from "@/components/advisor/workflow/AIWorkflowAnalysisPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSameWeek, isToday, parseISO } from "date-fns";

type ViewMode = "kanban" | "list";
type TimeFilter = "today" | "week" | "all" | "critical" | "action";

const AdvisorWorkflow = () => {
  const { firmId } = useAdvisorContext();
  const { data: tasks = [], isLoading } = useFirmTasks(firmId);
  const { data: autoTasks = [], isLoading: autoLoading, refetch: refetchAuto } =
    useAutoTasks();
  useAutoGenerateTasks(firmId);

  const [view, setView] = useState<ViewMode>("list");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAutoTasks = useMemo(
    () => autoTasks.filter((t) => !dismissed.has(t.id)),
    [autoTasks, dismissed],
  );

  const filteredAuto = useMemo(() => {
    return visibleAutoTasks.filter((t) => {
      if (
        search &&
        !`${t.title} ${t.client_name}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        return false;
      }
      if (timeFilter === "critical") return t.priority === "critical";
      if (timeFilter === "action")
        return t.priority === "critical" || t.priority === "high";
      // Auto-tasks have no due_date — only included in "all" for time filters
      return timeFilter === "all";
    });
  }, [visibleAutoTasks, search, timeFilter]);

  const filteredManual = useMemo(() => {
    return tasks.filter((t) => {
      if (
        search &&
        !`${t.title} ${t.client_name}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        return false;
      }
      if (timeFilter === "all") return true;
      if (timeFilter === "critical") return t.priority === "urgent";
      if (timeFilter === "action")
        return t.priority === "urgent" || t.priority === "high";
      if (!t.due_date) return false;
      const due = parseISO(t.due_date);
      if (timeFilter === "today") return isToday(due);
      if (timeFilter === "week")
        return isSameWeek(due, new Date(), { weekStartsOn: 1 });
      return true;
    });
  }, [tasks, search, timeFilter]);

  const insights = useWorkflowAIInsights(filteredManual);

  const counts = useMemo(() => {
    const all = visibleAutoTasks.length + tasks.length;
    return {
      today: tasks.filter((t) => t.due_date && isToday(parseISO(t.due_date)))
        .length,
      week: tasks.filter(
        (t) =>
          t.due_date &&
          isSameWeek(parseISO(t.due_date), new Date(), { weekStartsOn: 1 }),
      ).length,
      all,
      critical:
        visibleAutoTasks.filter((t) => t.priority === "critical").length +
        tasks.filter((t) => t.priority === "urgent").length,
      action:
        visibleAutoTasks.filter(
          (t) => t.priority === "critical" || t.priority === "high",
        ).length +
        tasks.filter((t) => t.priority === "urgent" || t.priority === "high")
          .length,
    };
  }, [tasks, visibleAutoTasks]);

  if (!firmId) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Ingen byrå-kontext.</p>
      </div>
    );
  }

  const totalActive = filteredAuto.length + filteredManual.length;
  const noTasksAtAll = !isLoading && !autoLoading && totalActive === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Workflow className="h-5 w-5 text-[#3b82f6]" />
            <h1 className="text-2xl font-bold text-slate-900">Arbetsflöde</h1>
          </div>
          <p className="text-sm text-slate-500">
            Operativt nav — {totalActive} aktiva uppgifter
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setAiOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            AI Workflow-analys
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            Ny uppgift
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex bg-slate-100 rounded-lg p-1 flex-wrap">
          {[
            { key: "today" as const, label: `Idag (${counts.today})` },
            { key: "week" as const, label: `Denna vecka (${counts.week})` },
            { key: "all" as const, label: `Alla (${counts.all})` },
            { key: "critical" as const, label: `Kritiska (${counts.critical})` },
            { key: "action" as const, label: `Kräver åtgärd (${counts.action})` },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTimeFilter(opt.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                timeFilter === opt.key
                  ? "bg-white text-[#3b82f6] shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Sök uppgift eller klient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="inline-flex bg-slate-100 rounded-lg p-1 ml-auto">
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold transition-colors",
              view === "list"
                ? "bg-white text-[#3b82f6] shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold transition-colors",
              view === "kanban"
                ? "bg-white text-[#3b82f6] shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
        </div>
      </div>

      {/* Body */}
      {(isLoading || autoLoading) && totalActive === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : noTasksAtAll ? (
        <div className="rounded-[12px] border-[0.5px] border-[#A7E3C7] bg-[#F2FBF7] p-[24px] text-center">
          <CheckCircle className="h-8 w-8 mx-auto text-[#1D9E75] mb-2" />
          <h3 className="text-base font-semibold text-[#0F172A]">
            Allt är i ordning — inga uppgifter just nu
          </h3>
          <p className="text-sm text-[#475569] mt-1">
            AI-agenten övervakar portföljen och skapar uppgifter automatiskt.
          </p>
        </div>
      ) : view === "list" ? (
        <div className="space-y-3">
          {filteredAuto.map((t) => (
            <AutoTaskCard
              key={t.id}
              task={t}
              onDismiss={(id) =>
                setDismissed((prev) => new Set(prev).add(id))
              }
            />
          ))}
          {filteredManual.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Manuella uppgifter
              </p>
              <WorkflowKanban firmId={firmId} tasks={filteredManual} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAuto.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                AI-genererade uppgifter
              </p>
              {filteredAuto.map((t) => (
                <AutoTaskCard
                  key={t.id}
                  task={t}
                  onDismiss={(id) =>
                    setDismissed((prev) => new Set(prev).add(id))
                  }
                />
              ))}
            </div>
          )}
          <WorkflowKanban firmId={firmId} tasks={filteredManual} />
        </div>
      )}

      <NewTaskDialog firmId={firmId} open={newOpen} onOpenChange={setNewOpen} />

      <AIWorkflowAnalysisPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        tasks={visibleAutoTasks}
        onRegenerate={() => refetchAuto()}
      />

      {/* Hidden AI insights driver — preserves existing analytics signal */}
      <span className="sr-only" aria-hidden="true">
        {insights.length}
      </span>
    </div>
  );
};

export default AdvisorWorkflow;
