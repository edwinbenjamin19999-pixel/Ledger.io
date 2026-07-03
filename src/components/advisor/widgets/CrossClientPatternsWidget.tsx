import { useFirmPortfolioInsights } from "@/hooks/useFirmPortfolioInsights";
import { Sparkles, AlertTriangle, FileWarning, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CARD_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(15,23,42,0.06)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
};

const ICON: Record<string, typeof Sparkles> = {
  overdue_invoices: Receipt,
  draft_pile: FileWarning,
  stale_books: AlertTriangle,
  anomalies: Sparkles,
};

export const CrossClientPatternsWidget = () => {
  const { data: insights = [], isLoading } = useFirmPortfolioInsights();
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl p-6" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">
            AI-mönster
          </p>
          <h2 className="text-lg font-semibold text-[#0F172A] mt-0.5">
            Tvärgående portfölj
          </h2>
        </div>
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--brand-primary) / 0.1)" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--brand-primary))" }} />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#94A3B8] py-6 text-center">Analyserar portfölj…</p>
      ) : insights.length === 0 ? (
        <p className="text-sm text-[#64748B] py-6 text-center">
          Inga mönster upptäckta. Allt ser stabilt ut.
        </p>
      ) : (
        <div className="space-y-2">
          {insights.map((ins) => {
            const Icon = ICON[ins.kind] ?? Sparkles;
            const tone =
              ins.severity === "critical"
                ? "border-[#F4C8C8] bg-rose-50/50"
                : ins.severity === "warning"
                  ? "border-[#F0DDB7] bg-amber-50/50"
                  : "border-[#E2E8F0] bg-[#F8FAFC]";
            return (
              <button
                key={ins.kind}
                onClick={() => navigate("/wl/app/clients")}
                className={`w-full text-left rounded-2xl border p-3.5 hover:shadow-sm transition-all ${tone}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-[#0F172A]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#0F172A]">{ins.title}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{ins.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
