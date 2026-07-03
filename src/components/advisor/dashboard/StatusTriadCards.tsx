import { AlertTriangle, ListChecks, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmApprovalQueue } from "@/hooks/useFirmApprovalQueue";
import { useAutomationStats } from "@/hooks/useAutomationStats";

interface CardWrapProps {
  tone: "rose" | "amber" | "emerald";
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: React.ReactNode;
  onClick: () => void;
}

const TONES = {
  rose: { dot: "bg-rose-500", border: "rgb(254,205,211)", iconBg: "bg-[#FCE8E8]", iconText: "text-[#7A1A1A]", chipBg: "bg-[#FCE8E8]", chipText: "text-[#7A1A1A]" },
  amber: { dot: "bg-amber-500", border: "rgb(253,230,138)", iconBg: "bg-[#FAEEDA]", iconText: "text-[#7A5417]", chipBg: "bg-[#FAEEDA]", chipText: "text-[#7A5417]" },
  emerald: { dot: "bg-emerald-500", border: "rgb(167,243,208)", iconBg: "bg-[#E1F5EE]", iconText: "text-[#085041]", chipBg: "bg-[#E1F5EE]", chipText: "text-[#085041]" },
} as const;

const StatCard = ({ tone, icon, label, value, sub, onClick }: CardWrapProps) => {
  const t = TONES[tone];
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-3xl bg-white p-5 transition-all hover:-translate-y-0.5"
      style={{
        border: `1px solid ${t.border}`,
        boxShadow: "0 12px 32px rgba(15,23,42,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${t.dot}`} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#64748B] font-bold">
            {label}
          </span>
        </div>
        <div className={`h-8 w-8 rounded-xl ${t.iconBg} ${t.iconText} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-[#0F172A] tabular-nums">{value}</div>
      <div className="mt-2 text-xs text-[#64748B] min-h-[16px]">{sub}</div>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity">
        Öppna <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
};

export const StatusTriadCards = () => {
  const navigate = useNavigate();
  const { clients } = useAdvisorContext();
  const { data: approvals = [] } = useFirmApprovalQueue();
  const companyIds = clients.map((c) => c.id);
  const { data: automation } = useAutomationStats(companyIds);

  // 🔴 Critical: high-urgency clients
  const critical = clients.filter((c) => c.urgency === "high");
  const top3 = critical.slice(0, 3).map((c) => c.name).join(", ");

  // 🟡 Tasks: bucket approvals by entity_type → friendly label
  const buckets = approvals.reduce<Record<string, number>>((acc, a) => {
    const t = a.entity_type?.toLowerCase() ?? "övrigt";
    let key = "Övrigt";
    if (t.includes("vat") || t.includes("moms")) key = "Moms";
    else if (t.includes("journal") || t.includes("verifik") || t.includes("entry")) key = "Bokföring";
    else if (t.includes("invoice") || t.includes("faktur")) key = "Fakturor";
    else if (t.includes("payroll") || t.includes("lon")) key = "Lön";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topBuckets = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        tone="rose"
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Kritiska idag"
        value={critical.length}
        sub={
          critical.length > 0
            ? `${top3}${critical.length > 3 ? ` +${critical.length - 3}` : ""}`
            : "Inga klienter med akuta problem"
        }
        onClick={() => navigate("/wl/app/clients?filter=critical")}
      />
      <StatCard
        tone="amber"
        icon={<ListChecks className="h-4 w-4" />}
        label="Uppgifter"
        value={approvals.length}
        sub={
          topBuckets.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {topBuckets.map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-md bg-[#FAEEDA] text-[#7A5417] px-1.5 py-0.5 text-[10px] font-semibold"
                >
                  {k} {v}
                </span>
              ))}
            </span>
          ) : (
            "Inga väntande godkännanden"
          )
        }
        onClick={() => navigate("/wl/app/approvals")}
      />
      <StatCard
        tone="emerald"
        icon={<Sparkles className="h-4 w-4" />}
        label="AI-automation"
        value={automation?.autoHandledToday ?? 0}
        sub="AI-hanterade verifikationer senaste 24h"
        onClick={() => navigate("/wl/app/insights")}
      />
    </div>
  );
};
