import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ConversationStream } from "@/components/ai-ekonom/ConversationStream";
import { PrimaryInput } from "@/components/ai-ekonom/PrimaryInput";
import { useAIEkonom } from "@/hooks/useAIEkonom";

interface Props {
  companyId: string | null;
}

const QUICK_PROMPTS = [
  "Jag köpte en dator för 12 000 kr inkl. moms",
  "Bokför hyra 8 500 kr",
  "Hjälp mig att ladda upp ett kvitto",
];

export function PrimaryBookkeepingChat({ companyId }: Props) {
  const { turns, send, retry, loading } = useAIEkonom(companyId);
  const navigate = useNavigate();
  const openVoucher = (id: string) => navigate(`/verifikationer?entry=${id}`);

  return (
    <Card className="flex flex-col overflow-hidden border-border/60 shadow-[0_8px_30px_-12px_hsl(var(--brand-primary)/0.25)] bg-card">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-border/60 backdrop-blur-sm"
        style={{ background: "linear-gradient(135deg, hsl(var(--brand-primary)/0.08), hsl(var(--brand-primary)/0.02))" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0"
          style={{ background: "var(--brand-grad-cash)" }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "var(--brand-on-primary)" }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-tight">AI Bokför</h2>
          <p className="text-xs text-muted-foreground">Skriv vad du vill bokföra — jag sköter resten</p>
        </div>
        <span
          className="ml-auto text-[10px] font-medium px-2 py-1 rounded-full"
          style={{
            background: "hsl(var(--brand-primary)/0.1)",
            color: "hsl(var(--brand-primary))",
          }}
        >
          Live
        </span>
      </div>

      {/* Body — fixed-height conversation area */}
      <div className="flex flex-col bg-slate-50 dark:bg-slate-900/40" style={{ minHeight: 480, maxHeight: "65vh" }}>
        {turns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-10">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-5"
              style={{ background: "var(--brand-grad-cash)", boxShadow: "0 10px 30px -10px hsl(var(--brand-primary) / 0.45)" }}
            >
              <Sparkles className="w-7 h-7" style={{ color: "var(--brand-on-primary)" }} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1.5 tracking-tight">Vad vill du bokföra?</h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-5">
              Beskriv vad som hänt med vanlig svenska — ladda upp ett kvitto, eller välj ett snabbval nedan.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading || !companyId}
                  className="text-xs font-medium px-3 py-2 rounded-full bg-card border border-border text-foreground hover:border-[hsl(var(--brand-primary)/0.4)] hover:bg-[hsl(var(--brand-primary)/0.06)] hover:text-[hsl(var(--brand-primary))] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ConversationStream
            turns={turns}
            loading={loading}
            onPickAction={send}
            onOpenVoucher={openVoucher}
            onRetry={retry}
          />
        )}
      </div>

      {/* Footer input */}
      <PrimaryInput
        onSend={send}
        onFiles={async () => {}}
        loading={loading}
        placeholder="T.ex. 'Jag köpte en laptop för 14 990 kr inkl. moms'"
      />
    </Card>
  );
}
