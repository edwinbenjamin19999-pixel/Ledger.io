import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const ExecutiveSummaryBlock = ({
  summary,
  updatedAt,
  pulsing,
  loading,
}: {
  summary: string;
  updatedAt: string;
  pulsing: boolean;
  loading: boolean;
}) => {
  const timeStr = (() => {
    if (!updatedAt) return "";
    const diff = Date.now() - new Date(updatedAt).getTime();
    if (diff < 60_000) return "Uppdaterad just nu";
    if (diff < 3600_000) return `Uppdaterad för ${Math.floor(diff / 60_000)} min sedan`;
    return `Uppdaterad ${new Date(updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
  })();

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-10">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-4 w-4 text-[#1E3A5F]" />
        <span className="text-xs uppercase tracking-[0.2em] text-[#3b82f6]/80 font-medium">
          Executive Summary
        </span>
        <span className={cn(
          "ml-auto flex items-center gap-1.5 text-xs text-white/50 transition-all",
          pulsing && "text-[#1D9E75]"
        )}>
          <span className={cn(
            "w-1.5 h-1.5 rounded-full bg-emerald-400 transition-all",
            pulsing && "shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"
          )} />
          {timeStr}
        </span>
      </div>
      {loading ? (
        <div className="space-y-3">
          <div className="h-6 bg-white/10 rounded animate-pulse w-3/4" />
          <div className="h-6 bg-white/10 rounded animate-pulse w-full" />
          <div className="h-6 bg-white/10 rounded animate-pulse w-2/3" />
        </div>
      ) : (
        <p className="text-2xl leading-relaxed text-white/95 font-light tracking-tight">
          {summary}
        </p>
      )}
    </div>
  );
};
