import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBureauSync } from "@/hooks/useBureauSync";

interface Priority {
  severity: "red" | "amber" | "green";
  client: string;
  issue: string;
  route: string;
}

const sevColor = { red: "#E24B4A", amber: "#EF9F27", green: "#1D9E75" } as const;

const fmtTime = (d: Date | null) =>
  d ? d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Dark AI priorities panel — replaces the old green hero banner.
 * Surfaces the 5 most urgent items computed from useBureauSync.
 */
export const BureauAIPrioritiesPanel = () => {
  const { summaries, lastUpdated } = useBureauSync();
  const navigate = useNavigate();

  const priorities = useMemo<Priority[]>(() => {
    const today = new Date();
    const inDays = (d: string | null) =>
      d ? Math.ceil((new Date(d).getTime() - today.getTime()) / (1000 * 3600 * 24)) : Infinity;

    const items: Priority[] = [];
    for (const s of summaries) {
      if (s.overdue_customer_invoices_count > 0) {
        items.push({
          severity: s.overdue_customer_invoices_amount > 100_000 ? "red" : "amber",
          client: s.company_name,
          issue: `${s.overdue_customer_invoices_count} förfallna kundfakturor`,
          route: `/wl/app/clients/${s.company_id}`,
        });
      }
      if (s.vat_next_deadline && inDays(s.vat_next_deadline) <= 3) {
        items.push({
          severity: "red",
          client: s.company_name,
          issue: `Moms förfaller om ${inDays(s.vat_next_deadline)} dag(ar)`,
          route: `/wl/app/clients/${s.company_id}`,
        });
      }
      if (s.missing_receipts_count > 5) {
        items.push({
          severity: "amber",
          client: s.company_name,
          issue: `${s.missing_receipts_count} verifikationer saknar underlag`,
          route: `/wl/app/clients/${s.company_id}`,
        });
      }
    }
    items.sort((a, b) => (a.severity === "red" ? -1 : 1) - (b.severity === "red" ? -1 : 1));
    return items.slice(0, 5);
  }, [summaries]);

  return (
    <div
      className="rounded-[12px] p-[14px] mb-3"
      style={{ background: "#0B1929", border: "0.5px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="h-[18px] w-[18px] rounded-full flex items-center justify-center"
            style={{ background: "#0B4F6C" }}
          >
            <span className="h-[7px] w-[7px] rounded-full bg-[#3b82f6]" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-white/60">
            AI-prioriteringar idag
          </span>
        </div>
        <span className="text-[10px] text-white/30">Senast uppdaterad {fmtTime(lastUpdated)}</span>
      </div>

      {priorities.length === 0 ? (
        <div className="flex items-center gap-2 py-1.5">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: sevColor.green }} />
          <span className="text-[12px] text-white/70">
            Inga kritiska åtgärder — din portfölj ser bra ut idag.
          </span>
        </div>
      ) : (
        <ul>
          {priorities.map((p, i) => (
            <li
              key={i}
              className="flex items-center gap-[10px] py-[6px]"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: sevColor[p.severity] }} />
              <span className="text-[12px] font-medium text-white/80">{p.client}</span>
              <span className="text-[11px] text-white/50 flex-1 truncate">{p.issue}</span>
              <button
                onClick={() => navigate(p.route)}
                className="rounded-[6px] text-[10px] text-white/60 px-[7px] py-[2px] hover:bg-white/[0.08] hover:text-white"
                style={{ background: "transparent", border: "0.5px solid rgba(255,255,255,0.20)" }}
              >
                Öppna
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => navigate("/wl/app/insights")}
        className="mt-2.5 text-[11px] text-[#3b82f6] hover:underline"
      >
        Visa fullständig AI-logg →
      </button>
    </div>
  );
};
