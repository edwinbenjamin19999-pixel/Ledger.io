import { Card } from "@/components/ui/card";
import { Sparkles, AlertTriangle, Globe2 } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";

interface CCTaxInsightCardProps {
  recoverableVat: number;
  nonDeductibleCount: number;
  nonDeductibleAmount: number;
  foreignTxnCount: number;
}

export function CCTaxInsightCard({
  recoverableVat,
  nonDeductibleCount,
  nonDeductibleAmount,
  foreignTxnCount,
}: CCTaxInsightCardProps) {
  const insights: Array<{ icon: any; text: string; tone: "emerald" | "amber" | "blue" }> = [];

  if (recoverableVat > 0) {
    insights.push({
      icon: Sparkles,
      text: `Du kan återvinna ${formatSEK(recoverableVat)} i ingående moms denna period`,
      tone: "emerald",
    });
  }
  if (nonDeductibleCount > 0) {
    insights.push({
      icon: AlertTriangle,
      text: `${nonDeductibleCount} transaktion${nonDeductibleCount === 1 ? "" : "er"} ej avdragsgilla — ${formatSEK(nonDeductibleAmount)}`,
      tone: "amber",
    });
  }
  if (foreignTxnCount > 0) {
    insights.push({
      icon: Globe2,
      text: `${foreignTxnCount} utländsk${foreignTxnCount === 1 ? "" : "a"} transaktion${foreignTxnCount === 1 ? "" : "er"} kan behöva FX-justering`,
      tone: "blue",
    });
  }

  if (insights.length === 0) return null;

  const tones: Record<string, string> = {
    emerald: "border-l-emerald-500 bg-emerald-50/40",
    amber: "border-l-amber-500 bg-amber-50/40",
    blue: "border-l-[#3b82f6] bg-blue-50/40",
  };
  const iconTones: Record<string, string> = {
    emerald: "text-[#085041]",
    amber: "text-[#7A5417]",
    blue: "text-[#3b82f6]",
  };

  return (
    <Card className="rounded-2xl p-5 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-[#3b82f6]" />
        <h3 className="text-sm font-semibold text-slate-900">AI-skatteoptimering</h3>
      </div>
      <div className="space-y-2">
        {insights.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 border-l-[3px] rounded-r-lg pl-3 py-2 ${tones[ins.tone]}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${iconTones[ins.tone]}`} />
              <p className="text-sm text-slate-700">{ins.text}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
