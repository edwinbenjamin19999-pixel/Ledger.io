import { Sparkles, Receipt, ArrowRight, CheckCircle2 } from "lucide-react";

/**
 * Mini-cockpit preview shown in onboarding step 4 (System Preview).
 * Uses brand CSS variables → inherits white-label theme automatically.
 */
export const SystemPreviewCard = () => {
  return (
    <div className="rounded-2xl bg-[var(--brand-surface-dark,#0B1220)] p-5 border border-white/5 shadow-[0_8px_32px_rgba(8,12,28,0.18)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-[0.14em] text-white/40 font-semibold">
          Din plattform
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* 2 mini KPI cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <MiniKpi label="Omsättning" value="—" gradient="var(--brand-grad-revenue, linear-gradient(135deg,#0F766E,#134E4A))" />
        <MiniKpi label="Resultat"   value="—" gradient="var(--brand-grad-result, linear-gradient(135deg,#5B21B6,#3B0764))" />
      </div>

      {/* AI insights row */}
      <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3 mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary,#3b82f6)]" />
          <span className="text-[12px] font-medium text-white/90">AI har redan analyserat din ekonomi</span>
        </div>
        <p className="text-[11px] text-white/50 pl-5">3 förbättringsförslag redo att granska</p>
      </div>

      {/* Automation flow strip */}
      <div className="flex items-center justify-between gap-2 px-1">
        <FlowStep icon={Receipt} label="Kvitto" />
        <ArrowRight className="w-3 h-3 text-white/25 flex-shrink-0" />
        <FlowStep icon={Sparkles} label="AI" />
        <ArrowRight className="w-3 h-3 text-white/25 flex-shrink-0" />
        <FlowStep icon={CheckCircle2} label="Bokfört" highlight />
      </div>
    </div>
  );
};

const MiniKpi = ({ label, value, gradient }: { label: string; value: string; gradient: string }) => (
  <div
    className="rounded-xl p-3 relative overflow-hidden"
    style={{ backgroundImage: gradient }}
  >
    <div className="text-[10px] uppercase tracking-wider text-white/60 font-medium mb-1">{label}</div>
    <div className="text-[18px] font-bold text-white tabular-nums leading-none">{value}</div>
    {/* Subtle sparkline */}
    <svg className="absolute right-1 bottom-1 w-12 h-5 opacity-50" viewBox="0 0 48 20" fill="none">
      <path d="M0 14 L8 11 L16 13 L24 7 L32 9 L40 4 L48 6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const FlowStep = ({ icon: Icon, label, highlight }: { icon: any; label: string; highlight?: boolean }) => (
  <div className="flex flex-col items-center gap-1 flex-1">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
      highlight ? "bg-[var(--brand-primary,#3b82f6)]/20 text-[var(--brand-primary,#3b82f6)]" : "bg-white/[0.06] text-white/60"
    }`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <span className="text-[10px] text-white/50 font-medium">{label}</span>
  </div>
);
