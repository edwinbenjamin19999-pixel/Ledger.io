import { useNavigate } from "react-router-dom";
import {
  LucideIcon,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  Scale,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactSEK, formatFullSEK } from "../table/format";
import {
  TONE_STYLES,
  ACCENT_STYLES,
  KIND_DEFAULTS,
  type KpiTone,
  type KpiAccent,
  type KpiKind,
} from "./kpiTokens";

/** Backwards-compatible alias for the original `variant` prop. */
export type KpiVariant = KpiAccent;

export interface KpiTrend {
  /** Pre-formatted value, e.g. "+12.4%" or "-3 dagar". */
  value: string;
  positive?: boolean;
  /** Trailing label, e.g. "vs föregående period". */
  label?: string;
}

export type KpiInsight = string | { text: string; tone?: "ai" | "rule" };

export interface ReportKpiCardProps {
  label: string;
  /** Numeric value (auto-compacted to "mkr" >= 1M) OR a pre-formatted string / JSX. */
  value: number | string | React.ReactNode;
  subtext?: string;
  icon?: LucideIcon;
  /** Icon-chip color. Backwards-compat alias of `accent`. */
  variant?: KpiVariant;
  /** Icon-chip color (preferred). Falls back to `variant` then "default". */
  accent?: KpiAccent;
  /** Surface tone for status (neutral/positive/negative/warning). */
  tone?: KpiTone;
  /** Semantic shortcut → auto-mapped accent + default icon (revenue/cost/profit/asset/...) */
  kind?: KpiKind;
  /** Trend chip rendered in the bottom zone. */
  trend?: KpiTrend;
  /** Period/comparison label, e.g. "vs föregående månad". Replaces trend.label if both. */
  compareLabel?: string;
  /** Micro-insight (AI- or rule-driven), 1 line, truncated. */
  insight?: KpiInsight;
  /** Optional mini sparkline rendered behind the icon-chip. */
  sparkline?: number[];
  active?: boolean;
  onClick?: () => void;
  /** Drill-down route. If set, card becomes clickable and shows hover arrow. */
  drillTo?: string;
}

const KIND_ICON: Record<KpiKind, LucideIcon> = {
  revenue: TrendingUp,
  cost: TrendingDown,
  profit: Target,
  asset: Wallet,
  liability: Scale,
  neutral: CircleDot,
};

const Sparkline = ({ points, strokeClass }: { points: number[]; strokeClass: string }) => {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 64;
  const h = 28;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      className="absolute top-3 right-12 opacity-40 pointer-events-none"
      aria-hidden="true"
    >
      <path d={path} fill="none" strokeWidth="1.5" className={strokeClass} />
    </svg>
  );
};

/**
 * Premium KPI card v3 — the canonical KPI primitive.
 *
 * Layers (top → bottom):
 *  1. Label + icon-chip (+ optional sparkline)
 *  2. Value (auto-compact, truncate, full value in tooltip)
 *  3. Insight (AI- or rule-driven, optional)
 *  4. Trend chip + compare label + drill-down arrow (optional)
 *
 * @example
 * <ReportKpiCard
 *   label="Intäkter" value={1_245_000} kind="revenue"
 *   trend={{ value: "+12.4%", positive: true }} compareLabel="vs föregående månad"
 *   insight="Drivet av ökad fakturering"
 *   drillTo="/reports/revenue" />
 */
export const ReportKpiCard = ({
  label,
  value,
  subtext,
  icon: iconProp,
  variant,
  accent,
  tone,
  kind,
  trend,
  compareLabel,
  insight,
  sparkline,
  active,
  onClick,
  drillTo,
}: ReportKpiCardProps) => {
  const navigate = useNavigate();

  // Resolve numeric value for formatting + profit-tone inference
  const numericValue = typeof value === "number" ? value : null;

  // Resolve display string
  let display: React.ReactNode;
  let tooltip: string | undefined;
  if (typeof value === "number") {
    display = formatCompactSEK(value);
    tooltip = formatFullSEK(value);
  } else if (typeof value === "string") {
    display = value;
  } else {
    display = value; // JSX — render as-is
  }

  // Apply kind defaults (only if explicit prop not set)
  const kindDef = kind ? KIND_DEFAULTS[kind] : null;
  const accentKey: KpiAccent = accent ?? variant ?? kindDef?.accent ?? "default";

  // Resolve tone — explicit > kind > neutral. profit auto-flips on negative numbers.
  let resolvedTone: KpiTone = tone ?? kindDef?.tone ?? "neutral";
  if (kind === "profit" && numericValue !== null) {
    if (numericValue > 0) resolvedTone = tone ?? "positive";
    else if (numericValue < 0) resolvedTone = tone ?? "negative";
    else resolvedTone = tone ?? "neutral";
  }

  const Icon = iconProp ?? (kind ? KIND_ICON[kind] : undefined);
  const accentStyle = ACCENT_STYLES[accentKey];
  const toneStyle = TONE_STYLES[resolvedTone];

  // Normalize insight
  const insightObj = insight
    ? typeof insight === "string"
      ? { text: insight, tone: "ai" as const }
      : { text: insight.text, tone: insight.tone ?? "ai" }
    : null;

  // Click handler — drillTo wins, falls back to onClick
  const isClickable = Boolean(drillTo || onClick);
  const handleClick = () => {
    if (drillTo) navigate(drillTo);
    else if (onClick) onClick();
  };

  const Wrapper: React.ElementType = isClickable ? "button" : "div";

  // Compare label resolution: compareLabel prop > trend.label
  const trailingLabel = compareLabel ?? trend?.label;

  return (
    <Wrapper
      type={isClickable ? "button" : undefined}
      onClick={isClickable ? handleClick : undefined}
      title={tooltip}
      className={cn(
        "group relative w-full text-left overflow-hidden",
        "rounded-ds-card border-0.5",
        toneStyle.surface,
        toneStyle.border,
        "px-4 py-3 min-h-[120px] flex flex-col justify-between gap-2",
        "transition-colors duration-150",
        isClickable && "cursor-pointer hover:bg-ds-surface-raised",
        active && "border-ds-deep bg-ds-surface-raised",
      )}
    >
      {sparkline && <Sparkline points={sparkline} strokeClass={accentStyle.stroke} />}

      {/* Top zone — label + icon */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <span
          title={label}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 truncate min-w-0 flex-1"
        >
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "rounded-lg w-7 h-7 flex items-center justify-center shrink-0 relative z-10",
              accentStyle.bg,
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", accentStyle.fg)} />
          </span>
        )}
      </div>

      {/* Value zone */}
      <div className="min-w-0">
        <p className="report-numeric text-[22px] md:text-[24px] font-medium tracking-tight text-ds-text dark:text-slate-50 leading-none truncate tabular-nums">
          {display}
        </p>
      </div>

      {/* Insight zone (optional) */}
      {insightObj && (
        <div className="flex items-center gap-1.5 min-w-0" title={insightObj.text}>
          {insightObj.tone === "ai" ? (
            <Sparkles className="w-3 h-3 shrink-0 text-[#3b82f6] dark:text-[#1E3A5F]" />
          ) : (
            <Info className="w-3 h-3 shrink-0 text-slate-500 dark:text-slate-400" />
          )}
          <span
            className={cn(
              "text-[11px] truncate min-w-0",
              insightObj.tone === "ai"
                ? "text-[#3b82f6] dark:text-[#3b82f6]"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            {insightObj.text}
          </span>
        </div>
      )}

      {/* Bottom zone — trend + compare label + drill arrow */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
          {trend ? (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium px-2 py-0.5 rounded-full shrink-0 tabular-nums",
                  trend.positive ? toneStyle.trendPositive : toneStyle.trendNegative,
                )}
              >
                {trend.positive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {trend.value}
              </span>
              {trailingLabel && (
                <span className="text-slate-500 dark:text-slate-400 truncate min-w-0">
                  {trailingLabel}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400 truncate min-w-0">
              {subtext ?? compareLabel ?? "Aktuell period"}
            </span>
          )}
        </div>

        {isClickable && (
          <ArrowUpRight
            className="w-3.5 h-3.5 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
        )}
      </div>
    </Wrapper>
  );
};
