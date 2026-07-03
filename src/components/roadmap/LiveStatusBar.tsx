import { Activity, Database, Building2, Sparkles, ShieldCheck, type LucideIcon } from "lucide-react";
import { useLiveStatusMetrics } from "@/hooks/useLiveStatusMetrics";
import { useCountUp } from "@/hooks/useCountUp";

interface MetricProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  descriptor?: string;
  showDot?: boolean;
}

const StatusCard = ({ icon: Icon, label, value, descriptor, showDot }: MetricProps) => (
  <div
    className="group relative overflow-hidden rounded-[20px] border border-slate-900/[0.06] bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-[160ms] ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
  >
    <div className="flex items-center gap-2 text-slate-500">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <div className="mt-3 flex items-center gap-2">
      {showDot && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
    {descriptor && (
      <p className="mt-1.5 text-xs text-slate-500">{descriptor}</p>
    )}
  </div>
);

const AnimatedNumber = ({ value }: { value: number | null }) => {
  const animated = useCountUp(value ?? 0, 1200);
  if (value === null) return <span className="text-slate-400">—</span>;
  return <>{Math.round(animated).toLocaleString("sv-SE")}</>;
};

export const LiveStatusBar = () => {
  const { events, companies, loading } = useLiveStatusMetrics();

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-5">
      <StatusCard
        icon={Activity}
        label="Plattformstatus"
        value="Live"
        descriptor="I produktion"
        showDot
      />
      <StatusCard
        icon={Database}
        label="Bokförda händelser"
        value={loading ? <span className="text-slate-400">—</span> : <AnimatedNumber value={events} />}
        descriptor="Verifikationer i systemet"
      />
      <StatusCard
        icon={Building2}
        label="Aktiva företag"
        value={loading ? <span className="text-slate-400">—</span> : <AnimatedNumber value={companies} />}
        descriptor="Onboardade organisationer"
      />
      <StatusCard
        icon={Sparkles}
        label="Automationsgrad"
        value="94%"
        descriptor="AI-bokförda transaktioner"
      />
      <StatusCard
        icon={ShieldCheck}
        label="Systemstatus"
        value="99.9%"
        descriptor="Uptime senaste 30 dagar"
      />
    </div>
  );
};
