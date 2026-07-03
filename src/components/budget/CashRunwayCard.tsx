import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, Clock } from "lucide-react";

interface CashRunwayCardProps {
  cash: number[];
  netResult: number[];
}

function formatSEK(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("sv-SE", { style: "decimal", maximumFractionDigits: 0 }).format(v) + " kr";
}

export function CashRunwayCard({ cash, netResult }: CashRunwayCardProps) {
  const currentMonth = new Date().getMonth();
  const currentCash = cash[currentMonth] || cash[11] || 0;

  // Calculate burn rate from negative months
  const negativeMonths = netResult.filter(v => v < 0);
  const avgBurn = negativeMonths.length > 0 ? Math.abs(negativeMonths.reduce((a, b) => a + b, 0) / negativeMonths.length) : 0;
  const runway = avgBurn > 0 ? Math.round(currentCash / avgBurn) : currentCash > 0 ? 99 : 0;

  let gradient: string;
  let label: string;
  let Icon = Shield;

  if (runway > 12 || (avgBurn === 0 && currentCash > 0)) {
    gradient = "from-emerald-600 to-green-700";
    label = "Kassaposition stark";
    Icon = Shield;
  } else if (runway >= 6) {
    gradient = "from-[#3b82f6] to-[#3b82f6]";
    label = `${runway} månader kvar`;
    Icon = Clock;
  } else if (runway >= 3) {
    gradient = "from-amber-500 to-orange-500";
    label = `⚠ ${runway} månader kvar — planera finansiering`;
    Icon = AlertTriangle;
  } else {
    gradient = "from-rose-600 to-red-700";
    label = `🚨 Kassabrist om ${runway} månader`;
    Icon = AlertTriangle;
  }

  return (
    <div className={cn(
      "bg-gradient-to-r rounded-2xl p-5 shadow-md relative overflow-hidden text-white",
      gradient,
      runway < 3 && "animate-pulse border border-rose-300"
    )}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-white/70" />
        <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Kassalikviditet</span>
      </div>
      <p className="text-2xl font-black mt-1 tabular-nums">{formatSEK(currentCash)}</p>
      <span className="text-white/60 text-xs">{label}</span>
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
    </div>
  );
}
