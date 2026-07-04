import { CheckCircle2, AlertCircle, Circle, ChevronRight } from "lucide-react";
import type { ClosingTask } from "@/hooks/useClosingStatus";

interface Props {
  tasks: ClosingTask[];
  isLoading: boolean;
  onResolve?: (key: string) => void;
}

const statusConfig = {
  complete:   { Icon: CheckCircle2, color: "text-[#1D9E75]", bg: "bg-[#E1F5EE]", border: "border-[#B5E2CE]", bar: "bg-[#1D9E75]" },
  review:     { Icon: AlertCircle,  color: "text-[#C68316]", bg: "bg-[#FAEEDA]", border: "border-[#EDD9B0]", bar: "bg-[#C68316]" },
  incomplete: { Icon: Circle,        color: "text-[#94A3B8]", bg: "bg-[#F1F5F9]", border: "border-[#E2E8F0]", bar: "bg-[#E24B4A]" },
} as const;

export function ClosingTaskList({ tasks, isLoading, onResolve }: Props) {
  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[16px]">
      <div className="mb-[14px]">
        <h2 className="text-[14px] font-medium text-[#0F172A]">Bokslutsuppgifter</h2>
        <p className="text-[11px] text-[#94A3B8] mt-px">Strukturerat 6-stegs arbetsflöde</p>
      </div>

      {isLoading && (
        <div className="text-center py-[24px] text-[12px] text-[#94A3B8]">Beräknar status...</div>
      )}

      <div className="space-y-[6px]">
        {tasks.map((t) => {
          const cfg = statusConfig[t.status];
          const Icon = cfg.Icon;
          return (
            <div
              key={t.key}
              className={`group rounded-[10px] border-[0.5px] bg-white p-[12px] transition-colors hover:bg-[#F8FAFB] ${cfg.border}`}
            >
              <div className="flex items-center gap-[12px]">
                <div className={`w-[30px] h-[30px] rounded-[8px] shrink-0 flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`h-[14px] w-[14px] ${cfg.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-[8px] mb-[4px]">
                    <span className="text-[12px] font-medium text-[#0F172A]">{t.label}</span>
                    <span className={`text-[11px] tabular-nums font-mono ${cfg.color}`}>{t.progress}%</span>
                  </div>
                  <div className="h-[4px] rounded-full bg-[#F1F5F9] overflow-hidden mb-[6px]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#475569]">{t.detail}</p>
                </div>

                {t.status !== "complete" && onResolve && (
                  <button
                    onClick={() => onResolve(t.key)}
                    className="text-[11px] text-[#0040CC] hover:text-[#093d54] flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    Lös <ChevronRight className="h-[12px] w-[12px]" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
