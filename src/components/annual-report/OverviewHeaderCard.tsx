import { CheckCircle, Clock, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SectionProgress } from "@/lib/annual-report-compliance";
import { SECTION_LABELS } from "@/lib/annual-report-compliance";

export interface OverviewHeaderCardProps {
  companyName: string;
  framework: "K2" | "K3";
  year: number;
  status: string;
  balanced: boolean;
  completionPct: number;
  bySection: SectionProgress[];
  deadlines: Array<{ label: string; date: Date; done?: boolean; countdown?: number }>;
}

export function OverviewHeaderCard({
  companyName, framework, year, status, balanced, completionPct, bySection, deadlines,
}: OverviewHeaderCardProps) {
  const today = new Date();
  return (
    <div className="rounded-2xl bg-[#111827] text-white p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-semibold truncate">{companyName}</h1>
              <p className="text-white/60 text-xs flex items-center gap-2">
                <span>Årsredovisning {year}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] tracking-wider">{framework}</span>
              </p>
            </div>
          </div>

          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-semibold tabular-nums">{completionPct}%</span>
                    <span className="text-white/60 text-sm">klar</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#1F2937] text-white border-white/10">
                <div className="text-xs space-y-1 min-w-[200px]">
                  {bySection.filter(s => s.total > 0).map(s => (
                    <div key={s.section} className="flex justify-between gap-4">
                      <span className="text-white/70">{SECTION_LABELS[s.section]}</span>
                      <span className="tabular-nums">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[11px]">{status}</span>
            {balanced && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[11px] flex items-center gap-1 border border-emerald-400/20">
                <CheckCircle className="w-3 h-3" /> Balans OK
              </span>
            )}
          </div>
        </div>

        {/* RIGHT — deadline grid */}
        <div className="grid grid-cols-2 gap-2 shrink-0 w-full lg:w-auto">
          {deadlines.map((d, i) => {
            const past = d.date < today;
            const done = d.done ?? false;
            return (
              <div
                key={i}
                className="rounded-[8px] p-[10px] min-w-[140px]"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="text-[9px] uppercase tracking-[0.07em] text-white/40">{d.label}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {done || past ? (
                    <CheckCircle className="w-3 h-3 text-emerald-300" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-300" />
                  )}
                  <span className="text-[14px] font-medium text-white tabular-nums">
                    {d.date.toLocaleDateString("sv-SE")}
                  </span>
                </div>
                {!done && d.countdown !== undefined && (
                  <p className="text-[10px] text-amber-200/80 mt-0.5">Om {d.countdown} dagar</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
