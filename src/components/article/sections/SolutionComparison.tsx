import { CheckCircle2, X, Sparkles } from "lucide-react";
import type { SolutionComparison as SolutionComparisonData } from "@/data/guides/articles/types";

export const SolutionComparison = ({ data }: { data: SolutionComparisonData }) => (
  <section className="relative my-16 -mx-2 md:-mx-6 rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#101a3a] to-[#0F172A] p-8 md:p-10 overflow-hidden">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/40 to-transparent" />

    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6]/15 border border-[#3b82f6]/20">
        <Sparkles className="h-4 w-4 text-[#3b82f6]" />
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#3b82f6]">Automation</span>
    </div>
    <h2 className="!mt-4 !text-[28px] md:!text-[32px] font-semibold tracking-tight !text-white !mb-4">
      Hur Cogniq automatiserar detta
    </h2>
    <p className="text-white/70 leading-[1.75] max-w-2xl !mb-0">{data.intro}</p>

    <div className="mt-8 grid md:grid-cols-2 gap-4">
      {/* Manuellt */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-white/60">
          Manuellt
        </div>
        <ul className="mt-4 space-y-3">
          {data.comparison.map((row, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] text-white/60 leading-relaxed">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
              <span>{row.manual}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Med Cogniq */}
      <div className="relative rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.08] p-5 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-[#3b82f6]/40" />
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#3b82f6] shadow-[0_0_20px_-4px_rgba(0,82,255,0.4)]">
          Med Cogniq
        </div>
        <ul className="mt-4 space-y-3">
          {data.comparison.map((row, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] text-white font-medium leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3b82f6]" />
              <span>{row.northledger}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
