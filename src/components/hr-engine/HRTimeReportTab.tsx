import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
}

const PERIODS = [
  { value: "this-week", label: "Denna vecka" },
  { value: "this-month", label: "Denna månad" },
  { value: "prev-month", label: "Föregående månad" },
];

const STATUS_FILTERS = ["alla", "pending", "approved", "rejected"];
const STATUS_LABELS: Record<string, string> = {
  alla: "Alla",
  pending: "Väntar",
  approved: "Godkänd",
  rejected: "Nekad",
};

const TYPES = [
  { value: "work", label: "Arbete", bg: "#E1F5EE", color: "#085041", border: "#5DCAA5", row: "#FFFFFF" },
  { value: "overtime", label: "Övertid", bg: "#FAEEDA", color: "#412402", border: "#EF9F27", row: "#FFFBF0" },
  { value: "sick", label: "Sjuk", bg: "#FCEBEB", color: "#791F1F", border: "#F09595", row: "#FFF8F8" },
  { value: "vacation", label: "Semester", bg: "#EFF6FF", color: "#0C447C", border: "#85B7EB", row: "#F5F9FF" },
  { value: "vab", label: "VAB", bg: "#EFF6FF", color: "#0C447C", border: "#85B7EB", row: "#F5F9FF" },
];

function typeFromCategory(key?: string | null) {
  const k = (key || "").toLowerCase();
  if (k.includes("overtime") || k.includes("övertid")) return TYPES[1];
  if (k.includes("sick") || k.includes("sjuk")) return TYPES[2];
  if (k.includes("vacation") || k.includes("semester")) return TYPES[3];
  if (k.includes("vab")) return TYPES[4];
  return TYPES[0];
}

function periodRange(p: string) {
  const today = new Date();
  if (p === "this-week") {
    const day = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return [start, end];
  }
  if (p === "prev-month") {
    return [
      new Date(today.getFullYear(), today.getMonth() - 1, 1),
      new Date(today.getFullYear(), today.getMonth(), 0),
    ];
  }
  return [
    new Date(today.getFullYear(), today.getMonth(), 1),
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  ];
}

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function HRTimeReportTab({ companyId }: Props) {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [period, setPeriod] = useState("this-week");
  const [status, setStatus] = useState("alla");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    event_date: new Date().toISOString().slice(0, 10),
    category_key: "work",
    hours: "8",
    description: "",
  });

  const [start, end] = periodRange(period);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data: employees } = useQuery({
    queryKey: ["hr-employees", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("first_name");
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["hr-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_event_categories").select("category_key, label_sv");
      return data ?? [];
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["hr-entries", companyId, employeeId, startStr, endStr, status],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("hr_events")
        .select("id, employee_id, event_date, category_key, hours, description, status, employees(first_name, last_name)")
        .eq("company_id", companyId)
        .gte("event_date", startStr)
        .lte("event_date", endStr)
        .order("event_date", { ascending: false });
      if (employeeId !== "all") q = q.eq("employee_id", employeeId);
      if (status !== "alla") q = q.eq("status", status);
      const { data } = await q;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      await supabase.from("hr_events").update({ status: newStatus, approved_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-entries"] });
      toast.success("Status uppdaterad");
    },
  });

  const insert = useMutation({
    mutationFn: async () => {
      if (!form.employee_id) throw new Error("Välj anställd");
      const { error } = await supabase.from("hr_events").insert({
        company_id: companyId,
        employee_id: form.employee_id,
        event_date: form.event_date,
        category_key: form.category_key,
        hours: Number(form.hours),
        description: form.description,
        source: "manual",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-entries"] });
      setShowAdd(false);
      toast.success("Tidsrad sparad");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Group by week
  const groups = useMemo(() => {
    const map = new Map<number, typeof entries>();
    (entries ?? []).forEach((e) => {
      const w = isoWeek(new Date(e.event_date));
      if (!map.has(w)) map.set(w, [] as any);
      map.get(w)!.push(e);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [entries]);

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px] px-2 py-[6px] bg-white text-[#0F172A]"
        >
          <option value="all">Alla anställda</option>
          {(employees ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px] px-2 py-[6px] bg-white text-[#0F172A]"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "text-[11px] rounded-full px-2 py-[3px]",
                status === s
                  ? "bg-[#0B4F6C] text-white"
                  : "bg-white border-[0.5px] border-[#E2E8F0] text-[#475569]",
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="ml-auto text-[12px] inline-flex items-center gap-1 px-3 py-[6px] rounded-[8px] bg-[#0B4F6C] text-[#E6F4FA]"
        >
          <Plus className="h-3 w-3" /> Lägg till tidsrad
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-3 grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
          <select
            value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[6px]"
          >
            <option value="">Välj anställd</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[6px]"
          />
          <select
            value={form.category_key}
            onChange={(e) => setForm({ ...form, category_key: e.target.value })}
            className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[6px]"
          >
            {(categories ?? []).map((c) => (
              <option key={c.category_key} value={c.category_key}>
                {c.label_sv || c.category_key}
              </option>
            ))}
            {!categories?.length && <option value="work">Arbete</option>}
          </select>
          <input
            type="number"
            step="0.25"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            placeholder="Timmar"
            className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[6px]"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Beskrivning"
            className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[6px] px-2 py-[6px]"
          />
          <button
            onClick={() => insert.mutate()}
            disabled={insert.isPending}
            className="text-[12px] rounded-[6px] bg-[#0B4F6C] text-[#E6F4FA] py-[6px] disabled:opacity-50"
          >
            Spara
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] bg-[#F8FAFB]">
              <th className="text-left px-3 py-2 font-medium">Datum</th>
              <th className="text-left px-3 py-2 font-medium">Anställd</th>
              <th className="text-left px-3 py-2 font-medium">Typ</th>
              <th className="text-left px-3 py-2 font-medium">Beskrivning</th>
              <th className="text-right px-3 py-2 font-medium">Timmar</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[12px] text-[#94A3B8] py-8">
                  Inga tidsrader för vald period
                </td>
              </tr>
            )}
            {groups.map(([week, rows]) => {
              const totalWork = (rows ?? []).filter((r) => typeFromCategory(r.category_key).value === "work").reduce((s, r) => s + Number(r.hours || 0), 0);
              const totalOvertime = (rows ?? []).filter((r) => typeFromCategory(r.category_key).value === "overtime").reduce((s, r) => s + Number(r.hours || 0), 0);
              const totalAbs = (rows ?? []).filter((r) => ["sick","vacation","vab"].includes(typeFromCategory(r.category_key).value)).reduce((s, r) => s + Number(r.hours || 0), 0);
              return (
                <>
                  {(rows ?? []).map((r) => {
                    const t = typeFromCategory(r.category_key);
                    return (
                      <tr key={r.id} className="border-t-[0.5px] border-[#E2E8F0]" style={{ background: t.row }}>
                        <td className="px-3 py-2 text-[#475569] tabular-nums">{r.event_date}</td>
                        <td className="px-3 py-2 text-[#0F172A]">
                          {(r as any).employees ? `${(r as any).employees.first_name} ${(r as any).employees.last_name}` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-[2px] text-[10px]"
                            style={{ background: t.bg, color: t.color, border: `0.5px solid ${t.border}` }}
                          >
                            {t.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#475569] truncate max-w-[200px]">{r.description || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{Number(r.hours || 0).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-[2px] text-[10px]"
                            style={{
                              background: r.status === "approved" ? "#E1F5EE" : r.status === "rejected" ? "#FCEBEB" : "#FAEEDA",
                              color: r.status === "approved" ? "#085041" : r.status === "rejected" ? "#791F1F" : "#412402",
                              border: `0.5px solid ${r.status === "approved" ? "#5DCAA5" : r.status === "rejected" ? "#F09595" : "#EF9F27"}`,
                            }}
                          >
                            {r.status === "approved" ? "Godkänd" : r.status === "rejected" ? "Nekad" : "Väntar"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.status === "pending" && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => updateStatus.mutate({ id: r.id, newStatus: "approved" })}
                                className="text-[10px] inline-flex items-center gap-1 px-2 py-[3px] rounded-[6px] bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5]"
                              >
                                <Check className="h-2.5 w-2.5" /> Godkänn
                              </button>
                              <button
                                onClick={() => updateStatus.mutate({ id: r.id, newStatus: "rejected" })}
                                className="text-[10px] inline-flex items-center gap-1 px-2 py-[3px] rounded-[6px] text-[#791F1F]"
                              >
                                <X className="h-2.5 w-2.5" /> Neka
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#F8FAFB] border-t-[0.5px] border-[#E2E8F0]">
                    <td colSpan={7} className="px-3 py-2 text-[11px] font-medium text-[#475569]">
                      Vecka {week}: {totalWork.toFixed(1)}h arbete · {totalOvertime.toFixed(1)}h övertid · {totalAbs.toFixed(1)}h frånvaro
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
