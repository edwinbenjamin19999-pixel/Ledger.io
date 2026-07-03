import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Receipt,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Sparkles,
  Globe2,
  AlertTriangle,
} from "lucide-react";
import { CCClarificationCard } from "./CCClarificationCard";
import { formatSEK } from "@/lib/formatNumber";

export interface CCTransaction {
  id: string;
  transaction_date: string;
  merchant_name: string | null;
  amount: number;
  currency: string;
  match_status: string;
  match_confidence: number;
  status: string;
  is_private: boolean;
  is_duplicate: boolean;
  ai_suggestion: {
    debit_account?: string;
    debit_account_name?: string;
    vat_code?: string;
    explanation?: string;
    confidence?: number;
  } | null;
  clarification_question: string | null;
  clarification_answer: string | null;
  matched_receipt_id: string | null;
  liability_account?: string | null;
  vat_account?: string | null;
  vat_amount?: number | null;
  confidence?: number | null;
  journal_entry_id?: string | null;
}

interface CCTransactionRowProps {
  txn: CCTransaction;
  onAccept: (id: string) => void;
  onExclude: (id: string) => void;
  onTogglePrivate: (id: string) => void;
  onClarify: (id: string, answer: string) => void;
  onOverride?: (id: string) => void;
  onRequestReceipt?: (id: string) => void;
}

function statusBadge(status: string, hasReceipt: boolean) {
  switch (status) {
    case "auto_booked":
    case "posted":
      return { label: "Bokfört", className: "bg-[#E1F5EE] text-[#085041] border border-[#BFE6D6]" };
    case "missing_receipt":
      return { label: "Saknar kvitto", className: "bg-[#FAEEDA] text-[#7A5417] border border-[#F0DDB7]" };
    case "needs_review":
      return { label: "Behöver granskning", className: "bg-[#FCE8E8] text-[#7A1A1A] border border-[#F4C8C8]" };
    case "ready":
      return { label: "Klar att bokföra", className: "bg-[#EFF6FF] text-[#3b82f6] border border-[#C8DDF5]" };
    case "excluded":
      return { label: "Exkluderad", className: "bg-slate-100 text-slate-600 border" };
    default:
      return { label: hasReceipt ? "Klar" : "Väntar", className: "bg-slate-100 text-slate-700 border" };
  }
}

function confidencePill(confidence: number | null | undefined) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  if (confidence >= 0.95) return { label: `${pct}% säker`, className: "bg-[#E1F5EE] text-[#085041] border border-[#BFE6D6]" };
  if (confidence >= 0.75) return { label: `${pct}% säker`, className: "bg-[#FAEEDA] text-[#7A5417] border border-[#F0DDB7]" };
  return { label: `${pct}% — osäker`, className: "bg-[#FCE8E8] text-[#7A1A1A] border border-[#F4C8C8]" };
}

export function CCTransactionRow({
  txn,
  onAccept,
  onExclude,
  onTogglePrivate,
  onClarify,
  onOverride,
  onRequestReceipt,
}: CCTransactionRowProps) {
  const suggestion = txn.ai_suggestion;
  const hasReceipt = !!txn.matched_receipt_id;
  const hasClarification = txn.clarification_question && !txn.clarification_answer;
  const status = statusBadge(txn.status, hasReceipt);
  const conf = confidencePill(txn.confidence ?? suggestion?.confidence ?? null);
  const liabilityAccount = txn.liability_account || "2890";
  const isForeign = txn.currency && txn.currency !== "SEK";
  const isPosted = txn.status === "posted" || txn.status === "auto_booked";

  return (
    <div
      className={`group p-4 border-b last:border-b-0 transition-colors hover:bg-slate-50/60 ${txn.is_duplicate ? "opacity-50" : ""} ${txn.is_private ? "bg-muted/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: merchant + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground tabular-nums w-20 shrink-0">
              {txn.transaction_date}
            </div>
            <div className="font-medium text-slate-900 truncate">
              {txn.merchant_name || "Okänd"}
            </div>
            {hasReceipt && (
              <span title="Kvitto bifogat">
                <Receipt className="h-3.5 w-3.5 text-[#085041] shrink-0" />
              </span>
            )}
            {isForeign && (
              <Badge variant="outline" className="h-5 text-[10px] gap-1">
                <Globe2 className="h-3 w-3" />
                {txn.currency}
              </Badge>
            )}
            {txn.is_duplicate && <Badge variant="destructive" className="text-xs">Dubblett</Badge>}
            {txn.is_private && <Badge variant="outline" className="text-xs">Privat</Badge>}
          </div>

          {/* AI account chip row */}
          {suggestion?.debit_account && (
            <div className="flex items-center gap-2 mt-2 pl-[5.25rem] flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md bg-[#EFF6FF] text-[#3b82f6] border border-blue-100">
                <Sparkles className="h-3 w-3" />
                {suggestion.debit_account} {suggestion.debit_account_name}
              </span>
              {suggestion.vat_code && (
                <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700 border">
                  Moms {suggestion.vat_code}%
                </span>
              )}
              {conf && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${conf.className}`}>
                  {conf.label}
                </span>
              )}
            </div>
          )}

          {/* Liability microline */}
          <div className="text-[11px] text-muted-foreground mt-1.5 pl-[5.25rem] font-mono">
            → {liabilityAccount} Kreditkortsskuld {formatSEK(txn.amount)}
          </div>

          {suggestion?.explanation && (
            <p className="text-xs text-muted-foreground italic mt-1 pl-[5.25rem]">
              {suggestion.explanation}
            </p>
          )}
        </div>

        {/* Right: amount + status */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-lg font-semibold tabular-nums text-slate-900">
            {txn.amount.toLocaleString("sv-SE")} <span className="text-xs text-muted-foreground">{txn.currency}</span>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
          {!hasReceipt && !isPosted && (
            <button
              type="button"
              onClick={() => onRequestReceipt?.(txn.id)}
              className="text-[11px] text-[#7A5417] hover:text-[#7A5417] inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <AlertTriangle className="h-3 w-3" /> Begär kvitto
            </button>
          )}
        </div>
      </div>

      {hasClarification && (
        <div className="pl-[5.25rem] mt-3">
          <CCClarificationCard
            question={txn.clarification_question!}
            options={["Representation (avdragsgill)", "Personalmåltid", "Privat", "Annat"]}
            onAnswer={(answer) => onClarify(txn.id, answer)}
          />
        </div>
      )}

      {/* Inline actions */}
      {!isPosted && txn.status !== "excluded" && (
        <div className="flex items-center gap-1 pl-[5.25rem] mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onAccept(txn.id)}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Godkänn
          </Button>
          {onOverride && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onOverride(txn.id)}>
              <Edit2 className="h-3.5 w-3.5" /> Ändra konto
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onTogglePrivate(txn.id)}>
            {txn.is_private ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {txn.is_private ? "Affärsköp" : "Privat"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" onClick={() => onExclude(txn.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Exkludera
          </Button>
        </div>
      )}
    </div>
  );
}
