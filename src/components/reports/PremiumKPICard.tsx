/**
 * @deprecated Use `ReportKpiCard` from `@/components/reports/shell/ReportKpiCard` directly.
 * This shim maps the legacy `PremiumKPICard` API to the unified card system.
 */
import { LucideIcon } from "lucide-react";
import { ReportKpiCard } from "./shell/ReportKpiCard";
import type { KpiAccent, KpiTone } from "./shell/kpiTokens";

export type KPIAccent = "emerald" | "slate" | "rose" | "profit";

interface PremiumKPICardProps {
  label: string;
  value: number;
  accent: KPIAccent;
  icon?: LucideIcon;
  deltaPct?: number;
  deltaLabel?: string;
  active?: boolean;
  onClick?: () => void;
  sparkline?: number[];
  subtitle?: string;
}

export const PremiumKPICard = ({
  label,
  value,
  accent,
  icon,
  deltaPct,
  deltaLabel,
  active,
  onClick,
  sparkline,
  subtitle,
}: PremiumKPICardProps) => {
  const resolvedAccent: Exclude<KPIAccent, "profit"> =
    accent === "profit" ? (value >= 0 ? "emerald" : "rose") : accent;

  const accentMap: Record<Exclude<KPIAccent, "profit">, KpiAccent> = {
    emerald: "emerald",
    slate: "slate",
    rose: "rose",
  };

  let tone: KpiTone = "neutral";
  if (accent === "profit") tone = value >= 0 ? "positive" : "negative";

  const hasDelta = typeof deltaPct === "number" && isFinite(deltaPct);
  const trend = hasDelta
    ? {
        value: `${deltaPct! >= 0 ? "+" : ""}${deltaPct!.toFixed(1)}%`,
        positive: deltaPct! >= 0,
        label: deltaLabel ?? "vs föregående period",
      }
    : undefined;

  return (
    <ReportKpiCard
      label={label}
      value={value}
      icon={icon}
      accent={accentMap[resolvedAccent]}
      tone={tone}
      trend={trend}
      sparkline={sparkline}
      subtext={!hasDelta ? subtitle : undefined}
      active={active}
      onClick={onClick}
    />
  );
};
