import { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

const MiniSparkline = () => {
  const points = "0,20 13,16 27,18 40,10 53,14 67,6 80,8";
  const fillPoints = `${points} 80,24 0,24`;
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="flex-shrink-0">
      <polyline points={fillPoints} fill="white" fillOpacity="0.12" stroke="none" />
      <polyline points={points} fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

export interface GradientKPICardData {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  gradient: string;
}

// Preset gradients (legacy — kept for backwards compatibility outside dashboard)
export const KPI_GRADIENTS = {
  emerald: "bg-[#0F1F3D]",
  rose: "bg-[#0F1F3D]",
  indigo: "bg-[#0F1F3D]",
  slate: "bg-[#0F1F3D]",
  amber: "bg-[#0F1F3D]",
  blue: "bg-[#0F1F3D]",
  teal: "bg-[#0F1F3D]",
  purple: "bg-[#0F1F3D]",
  cyan: "bg-[#0F1F3D]",
  orange: "bg-[#0F1F3D]",
  red: "bg-[#0F1F3D]",
  green: "bg-[#0F1F3D]",
} as const;

/**
 * Enterprise-neutral accent system — use this for dashboard KPIs.
 * Color = meaning only (Law 3). Maps to a 3px left border on a neutral card.
 */
export const KPI_ACCENT = {
  emerald: { border: "border-l-emerald-500", icon: "text-[#085041]", dot: "bg-emerald-500" },
  rose: { border: "border-l-rose-500", icon: "text-[#7A1A1A]", dot: "bg-rose-500" },
  cyan: { border: "border-l-[#3b82f6]", icon: "text-[#3b82f6]", dot: "bg-[#3b82f6]" },
  amber: { border: "border-l-amber-500", icon: "text-[#7A5417]", dot: "bg-amber-500" },
  slate: { border: "border-l-slate-400", icon: "text-slate-600", dot: "bg-slate-400" },
} as const;

export type KPIAccent = keyof typeof KPI_ACCENT;

export const GradientKPICard = ({ label, value, sub, icon: Icon, gradient }: GradientKPICardData) => (
  <div
    className={`${gradient} rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.22)] hover:-translate-y-1 transition-all duration-200 relative`}
  >
    <div className="flex items-start justify-between gap-3 mb-2">
      <span className="text-white/80 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <Icon className="w-6 h-6 text-white/40 flex-shrink-0" />
    </div>
    <p className="text-2xl font-black text-white tracking-tight tabular-nums whitespace-nowrap">
      {value}
    </p>
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs text-white/60 whitespace-nowrap">{sub || "vs förra månaden"}</span>
      <MiniSparkline />
    </div>
  </div>
);

/** Numeric value extractor — pulls leading number from "12 345 kr" / "85%" etc. */
function parseLeadingNumber(value: string): { num: number | null; prefix: string; suffix: string } {
  const match = value.match(/^([^\d-]*)(-?[\d\s.,]+)(.*)$/);
  if (!match) return { num: null, prefix: "", suffix: value };
  const raw = match[2].replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(raw);
  if (Number.isNaN(num)) return { num: null, prefix: "", suffix: value };
  return { num, prefix: match[1], suffix: match[3] };
}

function formatAnimated(num: number, hasDecimal: boolean): string {
  const rounded = hasDecimal ? Math.round(num * 10) / 10 : Math.round(num);
  return rounded.toLocaleString("sv-SE");
}

export interface AccentKPICardData {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent: KPIAccent;
}

const AnimatedValue = ({ value }: { value: string }) => {
  const parsed = parseLeadingNumber(value);
  const target = parsed.num ?? 0;
  const animated = useCountUp(target, 900);
  if (parsed.num === null) return <>{value}</>;
  const hasDecimal = /[.,]\d/.test(value);
  return (
    <>
      {parsed.prefix}
      {formatAnimated(animated, hasDecimal)}
      {parsed.suffix}
    </>
  );
};

export const AccentKPICard = ({ label, value, sub, icon: Icon, accent }: AccentKPICardData) => {
  const a = KPI_ACCENT[accent];
  return (
    <div
      className={`relative bg-white border border-slate-200/70 border-l-[3px] ${a.border} rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
          {label}
        </span>
        <Icon className={`w-5 h-5 ${a.icon} flex-shrink-0 opacity-70`} />
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums whitespace-nowrap">
        <AnimatedValue value={value} />
      </p>
      {sub && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`w-1 h-1 rounded-full ${a.dot}`} />
          <span className="text-xs text-slate-500 whitespace-nowrap">{sub}</span>
        </div>
      )}
    </div>
  );
};

interface GradientKPIStripProps {
  cards: GradientKPICardData[];
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export const GradientKPIStrip = ({ cards, columns }: GradientKPIStripProps) => {
  const cols = columns || Math.min(cards.length, 6);
  const colClass = GRID_COLS[cols] || GRID_COLS[4];
  return (
    <div className={`grid ${colClass} gap-4 overflow-x-auto`} style={{ minWidth: `${cols * 200}px` }}>
      {cards.map((card) => (
        <GradientKPICard key={card.label} {...card} />
      ))}
    </div>
  );
};

interface AccentKPIStripProps {
  cards: AccentKPICardData[];
  columns?: number;
}

export const AccentKPIStrip = ({ cards, columns }: AccentKPIStripProps) => {
  const cols = columns || Math.min(cards.length, 6);
  const colClass = GRID_COLS[cols] || GRID_COLS[4];
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:${colClass} gap-4`}>
      {cards.map((card) => (
        <AccentKPICard key={card.label} {...card} />
      ))}
    </div>
  );
};
