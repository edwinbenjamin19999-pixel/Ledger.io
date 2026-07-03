import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  type FirmTask,
  type TaskStatus,
  useUpdateTaskStatus,
} from "@/hooks/useFirmTasks";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Att göra" },
  { value: "in_progress", label: "Pågår" },
  { value: "review", label: "Granskning" },
  { value: "done", label: "Klart" },
];

const PRIORITY_CHIP: Record<string, string> = {
  urgent: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
  high: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  medium: "bg-slate-50 text-slate-600 border-slate-200",
  low: "bg-slate-50 text-slate-500 border-slate-200",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Brådskande",
  high: "Hög",
  medium: "Normal",
  low: "Låg",
};

interface Props {
  firmId: string;
  tasks: FirmTask[];
  onTaskClick?: (t: FirmTask) => void;
}

export const WorkflowList = ({ firmId, tasks, onTaskClick }: Props) => {
  const updateStatus = useUpdateTaskStatus(firmId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="font-semibold text-slate-700">Uppgift</TableHead>
            <TableHead className="font-semibold text-slate-700">Klient</TableHead>
            <TableHead className="font-semibold text-slate-700">Typ</TableHead>
            <TableHead className="font-semibold text-slate-700">Prioritet</TableHead>
            <TableHead className="font-semibold text-slate-700">Ansvarig</TableHead>
            <TableHead className="font-semibold text-slate-700">Deadline</TableHead>
            <TableHead className="font-semibold text-slate-700 w-[140px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                Inga uppgifter att visa
              </TableCell>
            </TableRow>
          )}
          {tasks.map((t) => {
            const due = t.due_date ? parseISO(t.due_date) : null;
            const overdue = due && isPast(due) && !isToday(due) && t.status !== "done";
            const dueToday = due && isToday(due);
            return (
              <TableRow
                key={t.id}
                className="cursor-pointer hover:bg-slate-50/70"
                onClick={() => onTaskClick?.(t)}
              >
                <TableCell className="font-medium text-slate-900 max-w-[280px]">
                  <div className="truncate">{t.title}</div>
                  {t.description && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">{t.description}</div>
                  )}
                </TableCell>
                <TableCell className="text-slate-700">{t.client_name}</TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 uppercase tracking-wide">
                    {t.task_type ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border", PRIORITY_CHIP[t.priority])}>
                    {PRIORITY_LABEL[t.priority] ?? t.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-700">{t.assignee_name ?? "—"}</TableCell>
                <TableCell
                  className={cn(
                    "tabular-nums text-sm",
                    overdue && "text-[#7A1A1A] font-semibold",
                    dueToday && "text-[#7A5417] font-semibold",
                    !overdue && !dueToday && "text-slate-600",
                  )}
                >
                  {due ? format(due, "d MMM yyyy", { locale: sv }) : "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={t.status}
                    onValueChange={(v) => updateStatus.mutate({ taskId: t.id, status: v as TaskStatus })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
