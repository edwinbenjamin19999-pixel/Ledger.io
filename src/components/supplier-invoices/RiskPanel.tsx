import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ban, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { useRiskSignals, RISK_KIND_LABELS } from "@/hooks/useRiskSignals";
import { useReleaseBlock, type APInvoice } from "@/hooks/useAPInvoices";
import { RiskBadge } from "./RiskBadge";

interface Props {
  invoice: APInvoice;
}

export function RiskPanel({ invoice }: Props) {
  const { data: signals = [], isLoading } = useRiskSignals(invoice.id);
  const release = useReleaseBlock(invoice.company_id);
  const [reason, setReason] = useState("");

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#0F172A]" />
          <span className="text-sm font-semibold text-[#0F172A]">Riskanalys</span>
        </div>
        <RiskBadge level={invoice.risk_level} score={invoice.risk_score} blocked={invoice.is_blocked} size="md" />
      </div>

      {invoice.is_blocked && (
        <div className="rounded-xl border border-foreground/40 bg-foreground/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <Ban className="h-4 w-4" />
            Blockerad — kräver verifiering
          </div>
          <p className="text-[11px] text-[#475569]">
            Fakturan kan inte attesteras eller ingå i betalning förrän en användare häver blockeringen. Alla overrides loggas.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Skäl för att häva blockering..."
            className="w-full rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs"
          />
          <Button
            size="sm"
            variant="destructive"
            className="w-full"
            disabled={!reason.trim() || release.isPending}
            onClick={() => release.mutate({ invoiceId: invoice.id, reason: reason.trim() })}
          >
            {release.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Häv blockering (logga override)
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-wide text-[#475569] font-bold">
          Signaler
        </div>
        {isLoading ? (
          <div className="text-xs text-[#475569]">Laddar...</div>
        ) : signals.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[#085041]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Inga risksignaler upptäckta.
          </div>
        ) : (
          signals.map((s) => {
            const sevCls =
              s.severity === "critical" || s.severity === "high"
                ? "border-[#F1A1A0] bg-[#FCE8E8] text-[#7A1F1E]"
                : s.severity === "medium"
                  ? "border-[#E8C589] bg-[#FAEEDA] text-[#7A5417]"
                  : "border-[#E2E8F0] bg-[#F8FAFB] text-[#475569]";
            return (
              <div key={s.id} className={`rounded-lg border ${sevCls} p-2 text-[11px]`}>
                <div className="flex items-center justify-between font-semibold">
                  <span>{RISK_KIND_LABELS[s.kind]}</span>
                  <span className="tabular-nums">+{s.score_contribution}</span>
                </div>
                {typeof s.details?.message === "string" && (
                  <div className="opacity-80 mt-0.5">{s.details.message as string}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
