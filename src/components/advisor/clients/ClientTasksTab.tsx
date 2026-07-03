import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Loader2, Calendar, FileText, BarChart3, Layers, Send, Search } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  task_type: string | null;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  priority: string;
}

const TYPE_OPTIONS = [
  { value: "vat", label: "Moms", icon: Calendar },
  { value: "agi", label: "AGI", icon: FileText },
  { value: "annual_report", label: "Bokslut", icon: BarChart3 },
  { value: "tax_return", label: "Årsredovisning", icon: Layers },
  { value: "other", label: "Klientleverans", icon: Send },
  { value: "reconciliation", label: "Granskning", icon: Search },
];

interface Props {
  companyId: string;
  firmId: string;
}

export const ClientTasksTab = ({ companyId, firmId }: Props) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "done" | "all">("active");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", task_type: "other", due_date: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("firm_tasks")
      .select("id,title,task_type,due_date,status,assigned_to,priority")
      .eq("company_id", companyId)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) toast.error("Kunde inte ladda uppgifter");
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "done") return tasks.filter((t) => t.status === "done");
    return tasks.filter((t) => t.status !== "done");
  }, [tasks, filter]);

  const toggleDone = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    const { data: u } = await supabase.auth.getUser();
    await supabase
      .from("firm_tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
        completed_by: newStatus === "done" ? u.user?.id : null,
      })
      .eq("id", task.id);
    load();
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("firm_tasks").insert({
      firm_id: firmId,
      company_id: companyId,
      title: newTask.title.trim(),
      task_type: newTask.task_type,
      due_date: newTask.due_date || null,
      created_by: u.user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewTask({ title: "", task_type: "other", due_date: "" });
    setShowAdd(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex border border-slate-200 rounded-lg p-0.5 text-[12px]">
          {(["active", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "active" ? "Aktiva" : f === "done" ? "Slutförda" : "Alla"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowAdd((s) => !s)}>
          <Plus className="h-4 w-4 mr-1" /> Lägg till uppgift
        </Button>
      </div>

      {showAdd && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2">
          <Input
            className="md:col-span-5"
            placeholder="Uppgift…"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          <Select
            value={newTask.task_type}
            onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}
          >
            <SelectTrigger className="md:col-span-3"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="md:col-span-2"
            value={newTask.due_date}
            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
          />
          <Button onClick={addTask} className="md:col-span-2">Spara</Button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-slate-400">Inga uppgifter.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 w-8"></th>
                <th className="text-left px-4 py-2">Uppgift</th>
                <th className="text-left px-4 py-2">Typ</th>
                <th className="text-left px-4 py-2">Deadline</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const typeMeta = TYPE_OPTIONS.find((o) => o.value === t.task_type);
                const Icon = typeMeta?.icon ?? FileText;
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <Checkbox
                        checked={t.status === "done"}
                        onCheckedChange={() => toggleDone(t)}
                      />
                    </td>
                    <td className={`px-4 py-2.5 ${t.status === "done" ? "line-through text-slate-400" : ""}`}>
                      {t.title}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" /> {typeMeta?.label ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {t.due_date ? format(new Date(t.due_date), "yyyy-MM-dd") : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        t.status === "done"
                          ? "bg-emerald-50 text-emerald-700"
                          : t.status === "in_progress"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {t.status === "done" ? "Klar" : t.status === "in_progress" ? "Pågår" : "Att göra"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
