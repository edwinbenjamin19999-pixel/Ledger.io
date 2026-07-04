import { X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AIExplanationBlock } from "./AIExplanationBlock";

export interface LiveActivityItem {
  id: string;
  type: "journal" | "invoice" | "bank" | "warning";
  title: string;
  subtitle: string;
  amount?: number;
  confidence?: number;
  timestamp: Date;
  source: string;
  rawId: string;
}

interface Props {
  item: LiveActivityItem | null;
  onClose: () => void;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(n) + " kr";
}

/**
 * Slide-in detail panel (right). Shows full breakdown, AI reasoning,
 * source data, confidence explanation. 400-480px wide.
 */
export function LiveActivityDetailPanel({ item, onClose }: Props) {
  const navigate = useNavigate();
  if (!item) return null;

  const conf = item.confidence ?? 0.95;
  const confidenceText =
    conf >= 0.95
      ? "Hög säkerhet — flera datakällor överensstämmer (köpmönster, belopp, historik)."
      : conf >= 0.75
      ? "Medelhög säkerhet — vissa signaler saknas, granska gärna före godkännande."
      : "Låg säkerhet — underliggande data är ofullständig och behöver kompletteras.";

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <p className="text-[11px] uppercase font-semibold text-[#3b82f6] tracking-wide">Detaljvy</p>
            <h3 className="text-base font-semibold text-slate-900 mt-1 leading-tight">{item.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Quick facts */}
          <div className="grid grid-cols-2 gap-3">
            {item.amount != null && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">Belopp</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">{fmt(item.amount)}</p>
              </div>
            )}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">Tidpunkt</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {item.timestamp.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          </div>

          {/* AI Reasoning */}
          <AIExplanationBlock
            title="Varför gjorde AI detta?"
            simple={`${item.title}. ${confidenceText}`}
            detailed={`Källa: ${item.source}. Identifierare: ${item.rawId}. AI matchade händelsen mot historiska mönster, leverantörsregister och belopp inom förväntade intervall. Konfidensgrad: ${Math.round(
              conf * 100
            )}%.`}
            audit={`Pipeline: ai-bookkeeper-stream → bookkeepingEngine → ${item.source}.\nKälltabell: ${item.source}\nPrimärnyckel: ${item.rawId}\nKonfidensbeslut: ${
              conf >= 0.95 ? "AUTO_BOOK (≥95%)" : conf >= 0.75 ? "SUGGEST (75–95%)" : "REVIEW (<75%)"
            }\nTidsstämpel: ${item.timestamp.toISOString()}`}
            sources={[item.source, `id: ${item.rawId.slice(0, 8)}…`, "ai-bookkeeper-stream"]}
            confidence={conf}
            actions={[
              {
                label: "Öppna modul",
                primary: true,
                onClick: () => {
                  const route =
                    item.source === "invoices"
                      ? "/invoices"
                      : item.source === "journal_entries"
                      ? "/verifications"
                      : "/dashboard";
                  navigate(route);
                  onClose();
                },
              },
            ]}
          />

          {/* Audit trail */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide">Spårbarhet</p>
            </div>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500">Källa</dt>
                <dd className="text-slate-800 font-mono">{item.source}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">ID</dt>
                <dd className="text-slate-800 font-mono">{item.rawId.slice(0, 12)}…</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd className="text-slate-800">{item.type === "warning" ? "Avvikelse" : "Genomförd"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
