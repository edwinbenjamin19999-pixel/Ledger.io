import { AlertTriangle, Send, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARInvoice } from "./ARAgent";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  openInvoices: ARInvoice[];
  onViewDetails?: () => void;
}

/**
 * Slim priority bar — surfaces the single most important action.
 * Cohesion: white surface, rose accent border, subtle gradient. No dark blocks.
 */
export const ARPriorityBar = ({ openInvoices, onViewDetails }: Props) => {
  const now = new Date();
  const actionable = openInvoices.filter((i) => {
    const days = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
    return days > 0;
  });
  const atRisk = actionable.reduce((s, i) => s + i.total_amount, 0);

  if (actionable.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/60 to-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-[#085041]" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Alla kundfordringar under kontroll</p>
            <p className="text-xs text-slate-500 mt-0.5">Inga förfallna fakturor kräver åtgärd just nu</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-r from-rose-50/60 via-white to-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[#FCE8E8] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-[#7A1A1A]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">
              {actionable.length} {actionable.length === 1 ? "faktura kräver" : "fakturor kräver"} åtgärd
              <span className="text-[#7A1A1A]"> — {fmt(atRisk)} kr i risk</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Genomsnittlig fördröjning {Math.round(actionable.reduce((s, i) => s + Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000), 0) / actionable.length)} dagar
            </p>
          </div>
        </div>
        <div className="flex gap-2 md:flex-shrink-0">
          <Button
            className="bg-[#0F1F3D] hover:from-[#3b82f6] hover:to-blue-500 text-white shadow-[0_2px_8px_rgba(6,182,212,0.25)] h-10"
            onClick={() => toast.success(`${actionable.length} påminnelser köade för utskick`)}
          >
            <Send className="h-4 w-4 mr-2" />
            Skicka påminnelser
          </Button>
          <Button variant="ghost" className="text-slate-700 hover:text-slate-900 h-10" onClick={onViewDetails}>
            Visa detaljer
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
