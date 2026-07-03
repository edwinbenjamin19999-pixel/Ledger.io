import { useMemo } from "react";
import { differenceInDays, parseISO, startOfDay, addDays, format } from "date-fns";
import { sv } from "date-fns/locale";
import { ArrowRight, Minus, Equal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  bankBalance: number;
  totalSelected: number;
  selectedCount: number;
  paymentDate: string;
  upcomingInvoices: { due_date: string; total_amount: number }[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function CashSimulationStrip({
  bankBalance, totalSelected, selectedCount, paymentDate, upcomingInvoices,
}: Props) {
  const cashAfter = bankBalance - totalSelected;
  const ratio = bankBalance > 0 ? cashAfter / bankBalance : 0;
  const tone = ratio > 0.3 ? "emerald" : ratio > 0.1 ? "amber" : "rose";

  const projection = useMemo(() => {
    const today = startOfDay(new Date());
    const series: { day: number; v: number }[] = [];
    let running = bankBalance;
    for (let d = 0; d < 7; d++) {
      const date = addDays(today, d);
      for (const inv of upcomingInvoices) {
        if (!inv.due_date) continue;
        const dd = differenceInDays(parseISO(inv.due_date), date);
        if (dd === 0) running -= inv.total_amount;
      }
      series.push({ day: d, v: Math.round(running) });
    }
    return series;
  }, [bankBalance, upcomingInvoices]);

  const minProjected = Math.min(...projection.map(p => p.v));
  const lowestRisk = minProjected < 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="sticky top-0 z-20 rounded-2xl border border-slate-100 bg-white/95 backdrop-blur shadow-sm px-5 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Trajectory */}
          <div className="flex items-center gap-2 text-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-baseline gap-1.5 cursor-help">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">Bank</span>
                  <span className="font-mono tabular-nums font-medium">{fmt(bankBalance)} kr</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Aktuellt banksaldo</TooltipContent>
            </Tooltip>

            <Minus className="h-3 w-3 text-slate-400" />

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-baseline gap-1.5 cursor-help">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">Valda</span>
                  <span className="font-mono tabular-nums font-medium text-slate-700">{fmt(totalSelected)} kr</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>{selectedCount} fakturor markerade för betalning {paymentDate}</TooltipContent>
            </Tooltip>

            <Equal className="h-3 w-3 text-slate-400" />

            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "inline-flex items-baseline gap-1.5 cursor-help",
                  tone === "emerald" && "text-[#085041]",
                  tone === "amber" && "text-[#7A5417]",
                  tone === "rose" && "text-[#7A1A1A]",
                )}>
                  <span className="text-[11px] uppercase tracking-wide opacity-70">Kassa efter</span>
                  <span className="font-mono tabular-nums font-semibold">{fmt(cashAfter)} kr</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Om du verkställer dessa betalningar {format(parseISO(paymentDate), "d MMM", { locale: sv })}: kassa {fmt(cashAfter)} kr
                {lowestRisk && ` · varning: lägsta projicerade saldo ${fmt(minProjected)} kr`}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-slate-500">7-dagars projektion</span>
            <div className="h-8 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection}>
                  <ReferenceLine y={0} stroke="hsl(0,0%,80%)" strokeDasharray="2 2" />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={lowestRisk ? "hsl(346,87%,55%)" : "hsl(189,94%,43%)"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
