import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { MemberCapacity } from "@/hooks/useTeamCapacity";
import type { FirmTask } from "@/hooks/useFirmTasks";
import { GripVertical } from "lucide-react";

const loadColor = (pct: number) => {
  if (pct >= 110) return { bg: "bg-[#FCE8E8]", text: "text-[#7A1A1A]", bar: "bg-rose-500" };
  if (pct >= 90) return { bg: "bg-[#FAEEDA]", text: "text-[#7A5417]", bar: "bg-amber-500" };
  return { bg: "bg-[#E1F5EE]", text: "text-[#085041]", bar: "bg-emerald-500" };
};

export const MemberCard = ({ cap }: { cap: MemberCapacity }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `member:${cap.member.user_id}` });
  const c = loadColor(cap.loadPercent);
  const barWidth = Math.min(150, cap.loadPercent);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-4 transition-all ${isOver ? "ring-2 ring-[hsl(var(--brand-primary))] scale-[1.01]" : ""}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: isOver ? "0 30px 80px rgba(8,145,178,0.18)" : "0 30px 80px rgba(15,23,42,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#0F172A] truncate">{cap.member.display_name}</div>
          <div className="text-[11px] text-[#94A3B8] truncate">
            {cap.member.title ?? (cap.member.role === "admin" ? "Administratör" : "Konsult")}
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${c.bg} ${c.text}`}>
          {cap.loadPercent}%
        </span>
      </div>

      {/* Load bar (overflows visually past 100%) */}
      <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden mb-3 relative">
        <div className={`h-full ${c.bar} transition-all`} style={{ width: `${(barWidth / 150) * 100}%` }} />
        <div className="absolute top-0 left-2/3 w-px h-full bg-white/60" title="100%" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-center">
        <div>
          <div className="text-base font-bold tabular-nums text-[#0F172A]">{cap.openTasks.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">Uppgifter</div>
        </div>
        <div>
          <div className="text-base font-bold tabular-nums text-[#0F172A]">{cap.deadlinesThisWeek}</div>
          <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">Vecka</div>
        </div>
      </div>

      {/* Tasks list — top 4 (draggable) */}
      <div className="space-y-1">
        {cap.openTasks.slice(0, 4).map((t) => (
          <DraggableTask key={t.id} task={t} />
        ))}
        {cap.openTasks.length > 4 && (
          <div className="text-[11px] text-[#94A3B8] text-center pt-1">
            +{cap.openTasks.length - 4} till
          </div>
        )}
        {cap.openTasks.length === 0 && (
          <div className="text-[11px] text-[#94A3B8] text-center py-2">Inga uppgifter</div>
        )}
      </div>
    </div>
  );
};

export const DraggableTask = ({ task }: { task: FirmTask }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task:${task.id}` });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-3 w-3 text-[#CBD5E1] shrink-0" />
      <span className="text-xs text-[#475569] truncate flex-1">{task.title}</span>
      {task.priority === "urgent" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />}
    </div>
  );
};

export const UnassignedZone = ({ tasks }: { tasks: FirmTask[] }) => {
  const { setNodeRef, isOver } = useDroppable({ id: "member:unassigned" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-4 border-2 border-dashed transition-colors ${
        isOver ? "border-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary)/0.03)]" : "border-[#E2E8F0] bg-[#FAFBFC]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-[#475569]">Ej tilldelade</div>
          <div className="text-[11px] text-[#94A3B8]">{tasks.length} uppgifter</div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#F1F5F9] text-[#64748B]">
          Pool
        </span>
      </div>
      <div className="space-y-1">
        {tasks.slice(0, 6).map((t) => (
          <DraggableTask key={t.id} task={t} />
        ))}
        {tasks.length > 6 && (
          <div className="text-[11px] text-[#94A3B8] text-center pt-1">+{tasks.length - 6} till</div>
        )}
        {tasks.length === 0 && (
          <div className="text-[11px] text-[#94A3B8] text-center py-3">Alla uppgifter är tilldelade</div>
        )}
      </div>
    </div>
  );
};
