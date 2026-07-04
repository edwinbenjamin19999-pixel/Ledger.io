import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  FileX,
  Building2,
  Calendar,
  FileCheck,
  BookOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AutoTask, AutoTaskPriority } from "@/services/taskGenerator";

const ICON_MAP: Record<AutoTask["iconName"], LucideIcon> = {
  AlertCircle,
  FileX,
  Building2,
  Calendar,
  FileCheck,
  BookOpen,
};

const ACCENT: Record<AutoTaskPriority, string> = {
  critical: "bg-[#E24B4A]",
  high: "bg-[#EF9F27]",
  medium: "bg-[#0040CC]",
};

function relativeAge(ms: number): string {
  if (ms <= 0) return "nyss";
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "idag";
  if (days === 1) return "1 dag sedan";
  return `${days} dagar sedan`;
}

interface Props {
  task: AutoTask;
  onDismiss?: (id: string) => void;
}

export const AutoTaskCard = ({ task, onDismiss }: Props) => {
  const navigate = useNavigate();
  const Icon = ICON_MAP[task.iconName];

  return (
    <div className="relative overflow-hidden rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-[14px]">
      <div
        className={`absolute inset-x-0 top-0 h-[1.5px] ${ACCENT[task.priority]}`}
      />
      <div className="flex items-start gap-[12px]">
        <Icon
          className="h-[14px] w-[14px] shrink-0 mt-[2px]"
          style={{ color: task.iconColor }}
        />

        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-[#0F172A] leading-snug">
            {task.title}
          </div>
          <div className="mt-[2px] text-[11px] text-[#94A3B8]">
            {task.subtitle}
          </div>

          <div className="mt-[8px] flex items-center flex-wrap gap-[6px]">
            <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-[8px] py-[2px] text-[10px] font-medium text-[#0C447C]">
              {task.client_name}
            </span>
            <span className="text-[10px] text-[#94A3B8]">
              Skapad {relativeAge(task.ageMs)}
            </span>
            {task.isAIGenerated && (
              <span className="inline-flex items-center gap-[3px] rounded-full border-[0.5px] border-[#AFA9EC] bg-[#EEEDFE] px-[6px] py-[1px] text-[9px] font-medium text-[#26215C]">
                <Sparkles className="h-[8px] w-[8px]" />
                AI-genererad
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-[4px] shrink-0">
          <Button
            type="button"
            onClick={() => navigate(task.actionHref)}
            className="h-[28px] rounded-[8px] bg-[#0040CC] px-[10px] text-[11px] font-medium text-[#E6F4FA] hover:bg-[#0040CC]/90"
          >
            {task.actionLabel}
          </Button>
          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(task.id)}
              className="text-[10px] text-[#94A3B8] hover:text-[#64748B]"
            >
              Avfärda
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
