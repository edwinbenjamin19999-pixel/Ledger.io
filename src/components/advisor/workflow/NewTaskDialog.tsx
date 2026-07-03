import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useCreateTask, type TaskPriority, type TaskType } from "@/hooks/useFirmTasks";

interface Props {
  firmId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

const TYPES: { value: TaskType; label: string }[] = [
  { value: "bookkeeping", label: "Bokföring" },
  { value: "vat", label: "Momsdeklaration" },
  { value: "agi", label: "AGI" },
  { value: "payroll", label: "Lön" },
  { value: "annual_report", label: "Bokslut" },
  { value: "tax_return", label: "Deklaration" },
  { value: "reconciliation", label: "Avstämning" },
  { value: "other", label: "Övrigt" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Brådskande" },
  { value: "high", label: "Hög" },
  { value: "medium", label: "Normal" },
  { value: "low", label: "Låg" },
];

export const NewTaskDialog = ({ firmId, open, onOpenChange, defaultClientId }: Props) => {
  const { clients } = useAdvisorContext();
  const create = useCreateTask(firmId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState(defaultClientId ?? "");
  const [taskType, setTaskType] = useState<TaskType>("bookkeeping");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setCompanyId(defaultClientId ?? "");
    setTaskType("bookkeeping");
    setPriority("medium");
    setDueDate("");
  };

  const handleCreate = async () => {
    if (!title || !companyId) return;
    await create.mutateAsync({
      company_id: companyId,
      title,
      description: description || undefined,
      task_type: taskType,
      priority,
      due_date: dueDate || null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ny uppgift</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Titel</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Stäm av kundreskontra"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Klient</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj klient" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioritet</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Deadline</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Beskrivning (valfri)</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleCreate} disabled={!title || !companyId || create.isPending}>
            {create.isPending ? "Skapar..." : "Skapa uppgift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
