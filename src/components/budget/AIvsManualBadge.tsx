import { Sparkles, Pencil, RotateCcw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type CellSource = "ai" | "manual" | "locked" | "actual";

interface Props {
  source: CellSource;
  onReset?: () => void;
  onUnlock?: () => void;
  className?: string;
}

export function AIvsManualBadge({ source, onReset, onUnlock, className }: Props) {
  if (source === "locked") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
          "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
          className
        )}
      >
        <Lock className="w-3 h-3" />
        Låst
        {onUnlock && (
          <button
            type="button"
            onClick={onUnlock}
            className="ml-1 inline-flex items-center text-[#7A5417] hover:text-[#7A5417]"
            title="Lås upp"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </span>
    );
  }

  if (source === "actual") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
          "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
          className
        )}
      >
        Utfall
      </span>
    );
  }

  const isAi = source === "ai";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
        isAi
          ? "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5]"
          : "bg-slate-100 text-slate-700 border-slate-200",
        className
      )}
    >
      {isAi ? <Sparkles className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
      {isAi ? "AI" : "Manuell"}
      {!isAi && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="ml-1 inline-flex items-center text-slate-500 hover:text-[#3b82f6]"
          title="Återställ till AI"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
