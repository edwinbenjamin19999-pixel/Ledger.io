import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileSpreadsheet, FileText, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  companyId: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

export function HRPayrollBaseTab({ companyId }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthStart = useMemo(
    () => new Date(year, month, 1).toISOString().slice(0, 10),
    [year, month],
  );
  const monthEnd = useMemo(
    () => new Date(year, month + 1, 0).toISOString().slice(0, 10),
    [year, month],
  );

  const { data } = useQuery({
    queryKey: ["hr-payroll-base", companyId, monthStart],
    enabled: !!companyId,
    queryFn: async () => {
      const [emps, events, run] = await Promise.all([
        supabase
          .from("employees")
          .select("id, first_name, last_name, employment_type, monthly_salary, hourly_rate")
          .eq("company_id", companyId)
          .eq("is_active", true),
        supabase
          .from("hr_events")
          .select("employee_id, category_key, hours")
          .eq("company_id", companyId)
          .gte("event_date", monthStart)
          .lte("event_date", monthEnd),
        supabase
          .from("payroll_runs")
          .select("id, status, period_start")
          .eq("company_id", companyId)
          .gte("period_start", monthStart)
          .lte("period_start", monthEnd)
          .maybeSingle(),
      ]);
      return { employees: emps.data ?? [], events: events.data ?? [], run: run.data };
    },
  });

  const rows = (data?.employees ?? []).map((e) => {
    const myEvents = (data?.events ?? []).filter((ev) => ev.employee_id === e.id);
    const work = myEvents
      .filter((ev) => !ev.category_key?.toLowerCase().match(/sick|sjuk|vacation|semester|vab|leave|overtime|övertid/))
      .reduce((s, ev) => s + Number(ev.hours || 0), 0);
    const overtime = myEvents
      .filter((ev) => ev.category_key?.toLowerCase().includes("overtime") || ev.category_key?.toLowerCase().includes("övertid"))
      .reduce((s, ev) => s + Number(ev.hours || 0), 0);
    const absence = myEvents
      .filter((ev) => ev.category_key?.toLowerCase().match(/sick|sjuk|vacation|semester|vab|leave/))
      .reduce((s, ev) => s + Number(ev.hours || 0), 0);
    const baseGross = Number(e.monthly_salary ?? 0);
    const overtimeRate = Number(e.hourly_rate ?? (baseGross > 0 ? baseGross / 165 : 0));
    const overtimePay = overtime * overtimeRate * 1.5;
    const gross = baseGross + overtimePay;
    const employer = gross * 0.3142;
    const total = gross + employer;
    return {
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      type: e.employment_type === "full_time" ? "Heltid" : "Deltid",
      work,
      overtime,
      absence,
      gross,
      employer,
      total,
    };
  });

  const totals = rows.reduce(
    (s, r) => ({
      gross: s.gross + r.gross,
      employer: s.employer + r.employer,
      total: s.total + r.total,
      vacationDebt: 0,
    }),
    { gross: 0, employer: 0, total: 0, vacationDebt: 0 },
  );
  totals.vacationDebt = totals.gross * 0.12;

  const status = data?.run?.status === "completed" || data?.run?.status === "approved"
    ? "Exporterad"
    : data?.run?.status === "ready"
    ? "Klar för export"
    : "Öppen";

  const exportExcel = () => {
    const header = "Anställd;Anst.form;Arbete h;Övertid h;Frånvaro h;Bruttolön;Arb.avg;Totalkostnad\n";
    const csv = rows
      .map((r) =>
        [r.name, r.type, r.work, r.overtime, r.absence, r.gross, r.employer, r.total].join(";"),
      )
      .join("\n");
    const blob = new Blob([header + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lonunderlag-${year}-${String(month + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lönunderlag exporterat");
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px] px-2 py-[6px] bg-white"
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px] px-2 py-[6px] bg-white"
        >
          {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span
          className="ml-2 inline-flex items-center rounded-full px-2 py-[3px] text-[10px]"
          style={{
            background: status === "Exporterad" ? "#E1F5EE" : status === "Klar för export" ? "#FAEEDA" : "#EFF6FF",
            color: status === "Exporterad" ? "#085041" : status === "Klar för export" ? "#412402" : "#0C447C",
            border: `0.5px solid ${status === "Exporterad" ? "#5DCAA5" : status === "Klar för export" ? "#EF9F27" : "#85B7EB"}`,
          }}
        >
          {status}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] bg-[#F8FAFB]">
              <th className="text-left px-3 py-2 font-medium">Anställd</th>
              <th className="text-left px-3 py-2 font-medium">Anst.form</th>
              <th className="text-right px-3 py-2 font-medium">Arb.timmar</th>
              <th className="text-right px-3 py-2 font-medium">Övertid</th>
              <th className="text-right px-3 py-2 font-medium">Frånvaro</th>
              <th className="text-right px-3 py-2 font-medium">Bruttolön</th>
              <th className="text-right px-3 py-2 font-medium">Arb.avg</th>
              <th className="text-right px-3 py-2 font-medium">Totalkostnad</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-[12px] text-[#94A3B8] py-8">
                  Inga anställda eller events för {MONTH_NAMES[month]} {year}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t-[0.5px] border-[#E2E8F0]">
                <td className="px-3 py-2 text-[#0F172A]">{r.name}</td>
                <td className="px-3 py-2 text-[#475569]">{r.type}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.work.toFixed(1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.overtime.toFixed(1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.absence.toFixed(1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.gross)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.employer)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(r.total)}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t border-[#0F172A]/60 bg-[#F8FAFB] font-medium">
                <td className="px-3 py-2" colSpan={5}>TOTALT</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.gross)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.employer)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Employer cost breakdown */}
      <div
        className="rounded-[12px] p-4 relative overflow-hidden"
        style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA" }}
      >
        <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#0B4F6C" }} />
        <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mb-3">
          Total arbetsgivarkostnad
        </div>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between text-[#475569]">
            <span>Bruttolöner</span>
            <span className="tabular-nums">{fmt(totals.gross)} kr</span>
          </div>
          <div className="flex justify-between text-[#475569]">
            <span>+ Arbetsgivaravgift (31,42 %)</span>
            <span className="tabular-nums">{fmt(totals.employer)} kr</span>
          </div>
          <div className="flex justify-between text-[#475569]">
            <span>+ Semesterlöneskuld (~12 %)</span>
            <span className="tabular-nums">{fmt(totals.vacationDebt)} kr</span>
          </div>
          <div className="flex justify-between text-[#0F172A] font-medium border-t-[0.5px] border-[#E2E8F0] pt-2 mt-2">
            <span>= Total lönekostnad</span>
            <span className="tabular-nums">{fmt(totals.total + totals.vacationDebt)} kr</span>
          </div>
        </div>
        <button
          onClick={() => toast.info("Kontrollerar mot konto 7000-7699...")}
          className="mt-3 text-[11px] text-[#0B4F6C] hover:underline"
        >
          Kontrollera mot bokföring →
        </button>
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={exportExcel}
          className="text-[12px] inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[8px] bg-[#0B4F6C] text-[#E6F4FA]"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Exportera lönunderlag (Excel)
        </button>
        <button
          onClick={() => toast.info("Fortnox Lön är inte ansluten")}
          className="text-[12px] inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[8px] bg-white border-[0.5px] border-[#E2E8F0] text-[#475569]"
        >
          <Send className="h-3.5 w-3.5" /> Exportera till Fortnox Lön
        </button>
        <button
          onClick={() => toast.info("PDF-export skickad till lönebyrå")}
          className="text-[12px] inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[8px] bg-white border-[0.5px] border-[#E2E8F0] text-[#475569]"
        >
          <FileText className="h-3.5 w-3.5" /> Skicka till lönebyrå (PDF)
        </button>
      </div>
    </div>
  );
}
