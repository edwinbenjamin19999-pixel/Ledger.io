import { Zap, Building2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardModeId } from "@/lib/board-mode/modeProfiles";
import { MODE_PROFILES } from "@/lib/board-mode/modeProfiles";

const ICONS: Record<BoardModeId, typeof Zap> = {
  CEO: Zap,
  BOARD: Building2,
  INVESTOR: TrendingUp,
};

export const BoardModeSwitcher = ({
  value,
  onChange,
}: {
  value: BoardModeId;
  onChange: (mode: BoardModeId) => void;
}) => {
  return (
    <div
      role="tablist"
      aria-label="Executive mode"
      className="inline-flex items-center gap-1"
    >
      {(Object.keys(MODE_PROFILES) as BoardModeId[]).map(id => {
        const Icon = ICONS[id];
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
              active
                ? "bg-white border border-gray-300 text-gray-900 font-medium shadow-sm"
                : "bg-transparent border border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <Icon className="h-4 w-4" />
            {MODE_PROFILES[id].shortLabel}
          </button>
        );
      })}
    </div>
  );
};
