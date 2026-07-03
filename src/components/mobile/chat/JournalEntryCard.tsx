import { CheckCircle2, FileText, ChevronRight } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

export interface JournalEntryLine {
  account: string;
  accountName?: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface JournalEntryPayload {
  createJournalEntry?: boolean;
  description?: string;
  date?: string;
  confidence?: number;
  verificationNumber?: string;
  lines: JournalEntryLine[];
  posted?: boolean;
}

/**
 * Tries to extract a journal-entry JSON object from an AI assistant message.
 * Looks for the first ```json ... ``` block OR a bare {...} containing
 * "createJournalEntry" / "lines": [...]. Returns the parsed payload and the
 * original raw substring so the caller can strip it from the rendered text.
 */
export function extractJournalEntry(
  text: string,
): { payload: JournalEntryPayload; raw: string } | null {
  if (!text) return null;

  // 1) fenced ```json ... ```
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  const candidates: string[] = [];
  if (fenced) candidates.push(fenced[1]);

  // 2) bare object containing "lines" and account-style entries
  const bare = text.match(/\{[\s\S]*?"lines"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
  if (bare) candidates.push(bare[0]);

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed?.lines) && parsed.lines.length > 0) {
        return {
          payload: parsed as JournalEntryPayload,
          raw: fenced ? fenced[0] : c,
        };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

const formatAmount = (n?: number) =>
  typeof n === "number" && n > 0 ? formatSEK(n) : "—";

export function JournalEntryCard({
  data,
  posted,
}: {
  data: JournalEntryPayload;
  posted?: boolean;
}) {
  const totalDebit = data.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = data.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const isPosted = posted ?? data.posted ?? true;
  const confidencePct =
    typeof data.confidence === "number"
      ? Math.round(data.confidence * 100)
      : null;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "rounded-xl p-2 shrink-0",
              isPosted ? "bg-emerald-600" : "bg-indigo-600",
            )}
          >
            {isPosted ? (
              <CheckCircle2 className="h-5 w-5 text-white" />
            ) : (
              <FileText className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {isPosted ? "Verifikat bokfört" : "Verifikatförslag"}
            </p>
            <p className="text-slate-400 text-xs truncate">
              {data.verificationNumber ? `${data.verificationNumber} · ` : ""}
              {data.date || "—"}
            </p>
          </div>
        </div>
        {confidencePct !== null && (
          <div
            className={cn(
              "text-[10px] font-semibold px-2 py-1 rounded-full border",
              confidencePct >= 95
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : confidencePct >= 80
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30",
            )}
          >
            {confidencePct}%
          </div>
        )}
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-4 pt-3">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
            Beskrivning
          </p>
          <p className="text-slate-200 text-sm leading-snug">
            {data.description}
          </p>
        </div>
      )}

      {/* Lines */}
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] uppercase tracking-wider text-slate-500 px-2 pb-1.5">
          <span>Konto</span>
          <span className="text-right w-20">Debet</span>
          <span className="text-right w-20">Kredit</span>
        </div>
        <div className="space-y-1">
          {data.lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center bg-slate-800/40 rounded-lg px-2 py-2 text-[13px]"
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-slate-100 font-mono font-semibold shrink-0">
                  {l.account}
                </span>
                {l.accountName && (
                  <span className="text-slate-400 truncate min-w-0">
                    {l.accountName}
                  </span>
                )}
              </div>
              <div className="w-20 text-right font-mono text-slate-200 tabular-nums">
                {formatAmount(l.debit)}
              </div>
              <div className="w-20 text-right font-mono text-slate-200 tabular-nums">
                {formatAmount(l.credit)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="px-4 pb-3">
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
          <span className="text-slate-400">Summa</span>
          <div className="flex gap-6 font-mono">
            <span className="text-slate-200">{formatSEK(totalDebit)}</span>
            <span
              className={cn(
                "font-semibold",
                balanced ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {formatSEK(totalCredit)}
            </span>
          </div>
        </div>
        {!balanced && (
          <p className="text-rose-400 text-[11px] mt-1">
            ⚠ Differens {formatSEK(Math.abs(totalDebit - totalCredit))}
          </p>
        )}
      </div>

    </div>
  );
}
