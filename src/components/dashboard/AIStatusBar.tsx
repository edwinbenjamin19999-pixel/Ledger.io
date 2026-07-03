import { Sparkles } from "lucide-react";
import { useAIStatus } from "@/hooks/useAIStatus";

/**
 * Slim status bar for the dashboard top — gives a "live" feeling (Law 5).
 * Shared rotator with AIActivitySummary feed.
 */
export const AIStatusBar = () => {
  const status = useAIStatus();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cyan-200/60 bg-[#0F1F3D] px-4 py-2.5">
      <div className="relative flex-shrink-0">
        <Sparkles className="w-4 h-4 text-[#3b82f6]" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
        </span>
      </div>
      <p className="text-sm font-medium text-[#3b82f6] flex-shrink-0">
        AI analyserar din ekonomi i realtid
      </p>
      <span className="text-[#3b82f6]">·</span>
      <p key={status} className="text-sm text-[#3b82f6] animate-fade-in truncate">{status}</p>
    </div>
  );
};
