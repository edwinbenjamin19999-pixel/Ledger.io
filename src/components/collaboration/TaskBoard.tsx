import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Trash2, Calendar, GripVertical, AlertCircle, Clock, Circle, CheckCircle2 } from "lucide-react";
import { useCollaboration, CollaborationTask } from "@/hooks/useCollaboration";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const COLUMNS = [
  { key: "todo", label: "Att göra", accent: "border-t-slate-400" },
  { key: "in_progress", label: "Pågående", accent: "border-t-blue-500" },
  { key: "review", label: "Granskning", accent: "border-t-amber-500" },
  { key: "done", label: "Klar", accent: "border-t-green-500" },
] as const;

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  urgent: { label: "Brådskande", bg: "bg-[#FCE8E8] dark:bg-red-900/30", text: "text-[#7A1A1A] dark:text-[#C73838]" },
  high: { label: "Hög", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
  medium: { label: "Medium", bg: "bg-[#EFF6FF] dark:bg-blue-900/30", text: "text-blue-700 dark:text-[#1E3A5F]" },
  low: { label: "Låg", bg: "bg-muted", text: "text-muted-foreground" },
};

export const TaskBoard = () => {
  const { useTasks, addTask, updateTaskStatus, deleteTask } = useCollaboration();
  const { data: tasks = [], isLoading } = useTasks("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createInStatus, setCreateInStatus] = useState("todo");
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", due_date: "" });
  const [selectedTask, setSelectedTask] = useState<CollaborationTask | null>(null);

  const handleCreate = () => {
    if (!newTask.title.trim()) return;
    addTask.mutate(
      { ...newTask, due_date: newTask.due_date || undefined, status: createInStatus }, {
        onSuccess: () => {
          setNewTask({ title: "", description: "", priority: "medium", due_date: "" });
          setShowCreate(false);
        },
      }
    );
  };

  const openCreateInColumn = (status: string) => {
    setCreateInStatus(status);
    setShowCreate(true);
  };

  const grouped = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.key),
  }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="bg-muted/30 rounded-xl p-4 h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {grouped.map((col) => (
          <div key={col.key} className={`rounded-xl border-t-4 ${col.accent} bg-muted/20 p-3 space-y-3 min-h-[300px]`}>
            {/* Column header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">
                  {col.tasks.length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreateInColumn(col.key)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Task cards */}
            <div className="space-y-2">
              {col.tasks.map((task) => {
                const p = priorityConfig[task.priority] || priorityConfig.medium;
                return (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTask(task)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.bg} ${p.text} border-0`}>
                          {p.label}
                        </Badge>
                        {task.due_date && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {format(new Date(task.due_date), "d MMM", { locale: sv })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {col.tasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Inga uppgifter</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny uppgift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Titel"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <Textarea
              placeholder="Beskrivning (valfritt)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                <SelectTrigger><SelectValue placeholder="Prioritet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Låg</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">Hög</SelectItem>
                  <SelectItem value="urgent">Brådskande</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <Button onClick={handleCreate} disabled={!newTask.title.trim() || addTask.isPending} className="w-full">
              Skapa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task detail sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent>
          {selectedTask && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-left">{selectedTask.title}</SheetTitle>
              </SheetHeader>

              {selectedTask.description && (
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(v) => {
                      updateTaskStatus.mutate({ taskId: selectedTask.id, status: v });
                      setSelectedTask({ ...selectedTask, status: v });
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Prioritet</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={`${priorityConfig[selectedTask.priority]?.bg} ${priorityConfig[selectedTask.priority]?.text} border-0`}>
                      {priorityConfig[selectedTask.priority]?.label || selectedTask.priority}
                    </Badge>
                  </div>
                </div>

                {selectedTask.due_date && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Förfallodatum</label>
                    <p className="text-sm mt-1">{format(new Date(selectedTask.due_date), "d MMMM yyyy", { locale: sv })}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Skapad</label>
                  <p className="text-sm mt-1">{format(new Date(selectedTask.created_at), "d MMMM yyyy HH:mm", { locale: sv })}</p>
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  deleteTask.mutate(selectedTask.id);
                  setSelectedTask(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Ta bort uppgift
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
