import { useState, useRef } from "react";
import { Send, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { streamAIResponse } from "@/lib/stream-helpers";

interface Props {
  companyId?: string;
}

export const DashboardAIInput = ({ companyId }: Props = {}) => {
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [response, setResponse] = useState("");
  const [errored, setErrored] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setResponse("");
    setErrored(false);
    setLastQuery(q);

    let acc = "";
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bookkeeper-stream`;

    await streamAIResponse(
      url,
      {
        message: q.trim(),
        companyId,
        conversationHistory: [],
      },
      {
        onDelta: (text) => {
          acc += text;
          // Hide raw json blocks in inline answer.
          setResponse(acc.replace(/```json[\s\S]*?```/g, "").trim());
        },
        onDone: () => setLoading(false),
        onError: (msg) => {
          setResponse(msg || "AI-tjänsten är överbelastad. Försök igen om en stund.");
          setErrored(true);
          setLoading(false);
        },
      },
      controller.signal
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(query);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[600px] px-4 z-50">
      <div className="rounded-2xl border border-border bg-card/95  shadow-[0_8px_40px_rgba(0,0,0,0.15)] overflow-hidden">
        {(response || loading) && (
          <div className="px-4 pt-3 pb-2 border-b border-border">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#3b82f6] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">
                {response || (loading ? "Tänker..." : "")}
                {loading && response && <span className="inline-block w-1 h-3 bg-foreground/60 ml-0.5 animate-pulse" />}
              </p>
              {errored && lastQuery && !loading && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => ask(lastQuery)}
                  className="h-7 px-2 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Försök igen
                </Button>
              )}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fråga AI... t.ex. 'Vad är min skatt?'"
            disabled={loading}
            className="border-0 bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !query.trim()}
            className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] text-white hover:brightness-110 flex-shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
};
