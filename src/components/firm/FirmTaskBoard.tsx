import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Calendar, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface FirmTaskBoardProps { firmId: string;
}

interface Task { id: string;
  title: string;
  description: string | null;
  task_type: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  company_id: string;
  assigned_to: string | null;
  companies?: { name: string } | null;
}

const taskTypeOptions = [
  { value: "bookkeeping", label: "Bokföring" },
  { value: "vat", label: "Momsdeklaration" },
  { value: "agi", label: "AGI" },
  { value: "payroll", label: "Lön" },
  { value: "annual_report", label: "Bokslut" },
  { value: "tax_return", label: "Deklaration" },
  { value: "reconciliation", label: "Avstämning" },
  { value: "other", label: "Övrigt" },
];

const priorityOptions = [
  { value: "low", label: "Låg" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "Hög" },
  { value: "urgent", label: "Brådskande" },
];

const statusColumns = [
  { key: "todo", label: "Att göra", icon: Clock, color: "text-muted-foreground" },
  { key: "in_progress", label: "Pågår", icon: AlertTriangle, color: "text-blue-600" },
  { key: "review", label: "Granskning", icon: Calendar, color: "text-[#7A5417]" },
  { key: "done", label: "Klart", icon: CheckCircle2, color: "text-[#085041]" },
];

export const FirmTaskBoard = ({ firmId }: FirmTaskBoardProps) => { const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState<{ company_id: string; name: string }[]>([]);

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("bookkeeping");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCompany, setNewCompany] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => { loadData();
  }, [firmId]);

  const loadData = async () => { const [tasksRes, clientsRes] = await Promise.all([
      supabase
        .from("firm_tasks")
        .select("*, companies:company_id (name)")
        .eq("firm_id", firmId)
        .order("created_at", { ascending: false }),
      supabase
        .from("firm_clients")
        .select("company_id, companies:company_id (name)")
        .eq("firm_id", firmId)
        .eq("is_active", true),
    ]);

    setTasks(tasksRes.data || []);
    setClients(
      (clientsRes.data || []).map((c: any) => ({ company_id: c.company_id,
        name: c.companies?.name || "Okänt",
      }))
    );
    setLoading(false);
  };

  const createTask = async () => { if (!newTitle || !newCompany) { toast.error("Fyll i titel och välj klient");
      return;
    }
    try { const { error } = await supabase.from("firm_tasks").insert({ firm_id: firmId,
        company_id: newCompany,
        title: newTitle,
        description: newDesc || null,
        task_type: newType as string,
        priority: newPriority as string,
        due_date: newDueDate || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success("Uppgift skapad");
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      loadData();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa uppgift");
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => { const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "done") { updates.completed_at = new Date().toISOString();
      updates.completed_by = user?.id;
    }
    const { error } = await supabase.from("firm_tasks").update(updates).eq("id", taskId);
    if (error) { toast.error("Kunde inte uppdatera status");
    } else { setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  const priorityColor: Record<string, string> = { low: "bg-muted text-muted-foreground",
    medium: "bg-[#EFF6FF] text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    urgent: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Uppgiftshantering</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Ny uppgift</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skapa uppgift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Klient</Label>
                <Select value={newCompany} onValueChange={setNewCompany}>
                  <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="T.ex. Bokslut 2025" />
              </div>
              <div className="space-y-2">
                <Label>Beskrivning</Label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {taskTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioritet</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
              </div>
              <Button onClick={createTask} className="w-full">Skapa</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban-style board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statusColumns.map(col => { const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <col.icon className={`h-4 w-4 ${col.color}`} />
                <span className="font-medium text-sm">{col.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
              </div>
              {colTasks.map(task => (
                <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3 space-y-2">
                    <p className="font-medium text-sm">{task.title}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {task.companies?.name || ""}
                      </Badge>
                      {task.task_type && (
                        <Badge variant="outline" className="text-xs">
                          {taskTypeOptions.find(o => o.value === task.task_type)?.label || task.task_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColor[task.priority] || ""}`}>
                        {priorityOptions.find(o => o.value === task.priority)?.label}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.due_date).toLocaleDateString("sv-SE")}
                        </span>
                      )}
                    </div>
                    {col.key !== "done" && (
                      <Select
                        value={task.status}
                        onValueChange={(val) => updateTaskStatus(task.id, val)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusColumns.map(s => (
                            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
