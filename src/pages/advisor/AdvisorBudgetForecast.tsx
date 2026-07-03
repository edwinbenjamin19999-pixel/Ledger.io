import { useMemo, useState } from "react";
import {
  useFirmBudgetForecast,
  reshapeView,
  type ForecastView,
  type ScenarioMode,
  type ClientForecastRow,
} from "@/hooks/useFirmBudgetForecast";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { BudgetForecastChart } from "@/components/advisor/budget/BudgetForecastChart";
import { ClientDrilldownDialog } from "@/components/advisor/budget/ClientDrilldownDialog";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  LineChart as LineChartIcon,
  Layers,
  Sigma,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CARD: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(15,23,42,0.06)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
};

const VIEWS: { key: ForecastView; label: string }[] = [
  { key: "monthly", label: "Månad" },
  { key: "quarterly", label: "Kvartal" },
  { key: "ytd", label: "YTD" },
  { key: "rolling12", label: "Rullande 12" },
];

const SCENARIOS: { key: ScenarioMode; label: string; tone: string }[] = [
  { key: "pessimistic", label: "Pessimistisk", tone: "text-[#7A1A1A]" },
  { key: "base", label: "Bas", tone: "text-[hsl(var(--brand-primary))]" },
  { key: "optimistic", label: "Optimistisk", tone: "text-[#085041]" },
];

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

const AdvisorBudgetForecast = () => {
  const { clients, isLoading: ctxLoading } = useAdvisorContext();
  const [view, setView] = useState<ForecastView>("monthly");
  const [scenario, setScenario] = useState<ScenarioMode>("base");
  const [year] = useState(new Date().getFullYear());
  const [level, setLevel] = useState<"firm" | "clients">("firm");
  const [drilldown, setDrilldown] = useState<ClientForecastRow | null>(null);

  const { data, isLoading } = useFirmBudgetForecast({ scenario, year });

  const chartData = useMemo(() => {
    if (!data) return [];
    return reshapeView(data.aggregated, view);
  }, [data, view]);

  const overloaded = data?.clients.filter((c) => c.riskLevel === "high").length ?? 0;
  const opportunity = data?.clients.filter((c) => c.variancePct > 5).length ?? 0;

  if (ctxLoading || isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-[360px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (clients.length === 0 || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="rounded-3xl p-12 text-center" style={CARD}>
          <LineChartIcon className="h-10 w-10 mx-auto text-[#CBD5E1] mb-3" />
          <h2 className="text-lg font-semibold text-[#0F172A] mb-1">Ingen budgetdata</h2>
          <p className="text-sm text-[#64748B]">
            Lägg till klienter och budgetar i klientvyn för att aktivera prognosmotorn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
            Budget & Prognos
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">
            Prognosmotor — flera klienter
          </h1>
          <p className="text-[#64748B] mt-1.5">
            {clients.length} klienter · {year} · scenario:{" "}
            <span className="font-semibold text-[#0F172A]">
              {SCENARIOS.find((s) => s.key === scenario)?.label}
            </span>
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile icon={Sigma} label="Budget" value={fmtSEK(data.totals.budget)} />
        <KpiTile icon={Layers} label="Utfall (YTD)" value={fmtSEK(data.totals.actual)} />
        <KpiTile
          icon={LineChartIcon}
          label="Prognos helår"
          value={fmtSEK(data.totals.forecast)}
          tone="info"
        />
        <KpiTile
          icon={data.totals.variance >= 0 ? TrendingUp : TrendingDown}
          label="Avvikelse"
          value={`${data.totals.variance >= 0 ? "+" : ""}${data.totals.variancePct.toFixed(1)}%`}
          tone={data.totals.variance >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <Toggle
          value={view}
          onChange={(v) => setView(v as ForecastView)}
          options={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        />
        <Toggle
          value={level}
          onChange={(v) => setLevel(v as "firm" | "clients")}
          options={[
            { key: "firm", label: "Aggregerat" },
            { key: "clients", label: "Per klient" },
          ]}
        />
        <div className="ml-auto flex items-center gap-2 rounded-xl bg-[#F1F5F9] p-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => setScenario(s.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                scenario === s.key
                  ? `bg-white shadow-sm ${s.tone}`
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-3xl p-6" style={CARD}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">
              Utfall vs Prognos vs Budget
            </p>
            <h2 className="text-base font-semibold text-[#0F172A] mt-0.5">
              {VIEWS.find((v) => v.key === view)?.label} · {year}
            </h2>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8]">
            Klicka i grafen för att drilla
          </span>
        </div>
        <BudgetForecastChart data={chartData} />
      </div>

      {/* AI insights strip */}
      <div className="rounded-3xl p-5" style={CARD}>
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#0F1F3D] flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#0F172A]">AI-prognos & scenarioanalys</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Trailing 3-månaders utfall blandas med budget och scenariomultiplier
              (intäkt/kostnad). {overloaded > 0 && `${overloaded} klient(er) ligger >15% under budget. `}
              {opportunity > 0 && `${opportunity} klient(er) presterar över budget.`}
            </p>
          </div>
        </div>
      </div>

      {/* Client variance table */}
      <div className="rounded-3xl overflow-hidden" style={CARD}>
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">
              Klientnivå
            </p>
            <h2 className="text-base font-semibold text-[#0F172A] mt-0.5">
              Budget · Prognos · Avvikelse
            </h2>
          </div>
          <span className="text-xs text-[#64748B]">{data.clients.length} klienter</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">
              <tr>
                <th className="px-6 py-3 text-left">Klient</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Utfall</th>
                <th className="px-4 py-3 text-right">Prognos</th>
                <th className="px-4 py-3 text-right">Avvikelse</th>
                <th className="px-4 py-3 text-center">Risk</th>
                <th className="px-4 py-3 text-right">Drilla</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {data.clients.map((c) => (
                <tr
                  key={c.clientId}
                  className="hover:bg-[#F8FAFC] cursor-pointer"
                  onClick={() => setDrilldown(c)}
                >
                  <td className="px-6 py-3 font-medium text-[#0F172A]">{c.clientName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#0F172A]">
                    {fmtSEK(c.budgetTotal)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#0F172A]">
                    {fmtSEK(c.actualTotal)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#0F172A]">
                    {fmtSEK(c.forecastTotal)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-semibold ${
                      c.variance >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"
                    }`}
                  >
                    {c.variance >= 0 ? "+" : ""}
                    {c.variancePct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RiskPill level={c.riskLevel} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ArrowRight className="h-4 w-4 inline text-[#CBD5E1]" />
                  </td>
                </tr>
              ))}
              {data.clients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#94A3B8]">
                    Ingen klientdata för {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientDrilldownDialog
        open={!!drilldown}
        onClose={() => setDrilldown(null)}
        client={drilldown}
        view={view}
      />
    </div>
  );
};

const Toggle = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) => (
  <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1">
    {options.map((o) => (
      <button
        key={o.key}
        onClick={() => onChange(o.key)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
          value === o.key
            ? "bg-white shadow-sm text-[hsl(var(--brand-primary))]"
            : "text-[#64748B] hover:text-[#0F172A]"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const KpiTile = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "positive" | "negative" | "info";
}) => {
  const color =
    tone === "positive"
      ? "text-[#085041]"
      : tone === "negative"
      ? "text-[#7A1A1A]"
      : tone === "info"
      ? "text-[hsl(var(--brand-primary))]"
      : "text-[#0F172A]";
  return (
    <div className="rounded-2xl p-4" style={CARD}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#94A3B8]">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
};

const RiskPill = ({ level }: { level: "high" | "medium" | "low" }) => {
  const map = {
    high: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
    medium: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
    low: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  } as const;
  const label = level === "high" ? "Hög" : level === "medium" ? "Medel" : "Låg";
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${map[level]}`}
    >
      {label}
    </span>
  );
};

export default AdvisorBudgetForecast;
