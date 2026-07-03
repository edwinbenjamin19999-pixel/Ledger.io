import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Command as CmdIcon,
  Sparkles,
  Clock,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useFirmPortfolioInsights } from "@/hooks/useFirmPortfolioInsights";
import { CopilotAIPanel } from "./CopilotAIPanel";
import {
  parseQuery,
  pushRecent,
  loadRecents,
  SUGGESTION_TEMPLATES,
  type CommandIntent,
} from "@/lib/advisor/commandIntents";

/**
 * Always-visible global command bar (sticky in the advisor shell).
 * Click or press ⌘K to expand the dark glass panel with suggestions,
 * recent queries and AI recommendations sourced from the firm-wide
 * insight engine. Hitting Enter executes the top-ranked intent.
 */
export const GlobalCommandBar = () => {
  const navigate = useNavigate();
  const { clients, firmId, isLoading: clientsLoading } = useAdvisorContext();
  const { setActiveClient } = useAdvisorActiveClient();
  const { data: aiInsights = [] } = useFirmPortfolioInsights();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Hydrate recents on mount
  useEffect(() => setRecents(loadRecents()), [open]);

  const intents = useMemo(() => parseQuery(q, clients), [q, clients]);

  // Top 3 AI recommendations as one-click intents
  const aiRecommendations = useMemo<CommandIntent[]>(() => {
    return aiInsights.slice(0, 3).map((i) => ({
      kind: "ai_insights",
      label: i.title,
      description: i.description ?? "AI-genererad insikt",
      route: "/wl/app/insights",
      score: i.severity === "critical" ? 1 : i.severity === "warning" ? 0.7 : 0.5,
      query: i.title,
    }));
  }, [aiInsights]);

  // ⌘K / Ctrl+K toggle, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 30);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  // Reset highlight when intents change
  useEffect(() => setHighlight(0), [q, intents.length]);

  const execute = useCallback(
    (intent: CommandIntent) => {
      pushRecent(intent.query);
      if (intent.clientId && intent.clientName) {
        setActiveClient({
          id: intent.clientId,
          name: intent.clientName,
          orgNumber: intent.clientOrg,
        });
      }
      const params = intent.filter
        ? "?" + new URLSearchParams(intent.filter).toString()
        : "";
      navigate(intent.route + params);
      setOpen(false);
      setQ("");
    },
    [navigate, setActiveClient],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(intents.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = intents[highlight] ?? intents[0];
      if (target) {
        execute(target);
      } else if (q.trim() && firmId) {
        // No matching intent → ask AI copilot
        pushRecent(q.trim());
        setAiQuestion(q.trim());
        setQ("");
      }
    }
  };

  return (
    <div className="sticky top-0 z-50 px-5 pt-3 pb-2 bg-[#F8FAFC]/80 backdrop-blur-md">
      <div ref={panelRef} className="relative max-w-3xl mx-auto">
        {/* Collapsed pill */}
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 30);
          }}
          className="w-full flex items-center gap-3 h-11 px-4 rounded-2xl text-left transition-all"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.92) 100%)",
            border: "1px solid rgba(37,99,235,0.25)",
            boxShadow:
              "0 8px 24px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <Search className="h-4 w-4 text-[#3b82f6]" />
          <span className="flex-1 text-sm text-white/60">
            Fråga AI-copilot eller skriv kommando · t.ex. "visa riskklienter"
          </span>
          <kbd className="hidden md:inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/70">
            <CmdIcon className="h-3 w-3" /> K
          </kbd>
        </button>

        {/* Expanded panel */}
        {open && (
          <div
            className="absolute left-0 right-0 top-0 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 100%)",
              border: "1px solid rgba(37,99,235,0.35)",
              boxShadow:
                "0 30px 80px rgba(2,6,23,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 h-12 px-4 border-b border-white/10">
              {clientsLoading ? (
                <Loader2 className="h-4 w-4 text-[#3b82f6] animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              )}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Vad vill du göra? — Tryck Enter för att utföra"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Stäng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {/* Live intent matches */}
              {q.trim() && intents.length > 0 && (
                <Section title="Förslag">
                  {intents.map((it, i) => (
                    <IntentRow
                      key={`${it.kind}-${i}`}
                      intent={it}
                      active={i === highlight}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => execute(it)}
                    />
                  ))}
                </Section>
              )}

              {/* AI recommendations */}
              {!q.trim() && aiRecommendations.length > 0 && (
                <Section title="AI rekommenderar" icon={<Sparkles className="h-3 w-3" />}>
                  {aiRecommendations.map((it, i) => (
                    <IntentRow
                      key={`ai-${i}`}
                      intent={it}
                      onClick={() => execute(it)}
                      tone="ai"
                    />
                  ))}
                </Section>
              )}

              {/* Static templates */}
              {!q.trim() && (
                <Section title="Snabbkommandon">
                  {SUGGESTION_TEMPLATES.map((t) => (
                    <button
                      key={t.query}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQ(t.query);
                        setTimeout(() => {
                          const parsed = parseQuery(t.query, clients);
                          if (parsed[0]) execute(parsed[0]);
                        }, 0);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <div className="text-sm text-white">{t.label}</div>
                        <div className="text-[11px] text-white/40">{t.hint}</div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-white/40" />
                    </button>
                  ))}
                </Section>
              )}

              {/* Recents */}
              {!q.trim() && recents.length > 0 && (
                <Section title="Senaste sökningar" icon={<Clock className="h-3 w-3" />}>
                  {recents.map((r) => (
                    <button
                      key={r}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQ(r);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm text-white/70">{r}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-white/30" />
                    </button>
                  ))}
                </Section>
              )}

              {/* Empty state — invite AI */}
              {q.trim() && intents.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <div className="text-sm text-white/50 mb-3">Inga snabbkommandon matchar "{q}"</div>
                  {firmId && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pushRecent(q.trim());
                        setAiQuestion(q.trim());
                        setQ("");
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 text-[#3b82f6] rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
                    >
                      <Sparkles className="h-3 w-3" /> Fråga AI-copilot istället
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 h-9 border-t border-white/10 text-[11px] text-white/40">
              <div className="flex items-center gap-3">
                <span><kbd className="font-mono">↵</kbd> kör</span>
                <span><kbd className="font-mono">↑↓</kbd> navigera</span>
                <span><kbd className="font-mono">esc</kbd> stäng</span>
              </div>
              <span>Powered by AI Copilot</span>
            </div>
          </div>
        )}

        {/* AI copilot response panel — appears below the command bar */}
        {aiQuestion && firmId && (
          <div className="mt-2">
            <CopilotAIPanel
              firmId={firmId}
              initialQuestion={aiQuestion}
              onClose={() => setAiQuestion(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="py-1">
    <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-white/40">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const IntentRow = ({
  intent,
  active,
  onClick,
  onMouseEnter,
  tone,
}: {
  intent: CommandIntent;
  active?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  tone?: "ai";
}) => (
  <button
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    onMouseEnter={onMouseEnter}
    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
      active ? "bg-[#3b82f6]/15" : "hover:bg-white/5"
    }`}
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {tone === "ai" && <Sparkles className="h-3 w-3 text-[#3b82f6] shrink-0" />}
        <div className="text-sm text-white truncate">{intent.label}</div>
      </div>
      <div className="text-[11px] text-white/45 truncate">{intent.description}</div>
    </div>
    <ArrowRight className="h-3.5 w-3.5 text-white/40 shrink-0 ml-3" />
  </button>
);
