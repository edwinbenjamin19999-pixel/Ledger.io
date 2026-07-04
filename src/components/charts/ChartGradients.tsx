/**
 * FLAT CHART THEME — återanvändbara defs för alla Recharts-diagram.
 * Flat design: solida fyllnader (2-stop samma färg så alla url(#grad*)-
 * konsumenter fungerar oförändrat). Semantik för bokföring:
 * intäkter = blå, kostnader = röd, resultat = emerald, varning = amber.
 */
export function ChartGradients() { return (
    <defs>
      {/* Inbetalningar / Intäkter — solid blå */}
      <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0052FF" stopOpacity={1} />
        <stop offset="100%" stopColor="#4D7CFF" stopOpacity={0.85} />
      </linearGradient>

      {/* Utbetalningar / Kostnader — solid röd */}
      <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#DC2626" stopOpacity={1} />
        <stop offset="100%" stopColor="#F87171" stopOpacity={0.8} />
      </linearGradient>

      {/* Resultat / EBIT — solid mörkblå */}
      <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0040CC" stopOpacity={1} />
        <stop offset="100%" stopColor="#4D7CFF" stopOpacity={0.85} />
      </linearGradient>

      {/* Amber — solid */}
      <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
        <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.8} />
      </linearGradient>

      {/* Violet → ink (utanför flat-paletten) */}
      <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0F172A" stopOpacity={1} />
        <stop offset="100%" stopColor="#0F172A" stopOpacity={1} />
      </linearGradient>

      {/* Emerald — solid */}
      <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#059669" stopOpacity={1} />
        <stop offset="100%" stopColor="#34D399" stopOpacity={0.8} />
      </linearGradient>

      {/* Area-fyllnader — platt låg tint, ingen fade */}
      <linearGradient id="areaFillTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0052FF" stopOpacity={0.1} />
        <stop offset="100%" stopColor="#0052FF" stopOpacity={0.1} />
      </linearGradient>

      <linearGradient id="areaFillIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0040CC" stopOpacity={0.1} />
        <stop offset="100%" stopColor="#0040CC" stopOpacity={0.1} />
      </linearGradient>

      <linearGradient id="areaFillRose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#DC2626" stopOpacity={0.08} />
        <stop offset="100%" stopColor="#DC2626" stopOpacity={0.08} />
      </linearGradient>

      <linearGradient id="areaFillAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.1} />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1} />
      </linearGradient>

      <linearGradient id="areaFillViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0F172A" stopOpacity={0.08} />
        <stop offset="100%" stopColor="#0F172A" stopOpacity={0.08} />
      </linearGradient>

      <linearGradient id="areaFillEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#059669" stopOpacity={0.1} />
        <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
      </linearGradient>
    </defs>
  );
}

/** Light theme axis tick props */
export const AXIS_TICK = { fill: '#6D7F92', fontSize: 11, fontFamily: 'inherit' };

/** Light theme grid props — låg kontrast så data dominerar */
export const GRID_PROPS = { strokeDasharray: "4 4",
  stroke: "#EEF2F7",
  vertical: false,
} as const;

/** Standard animation for bars */
export const BAR_ANIMATION = { animationDuration: 800, animationEasing: "ease-out" as const };

/** Standard animation for lines */
export const LINE_ANIMATION = { animationDuration: 1200, animationEasing: "ease-out" as const };

/** Flat färgpalett för pie/donut — systemfärger, färgblindsäker ordning */
export const PIE_COLORS = [
  '#0052FF', '#059669', '#F59E0B', '#DC2626',
  '#0F172A', '#4D7CFF', '#34D399', '#FBBF24',
];

/** Color assignments — mappade till flat-systemet */
export const NEON = { teal: '#0052FF',
  emerald: '#059669',
  rose: '#DC2626',
  indigo: '#0040CC',
  amber: '#F59E0B',
  blue: '#0052FF',
  violet: '#0F172A',
  slate: '#94A3B8',
} as const;

/** Cursor style for tooltips (light theme) */
export const TOOLTIP_CURSOR = { fill: 'rgba(0,82,255,0.05)', radius: 8 };

/** Flat chart card wrapper — kant, aldrig skugga */
export const CHART_CARD_CLASS = "bg-white rounded-lg border border-gray-200 hover:border-[#0052FF]/40 transition-colors duration-200 p-6";
