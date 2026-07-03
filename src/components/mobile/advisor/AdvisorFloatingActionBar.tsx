import { Check, MessageSquare, Flag, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic, type HapticPattern } from "@/lib/haptics";

interface AdvisorFloatingActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onAction: (action: "approve" | "comment" | "flag" | "ai") => void;
}

export const AdvisorFloatingActionBar = ({
  selectedCount, onClear, onAction,
}: AdvisorFloatingActionBarProps) => {
  if (selectedCount === 0) return null;
  return (
    <div
      className="fixed left-0 right-0 z-40 px-4 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-md flex items-center gap-1 px-2 py-2 rounded-full",
          "bg-slate-900/80 backdrop-blur-2xl border border-white/15",
          "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]",
          "animate-in fade-in slide-in-from-bottom-4 duration-200",
        )}
      >
        <button
          onClick={onClear}
          className="h-9 w-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          aria-label="Avmarkera"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-xs font-semibold text-white px-2 tabular-nums">
          {selectedCount}
        </div>
        <div className="flex-1 flex items-center justify-end gap-1">
          <ActionButton Icon={Check} label="Godkänn" tone="emerald" haptic="success" onClick={() => onAction("approve")} />
          <ActionButton Icon={MessageSquare} label="Kommentera" tone="cyan" haptic="light" onClick={() => onAction("comment")} />
          <ActionButton Icon={Flag} label="Flagga" tone="amber" haptic="warning" onClick={() => onAction("flag")} />
          <ActionButton Icon={Sparkles} label="Fråga AI" tone="violet" haptic="medium" onClick={() => onAction("ai")} />
        </div>
      </div>
    </div>
  );
};

const TONES = {
  emerald: "text-emerald-300 hover:bg-emerald-500/15",
  cyan: "text-[#3b82f6] hover:bg-[#3b82f6]/15",
  amber: "text-amber-300 hover:bg-amber-500/15",
  violet: "text-violet-300 hover:bg-violet-500/15",
} as const;

const ActionButton = ({
  Icon, label, tone, onClick, haptic: hapticPattern,
}: { Icon: typeof Check; label: string; tone: keyof typeof TONES; onClick: () => void; haptic?: HapticPattern }) => (
  <button
    onClick={() => { if (hapticPattern) haptic(hapticPattern); onClick(); }}
    aria-label={label}
    className={cn(
      "h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90",
      TONES[tone],
    )}
  >
    <Icon className="h-4 w-4" />
  </button>
);
