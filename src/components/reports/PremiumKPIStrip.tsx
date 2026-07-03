/**
 * @deprecated Replaced by `UnifiedKPIHeader` in the unified Reports module.
 * Do not use in new code — kept temporarily for backwards compatibility.
 */
import { TrendingUp, TrendingDown, Activity, LayoutGrid, Scale, Wallet } from "lucide-react";
import { PremiumKPICard, KPIAccent } from "./PremiumKPICard";

export type ReportFilterKey = "revenue" | "costs" | "profit" | "assets" | "liabilities" | "balance" | null;

interface KPIDef {
  key: Exclude<ReportFilterKey, null>;
  label: string;
  value: number;
  accent: KPIAccent;
  icon: any;
  deltaPct?: number;
  subtitle?: string;
}

interface PremiumKPIStripProps {
  variant?: "income" | "balance" | "overview";
  revenue?: number;
  expenses?: number;
  netResult?: number;
  assets?: number;
  liabilities?: number;
  balanceDiff?: number;
  activeFilter?: ReportFilterKey;
  onFilterChange?: (key: ReportFilterKey) => void;
}

export const PremiumKPIStrip = ({
  variant = "overview",
  revenue = 0,
  expenses = 0,
  netResult = 0,
  assets = 0,
  liabilities = 0,
  balanceDiff = 0,
  activeFilter,
  onFilterChange,
}: PremiumKPIStripProps) => {
  const cards: KPIDef[] = [];

  if (variant === "overview" || variant === "income") {
    cards.push(
      { key: "revenue", label: "Intäkter", value: revenue, accent: "emerald", icon: TrendingUp },
      { key: "costs", label: "Kostnader", value: Math.abs(expenses), accent: "slate", icon: TrendingDown },
      {
        key: "profit",
        label: "Nettoresultat",
        value: netResult,
        accent: "profit",
        icon: Activity,
        subtitle: netResult > 0.005 ? "Vinst" : netResult < -0.005 ? "Förlust" : "Nollresultat",
      },
    );
  }

  if (variant === "overview") {
    cards.push({ key: "assets", label: "Tillgångar", value: assets, accent: "emerald", icon: LayoutGrid });
  }

  if (variant === "balance") {
    cards.push(
      { key: "assets", label: "Tillgångar", value: assets, accent: "emerald", icon: LayoutGrid },
      { key: "liabilities", label: "Skulder + EK", value: liabilities, accent: "slate", icon: Wallet },
      {
        key: "balance",
        label: "Balanskontroll",
        value: Math.abs(balanceDiff) <= 1 ? 0 : balanceDiff,
        accent: Math.abs(balanceDiff) <= 1 ? "emerald" : "rose",
        icon: Scale,
        subtitle: Math.abs(balanceDiff) <= 1 ? "Balanserad ✓" : "Differens",
      },
    );
  }

  const cols = cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <div className={`grid grid-cols-2 ${cols} gap-4`}>
      {cards.map((c) => (
        <PremiumKPICard
          key={c.key}
          label={c.label}
          value={c.value}
          accent={c.accent}
          icon={c.icon}
          subtitle={c.subtitle}
          deltaPct={c.deltaPct}
          active={activeFilter === c.key}
          onClick={onFilterChange ? () => onFilterChange(activeFilter === c.key ? null : c.key) : undefined}
        />
      ))}
    </div>
  );
};
