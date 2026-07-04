import { useMemo, useState } from "react";
import { ChevronDown, Filter, Check, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { formatSEK } from "@/lib/formatNumber";
import type {
  AgentActivityRow,
  AgentActivityStatus,
  AgentReviewDetails,
} from "./types";
import { formatRelative } from "./format";

interface Props {
  rows: AgentActivityRow[];
  initialCount?: number;
}

type StatusFilter = "all" | AgentActivityStatus;
type ConfFilter = "all" | "high" | "mid" | "low";
type DateFilter = "all" | "today" | "7d" | "30d";

const statusLabel: Record<AgentActivityStatus, string> = {
  done: "Klart",
  corrected: "Rättad av användare",
  in_progress: "Kräver beslut",
};
const statusTone: Record<AgentActivityStatus, string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  corrected: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-[#3b82f6] border-blue-200",
};

function confidenceTone(c?: number) {
  if (c == null) return "bg-slate-50 text-slate-500 border-slate-200";
  if (c >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

type Decision = { status: AgentActivityStatus; note?: string };

export function ActivityFeed({ rows, initialCount = 10 }: Props) {
  const [statusF, setStatusF] = useState<StatusFilter>("all");
  const [confF, setConfF] = useState<ConfFilter>("all");
  const [dateF, setDateF] = useState<DateFilter>("all");
  const [shown, setShown] = useState(initialCount);
  // Locally tracked approve/reject decisions for review rows
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const effectiveRows = useMemo(
    () =>
      rows.map((r) => {
        const d = decisions[r.id];
        return d ? { ...r, status: d.status } : r;
      }),
    [rows, decisions],
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return effectiveRows.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (confF !== "all") {
        const c = r.confidence ?? -1;
        if (confF === "high" && c < 90) return false;
        if (confF === "mid" && (c < 60 || c >= 90)) return false;
        if (confF === "low" && c >= 60) return false;
      }
      if (dateF !== "all") {
        const t = new Date(r.timestamp).getTime();
        const days = (now - t) / 86400000;
        if (dateF === "today" && days > 1) return false;
        if (dateF === "7d" && days > 7) return false;
        if (dateF === "30d" && days > 30) return false;
      }
      return true;
    });
  }, [effectiveRows, statusF, confF, dateF]);

  const visible = filtered.slice(0, shown);

  const handleApprove = (row: AgentActivityRow) => {
    setDecisions((m) => ({ ...m, [row.id]: { status: "done" } }));
    toast.success(
      row.review?.approveLabel ?? row.review?.proposedAction ?? "Åtgärd godkänd",
      { description: "Posteringen är utförd och raden flyttades till Klart." },
    );
  };

  const handleReject = (row: AgentActivityRow, note?: string) => {
    setDecisions((m) => ({ ...m, [row.id]: { status: "corrected", note } }));
    toast.message("Förslag avvisat", {
      description: note ? `Kommentar: ${note}` : "Raden flyttades till Rättad.",
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <div className="mr-1 inline-flex items-center gap-1 text-xs text-slate-500">
          <Filter className="h-3.5 w-3.5" /> Filter
        </div>
        <Select value={statusF} onValueChange={(v) => setStatusF(v as StatusFilter)}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla statusar</SelectItem>
            <SelectItem value="done">Klart</SelectItem>
            <SelectItem value="corrected">Rättad</SelectItem>
            <SelectItem value="in_progress">Kräver beslut</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateF} onValueChange={(v) => setDateF(v as DateFilter)}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tid</SelectItem>
            <SelectItem value="today">Idag</SelectItem>
            <SelectItem value="7d">Senaste 7 dagar</SelectItem>
            <SelectItem value="30d">Senaste 30 dagar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={confF} onValueChange={(v) => setConfF(v as ConfFilter)}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla konfidensnivåer</SelectItem>
            <SelectItem value="high">Hög (≥90%)</SelectItem>
            <SelectItem value="mid">Medel (60–89%)</SelectItem>
            <SelectItem value="low">Låg (&lt;60%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Inga händelser matchar filtren — prova att utöka tidsintervallet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((row) => (
            <ActivityRow
              key={row.id}
              row={row}
              onApprove={() => handleApprove(row)}
              onReject={(note) => handleReject(row, note)}
            />
          ))}
        </ul>
      )}

      {shown < filtered.length && (
        <div className="border-t border-slate-100 p-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShown((s) => s + initialCount)}
          >
            Visa fler ({filtered.length - shown})
          </Button>
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  row,
  onApprove,
  onReject,
}: {
  row: AgentActivityRow;
  onApprove: () => void;
  onReject: (note?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <li className="px-4 py-3">
        <CollapsibleTrigger className="flex w-full items-center gap-3 text-left">
          <span className="w-24 shrink-0 text-xs text-slate-500 tabular-nums">
            {formatRelative(row.timestamp)}
          </span>
          <span className="flex-1 truncate text-sm text-slate-900 dark:text-slate-100">
            {row.description}
          </span>
          {row.confidence != null && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums",
                confidenceTone(row.confidence),
              )}
            >
              {Math.round(row.confidence)}%
            </span>
          )}
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
              statusTone[row.status],
            )}
          >
            {statusLabel[row.status]}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 pl-24 text-sm text-slate-600">
          {row.review && row.status === "in_progress" ? (
            <ReviewDetailPanel
              review={row.review}
              confidence={row.confidence}
              onApprove={onApprove}
              onReject={onReject}
            />
          ) : row.details ? (
            row.details
          ) : (
            <span className="text-slate-400">Ingen ytterligare detalj.</span>
          )}
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}

/**
 * Inline detail panel som återanvänder layouten från Inspector-panelen i
 * AI Operating Console (kompakta sektionsetiketter + mono badges).
 */
function ReviewDetailPanel({
  review,
  confidence,
  onApprove,
  onReject,
}: {
  review: AgentReviewDetails;
  confidence?: number;
  onApprove: () => void;
  onReject: (note?: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const totalDebit = review.accountLines
    ?.filter((l) => l.amount >= 0)
    .reduce((s, l) => s + l.amount, 0);
  const totalCredit = review.accountLines
    ?.filter((l) => l.amount < 0)
    .reduce((s, l) => s + Math.abs(l.amount), 0);

  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 dark:bg-slate-900/40 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/70">
        <div className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
          AI-förslag · Inspector
        </div>
        {review.reference && (
          <span className="font-mono text-[10px] text-slate-500">
            {review.reference}
          </span>
        )}
      </header>

      <div className="p-4 space-y-3.5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Föreslagen åtgärd
          </div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {review.proposedAction}
          </div>
        </div>

        {review.accountLines && review.accountLines.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Berörda konton
            </div>
            <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-200/70 bg-white dark:bg-slate-900/60">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Konto</th>
                    <th className="px-3 py-1.5 text-right font-medium">Debet</th>
                    <th className="px-3 py-1.5 text-right font-medium">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {review.accountLines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <span className="font-mono text-slate-700">{l.account}</span>
                        {l.label && (
                          <span className="ml-2 text-slate-500">{l.label}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">
                        {l.amount > 0 ? formatSEK(l.amount) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-[#3b82f6]">
                        {l.amount < 0 ? formatSEK(Math.abs(l.amount)) : "—"}
                      </td>
                    </tr>
                  ))}
                  {(totalDebit ?? 0) > 0 && (
                    <tr className="bg-slate-50/60 font-medium">
                      <td className="px-3 py-1.5 text-slate-500">Summa</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatSEK(totalDebit ?? 0)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatSEK(totalCredit ?? 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {review.amount != null && !review.accountLines?.length && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Belopp
            </div>
            <div className="mt-1 font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
              {formatSEK(review.amount)}
            </div>
          </div>
        )}

        {confidence != null && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Konfidens
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    confidence >= 90 && "bg-emerald-500",
                    confidence >= 60 && confidence < 90 && "bg-amber-500",
                    confidence < 60 && "bg-rose-500",
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                />
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-700">
                {Math.round(confidence)}%
              </span>
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Motivering
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {review.reasoning}
          </p>
        </div>
      </div>

      <footer className="border-t border-slate-200/70 bg-white/60 dark:bg-slate-900/30 px-4 py-3">
        {submitted ? (
          <div className="text-xs text-slate-500">Beslut registrerat.</div>
        ) : rejecting ? (
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Kommentar (valfri)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="T.ex. fel konto, ska bokas på 6230 istället…"
              className="text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRejecting(false);
                  setNote("");
                }}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  onReject(note.trim() || undefined);
                  setSubmitted(true);
                }}
              >
                Bekräfta avvisning
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={() => setRejecting(true)}
            >
              <X className="h-3.5 w-3.5" /> Avvisa
            </Button>
            <Button
              size="sm"
              className="bg-[#0052FF] text-white hover:bg-[#1e40af]"
              onClick={() => {
                onApprove();
                setSubmitted(true);
              }}
            >
              <Check className="h-3.5 w-3.5" /> Godkänn
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}
