import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
}

const ABSENCE_TYPES = [
  { value: "vacation", label: "Semester", category_key: "vacation" },
  { value: "sick_day1", label: "Sjukdom — Dag 1 (karens)", category_key: "sick" },
  { value: "sick_2_14", label: "Sjukdom — Dag 2-14 (sjuklön 80%)", category_key: "sick" },
  { value: "sick_15plus", label: "Sjukdom — Dag 15+ (FK tar över)", category_key: "sick" },
  { value: "vab", label: "VAB (vård av barn)", category_key: "vab" },
  { value: "leave_unpaid", label: "Tjänsteledighet", category_key: "leave" },
  { value: "parental", label: "Föräldraledighet", category_key: "parental" },
  { value: "other", label: "Övrig ledighet", category_key: "leave" },
];

const AVATAR_PALETTE = [
  "#0B4F6C", "#5DCAA5", "#EF9F27", "#85B7EB", "#A78BFA",
  "#F09595", "#22A06B", "#0C447C", "#412402", "#475569",
];

function getInitials(first?: string | null, last?: string | null) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

function workdaysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  let n = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

export function HRAbsenceTab({ companyId }: Props) {
  const qc = useQueryClient();
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "vacation",
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    comment: "",
  });

  const { data: employees } = useQuery({
    queryKey: ["hr-employees-balance", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employment_type, vacation_days_per_year, vacation_days_used, notes")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("first_name");
      return data ?? [];
    },
  });

  const yearStart = useMemo(() => `${new Date().getFullYear()}-01-01`, []);
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);

  const { data: events } = useQuery({
    queryKey: ["hr-absence-events", companyId, yearStart],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("hr_events")
        .select("employee_id, category_key, hours, event_date, event_end_date")
        .eq("company_id", companyId)
        .gte("event_date", yearStart);
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async (employeeId: string) => {
      const t = ABSENCE_TYPES.find((x) => x.value === form.type)!;
      const days = workdaysBetween(form.from, form.to);
      const { error } = await supabase.from("hr_events").insert({
        company_id: companyId,
        employee_id: employeeId,
        category_key: t.category_key,
        event_date: form.from,
        event_end_date: form.to,
        hours: days * 8,
        description: `${t.label}${form.comment ? " — " + form.comment : ""}`,
        source: "manual",
        status: "pending",
        metadata: { absence_type: form.type, workdays: days },
      });
      if (error) throw error;
      // Update vacation balance if vacation
      if (form.type === "vacation") {
        const emp = employees?.find((e) => e.id === employeeId);
        if (emp) {
          await supabase
            .from("employees")
            .update({ vacation_days_used: Number(emp.vacation_days_used ?? 0) + days })
            .eq("id", employeeId);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-absence-events"] });
      qc.invalidateQueries({ queryKey: ["hr-employees-balance"] });
      setOpenModal(null);
      toast.success("Frånvaro registrerad");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const days = workdaysBetween(form.from, form.to);

  return (
    <div className="space-y-4 mt-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
        Anställda — saldon och frånvaro
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(employees ?? []).map((e, idx) => {
          const myEvents = (events ?? []).filter((ev) => ev.employee_id === e.id);
          const sickHours = myEvents
            .filter((ev) => ev.category_key?.toLowerCase().includes("sick") || ev.category_key?.toLowerCase().includes("sjuk"))
            .filter((ev) => ev.event_date >= monthStart)
            .reduce((s, ev) => s + Number(ev.hours || 0), 0);
          const sickDays = sickHours / 8;
          const overtimeBalance = myEvents
            .filter((ev) => ev.category_key?.toLowerCase().includes("overtime") || ev.category_key?.toLowerCase().includes("övertid"))
            .reduce((s, ev) => s + Number(ev.hours || 0), 0);
          const vabHours = myEvents
            .filter((ev) => ev.category_key?.toLowerCase().includes("vab"))
            .reduce((s, ev) => s + Number(ev.hours || 0), 0);
          const vacEntitled = e.vacation_days_per_year ?? 25;
          const vacUsed = Number(e.vacation_days_used ?? 0);
          const vacRemain = vacEntitled - vacUsed;
          const vacEarned = Math.round((new Date().getMonth() + 1) * (vacEntitled / 12));
          const usedPct = vacEntitled > 0 ? (vacUsed / vacEntitled) * 100 : 0;
          const barColor = usedPct < 50 ? "#5DCAA5" : usedPct < 80 ? "#EF9F27" : "#E07171";
          return (
            <div
              key={e.id}
              className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white text-[12px] font-medium"
                  style={{ background: AVATAR_PALETTE[idx % AVATAR_PALETTE.length] }}
                >
                  {getInitials(e.first_name, e.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#0F172A] truncate">
                    {e.first_name} {e.last_name}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] truncate">
                    {e.notes || (e.employment_type === "full_time" ? "Heltid" : "Deltid")}
                  </div>
                </div>
                <button
                  onClick={() => setOpenModal(e.id)}
                  className="text-[11px] px-2 py-[5px] rounded-[6px] bg-[#0B4F6C] text-[#E6F4FA]"
                >
                  Registrera frånvaro
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Semester", main: `${vacRemain}/${vacEntitled}`, sub: `Uttagna ${vacUsed}` },
                  { label: "Intjänat", main: vacEarned, sub: "dagar" },
                  { label: "Sjukdagar mån", main: sickDays.toFixed(1), sub: "dagar" },
                  { label: "Övertid / VAB", main: `${overtimeBalance.toFixed(0)}h`, sub: `VAB ${(vabHours/8).toFixed(1)}d` },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="text-[9px] uppercase tracking-[0.07em] text-[#94A3B8]">{c.label}</div>
                    <div className="text-[14px] font-medium tabular-nums text-[#0F172A] mt-1">{c.main}</div>
                    <div className="text-[10px] text-[#94A3B8]">{c.sub}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="h-[5px] rounded-full bg-[#EEF2F6] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, usedPct)}%`, background: barColor }}
                  />
                </div>
                <div className="text-[9px] text-[#94A3B8] mt-1">
                  Semester: {vacUsed} av {vacEntitled} uttagna
                </div>
              </div>
            </div>
          );
        })}
        {(employees ?? []).length === 0 && (
          <div className="col-span-full text-[12px] text-[#94A3B8] py-8 text-center bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px]">
            Inga aktiva anställda
          </div>
        )}
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/30">
          <div className="bg-white w-full sm:w-[420px] sm:h-full sm:rounded-l-[16px] p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-medium text-[#0F172A]">Registrera frånvaro</div>
              <button onClick={() => setOpenModal(null)} className="p-1 rounded hover:bg-[#F1F5F9]">
                <X className="h-4 w-4 text-[#475569]" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">Anställd</label>
                <div className="text-[13px] text-[#0F172A] mt-1">
                  {employees?.find((e) => e.id === openModal)
                    ? `${employees.find((e) => e.id === openModal)!.first_name} ${employees.find((e) => e.id === openModal)!.last_name}`
                    : ""}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">Typ av frånvaro</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full mt-1 text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[7px]"
                >
                  {ABSENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">Från</label>
                  <input
                    type="date"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    className="w-full mt-1 text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[7px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">Till</label>
                  <input
                    type="date"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    className="w-full mt-1 text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[7px]"
                  />
                </div>
              </div>
              <div className="bg-[#F8FAFB] rounded-[8px] p-2 text-[11px] text-[#475569]">
                Antal dagar (exkl. helger): <span className="font-medium tabular-nums">{days}</span>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">Kommentar</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  className="w-full mt-1 text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[7px] min-h-[60px]"
                />
              </div>
              <button
                disabled={submit.isPending || days < 1}
                onClick={() => submit.mutate(openModal)}
                className="w-full text-[12px] font-medium rounded-[8px] py-[8px] bg-[#0B4F6C] text-[#E6F4FA] disabled:opacity-50"
              >
                Registrera frånvaro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Semester-kalender timeline */}
      <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mt-6">
        Semester-kalender — översikt {new Date().getFullYear()}
      </div>
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#F8FAFB] text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">
              <th className="text-left px-3 py-2 font-medium w-[180px]">Anställd</th>
              {Array.from({ length: 12 }).map((_, m) => (
                <th key={m} className="text-center px-1 py-2 font-medium">
                  {["J","F","M","A","M","J","J","A","S","O","N","D"][m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).map((e, idx) => {
              const myVac = (events ?? []).filter(
                (ev) => ev.employee_id === e.id && (ev.category_key?.toLowerCase().includes("vacation") || ev.category_key?.toLowerCase().includes("semester")),
              );
              return (
                <tr key={e.id} className="border-t-[0.5px] border-[#E2E8F0]">
                  <td className="px-3 py-2 text-[#0F172A]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium"
                        style={{ background: AVATAR_PALETTE[idx % AVATAR_PALETTE.length] }}
                      >
                        {getInitials(e.first_name, e.last_name)}
                      </div>
                      <span className="text-[12px]">{e.first_name} {e.last_name}</span>
                    </div>
                  </td>
                  {Array.from({ length: 12 }).map((_, m) => {
                    const inMonth = myVac.some((ev) => new Date(ev.event_date).getMonth() === m);
                    return (
                      <td key={m} className="text-center px-1 py-2">
                        <div
                          className={cn(
                            "h-3 rounded-[3px] mx-auto",
                            inMonth ? "" : "bg-transparent",
                          )}
                          style={{ background: inMonth ? "#85B7EB" : undefined, width: inMonth ? "80%" : 0 }}
                          title={inMonth ? "Semester" : ""}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
