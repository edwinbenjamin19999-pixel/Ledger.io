import { TrendingDown, AlertOctagon, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFirmPortfolioInsights } from "@/hooks/useFirmPortfolioInsights";

export const AIInsightsStrip = () => {
  const { data: insights = [] } = useFirmPortfolioInsights();
  const navigate = useNavigate();

  const risk = insights.find((i) => i.severity === "critical");
  const margin =
    insights.find((i) => i.kind === "anomalies") ??
    insights.find((i) => i.kind === "stale_books") ??
    insights.find((i) => i.kind === "draft_pile");

  const cards = [
    risk && {
      key: "risk",
      tone: "rose" as const,
      icon: AlertOctagon,
      title: "Riskklienter",
      value: risk.count,
      desc: risk.description,
    },
    margin && {
      key: "margin",
      tone: "amber" as const,
      icon: TrendingDown,
      title: margin.title.split(" ").slice(1).join(" ") || "Optimering",
      value: margin.count,
      desc: margin.description,
    },
  ].filter(Boolean) as Array<{
    key: string;
    tone: "rose" | "amber";
    icon: typeof AlertOctagon;
    title: string;
    value: number;
    desc: string;
  }>;

  if (cards.length === 0) {
    return (
      <div
        className="rounded-3xl bg-white p-6 text-sm text-[#94A3B8] text-center"
        style={{ border: "1px solid rgba(15,23,42,0.06)" }}
      >
        Inga AI-insikter just nu — allt ser bra ut.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const tone =
          c.tone === "rose"
            ? { iconBg: "bg-[#FCE8E8]", iconText: "text-[#7A1A1A]", border: "rgb(254,205,211)" }
            : { iconBg: "bg-[#FAEEDA]", iconText: "text-[#7A5417]", border: "rgb(253,230,138)" };
        return (
          <button
            key={c.key}
            onClick={() => navigate("/wl/app/insights")}
            className="text-left group rounded-3xl bg-white p-5 transition-all hover:-translate-y-0.5"
            style={{
              border: `1px solid ${tone.border}`,
              boxShadow: "0 12px 32px rgba(15,23,42,0.05)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#64748B]">
                AI-insikt
              </span>
              <div className={`h-8 w-8 rounded-xl ${tone.iconBg} ${tone.iconText} flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0F172A] tabular-nums">{c.value}</span>
              <span className="text-sm font-semibold text-[#0F172A]">{c.title}</span>
            </div>
            <p className="mt-1.5 text-xs text-[#64748B]">{c.desc}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity">
              Visa <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
