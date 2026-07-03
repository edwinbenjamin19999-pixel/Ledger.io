import { AlertCircle, TrendingUp, Mail, Clock, ShieldAlert, ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  totalOverdue: number;
  recoveredThisMonth: number;
  recoveryRate: number;
  remindersSentThisWeek: number;
  avgDaysOverdue: number;
  atRiskRevenue?: number;
  // Optional trend data — pass previous-period values to compute deltas
  prevOverdue?: number;
  prevRecovered?: number;
}

interface KPI {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent: string; // border + icon color tone
  iconColor: string;
  trend?: { delta: number; positiveIsGood: boolean; interpretation: string };
}

const NeutralKPICard = ({ kpi }: { kpi: KPI }) => {
  const t = kpi.trend;
  const isPositiveDelta = t && t.delta > 0;
  const isGood = t ? (t.positiveIsGood ? isPositiveDelta : !isPositiveDelta) && Math.abs(t.delta) > 1 : false;
  const isBad = t ? (t.positiveIsGood ? !isPositiveDelta : isPositiveDelta) && Math.abs(t.delta) > 1 : false;
  const TrendIcon = !t || Math.abs(t.delta) < 1 ? Minus : isPositiveDelta ? ArrowUp : ArrowDown;

  return (
    <div
      className={cn(
        "relative bg-ds-surface rounded-ds-card border-0.5 border-ds-border border-l-2 p-4 transition-colors hover:bg-ds-surface-raised",
        kpi.accent
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ds-text-secondary">{kpi.label}</span>
        <kpi.icon className={cn("h-3.5 w-3.5", kpi.iconColor)} />
      </div>
      <div className="text-[22px] font-medium text-ds-text tabular-nums tracking-tight leading-none">{kpi.value}</div>
      <p className="text-xs text-ds-text-secondary mt-2">{kpi.sub}</p>
      {t && (
        <div className="mt-2.5 pt-2.5 border-t border-0.5 border-ds-border flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded",
              isGood ? "bg-ds-success/10 text-ds-success" : isBad ? "bg-ds-danger/10 text-ds-danger" : "bg-ds-surface-raised text-ds-text-secondary"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(t.delta)}%
          </span>
          <span className="text-[11px] text-ds-text-secondary truncate">{t.interpretation}</span>
        </div>
      )}
    </div>
  );
};

export const ARHeroKPI = ({
  totalOverdue,
  recoveredThisMonth,
  recoveryRate,
  remindersSentThisWeek,
  avgDaysOverdue,
  atRiskRevenue = 0,
  prevOverdue,
  prevRecovered,
}: Props) => {
  const overdueDelta = prevOverdue && prevOverdue > 0 ? Math.round(((totalOverdue - prevOverdue) / prevOverdue) * 100) : 0;
  const recoveredDelta = prevRecovered && prevRecovered > 0 ? Math.round(((recoveredThisMonth - prevRecovered) / prevRecovered) * 100) : 0;

  const cards: KPI[] = [
    {
      label: "Totalt utestående",
      value: `${fmt(totalOverdue)} kr`,
      sub: "Förfallna kundfordringar",
      icon: AlertCircle,
      accent: "border-l-rose-500",
      iconColor: "text-[#7A1A1A]",
      trend: prevOverdue !== undefined
        ? {
            delta: overdueDelta,
            positiveIsGood: false,
            interpretation: overdueDelta > 5 ? "ökande risk" : overdueDelta < -5 ? "på rätt väg" : "stabil nivå",
          }
        : undefined,
    },
    {
      label: "Återvunnet denna månad",
      value: `${fmt(recoveredThisMonth)} kr`,
      sub: `${recoveryRate}% framgångsgrad`,
      icon: TrendingUp,
      accent: "border-l-emerald-500",
      iconColor: "text-[#085041]",
      trend: prevRecovered !== undefined
        ? {
            delta: recoveredDelta,
            positiveIsGood: true,
            interpretation: recoveredDelta > 5 ? "förbättring vs förra månaden" : recoveredDelta < -5 ? "minskning vs förra månaden" : "stabil takt",
          }
        : undefined,
    },
    {
      label: "AI-påminnelser",
      value: `${remindersSentThisWeek}`,
      sub: "Skickade denna vecka",
      icon: Mail,
      accent: "border-l-[#3b82f6]",
      iconColor: "text-[#3b82f6]",
    },
    {
      label: "Medelålder fordring",
      value: `${avgDaysOverdue} dagar`,
      sub: "Genomsnittlig fordringålder",
      icon: Clock,
      accent: "border-l-amber-500",
      iconColor: "text-[#7A5417]",
    },
    {
      label: "Hotad intäkt",
      value: `${fmt(atRiskRevenue)} kr`,
      sub: "Förfallen >60 dagar",
      icon: ShieldAlert,
      accent: "border-l-rose-500",
      iconColor: "text-[#7A1A1A]",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {cards.map((kpi) => (
        <NeutralKPICard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
};
