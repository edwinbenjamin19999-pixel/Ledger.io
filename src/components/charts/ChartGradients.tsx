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
        <stop offset="0%" stopColor="#2563EB" stopOpacity={1} />
        <stop offset="100%" stopColor="#2563EB" stopOpacity={1} />
      </linearGradient>

      {/* Utbetalningar / Kostnader — solid röd */}
      <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#DC2626" stopOpacity={1} />
        <stop offset="100%" stopColor="#DC2626" stopOpacity={1} />
      </linearGradient>

      {/* Resultat / EBIT — solid mörkblå */}
      <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1D4ED8" stopOpacity={1} />
        <stop offset="100%" stopColor="#1D4ED8" stopOpacity={1} />
      </linearGradient>

      {/* Amber — solid */}
      <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity={1} />
      </linearGradient>

      {/* Violet → ink (utanför flat-paletten) */}
      <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0F1B2D" stopOpacity={1} />
        <stop offset="100%" stopColor="#0F1B2D" stopOpacity={1} />
      </linearGradient>

      {/* Emerald — solid */}
      <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#059669" stopOpacity={1} />
        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
      </linearGradient>

      {/* Area-fyllnader — platt låg tint, ingen fade */}
      <linearGradient id="areaFillTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.1} />
        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.1} />
      </linearGradient>

      <linearGradient id="areaFillIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1D4ED8" stopOpacity={0.1} />
        <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.1} />
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
        <stop offset="0%" stopColor="#0F1B2D" stopOpacity={0.08} />
        <stop offset="100%" stopColor="#0F1B2D" stopOpacity={0.08} />
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
  '#2563EB', '#059669', '#F59E0B', '#DC2626',
  '#0F1B2D', '#60A5FA', '#34D399', '#FBBF24',
];

/** Color assignments — mappade till flat-systemet */
export const NEON = { teal: '#2563EB',
  emerald: '#059669',
  rose: '#DC2626',
  indigo: '#1D4ED8',
  amber: '#F59E0B',
  blue: '#2563EB',
  violet: '#0F1B2D',
  slate: '#94A3B8',
} as const;

/** Cursor style for tooltips (light theme) */
export const TOOLTIP_CURSOR = { fill: 'rgba(37,99,235,0.05)', radius: 8 };

/** Flat chart card wrapper — kant, aldrig skugga */
export const CHART_CARD_CLASS = "bg-white rounded-lg border border-gray-200 hover:border-[#2563EB]/40 transition-colors duration-200 p-6";
