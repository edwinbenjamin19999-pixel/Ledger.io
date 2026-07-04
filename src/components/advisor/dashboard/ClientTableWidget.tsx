import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ArrowRight } from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useClientRevenue } from "@/hooks/useClientRevenue";
import type { FirmClientEnriched } from "@/hooks/useFirmDashboard";

type SortKey = "name" | "status" | "risk" | "assigned" | "revenue";

const URGENCY_LABEL = {
  high: { text: "Kritisk", style: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]" },
  medium: { text: "Bevakas", style: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" },
  low: { text: "Aktiv", style: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
} as const;

const RiskBar = ({ alerts }: { alerts: number }) => {
  const filled = alerts === 0 ? 0 : alerts <= 2 ? 1 : alerts <= 5 ? 2 : 3;
  const color = filled === 0 ? "bg-emerald-500" : filled === 1 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-3 rounded-full ${i < filled ? color : "bg-[#E2E8F0]"}`}
        />
      ))}
    </div>
  );
};

const fmtSEK = (n: number | undefined) => {
  if (n === undefined || n === null) return "—";
  if (n === 0) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
};

export const ClientTableWidget = () => {
  const { clients } = useAdvisorContext();
  const { setActiveClient } = useAdvisorActiveClient();
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "risk",
    dir: "desc",
  });

  const companyIds = useMemo(() => clients.map((c) => c.id), [clients]);
  const { data: revenueMap } = useClientRevenue(companyIds);

  const rows = useMemo(() => {
    const list = clients.map((c) => ({
      ...c,
      assignedTo: "—" as string, // assigned_to not selected in current hook
      revenue: revenueMap?.get(c.id),
    }));
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "status": {
          const order = { high: 3, medium: 2, low: 1 } as const;
          return (order[a.urgency] - order[b.urgency]) * dir;
        }
        case "risk":
          return (a.alerts - b.alerts) * dir;
        case "assigned":
          return a.assignedTo.localeCompare(b.assignedTo) * dir;
        case "revenue":
          return ((a.revenue ?? -1) - (b.revenue ?? -1)) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [clients, revenueMap, sort]);

  const visible = rows.slice(0, 8);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const openClient = (c: FirmClientEnriched) => {
    setActiveClient({ id: c.id, name: c.name, orgNumber: c.org_number });
    navigate(`/wl/app/clients/${c.id}`);
  };

  const Th = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th className={`py-3 px-4 text-${align}`}>
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-bold text-[#94A3B8] hover:text-[#0F172A]"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div
      className="rounded-3xl bg-white overflow-hidden"
      style={{
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 30px 80px rgba(15,23,42,0.06)",
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#F1F5F9]">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">Klienter</h3>
          <p className="text-xs text-[#94A3B8]">Sorterat efter risk · klicka för att öppna</p>
        </div>
        <span className="text-xs text-[#64748B] tabular-nums">{clients.length} totalt</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
            <tr>
              <Th k="name" label="Klient" />
              <Th k="status" label="Status" />
              <Th k="risk" label="Risk" />
              <Th k="assigned" label="Ansvarig" />
              <Th k="revenue" label="Omsättning 12m" align="right" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#94A3B8] text-sm">
                  Inga klienter ännu
                </td>
              </tr>
            )}
            {visible.map((c) => {
              const u = URGENCY_LABEL[c.urgency];
              return (
                <tr
                  key={c.id}
                  onClick={() => openClient(c)}
                  className="border-b border-[#F8FAFC] last:border-0 hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#0F172A]">{c.name}</div>
                    <div className="text-[11px] text-[#94A3B8]">{c.org_number}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.style}`}>
                      {u.text}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <RiskBar alerts={c.alerts} />
                  </td>
                  <td className="py-3 px-4 text-[#64748B]">{c.assignedTo}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#0F172A]">
                    {fmtSEK(c.revenue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {clients.length > 8 && (
        <div className="px-5 py-3 border-t border-[#F1F5F9] bg-[#F8FAFC]">
          <button
            onClick={() => navigate("/wl/app/clients")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F172A] hover:opacity-80"
          >
            Visa alla {clients.length} klienter <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};
