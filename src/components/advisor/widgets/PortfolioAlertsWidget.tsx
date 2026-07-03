import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { getTopIssue } from "@/hooks/useClientIssues";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

const CARD_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(15,23,42,0.06)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
};

export const PortfolioAlertsWidget = () => {
  const { clients } = useAdvisorContext();
  const { setActiveClient } = useAdvisorActiveClient();
  const navigate = useNavigate();

  const sorted = [...clients]
    .sort((a, b) => b.alerts - a.alerts)
    .slice(0, 8);

  const handleOpen = (id: string, name: string, org_number: string) => {
    setActiveClient({ id, name, orgNumber: org_number });
    navigate(`/wl/app/clients/${id}`);
  };

  return (
    <div className="rounded-3xl p-6" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">
            Klientportfölj
          </p>
          <h2 className="text-lg font-semibold text-[#0F172A] mt-0.5">
            Sorterad efter brådska
          </h2>
        </div>
        <button
          onClick={() => navigate("/wl/app/clients")}
          className="text-xs font-semibold hover:opacity-80"
          style={{ color: "hsl(var(--brand-primary))" }}
        >
          Alla →
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-[#64748B] py-6 text-center">Inga klienter ännu.</p>
      ) : (
        <div className="divide-y divide-[#F1F5F9]">
          {sorted.map((c) => {
            const issue = getTopIssue(c);
            const dot =
              c.urgency === "high"
                ? "bg-rose-500"
                : c.urgency === "medium"
                  ? "bg-amber-500"
                  : "bg-emerald-500";
            return (
              <button
                key={c.id}
                onClick={() => handleOpen(c.id, c.name, c.org_number)}
                className="w-full py-3 flex items-center justify-between text-left hover:bg-[#F8FAFC] -mx-2 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-8 w-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-[#64748B]" />
                    <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white ${dot}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#0F172A] truncate">{c.name}</div>
                    <div className="text-[11px] text-[#94A3B8] truncate">
                      {issue ? issue.text : "Inga aktiva ärenden"}
                    </div>
                  </div>
                </div>
                <span
                  className="text-sm font-semibold tabular-nums shrink-0 ml-3"
                  style={{ color: "hsl(var(--brand-primary))" }}
                >
                  {c.alerts > 0 ? c.alerts : "✓"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
