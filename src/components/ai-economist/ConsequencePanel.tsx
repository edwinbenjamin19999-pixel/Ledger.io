import { CheckCircle2, AlertTriangle, Scale } from "lucide-react";

export interface Consequence {
  expected: { label: string; value: string }[];   // e.g. [{label:"Kassa", value:"+179 500 kr"}]
  downside: string[];                              // bullet points
  tradeoff?: string;                                // 1 line summary
}

interface Props {
  consequence: Consequence;
}

export function ConsequencePanel({ consequence }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#BFE6D6] dark:border-[#BFE6D6] bg-emerald-50/60 dark:bg-emerald-500/[0.06] p-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-[#085041] dark:text-[#1D9E75]" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#085041] dark:text-emerald-200">Förväntat utfall</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {consequence.expected.map((e, i) => (
            <div key={i} className="text-sm">
              <div className="text-[11px] text-muted-foreground">{e.label}</div>
              <div className="font-semibold text-slate-900 dark:text-white tabular-nums">{e.value}</div>
            </div>
          ))}
        </div>
      </div>

      {consequence.downside.length > 0 && (
        <div className="rounded-xl border border-[#F0DDB7] dark:border-[#F0DDB7] bg-amber-50/60 dark:bg-amber-500/[0.06] p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-[#7A5417] dark:text-[#C28A2B]" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#7A5417] dark:text-amber-200">Om något går fel</h4>
          </div>
          <ul className="space-y-1 text-xs text-slate-700 dark:text-white/80">
            {consequence.downside.map((d, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-[#7A5417] dark:text-[#C28A2B]">•</span><span>{d}</span></li>
            ))}
          </ul>
        </div>
      )}

      {consequence.tradeoff && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 flex items-start gap-2">
          <Scale className="h-4 w-4 text-slate-500 dark:text-white/60 mt-0.5" />
          <p className="text-xs text-slate-700 dark:text-white/80">{consequence.tradeoff}</p>
        </div>
      )}
    </div>
  );
}
