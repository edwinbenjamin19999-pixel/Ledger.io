import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string;
}

const fmt = (n: number) => new Intl.NumberFormat("sv-SE").format(Math.round(n));

function KpiCard({
  label,
  value,
  sub,
  variant = "default",
  topAccent = "#1D4ED8",
  progress,
  progressColor,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  variant?: "default" | "amber" | "green";
  topAccent?: string;
  progress?: number;
  progressColor?: string;
}) {
  const bg =
    variant === "amber"
      ? "#FFFBF0"
      : variant === "green"
      ? "#F0FBF5"
      : "#FAFBFC";
  const border =
    variant === "amber"
      ? "#F3D29A"
      : variant === "green"
      ? "#B7E5CC"
      : "#DFE4EA";
  return (
    <div
      className="rounded-[12px] p-4 relative overflow-hidden"
      style={{ background: bg, border: `0.5px solid ${border}` }}
    >
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1.5px", background: topAccent }}
      />
      <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
        {label}
      </div>
      <div className="text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A] mt-1">
        {value}
      </div>
      {sub && <div className="text-[10px] text-[#94A3B8] mt-[2px]">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-2 h-[4px] rounded-full bg-[#EEF2F6] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: progressColor || "#5DCAA5",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function HRKpiRow({ companyId }: Props) {
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);
  const monthEnd = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  }, []);
  const prevMonthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
  }, []);
  const prevMonthEnd = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
  }, []);

  const { data } = useQuery({
    queryKey: ["hr-kpi", companyId, monthStart],
    enabled: !!companyId,
    queryFn: async () => {
      const [emps, events, prevEvents, pending] = await Promise.all([
        supabase
          .from("employees")
          .select("id, employment_type, monthly_salary")
          .eq("company_id", companyId)
          .eq("is_active", true),
        supabase
          .from("hr_events")
          .select("category_key, hours")
          .eq("company_id", companyId)
          .gte("event_date", monthStart)
          .lte("event_date", monthEnd),
        supabase
          .from("hr_events")
          .select("category_key, hours")
          .eq("company_id", companyId)
          .gte("event_date", prevMonthStart)
          .lte("event_date", prevMonthEnd),
        supabase
          .from("hr_events")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "pending"),
      ]);
      const employees = emps.data ?? [];
      const ft = employees.filter((e) => e.employment_type === "full_time").length;
      const pt = employees.length - ft;
      const evts = events.data ?? [];
      const prevEvts = prevEvents.data ?? [];
      const sumHours = (rows: any[], filter?: (k: string) => boolean) =>
        rows
          .filter((r) => (filter ? filter(r.category_key) : true))
          .reduce((s, r) => s + Number(r.hours || 0), 0);
      const worked = sumHours(evts, (k) =>
        ["work", "overtime", "ob", "regular"].some((t) => k?.toLowerCase().includes(t)),
      );
      const overtime = sumHours(evts, (k) => k?.toLowerCase().includes("overtime") || k?.toLowerCase().includes("övertid"));
      const prevOvertime = sumHours(prevEvts, (k) => k?.toLowerCase().includes("overtime") || k?.toLowerCase().includes("övertid"));
      // Planerat: 40h/vecka * antal heltid + 20h/vecka * deltid * antal arbetsdagar denna månad / 5
      const today = new Date();
      const workdays = (() => {
        let n = 0;
        for (let day = 1; day <= today.getDate(); day++) {
          const d = new Date(today.getFullYear(), today.getMonth(), day);
          const wd = d.getDay();
          if (wd !== 0 && wd !== 6) n++;
        }
        return n;
      })();
      const planned = workdays * (ft * 8 + pt * 4);
      const grossMtd = employees.reduce((s, e) => {
        const monthly = Number(e.monthly_salary ?? 0);
        const dayShare = monthly / 22;
        return s + dayShare * workdays;
      }, 0);
      const totalCost = grossMtd * 1.3142;
      return {
        empCount: employees.length,
        ft,
        pt,
        worked,
        planned,
        pending: pending.count ?? 0,
        overtime,
        prevOvertime,
        totalCost,
      };
    },
  });

  const workedPct = data && data.planned > 0 ? (data.worked / data.planned) * 100 : 0;
  const progressColor = workedPct > 90 ? "#5DCAA5" : workedPct >= 70 ? "#EF9F27" : "#E07171";
  const overtimeDelta = data ? data.overtime - data.prevOvertime : 0;
  const pendingCount = data?.pending ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard
        label="Aktiva anställda"
        value={data?.empCount ?? "—"}
        sub={data ? `${data.ft} heltid · ${data.pt} deltid` : "—"}
      />
      <KpiCard
        label="Timmar denna månad"
        value={data ? `${fmt(data.worked)}h` : "—"}
        sub={data ? `av ${fmt(data.planned)}h planerat` : "—"}
        progress={workedPct}
        progressColor={progressColor}
        topAccent={workedPct > 90 ? "#5DCAA5" : "#1D4ED8"}
      />
      <KpiCard
        label="Väntar godkännande"
        value={pendingCount}
        sub={pendingCount > 0 ? "tidsrapporter" : "Allt godkänt ✓"}
        variant={pendingCount > 0 ? "amber" : "green"}
        topAccent={pendingCount > 0 ? "#EF9F27" : "#5DCAA5"}
      />
      <KpiCard
        label="Övertid denna månad"
        value={data ? `${fmt(data.overtime)}h` : "—"}
        sub={
          data
            ? `${overtimeDelta >= 0 ? "+" : ""}${fmt(overtimeDelta)}h vs förra månaden`
            : "—"
        }
      />
      <KpiCard
        label="Lönekostnad MTD"
        value={data ? `${fmt(data.totalCost)} kr` : "—"}
        sub="inkl. arbetsgivaravgift"
      />
    </div>
  );
}
