import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileChatFABProps {
  onClick: () => void;
  hidden?: boolean;
}

/**
 * Floating "Fråga AI" button — visible on all mobile views except the chat itself.
 * Sits above the bottom nav and respects the iOS safe-area inset.
 */
export const MobileChatFAB = ({ onClick, hidden }: MobileChatFABProps) => {
  if (hidden) return null;
  return (
    <button
      onClick={onClick}
      aria-label="Fråga AI"
      className={cn(
        "fixed right-4 z-40 flex items-center gap-2 pl-3 pr-4 h-12 rounded-full",
        "bg-[#3b82f6] text-white shadow-lg shadow-blue-600/30 active:scale-[0.97] transition-transform"
      )}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
    >
      <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="text-[14px] font-semibold">Fråga AI</span>
    </button>
  );
};
