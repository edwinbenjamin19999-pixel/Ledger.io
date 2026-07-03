import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Clock,
  Loader2,
  Eye,
  CheckCircle2,
  AlertOctagon,
  ArrowUp,
  Minus,
  ArrowDown,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type FirmTask,
  type TaskStatus,
  useUpdateTaskStatus,
} from "@/hooks/useFirmTasks";
import { format, isPast, isToday, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

const COLUMNS: {
  key: TaskStatus;
  label: string;
  icon: typeof Clock;
  accent: string;
}[] = [
  { key: "todo", label: "Att göra", icon: Clock, accent: "border-slate-300" },
  { key: "in_progress", label: "Pågår", icon: Loader2, accent: "border-blue-300" },
  { key: "review", label: "Granskning", icon: Eye, accent: "border-[#F0DDB7]" },
  { key: "done", label: "Klart", icon: CheckCircle2, accent: "border-[#BFE6D6]" },
];

const PRIORITY_META: Record<
  string,
  { label: string; icon: typeof ArrowUp; chip: string }
> = {
  urgent: {
    label: "Brådskande",
    icon: AlertOctagon,
    chip: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
  },
  high: {
    label: "Hög",
    icon: ArrowUp,
    chip: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  },
  medium: {
    label: "Normal",
    icon: Minus,
    chip: "bg-slate-50 text-slate-600 border-slate-200",
  },
  low: {
    label: "Låg",
    icon: ArrowDown,
    chip: "bg-slate-50 text-slate-500 border-slate-200",
  },
};

interface Props {
  firmId: string;
  tasks: FirmTask[];
  onTaskClick?: (task: FirmTask) => void;
}

export const WorkflowKanban = ({ firmId, tasks, onTaskClick }: Props) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const updateStatus = useUpdateTaskStatus(firmId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const next = String(e.over.id) as TaskStatus;
    const task = tasks.find((t) => t.id === e.active.id);
    if (task && task.status !== next) {
      updateStatus.mutate({ taskId: task.id, status: next });
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          return (
            <KanbanColumn
              key={col.key}
              status={col.key}
              label={col.label}
              icon={col.icon}
              accent={col.accent}
              count={items.length}
            >
              {items.map((t) => (
                <KanbanCard key={t.id} task={t} onClick={() => onTaskClick?.(t)} />
              ))}
            </KanbanColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
};

const KanbanColumn = ({
  status,
  label,
  icon: Icon,
  accent,
  count,
  children,
}: {
  status: TaskStatus;
  label: string;
  icon: typeof Clock;
  accent: string;
  count: number;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 bg-slate-50/50 p-3 min-h-[400px] transition-colors",
        accent,
        isOver && "bg-cyan-50/60 border-[#3b82f6]",
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
        </div>
        <span className="text-xs font-bold text-slate-500 tabular-nums bg-white px-2 py-0.5 rounded-full border">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
};

const KanbanCard = ({
  task,
  dragging,
  onClick,
}: {
  task: FirmTask;
  dragging?: boolean;
  onClick?: () => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  const meta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  const PrIcon = meta.icon;

  const due = task.due_date ? parseISO(task.due_date) : null;
  const overdue = due && isPast(due) && !isToday(due) && task.status !== "done";
  const dueToday = due && isToday(due);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group rounded-lg bg-white border border-slate-200 p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all",
        "hover:shadow-md hover:border-[#3b82f6]",
        (isDragging || dragging) && "opacity-60 ring-2 ring-[#3b82f6]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded-full border px-1.5 py-0.5",
            meta.chip,
          )}
        >
          <PrIcon className="h-3 w-3" />
          {meta.label}
        </span>
        {task.task_type && (
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            {task.task_type}
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold text-slate-900 leading-snug mb-2 line-clamp-2">
        {task.title}
      </h4>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-1.5">
        <Building2 className="h-3 w-3 shrink-0" />
        <span className="truncate">{task.client_name}</span>
      </div>

      <div className="flex items-center justify-between text-[11px] mt-2">
        <div className="flex items-center gap-1 text-slate-500">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[80px]">
            {task.assignee_name ?? "Ej tilldelad"}
          </span>
        </div>
        {due && (
          <div
            className={cn(
              "flex items-center gap-1 font-medium tabular-nums",
              overdue && "text-[#7A1A1A]",
              dueToday && "text-[#7A5417]",
              !overdue && !dueToday && "text-slate-500",
            )}
          >
            <Calendar className="h-3 w-3" />
            {format(due, "d MMM", { locale: sv })}
          </div>
        )}
      </div>
    </div>
  );
};
