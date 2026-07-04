import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, Sparkles, X } from "lucide-react";
import { classify, type ClassifiableInvoice } from "@/lib/supplier-ledger/classifyAP";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  invoices: ClassifiableInvoice[];
  selectedIds: Set<string>;
  cashBalance: number | null;
  onClear: () => void;
  onPay: () => void;
  onSchedule: () => void;
  onOptimize: (newSelection: Set<string>) => void;
}

export function APBulkActionBar({ invoices, selectedIds, cashBalance, onClear, onPay, onSchedule, onOptimize }: Props) {
  if (selectedIds.size === 0) return null;
  const selected = invoices.filter(i => selectedIds.has(i.id));
  const sum = selected.reduce((s, i) => s + i.total_amount, 0);
  const cashAfter = cashBalance !== null ? cashBalance - sum : null;

  const handleOptimize = () => {
    const next = new Set<string>();
    selected.forEach(i => {
      const cls = classify(i);
      if (cls !== "strategic_delay" && cls !== "can_wait") next.add(i.id);
    });
    onOptimize(next);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_8px_32px_rgba(15,23,42,0.12)] p-2 pl-4">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.size} valda · <span className="font-mono tabular-nums font-bold">{fmt(sum)} kr</span>
          </span>
          {cashAfter !== null && (
            <span className={`text-[11px] font-medium ${cashAfter < 0 ? "text-[#7A1A1A]" : "text-[#085041]"}`}>
              Kassa efter: {fmt(cashAfter)} kr
            </span>
          )}
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <Button size="sm" variant="ghost" onClick={handleOptimize} className="text-[#3b82f6]">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Optimera
        </Button>
        <Button size="sm" variant="outline" onClick={onSchedule}>
          <Calendar className="h-3.5 w-3.5 mr-1" /> Schemalägg
        </Button>
        <Button size="sm" onClick={onPay}>
          <CreditCard className="h-4 w-4 mr-1" /> Betala valda
        </Button>
        <Button size="icon" variant="ghost" onClick={onClear} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
