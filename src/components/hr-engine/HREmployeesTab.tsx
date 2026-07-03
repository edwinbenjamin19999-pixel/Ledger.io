import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Props {
  companyId: string;
}

const AVATAR_PALETTE = [
  "#0B4F6C", "#5DCAA5", "#EF9F27", "#85B7EB", "#A78BFA",
  "#F09595", "#22A06B", "#0C447C", "#412402", "#475569",
];

function getInitials(first?: string | null, last?: string | null) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

export function HREmployeesTab({ companyId }: Props) {
  const navigate = useNavigate();

  const { data: employees } = useQuery({
    queryKey: ["hr-emps-list", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employment_type, monthly_salary, employment_start, email, phone, is_active")
        .eq("company_id", companyId)
        .order("is_active", { ascending: false })
        .order("first_name");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
          Anställda — översikt
        </div>
        <button
          onClick={() => navigate("/employees")}
          className="text-[12px] px-3 py-[6px] rounded-[8px] bg-[#0B4F6C] text-[#E6F4FA]"
        >
          Hantera i Anställda-modul →
        </button>
      </div>
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] bg-[#F8FAFB]">
              <th className="text-left px-3 py-2 font-medium">Namn</th>
              <th className="text-left px-3 py-2 font-medium">Kontakt</th>
              <th className="text-left px-3 py-2 font-medium">Anst.form</th>
              <th className="text-right px-3 py-2 font-medium">Månadslön</th>
              <th className="text-left px-3 py-2 font-medium">Anställd sedan</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[12px] text-[#94A3B8] py-8">
                  Inga anställda registrerade
                </td>
              </tr>
            )}
            {(employees ?? []).map((e, idx) => (
              <tr
                key={e.id}
                className="border-t-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB] cursor-pointer"
                onClick={() => navigate(`/employees?id=${e.id}`)}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-medium"
                      style={{ background: AVATAR_PALETTE[idx % AVATAR_PALETTE.length] }}
                    >
                      {getInitials(e.first_name, e.last_name)}
                    </div>
                    <span className="text-[13px] text-[#0F172A]">{e.first_name} {e.last_name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-[#475569]">{e.email || e.phone || "—"}</td>
                <td className="px-3 py-2 text-[#475569]">{e.employment_type === "full_time" ? "Heltid" : "Deltid"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {e.monthly_salary ? new Intl.NumberFormat("sv-SE").format(Number(e.monthly_salary)) : "—"}
                </td>
                <td className="px-3 py-2 text-[#475569] tabular-nums">{e.employment_start || "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-[2px] text-[10px]"
                    style={{
                      background: e.is_active ? "#E1F5EE" : "#F1F5F9",
                      color: e.is_active ? "#085041" : "#475569",
                      border: `0.5px solid ${e.is_active ? "#5DCAA5" : "#CBD5E1"}`,
                    }}
                  >
                    {e.is_active ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
