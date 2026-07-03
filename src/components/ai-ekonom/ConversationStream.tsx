import { useEffect, useRef } from "react";
import { Sparkles, User as UserIcon, ArrowDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionBlock } from "./blocks/ActionBlock";
import { ExplanationBlock } from "./blocks/ExplanationBlock";
import { NextActionsBlock } from "./blocks/NextActionsBlock";
import { AIInsightCard } from "@/components/shared/AIInsightCard";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import type { ChatTurn } from "@/hooks/useAIEkonom";
import type { ActionPayload, ExplanationPayload, InsightPayload, NextActionsPayload } from "@/lib/ai-ekonom/intentRouter";

interface Props {
  turns: ChatTurn[];
  loading: boolean;
  onPickAction: (q: string) => void;
  onOpenVoucher?: (id: string) => void;
  onRetry?: (turnId: string) => void;
}

export const ConversationStream = ({ turns, loading, onPickAction, onOpenVoucher, onRetry }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-5"
          style={{ background: "var(--brand-grad-cash)", boxShadow: "0 10px 30px -10px hsl(var(--brand-primary) / 0.45)" }}
        >
          <Sparkles className="w-7 h-7" style={{ color: "var(--brand-on-primary)" }} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">AI Ekonom</h2>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          Fråga, bokför, analysera — allt i en vy. Beskriv vad som hänt eller ställ en fråga om ditt företag.
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {turns.map(turn => (
          <div key={turn.id} className={cn("flex gap-3", turn.role === "user" ? "justify-end" : "justify-start")}>
            {turn.role === "assistant" && (
              <div
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: "var(--brand-grad-cash)" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "var(--brand-on-primary)" }} />
              </div>
            )}
            <div className={cn("flex flex-col gap-3 min-w-0", turn.role === "user" ? "max-w-[80%] items-end" : "flex-1")}>
              {turn.role === "user" ? (
                <div
                  className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed"
                  style={{ background: "hsl(var(--brand-primary))", color: "var(--brand-on-primary)" }}
                >
                  {turn.text}
                </div>
              ) : (
                <>
                  {turn.text && (
                    <div className={cn(
                      "rounded-2xl rounded-tl-sm bg-white border px-4 py-3 text-sm leading-relaxed",
                      turn.error ? "border-[#F4C8C8] text-[#7A1A1A] bg-[#FCE8E8]" : "border-slate-200 text-slate-800"
                    )}>
                      <AssistantMarkdown text={turn.text} />
                      {turn.streaming && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse align-middle rounded-sm" style={{ background: "hsl(var(--brand-primary))" }} />}
                    </div>
                  )}
                  {turn.error && onRetry && (
                    <button
                      onClick={() => onRetry(turn.id)}
                      className="self-start inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-[hsl(var(--brand-primary)/0.4)] hover:text-[hsl(var(--brand-primary))] transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Försök igen
                    </button>
                  )}
                  {turn.blocks?.map((b, i) => {
                    if (b.kind === "action") {
                      const ab = b as ActionPayload;
                      return <ActionBlock key={i} data={ab} onApprove={() => ab.voucherId && onOpenVoucher?.(ab.voucherId)} onEdit={() => ab.voucherId && onOpenVoucher?.(ab.voucherId)} onReject={() => {}} />;
                    }
                    if (b.kind === "explanation") return <ExplanationBlock key={i} data={b as ExplanationPayload} />;
                    if (b.kind === "insight") {
                      const ip = b as InsightPayload;
                      return <AIInsightCard key={i} data={{
                        headline: ip.headline,
                        currentValue: ip.current,
                        previousValue: ip.previous,
                        deltaAmount: ip.delta?.amount,
                        deltaPercent: ip.delta?.percent,
                        isFavorable: ip.delta?.favorable,
                        explanations: [ip.source],
                      }} />;
                    }
                    if (b.kind === "next_actions") return <NextActionsBlock key={i} data={b as NextActionsPayload} onPick={onPickAction} />;
                    return null;
                  })}
                </>
              )}
            </div>
            {turn.role === "user" && (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
