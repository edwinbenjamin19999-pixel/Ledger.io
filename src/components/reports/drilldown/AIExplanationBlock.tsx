/**
 * Streaming AI explanation block — used at every drilldown level.
 * Calls `reports-row-explanation` edge function and renders tokens as they arrive.
 * On error/timeout falls back to a deterministic summary built by the caller.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIExplanationBlockProps {
  /** Stable key — re-runs when this changes. */
  cacheKey: string;
  /** Payload sent to the edge function. */
  payload: Record<string, unknown>;
  /** Used when streaming fails. Plain text. */
  fallback: string;
}

export function AIExplanationBlock({ cacheKey, payload, fallback }: AIExplanationBlockProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    setText("");
    setError(null);
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reports-row-explanation`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let done = false;

      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buffer += decoder.decode(r.value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              setText(acc);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "AI-förklaring misslyckades");
      setText(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <div className="rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50/40 to-transparent p-4 dark:border-[#3b82f6]/40 dark:from-blue-900/10">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#3b82f6] dark:text-[#1E3A5F]">
          <Sparkles className="h-3.5 w-3.5" />
          AI-förklaring
        </div>
        {!loading && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={run}>
            <RefreshCcw className="mr-1 h-3 w-3" />
            Uppdatera
          </Button>
        )}
      </div>
      {loading && !text ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analyserar…
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {text || fallback}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          (visar deterministisk sammanfattning – AI ej tillgänglig)
        </p>
      )}
    </div>
  );
}
