import { Sparkles, Bell, Gavel, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSEK } from "@/lib/formatNumber";

interface Invoice {
  id: string;
  due_date: string;
  total_amount: number;
  status: string;
  invoice_type: string;
}

interface InvoiceRecommendationsCardProps {
  remindCandidates: Invoice[];      // overdue 7-30
  collectionCandidates: Invoice[];  // overdue >60
  draftCandidates: Invoice[];       // drafts
  onExecute: () => void;
  isExecuting?: boolean;
}

export const InvoiceRecommendationsCard = ({
  remindCandidates,
  collectionCandidates,
  draftCandidates,
  onExecute,
  isExecuting,
}: InvoiceRecommendationsCardProps) => {
  const recs: { icon: typeof Bell; text: string; chip: string; tone: string }[] = [];

  if (remindCandidates.length > 0) {
    const sum = remindCandidates.reduce((s, i) => s + i.total_amount, 0);
    recs.push({
      icon: Bell,
      text: `Skicka påminnelse till ${remindCandidates.length} ${remindCandidates.length === 1 ? "kund" : "kunder"} (${formatSEK(sum)}) — förfallna 7–30 dagar`,
      chip: "Hög konfidens",
      tone: "rose",
    });
  }
  if (collectionCandidates.length > 0) {
    const sum = collectionCandidates.reduce((s, i) => s + i.total_amount, 0);
    recs.push({
      icon: Gavel,
      text: `Eskalera ${collectionCandidates.length} ${collectionCandidates.length === 1 ? "faktura" : "fakturor"} till inkasso (${formatSEK(sum)}) — förfallna >60 dagar`,
      chip: "Hög konfidens",
      tone: "rose",
    });
  }
  if (draftCandidates.length > 0) {
    const sum = draftCandidates.reduce((s, i) => s + i.total_amount, 0);
    recs.push({
      icon: Send,
      text: `Skicka ${draftCandidates.length} ${draftCandidates.length === 1 ? "utkast" : "utkast"} (${formatSEK(sum)})`,
      chip: "Medel konfidens",
      tone: "cyan",
    });
  }

  if (recs.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 border-l-[3px] border-l-[#3b82f6] shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow p-5">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-[#3b82f6]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-base font-semibold text-slate-900">AI rekommenderar</h3>
            <Button size="sm" onClick={onExecute} disabled={isExecuting}>
              <Zap className="h-3.5 w-3.5" />
              Utför rekommenderade åtgärder
            </Button>
          </div>
          <ul className="space-y-2">
            {recs.map((r, i) => {
              const Icon = r.icon;
              const toneText = r.tone === "rose" ? "text-[#7A1A1A]" : "text-[#3b82f6]";
              const toneBg = r.tone === "rose" ? "bg-[#FCE8E8]" : "bg-[#EFF6FF]";
              return (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className={`h-7 w-7 rounded-lg ${toneBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${toneText}`} />
                  </span>
                  <span className="text-slate-700 flex-1">{r.text}</span>
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">
                    {r.chip}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};
