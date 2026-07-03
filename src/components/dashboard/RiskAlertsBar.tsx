import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCashflowForecast } from "@/hooks/useCashflowForecast";
import { AlertTriangle, FileWarning, TrendingDown, Target } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";

interface Props { companyId: string }

type Pill = {
  key: string;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "red";
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
};

const tones = {
  emerald: { bg: "bg-[#E1F5EE]",  border: "border-[#BFE6D6]", text: "text-[#085041]", icon: "text-[#085041]", chip: "bg-[#E1F5EE] text-[#085041]" },
  amber:   { bg: "bg-[#FAEEDA]",    border: "border-[#F0DDB7]",   text: "text-[#7A5417]",   icon: "text-[#7A5417]",   chip: "bg-[#FAEEDA] text-[#7A5417]" },
  red:     { bg: "bg-[#FCE8E8]",      border: "border-[#F4C8C8]",     text: "text-[#7A1A1A]",     icon: "text-[#7A1A1A]",     chip: "bg-[#FCE8E8] text-[#7A1A1A]" },
} as const;

export function RiskAlertsBar({ companyId }: Props) {
  const navigate = useNavigate();
  const { data: cashflow } = useCashflowForecast(12, companyId);
  const [overdueAr, setOverdueAr] = useState<{ amount: number; count: number }>({ amount: 0, count: 0 });
  const [overdueAp, setOverdueAp] = useState<{ amount: number; count: number }>({ amount: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [arRes, apRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("total_amount,due_date,status")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .in("status", ["sent", "overdue"])
          .lt("due_date", today),
        supabase
          .from("invoices")
          .select("total_amount,due_date,status")
          .eq("company_id", companyId)
          .eq("invoice_direction", "incoming")
          .in("status", ["sent", "overdue"])
          .lt("due_date", today),
      ]);
      if (!active) return;
      const arRows = (arRes.data ?? []) as Array<{ total_amount: number | null }>;
      const apRows = (apRes.data ?? []) as Array<{ total_amount: number | null }>;
      setOverdueAr({
        amount: arRows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
        count: arRows.length,
      });
      setOverdueAp({
        amount: apRows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
        count: apRows.length,
      });
      setLoading(false);
    })();
    return () => { active = false; };
  }, [companyId]);

  const currentCash = cashflow?.currentCash ?? 0;
  const cashCritical = currentCash <= 0;
  const negCashMonths = cashflow?.forecast?.filter(f => f.pessimistic < 0).length ?? 0;
  const runway = cashCritical ? 0 : (cashflow?.runway ?? 12);

  const pills: Pill[] = [
    {
      key: "ar",
      label: "Förfallna kundfakturor",
      value: overdueAr.count > 0 ? `${formatSEK(overdueAr.amount)} · ${overdueAr.count} st` : "Inga",
      tone: overdueAr.amount > 100000 ? "red" : overdueAr.amount > 0 ? "amber" : "emerald",
      icon: FileWarning,
      to: "/invoices",
    },
    {
      key: "ap",
      label: "Förfallna lev.fakturor",
      value: overdueAp.count > 0 ? `${formatSEK(overdueAp.amount)} · ${overdueAp.count} st` : "Inga",
      tone: overdueAp.amount > 100000 ? "red" : overdueAp.amount > 0 ? "amber" : "emerald",
      icon: AlertTriangle,
      to: "/supplier-invoices",
    },
    {
      key: "cash",
      label: "Kassaprognos",
      value: cashCritical
        ? "Negativ idag"
        : negCashMonths > 0
          ? `${negCashMonths} mån framåt`
          : "Positiv",
      tone: cashCritical || negCashMonths >= 3 ? "red" : negCashMonths > 0 ? "amber" : "emerald",
      icon: TrendingDown,
      to: "/cashflow-forecast",
    },
    {
      key: "runway",
      label: "Runway",
      value: cashCritical ? "0 mån" : runway >= 12 ? "12+ mån" : `${runway} mån`,
      tone: cashCritical || runway < 6 ? "red" : runway >= 12 ? "emerald" : "amber",
      icon: Target,
      to: "/cashflow-forecast",
    },
  ];

  return (
    <Card className="p-4 border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#7A5417]" /> Risk & varningar
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {pills.map(p => {
          const t = tones[p.tone];
          const Icon = p.icon;
          return (
            <button
              key={p.key}
              onClick={() => p.to && navigate(p.to)}
              className={`text-left rounded-xl border ${t.border} ${t.bg} p-3 transition hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className={`w-4 h-4 ${t.icon}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${t.chip}`}>
                  {p.tone === "emerald" ? "OK" : p.tone === "amber" ? "Bevaka" : "Kritisk"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">{p.label}</div>
              <div className={`text-sm font-semibold mt-0.5 ${t.text}`}>{loading ? "…" : p.value}</div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
