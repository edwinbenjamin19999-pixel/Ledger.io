import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/formatNumber";
import type { CashflowDrilldownFocus } from "@/hooks/useCashflowState";

export interface AISummaryDriver {
  source_type: "invoice" | "supplierInvoice" | "payrollRun" | "vatPeriod" | "bankTransaction" | "journal";
  source_id: string;
  bucket?: string;
  label: string;
  amount: number;
}

export interface AISummaryResult {
  narrative: string;
  top_drivers: AISummaryDriver[];
  risks: string[];
}

interface Props {
  companyId: string | null;
  fromDate: Date;
  toDate: Date;
  /** Hash of inputs used to invalidate when period changes. */
  inputHash: string;
  /** Snapshot payload used as grounding (sent to edge function). */
  payload: Record<string, unknown> | null;
  onDriverClick: (focus: CashflowDrilldownFocus) => void;
}

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cashflow-ai-summary`;

export function CashflowAISummary({
  companyId,
  fromDate,
  toDate,
  inputHash,
  payload,
  onDriverClick,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<AISummaryDriver[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    if (!companyId || !payload) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    setText("");
    setDrivers([]);
    setRisks([]);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          company_id: companyId,
          period_from: fromDate.toISOString().slice(0, 10),
          period_to: toDate.toISOString().slice(0, 10),
          payload,
        }),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error("AI-tjänsten är upptagen. Försök igen om en stund.");
        if (resp.status === 402) throw new Error("AI-krediter är slut. Lägg till krediter i arbetsytan.");
        throw new Error(`AI-fel (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            if (parsed.meta) {
              setDrivers(parsed.meta.top_drivers ?? []);
              setRisks(parsed.meta.risks ?? []);
              continue;
            }
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setText(acc);
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e?.message ?? "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (companyId && payload) run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputHash, companyId]);

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3b82f6] dark:text-[#3b82f6]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">AI-tolkning</h3>
            <p className="text-[11px] text-muted-foreground">
              Vad som driver perioden — grundat i faktiska transaktioner.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={run}
          disabled={loading || !companyId || !payload}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Uppdatera
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-[#F4C8C8] bg-[#FCE8E8] p-3 text-xs text-[#7A1A1A] dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="min-h-[120px] flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {text || (loading ? "Analyserar perioden…" : "Inga AI-insikter ännu.")}
        {loading && text ? <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[#3b82f6]" /> : null}
      </div>

      {drivers.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Drivare
          </div>
          <div className="flex flex-wrap gap-1.5">
            {drivers.map((d, i) => (
              <button
                key={`${d.source_type}-${d.source_id}-${i}`}
                onClick={() =>
                  onDriverClick({
                    bucket: d.bucket ?? "other_op_out",
                    label: d.label,
                    sourceType: d.source_type as any,
                    sourceIds: [d.source_id],
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium",
                  "hover:border-[#C8DDF5] hover:bg-[#EFF6FF] hover:text-[#3b82f6] dark:hover:text-[#3b82f6]",
                )}
              >
                <span>{d.label}</span>
                <span className="font-semibold tabular-nums">
                  {d.amount < 0 ? "−" : ""}
                  {formatSEK(Math.abs(d.amount))}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {risks.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Risker
          </div>
          <ul className="space-y-1 text-xs text-foreground">
            {risks.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
