import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
  onOpenSmartInput?: () => void;
}

const AVATAR_PALETTE = [
  "#0B4F6C", "#5DCAA5", "#EF9F27", "#85B7EB", "#A78BFA",
  "#F09595", "#22A06B", "#0C447C", "#412402", "#475569",
];

const STATUS_BADGE: Record<string, { bg: string; color: string; border?: string; label: string }> = {
  arbetar: { bg: "#E1F5EE", color: "#085041", border: "#5DCAA5", label: "Arbetar" },
  semester: { bg: "#EFF6FF", color: "#0C447C", border: "#85B7EB", label: "Semester" },
  sjuk: { bg: "#FCEBEB", color: "#791F1F", border: "#F09595", label: "Sjuk" },
  pending: { bg: "#FAEEDA", color: "#412402", border: "#EF9F27", label: "Väntar godkännande" },
  ledig: { bg: "#F1F5F9", color: "#475569", label: "Ledig" },
};

function StatusBadge({ status }: { status: keyof typeof STATUS_BADGE }) {
  const s = STATUS_BADGE[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[2px] text-[10px]"
      style={{
        background: s.bg,
        color: s.color,
        border: s.border ? `0.5px solid ${s.border}` : undefined,
      }}
    >
      {s.label}
    </span>
  );
}

function getInitials(first?: string | null, last?: string | null) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // mon=0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

const QUICK_CHIPS = [
  "8h arbete",
  "Sjuk hela dagen",
  "Halvdag semester",
  "2h övertid",
  "VAB",
];

const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const DAY_HEADERS = ["M", "T", "O", "T", "F", "L", "S"];

export function HROverviewTab({ companyId, onOpenSmartInput }: Props) {
  const navigate = useNavigate();
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const weekStart = useMemo(() => startOfWeek(), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const yearStart = useMemo(
    () => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    [],
  );
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);
  const monthEnd = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  }, []);

  const { data } = useQuery({
    queryKey: ["hr-overview", companyId, weekStart.toISOString()],
    enabled: !!companyId,
    queryFn: async () => {
      const [emps, weekEvents, yearEvents, monthEvents] = await Promise.all([
        supabase
          .from("employees")
          .select("id, first_name, last_name, employment_type, vacation_days_per_year, vacation_days_used, notes")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("first_name"),
        supabase
          .from("hr_events")
          .select("employee_id, category_key, hours, status, event_date")
          .eq("company_id", companyId)
          .gte("event_date", weekStart.toISOString().slice(0, 10))
          .lte("event_date", weekEnd.toISOString().slice(0, 10)),
        supabase
          .from("hr_events")
          .select("category_key, hours")
          .eq("company_id", companyId)
          .gte("event_date", yearStart),
        supabase
          .from("hr_events")
          .select("category_key, hours")
          .eq("company_id", companyId)
          .gte("event_date", monthStart)
          .lte("event_date", monthEnd),
      ]);
      return {
        employees: emps.data ?? [],
        weekEvents: weekEvents.data ?? [],
        yearEvents: yearEvents.data ?? [],
        monthEvents: monthEvents.data ?? [],
      };
    },
  });

  const { data: monthCalEvents } = useQuery({
    queryKey: ["hr-cal-events", companyId, calMonth.toISOString()],
    enabled: !!companyId,
    queryFn: async () => {
      const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const end = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      const { data } = await supabase
        .from("hr_events")
        .select("event_date, category_key, hours")
        .eq("company_id", companyId)
        .gte("event_date", start)
        .lte("event_date", end);
      return data ?? [];
    },
  });

  // Build employee status
  const employees = data?.employees ?? [];
  const employeeStatus = employees.map((e, idx) => {
    const myEvents = (data?.weekEvents ?? []).filter((ev) => ev.employee_id === e.id);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayEvent = myEvents.find((ev) => ev.event_date === todayStr);
    const hasPending = myEvents.some((ev) => ev.status === "pending");
    const totalHours = myEvents.reduce((s, ev) => s + Number(ev.hours || 0), 0);
    let status: keyof typeof STATUS_BADGE = "ledig";
    const cat = todayEvent?.category_key?.toLowerCase() || "";
    if (hasPending) status = "pending";
    else if (cat.includes("sick") || cat.includes("sjuk")) status = "sjuk";
    else if (cat.includes("vacation") || cat.includes("semester")) status = "semester";
    else if (todayEvent) status = "arbetar";
    return {
      ...e,
      status,
      totalHours,
      color: AVATAR_PALETTE[idx % AVATAR_PALETTE.length],
    };
  });

  // Balance summaries
  const totalVacRemaining = employees.reduce(
    (s, e) => s + ((e.vacation_days_per_year ?? 25) - Number(e.vacation_days_used ?? 0)),
    0,
  );
  const totalVacUsed = employees.reduce((s, e) => s + Number(e.vacation_days_used ?? 0), 0);
  const sickEvents = (data?.monthEvents ?? []).filter((ev) =>
    ev.category_key?.toLowerCase().includes("sick") || ev.category_key?.toLowerCase().includes("sjuk"),
  ).length;
  const overtimeBalance = (data?.yearEvents ?? [])
    .filter((ev) => ev.category_key?.toLowerCase().includes("overtime") || ev.category_key?.toLowerCase().includes("övertid"))
    .reduce((s, ev) => s + Number(ev.hours || 0), 0);

  // Calendar grid
  const calGrid = useMemo(() => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const last = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const startOffset = (first.getDay() + 6) % 7;
    const cells: Array<{ day?: number; date?: string; type?: string }> = [];
    for (let i = 0; i < startOffset; i++) cells.push({});
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), d)
        .toISOString()
        .slice(0, 10);
      const ev = (monthCalEvents ?? []).find((e) => e.event_date === date);
      const cat = ev?.category_key?.toLowerCase() || "";
      let type: string | undefined;
      if (cat.includes("sick") || cat.includes("sjuk")) type = "sick";
      else if (cat.includes("vacation") || cat.includes("semester")) type = "vacation";
      else if (cat.includes("overtime") || cat.includes("övertid")) type = "overtime";
      else if (ev) type = "work";
      cells.push({ day: d, date, type });
    }
    return cells;
  }, [calMonth, monthCalEvents]);

  const today = new Date();
  const isCurrentMonth =
    calMonth.getFullYear() === today.getFullYear() && calMonth.getMonth() === today.getMonth();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mt-4">
      {/* LEFT */}
      <div className="space-y-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mb-2">
            Anställda — status denna vecka
          </div>
          <div className="space-y-2">
            {employeeStatus.length === 0 && (
              <div className="text-[12px] text-[#94A3B8] py-6 text-center bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px]">
                Inga aktiva anställda
              </div>
            )}
            {employeeStatus.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/employees?id=${e.id}`)}
                className="w-full text-left bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] px-[14px] py-[10px] flex items-center gap-[10px] hover:border-[#0B4F6C]/40 transition-colors"
              >
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white text-[12px] font-medium flex-shrink-0"
                  style={{ background: e.color }}
                >
                  {getInitials(e.first_name, e.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#0F172A] truncate">
                    {e.first_name} {e.last_name}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] truncate">
                    {e.notes || "—"} · {e.employment_type === "full_time" ? "Heltid" : "Deltid"}
                  </div>
                </div>
                <div className="text-right ml-auto flex-shrink-0">
                  <div className="text-[12px] font-medium tabular-nums text-[#0F172A]">
                    {e.totalHours.toFixed(1)}h
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={e.status} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Balance summary */}
        <div
          className="rounded-[12px] p-4 relative overflow-hidden"
          style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA" }}
        >
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: "1.5px", background: "#0B4F6C" }}
          />
          <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mb-3">
            Balanser — alla anställda
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Semesterdagar kvar", value: totalVacRemaining, sub: "dagar totalt" },
              { label: "Uttagna i år", value: totalVacUsed, sub: "dagar" },
              { label: "Sjukdagar denna mån", value: sickEvents, sub: "dagar" },
              { label: "Övertidssaldo", value: `${Math.round(overtimeBalance)}h`, sub: "i år" },
            ].map((c) => (
              <div key={c.label}>
                <div className="text-[9px] uppercase tracking-[0.07em] text-[#94A3B8]">
                  {c.label}
                </div>
                <div className="text-[16px] font-medium tabular-nums text-[#0F172A] mt-1">
                  {c.value}
                </div>
                <div className="text-[10px] text-[#94A3B8]">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="space-y-[10px]">
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b-[0.5px] border-[#E2E8F0]">
            <div className="text-[12px] font-medium text-[#0F172A]">
              {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
                }
                className="p-1 rounded hover:bg-[#F1F5F9]"
              >
                <ChevronLeft className="h-3 w-3 text-[#475569]" />
              </button>
              <button
                onClick={() =>
                  setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
                }
                className="p-1 rounded hover:bg-[#F1F5F9]"
              >
                <ChevronRight className="h-3 w-3 text-[#475569]" />
              </button>
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_HEADERS.map((d, i) => (
                <div
                  key={i}
                  className="text-[9px] text-[#94A3B8] text-center"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calGrid.map((c, i) => {
                if (!c.day) return <div key={i} className="w-7 h-7" />;
                const isToday = isCurrentMonth && c.day === today.getDate();
                const dow = ((i % 7) + 0) % 7; // 0..6 (mon..sun)
                const isWeekend = dow >= 5;
                let bg = "transparent";
                let color = "#475569";
                if (isToday) {
                  bg = "#0B4F6C";
                  color = "#fff";
                } else if (c.type === "work") {
                  bg = "#E1F5EE";
                  color = "#085041";
                } else if (c.type === "sick") {
                  bg = "#FCEBEB";
                  color = "#791F1F";
                } else if (c.type === "vacation") {
                  bg = "#EFF6FF";
                  color = "#0C447C";
                } else if (c.type === "overtime") {
                  bg = "#FAEEDA";
                  color = "#412402";
                } else if (isWeekend) {
                  color = "#CBD5E1";
                }
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-7 h-7 rounded-[4px] flex items-center justify-center text-[10px] tabular-nums",
                      isToday && "font-medium",
                    )}
                    style={{ background: bg, color }}
                  >
                    {c.day}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {[
                { color: "#5DCAA5", label: "Arbete" },
                { color: "#F09595", label: "Sjuk" },
                { color: "#85B7EB", label: "Semester" },
                { color: "#EF9F27", label: "Övertid" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: l.color }}
                  />
                  <span className="text-[9px] text-[#94A3B8]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Smart Input */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-[#0B4F6C]" />
            <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
              Snabbregistrering (AI)
            </div>
          </div>
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {QUICK_CHIPS.map((c) => (
              <span
                key={c}
                className="rounded-full text-[10px] px-2 py-[3px] whitespace-nowrap"
                style={{
                  background: "#EFF6FF",
                  color: "#0C447C",
                  border: "0.5px solid #85B7EB",
                }}
              >
                {c}
              </span>
            ))}
          </div>
          <div
            className="rounded-[8px] p-2 min-h-[56px] text-[12px] text-[#94A3B8]"
            style={{ background: "#F8FAFB" }}
          >
            T.ex. "Anna 8h igår, 2h övertid"
          </div>
          <button
            onClick={onOpenSmartInput}
            className="mt-2 w-full rounded-[8px] text-[12px] font-medium py-[7px]"
            style={{ background: "#0B4F6C", color: "#E6F4FA" }}
          >
            Tolka med AI →
          </button>
        </div>
      </div>
    </div>
  );
}
