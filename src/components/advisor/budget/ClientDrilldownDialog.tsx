import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BudgetForecastChart } from "./BudgetForecastChart";
import { reshapeView, type ClientForecastRow, type ForecastView } from "@/hooks/useFirmBudgetForecast";
import { useNavigate } from "react-router-dom";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  client: ClientForecastRow | null;
  view: ForecastView;
}

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export const ClientDrilldownDialog = ({ open, onClose, client, view }: Props) => {
  const navigate = useNavigate();
  const { setActiveClient } = useAdvisorActiveClient();

  if (!client) return null;
  const series = reshapeView(client.monthly, view);
  const isPositive = client.variance >= 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8">
            <span className="text-base font-semibold text-[#0F172A]">{client.clientName}</span>
            <button
              onClick={() => {
                setActiveClient({ id: client.clientId, name: client.clientName });
                navigate("/budget");
              }}
              className="text-xs font-semibold text-[hsl(var(--brand-primary))] hover:underline flex items-center gap-1"
            >
              Öppna budget i klientvyn <ArrowRight className="h-3 w-3" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 mt-2">
          <Stat label="Budget" value={fmtSEK(client.budgetTotal)} />
          <Stat label="Utfall" value={fmtSEK(client.actualTotal)} />
          <Stat label="Prognos" value={fmtSEK(client.forecastTotal)} />
          <Stat
            label="Avvikelse"
            value={`${isPositive ? "+" : ""}${client.variancePct.toFixed(1)}%`}
            tone={isPositive ? "positive" : "negative"}
            icon={isPositive ? TrendingUp : TrendingDown}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-[#F1F5F9] p-4 bg-white">
          <BudgetForecastChart data={series} />
        </div>

        <div className="mt-2 max-h-[240px] overflow-y-auto rounded-xl border border-[#F1F5F9]">
          <table className="w-full text-xs">
            <thead className="bg-[#F8FAFC] text-[#94A3B8] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-bold">Period</th>
                <th className="px-3 py-2 text-right font-bold">Budget</th>
                <th className="px-3 py-2 text-right font-bold">Utfall</th>
                <th className="px-3 py-2 text-right font-bold">Prognos</th>
                <th className="px-3 py-2 text-right font-bold">Avvik %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {series.map((m) => (
                <tr key={m.period} className="text-[#0F172A]">
                  <td className="px-3 py-2 font-medium">{m.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtSEK(m.budget)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtSEK(m.actual)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtSEK(m.forecast)}</td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums font-semibold ${
                      m.variancePct >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"
                    }`}
                  >
                    {m.variancePct >= 0 ? "+" : ""}
                    {m.variancePct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  icon?: any;
}) => (
  <div className="rounded-2xl bg-[#F8FAFC] p-3">
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</div>
    <div
      className={`mt-1 text-base font-semibold tabular-nums flex items-center gap-1 ${
        tone === "positive" ? "text-[#085041]" : tone === "negative" ? "text-[#7A1A1A]" : "text-[#0F172A]"
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {value}
    </div>
  </div>
);
