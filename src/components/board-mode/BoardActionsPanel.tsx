import { Zap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BoardAction } from "@/hooks/useBoardSummary";

const URGENCY: Record<string, string> = {
  critical: "text-[#C73838] border-[#F4C8C8]",
  high: "text-orange-400 border-orange-400/30",
  medium: "text-[#C28A2B] border-[#F0DDB7]",
  low: "text-[#1D9E75] border-[#BFE6D6]",
};

export const BoardActionsPanel = ({
  actions,
  onActionClick,
}: {
  actions: BoardAction[];
  onActionClick?: (id: string) => void;
}) => {
  const navigate = useNavigate();
  if (actions.length === 0) return null;

  return (
    <div className="rounded-3xl border border-[#C8DDF5] bg-gradient-to-br from-[#3b82f6]/[0.04] to-purple-500/[0.04] backdrop-blur-2xl p-8">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-4 w-4 text-[#1E3A5F]" />
        <h3 className="text-xs uppercase tracking-[0.2em] text-[#3b82f6]/90 font-medium">Vad ska vi göra?</h3>
      </div>
      <div className="space-y-3">
        {actions.map(a => (
          <div
            key={a.id}
            className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/5 p-5 hover:bg-white/[0.06] transition-all"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white/95 font-medium text-base leading-snug">{a.title}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className={cn("px-2 py-0.5 rounded-full border", URGENCY[a.urgency])}>
                  {a.urgency}
                </span>
                <span className="text-white/50 tabular-nums">
                  {Math.abs(a.impact).toLocaleString("sv-SE")} kr påverkan
                </span>
                <span className="text-white/40 tabular-nums">
                  {Math.round(a.confidence * 100)}% säkerhet
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#3b82f6] hover:text-[#3b82f6] hover:bg-[#EFF6FF]"
              onClick={() => { onActionClick?.(a.id); navigate("/ai-ekonom"); }}
            >
              {a.cta_label || "Visa detaljer"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
