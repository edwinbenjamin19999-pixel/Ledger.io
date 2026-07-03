import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  locked: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
}

export function LockToggle({ locked, onToggle, className, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
        locked
          ? "text-[#7A5417] hover:bg-[#FAEEDA]"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
      title={locked ? "Lås upp cellen" : "Lås cellen — AI kan inte ändra"}
      aria-label={locked ? "Lås upp" : "Lås"}
    >
      {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
    </button>
  );
}
