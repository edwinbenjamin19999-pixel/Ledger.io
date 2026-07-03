import { Check, Pencil, X, ArrowRight, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ActionPayload } from "@/lib/ai-ekonom/intentRouter";
import { formatSEK } from "@/lib/formatNumber";

interface Props {
  data: ActionPayload;
  onApprove?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
}

export const ActionBlock = ({ data, onApprove, onEdit, onReject }: Props) => {
  const conf = data.confidence ?? 0;
  const auto = conf >= 0.95;
  const flagged = conf > 0 && conf < 0.6;
  const voucherLines = data.lines ?? [];
  const totalDebit = voucherLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = voucherLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const hasVoucherLayout = voucherLines.length > 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className={cn(
      "rounded-xl border bg-white p-4 transition-shadow",
      auto ? "border-[#C8DDF5] shadow-[0_0_0_3px_rgba(6,182,212,0.06)]" : "border-slate-200"
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {hasVoucherLayout && <ReceiptText className="w-4 h-4 text-slate-500 shrink-0" />}
            <h4 className="text-sm font-semibold text-slate-900 truncate">{data.title}</h4>
          </div>
          {auto && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#3b82f6] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" /> Auto-bokförd
            </span>
          )}
          {flagged && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#7A1A1A] bg-[#FCE8E8] px-2 py-0.5 rounded-full">
              Osäker — granska innan godkännande
            </span>
          )}
        </div>
      </div>

      {hasVoucherLayout && (
        <div className="mb-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
            <div>
              <div className="text-slate-500">Datum</div>
              <div className="font-medium text-slate-900">{data.date || "—"}</div>
            </div>
            <div>
              <div className="text-slate-500">Belopp</div>
              <div className="font-medium text-slate-900">{data.amount || "—"}</div>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="grid grid-cols-[1fr_96px_96px] gap-2 px-2 pb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              <span>Konto</span>
              <span className="text-right">Debet</span>
              <span className="text-right">Kredit</span>
            </div>
            <div className="space-y-1.5">
              {voucherLines.map((line, index) => (
                <div key={`${line.account}-${index}`} className="grid grid-cols-[1fr_96px_96px] gap-2 rounded-md bg-slate-50 px-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-mono font-medium text-slate-900">{line.account}</div>
                    {line.accountName && <div className="truncate text-xs text-slate-500">{line.accountName}</div>}
                  </div>
                  <div className="text-right font-mono tabular-nums text-slate-900">
                    {typeof line.debit === "number" && line.debit > 0 ? formatSEK(line.debit) : "—"}
                  </div>
                  <div className="text-right font-mono tabular-nums text-slate-900">
                    {typeof line.credit === "number" && line.credit > 0 ? formatSEK(line.credit) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <span className={cn("font-medium", isBalanced ? "text-[#085041]" : "text-[#7A1A1A]")}>
              {isBalanced ? "Balanserat verifikat" : "Obalans i verifikatet"}
            </span>
            <div className="flex gap-4 font-mono tabular-nums text-slate-700">
              <span>D {formatSEK(totalDebit)}</span>
              <span>K {formatSEK(totalCredit)}</span>
            </div>
          </div>
        </div>
      )}

      {(!hasVoucherLayout && data.fields && data.fields.length > 0) && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 pb-4 border-b border-slate-100">
          {data.fields.map((f, i) => (
            <div key={i}>
              <dt className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{f.label}</dt>
              <dd className={cn("text-sm text-slate-800 mt-0.5", f.mono && "tabular-nums font-medium")}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {data.primary?.intent === "open" ? (
          <Button size="sm" onClick={data.voucherId ? onApprove : onEdit} className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white">
            {data.primary.label}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={onApprove} className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white">
              <Check className="w-3.5 h-3.5 mr-1" /> Godkänn
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Redigera
            </Button>
            <Button size="sm" variant="ghost" onClick={onReject} className="text-slate-500 hover:text-[#7A1A1A]">
              <X className="w-3.5 h-3.5 mr-1" /> Avvisa
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
