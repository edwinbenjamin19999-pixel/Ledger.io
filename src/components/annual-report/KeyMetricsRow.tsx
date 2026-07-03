import { ArrowDown, ArrowUp } from "lucide-react";

export interface MetricPill {
  label: string;
  value: string;
  changePct?: number; // vs föregående år
  tone?: "neutral" | "positive" | "negative";
  hint?: string;
}

export function KeyMetricsRow({ metrics }: { metrics: MetricPill[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {metrics.map((m, i) => {
        const showDelta = typeof m.changePct === "number" && isFinite(m.changePct);
        const up = (m.changePct ?? 0) >= 0;
        const valueColor =
          m.tone === "positive" ? "text-[#0F5132]" :
          m.tone === "negative" ? "text-[#842029]" :
          "text-[#0F172A]";
        return (
          <div
            key={i}
            className="bg-white rounded-[12px] px-[14px] py-[10px]"
            style={{ border: "0.5px solid #E2E8F0" }}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#64748B]">{m.label}</p>
            <p className={`text-[16px] font-medium tabular-nums mt-0.5 ${valueColor}`}>{m.value}</p>
            {showDelta ? (
              <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${up ? "text-[#0F5132]" : "text-[#842029]"}`}>
                {up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                {Math.abs(m.changePct!).toFixed(1)}% vs föreg. år
              </p>
            ) : m.hint ? (
              <p className="text-[10px] mt-0.5 text-[#94A3B8]">{m.hint}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
