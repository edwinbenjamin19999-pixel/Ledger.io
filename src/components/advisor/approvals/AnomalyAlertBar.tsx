import { AlertTriangle, Sparkles } from "lucide-react";
import type { ApprovalAnomaly } from "@/hooks/useApprovalAnomalies";

export function AnomalyAlertBar({ anomalies }: { anomalies: ApprovalAnomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <div
        className="rounded-3xl px-5 py-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, hsl(var(--brand-primary) / 0.06), transparent)",
          border: "1px solid hsl(var(--brand-primary) / 0.15)",
        }}
      >
        <div
          className="h-9 w-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(var(--brand-primary) / 0.12)" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--brand-primary))" }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#0F172A]">Inga avvikelser upptäckta</div>
          <div className="text-xs text-[#64748B] mt-0.5">
            AI har granskat alla väntande godkännanden mot föregående period — allt ser normalt ut.
          </div>
        </div>
      </div>
    );
  }

  const critical = anomalies.filter((a) => a.severity === "critical");
  const warnings = anomalies.filter((a) => a.severity === "warning");
  const headline = critical.length
    ? `${critical.length} kritisk${critical.length === 1 ? "" : "a"} avvikelse${critical.length === 1 ? "" : "r"}`
    : `${warnings.length} avvikelse${warnings.length === 1 ? "" : "r"} att granska`;
  const tone = critical.length > 0
    ? { ring: "ring-rose-200", bg: "bg-[#FCE8E8]", icon: "text-[#7A1A1A]", iconBg: "bg-[#FCE8E8]" }
    : { ring: "ring-amber-200", bg: "bg-[#FAEEDA]", icon: "text-[#7A5417]", iconBg: "bg-[#FAEEDA]" };

  return (
    <div className={`rounded-3xl px-5 py-4 ring-1 ${tone.ring} ${tone.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${tone.iconBg}`}>
          <AlertTriangle className={`h-4 w-4 ${tone.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#0F172A]">{headline}</div>
          <div className="text-xs text-[#64748B] mt-0.5">
            AI jämförde med föregående period. Granska innan godkännande.
          </div>
          <ul className="mt-2 space-y-1">
            {anomalies.slice(0, 4).map((a) => (
              <li key={a.requestId} className="text-xs text-[#0F172A]">
                <span className="font-semibold">{a.title}</span>
                <span className="text-[#64748B]"> — {a.detail}</span>
              </li>
            ))}
            {anomalies.length > 4 && (
              <li className="text-[11px] text-[#94A3B8]">+{anomalies.length - 4} fler…</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
