import { Sparkles, ArrowRight, Users } from "lucide-react";
import type { RebalanceSuggestion } from "@/hooks/useTeamCapacity";

interface Props {
  suggestions: RebalanceSuggestion[];
  onApply: (s: RebalanceSuggestion) => void;
  applyingKey?: string | null;
}

export const CapacityAIPanel = ({ suggestions, onApply, applyingKey }: Props) => {
  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">AI-balansering</p>
          <h3 className="text-base font-semibold text-[#0F172A] mt-0.5">Förslag på omfördelning</h3>
        </div>
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--brand-primary) / 0.1)" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--brand-primary))" }} />
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="py-6 text-center">
          <Users className="h-8 w-8 mx-auto text-[#085041] mb-2" />
          <p className="text-sm text-[#64748B]">Teamet är välbalanserat. ✨</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s, i) => {
            const key = `${s.fromUserId}-${s.toUserId}`;
            const busy = applyingKey === key;
            return (
              <div key={i} className="rounded-xl border border-[#F1F5F9] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-1">
                  <span className="truncate">{s.fromName}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                  <span className="truncate">{s.toName}</span>
                </div>
                <div className="text-[11px] text-[#64748B] mb-2">{s.reason}</div>
                <button
                  disabled={busy}
                  onClick={() => onApply(s)}
                  className="w-full text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: "hsl(var(--brand-primary) / 0.08)", color: "hsl(var(--brand-primary))" }}
                >
                  {busy ? "Flyttar…" : `Flytta ${s.taskCount} uppgift${s.taskCount === 1 ? "" : "er"}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
