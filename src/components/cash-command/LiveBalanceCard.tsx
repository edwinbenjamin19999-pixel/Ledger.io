import { useEffect, useRef, useState } from "react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  balance: number;
  runwayDays: number | null;
  netFlow30d: number;
  burnRateMonthly: number;
  isStale?: boolean;
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString("sv-SE") + " kr";

export function LiveBalanceCard({ balance, runwayDays, netFlow30d, burnRateMonthly, isStale }: Props) {
  const [flash, setFlash] = useState(false);
  const prevBalance = useRef(balance);

  useEffect(() => {
    if (prevBalance.current !== balance) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 800);
      prevBalance.current = balance;
      return () => clearTimeout(t);
    }
  }, [balance]);

  const isNegative = balance < 0;
  const lowRunway = runwayDays !== null && runwayDays < 60;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 transition-all duration-300",
        flash && "ring-2 ring-[#3b82f6]/60 shadow-[0_0_24px_rgba(37,99,235,0.25)]",
        isNegative && "ring-2 ring-rose-500/60",
        lowRunway && !isNegative && "ring-1 ring-amber-400/50",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#EFF6FF] border border-[#C8DDF5]">
            <Wallet className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Likvid kassa</div>
            <div className="text-[10px] text-muted-foreground/70">
              {isStale ? "Senast kända saldo" : "Live · uppdaterad nyss"}
            </div>
          </div>
        </div>
        {!isStale && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E1F5EE] text-[#085041] font-medium">
            ● LIVE
          </span>
        )}
      </div>

      <div className={cn(
        "text-3xl font-bold tabular-nums tracking-tight transition-colors",
        isNegative ? "text-[#7A1A1A]" : "text-foreground",
      )}>
        {fmt(balance)}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Runway</div>
          <div className={cn(
            "text-sm font-semibold tabular-nums",
            runwayDays === null ? "text-muted-foreground" : lowRunway ? "text-[#7A5417]" : "text-foreground",
          )}>
            {runwayDays === null ? "—" : `${runwayDays} dgr`}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Netto 30d</div>
          <div className={cn(
            "text-sm font-semibold tabular-nums flex items-center gap-1",
            netFlow30d >= 0 ? "text-[#085041]" : "text-[#7A1A1A]",
          )}>
            {netFlow30d >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmt(Math.abs(netFlow30d))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Burn/mån</div>
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {fmt(burnRateMonthly)}
          </div>
        </div>
      </div>
    </div>
  );
}
