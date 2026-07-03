/**
 * Reusable SVG gradient definitions for all Recharts charts.
 * Light theme: premium gradients on white card backgrounds.
 */
export function ChartGradients() { return (
    <defs>
      {/* Inbetalningar / Intäkter — Teal */}
      <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
        <stop offset="100%" stopColor="#0d9488" stopOpacity={0.6} />
      </linearGradient>

      {/* Utbetalningar / Kostnader — Rose */}
      <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
        <stop offset="100%" stopColor="#e11d48" stopOpacity={0.6} />
      </linearGradient>

      {/* Resultat / EBIT — Indigo */}
      <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
      </linearGradient>

      {/* Amber */}
      <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
      </linearGradient>

      {/* Violet */}
      <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
      </linearGradient>

      {/* Emerald */}
      <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
        <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
      </linearGradient>

      {/* Area fill Teal */}
      <linearGradient id="areaFillTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
      </linearGradient>

      {/* Area fill Indigo */}
      <linearGradient id="areaFillIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
      </linearGradient>

      {/* Area fill Rose */}
      <linearGradient id="areaFillRose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fb7185" stopOpacity={0.15} />
        <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
      </linearGradient>

      {/* Area fill Amber */}
      <linearGradient id="areaFillAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
      </linearGradient>

      {/* Area fill Violet */}
      <linearGradient id="areaFillViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
      </linearGradient>

      {/* Area fill Emerald */}
      <linearGradient id="areaFillEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

/** Light theme axis tick props */
export const AXIS_TICK = { fill: '#94a3b8', fontSize: 11, fontFamily: 'inherit' };

/** Light theme grid props */
export const GRID_PROPS = { strokeDasharray: "4 4",
  stroke: "#f1f5f9",
  vertical: false,
} as const;

/** Standard animation for bars */
export const BAR_ANIMATION = { animationDuration: 800, animationEasing: "ease-out" as const };

/** Standard animation for lines */
export const LINE_ANIMATION = { animationDuration: 1200, animationEasing: "ease-out" as const };

/** Color palette for pie/donut charts */
export const PIE_COLORS = [
  '#6366f1', '#14b8a6', '#f59e0b', '#f43f5e',
  '#8b5cf6', '#3b82f6', '#10b981', '#ef4444',
];

/** Color assignments */
export const NEON = { teal: '#14b8a6',
  emerald: '#10b981',
  rose: '#fb7185',
  indigo: '#6366f1',
  amber: '#f59e0b',
  blue: '#3b82f6',
  violet: '#a78bfa',
  slate: '#94a3b8',
} as const;

/** Cursor style for tooltips (light theme) */
export const TOOLTIP_CURSOR = { fill: 'rgba(99,102,241,0.04)', radius: 8 };

/** Light chart card wrapper className */
export const CHART_CARD_CLASS = "bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6";
