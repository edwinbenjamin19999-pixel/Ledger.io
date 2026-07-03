import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

interface Props {
  net: number;
  priorNet: number;
  openingCash: number;
  closingCash: number;
  period: string;
  /** True if statement reconciles (|cashUb - cashIb - net| <= 1) */
  reconciles: boolean;
}

/**
 * Compact compliance-style header strip.
 * One row: Net · Trend · Status · Period · Opening/Closing.
 * No KPI cards, no tinted backgrounds.
 */
export const CashflowReportHeader = ({
  net,
  priorNet,
  openingCash,
  closingCash,
  period,
  reconciles,
}: Props) => {
  const delta = net - priorNet;
  const trendUp = delta > 0;
  const trendFlat = Math.abs(delta) < 0.5;
  const TrendIcon = trendFlat ? Minus : trendUp ? TrendingUp : TrendingDown;
  const trendLabel = trendFlat ? "Oförändrat" : trendUp ? "Positivt" : "Negativt";
  const statusOk = reconciles && Math.abs(net) > 0;

  return (
    <div className="border-b border-slate-200 pb-4">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        {/* Left — primary verdict */}
        <div className="flex items-baseline gap-6 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Netto kassaflöde
            </div>
            <div
              className={cn(
                "text-3xl font-semibold tabular-nums mt-0.5",
                net < 0 ? "text-[#7A1A1A]" : "text-slate-900",
              )}
            >
              {net >= 0 ? "+" : ""}
              {formatSEK(net)}
            </div>
          </div>

          <div className="flex items-center gap-2 pb-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                trendFlat
                  ? "text-slate-500"
                  : trendUp
                    ? "text-[#085041]"
                    : "text-[#7A1A1A]",
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {trendLabel}
            </span>
            <span className="text-slate-300">·</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border",
                statusOk
                  ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]"
                  : "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  statusOk ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              {statusOk ? "OK" : "Behöver granskas"}
            </span>
          </div>
        </div>

        {/* Right — opening/closing as discreet subtitles */}
        <div className="flex items-end gap-8 text-right">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              IB likvida medel
            </div>
            <div className="text-sm tabular-nums text-slate-700 mt-0.5">
              {formatSEK(openingCash)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              UB likvida medel
            </div>
            <div className="text-sm tabular-nums text-slate-900 font-semibold mt-0.5">
              {formatSEK(closingCash)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Period: <span className="text-slate-700">{period}</span>{" "}
        <span className="text-slate-300">·</span> K2 direkt metod
      </div>
    </div>
  );
};
