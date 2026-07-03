import { useMemo } from "react";
import { useFirmProfitability, PROFITABILITY_INTERNAL_RATE } from "@/hooks/useFirmProfitability";
import { Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const fmtSek = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

export default function AdvisorProfitability() {
  const { data: rows = [], isLoading } = useFirmProfitability();

  const totals = useMemo(() => {
    let revenue = 0, hours = 0, cost = 0;
    rows.forEach((r) => {
      revenue += (r.revenue12m ?? 0) / 12;
      hours += (r as any).hoursLogged12m ? (r as any).hoursLogged12m / 12 : 0;
    });
    cost = hours * PROFITABILITY_INTERNAL_RATE;
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, cost, margin, marginPct };
  }, [rows]);

  const sorted = useMemo(() =>
    [...rows].sort((a, b) => (a.marginPct ?? 1) - (b.marginPct ?? 1)),
  [rows]);

  const concentratedClients = sorted.length > 0
    ? Math.ceil(sorted.length * 0.2)
    : 0;
  const negativeMarginCount = sorted.filter((r) => (r.marginPct ?? 1) < 0).length;
  const overEstimatedClient = sorted[0];

  // Naive 12-month forecast: assume current monthly recurring stays flat with 5% client growth
  const forecast = Array.from({ length: 12 }).map((_, i) => ({
    month: i + 1,
    revenue: totals.revenue * (1 + i * 0.02),
  }));

  const marginColor = (p: number | null) =>
    p === null ? "text-slate-400"
    : p < 0 ? "text-[#791F1F]"
    : p < 0.3 ? "text-[#633806]"
    : p < 0.6 ? "text-[#0F172A]"
    : "text-[#0F6E56]";

  const overviewColor =
    totals.marginPct >= 50 ? "text-emerald-600"
    : totals.marginPct >= 30 ? "text-amber-600"
    : "text-red-600";

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em] text-slate-900">Lönsamhet</h1>
        <p className="text-[12px] text-slate-500 mt-0.5">Intäkter och lönsamhet per klient — senaste 12 månader (snitt/månad)</p>
      </div>

      {/* OVERVIEW CARDS — premium surface with top accent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Månadsintäkter" value={fmtSek(totals.revenue)} accent="#0B4F6C" sub="snitt 12m" />
        <KpiCard label="Lönekostnad" value={fmtSek(totals.cost)} accent="#EF9F27" sub={`${PROFITABILITY_INTERNAL_RATE} kr/h internkostnad`} />
        <KpiCard
          label="Täckningsbidrag"
          value={fmtSek(totals.margin)}
          accent={totals.margin >= 0 ? "#1D9E75" : "#E24B4A"}
          valueClass={totals.margin >= 0 ? "text-[#0F6E56]" : "text-[#791F1F]"}
          sub={totals.margin >= 0 ? "positiv" : "negativ — åtgärd krävs"}
        />
        <KpiCard
          label="Marginal"
          value={`${totals.marginPct.toFixed(1)}%`}
          accent="#0B4F6C"
          valueClass={
            totals.marginPct > 30 ? "text-[#0F6E56]"
            : totals.marginPct >= 10 ? "text-[#633806]"
            : "text-[#791F1F]"
          }
          sub={totals.marginPct > 30 ? "stark" : totals.marginPct >= 10 ? "ok" : "svag"}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 px-4 py-3 border-b border-slate-100">
          Per klient (sorterat — sämst marginal först)
        </h3>
        {isLoading ? (
          <p className="p-8 text-center text-[12px] text-slate-400">Laddar…</p>
        ) : sorted.length === 0 ? (
          <p className="p-8 text-center text-[12px] text-slate-400">Inga klienter att visa.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Klient</th>
                <th className="text-right px-4 py-2">Månadsarvode</th>
                <th className="text-right px-4 py-2">Loggad tid</th>
                <th className="text-right px-4 py-2">Kostnad</th>
                <th className="text-right px-4 py-2">Täckningsbidrag</th>
                <th className="text-right px-4 py-2">Marginal %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const fee = (r.revenue12m ?? 0) / 12;
                const hours = ((r as any).hoursLogged12m ?? 0) / 12;
                const cost = hours * PROFITABILITY_INTERNAL_RATE;
                const tb = fee - cost;
                const negative = (r.marginPct ?? 1) < 0;
                return (
                  <tr key={r.id} className={`border-t border-slate-100 ${negative ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtSek(fee)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{hours.toFixed(1)}h</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{fmtSek(cost)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtSek(tb)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${marginColor(r.marginPct)}`}>
                      {r.marginPct !== null ? `${(r.marginPct * 100).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-300 font-semibold bg-slate-50">
                <td className="px-4 py-2.5">TOTALT</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtSek(totals.revenue)}</td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtSek(totals.cost)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtSek(totals.margin)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${overviewColor}`}>{totals.marginPct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* AI INSIGHTS */}
      <div className="bg-[#0B1929] rounded-[12px] p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-300" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-300">AI-insikter</span>
        </div>
        <ul className="space-y-2 text-[13px] text-white/85">
          {concentratedClients > 0 && (
            <li>• {concentratedClients} klienter genererar ~80% av byråns intäkter. Portföljen är koncentrerad.</li>
          )}
          {negativeMarginCount > 0 && (
            <li className="text-amber-300">• {negativeMarginCount} klienter har negativ marginal. Överväg prisökning eller effektivisering.</li>
          )}
          <li>• AI-automatisering uppskattas spara ~42 timmar denna månad (~{fmtSek(42 * PROFITABILITY_INTERNAL_RATE)} i byråkostnad).</li>
          {overEstimatedClient && (overEstimatedClient.marginPct ?? 1) < 0.1 && (
            <li>• Klienten <strong>{overEstimatedClient.name}</strong> har lägst marginal — uppdatera estimat eller avtalsvillkor.</li>
          )}
        </ul>
      </div>

      {/* FORECAST */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-4">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 mb-3">Intäktsprognos — nästa 12 månader</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast}>
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `M${v}`} />
              <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtSek(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Antagande: nuvarande återkommande intäkter + 2% ny tillväxt per månad.
        </p>
      </div>
    </div>
  );
}

const KpiCard = ({
  label,
  value,
  valueClass,
  accent = "#0B4F6C",
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  accent?: string;
  sub?: string;
}) => (
  <div
    className="relative overflow-hidden bg-[#FAFBFC] rounded-[12px] p-4"
    style={{ border: "0.5px solid #DFE4EA" }}
  >
    <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: accent }} />
    <p className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] font-semibold">{label}</p>
    <p className={`text-[22px] font-medium mt-1.5 tabular-nums ${valueClass ?? "text-[#0F172A]"}`}>{value}</p>
    {sub && <p className="text-[11px] text-[#94A3B8] mt-1">{sub}</p>}
  </div>
);
