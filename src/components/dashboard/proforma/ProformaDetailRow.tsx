import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForecastPoint } from "./useProformaInsights";

interface Props {
  data: ForecastPoint;
  isRisk: boolean;
  highlighted?: boolean;
}

export const ProformaDetailRow = ({ data, isRisk, highlighted }: Props) => {
  const margin =
    data.predicted_income > 0
      ? (data.predicted_result / data.predicted_income) * 100
      : 0;

  return (
    <div
      data-period={data.period}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all",
        isRisk
          ? "border-rose-200/60 bg-rose-50/30"
          : "border-slate-200/60 bg-white hover:bg-slate-50/60",
        highlighted && "ring-2 ring-[#3b82f6] ring-offset-2",
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {isRisk && (
          <AlertTriangle className="w-4 h-4 text-[#7A1A1A] shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <div className="font-semibold text-slate-900">{data.period}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Säkerhet: {(data.confidence * 100).toFixed(0)}%
            {data.seasonal_factor !== undefined &&
              ` • Säsongsfaktor: ${data.seasonal_factor.toFixed(2)}×`}
            {` • Marginal: ${margin.toFixed(0)}%`}
          </div>
        </div>
      </div>
      <div className="flex gap-6 text-sm shrink-0">
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Intäkter</div>
          <div className="font-semibold tabular-nums text-slate-900">
            {data.predicted_income.toLocaleString("sv-SE")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Kostnader</div>
          <div className="font-semibold tabular-nums text-slate-700">
            {data.predicted_expenses.toLocaleString("sv-SE")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Resultat</div>
          <div
            className={cn(
              "font-bold tabular-nums",
              data.predicted_result >= 0 ? "text-[#3b82f6]" : "text-[#7A1A1A]",
            )}
          >
            {data.predicted_result >= 0 ? "+" : ""}
            {data.predicted_result.toLocaleString("sv-SE")}
          </div>
        </div>
      </div>
    </div>
  );
};
