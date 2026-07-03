import { Megaphone, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BlockShell } from "./BlockShell";
import { cn } from "@/lib/utils";

interface Surface {
  id: string;
  destination: string;
  route: string;
  format: "insight_card" | "banner" | "approval" | "explanation" | "notification";
  urgency: "low" | "medium" | "high";
  agent: string;
}

const SURFACES: Surface[] = [
  { id: "1", destination: "Dashboard insight card", route: "/dashboard", format: "insight_card", urgency: "medium", agent: "AI CFO" },
  { id: "2", destination: "Financial Analysis variance", route: "/financial-analysis", format: "insight_card", urgency: "high", agent: "AI CFO" },
  { id: "3", destination: "AR warning banner", route: "/ar-agent", format: "banner", urgency: "high", agent: "AR Controller" },
  { id: "4", destination: "Verifikationer auto-post", route: "/verifikationer", format: "approval", urgency: "medium", agent: "Bokföringsagent" },
  { id: "5", destination: "Moms readiness panel", route: "/moms", format: "explanation", urgency: "high", agent: "VAT Engine" },
  { id: "6", destination: "Cashflow forecast scenario", route: "/cashflow-forecast", format: "insight_card", urgency: "medium", agent: "Cashflow Analyst" },
  { id: "7", destination: "Document extraction queue", route: "/dokument", format: "approval", urgency: "low", agent: "Document Intelligence" },
  { id: "8", destination: "AGI submission readiness", route: "/agi", format: "explanation", urgency: "high", agent: "Payroll Monitor" },
];

const FORMAT_LABEL: Record<Surface["format"], string> = {
  insight_card: "Insight card",
  banner: "Banner",
  approval: "Approval queue",
  explanation: "Explanation block",
  notification: "Notification",
};

export function OutputSurfaceMap() {
  const navigate = useNavigate();

  return (
    <BlockShell
      label="L4 · OUTPUT SURFACES"
      title="Var insikter ytas i produkten"
      subtitle={`${SURFACES.length} aktiva ytor över ${new Set(SURFACES.map((s) => s.agent)).size} agenter`}
      icon={Megaphone}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SURFACES.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(s.route)}
            className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200/70 bg-white hover:border-[#3b82f6] hover:bg-blue-50/30 transition-colors text-left"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{s.destination}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{s.route}</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {FORMAT_LABEL[s.format]}
                </span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  s.urgency === "high" && "bg-[#FCE8E8] text-[#7A1A1A]",
                  s.urgency === "medium" && "bg-[#FAEEDA] text-[#7A5417]",
                  s.urgency === "low" && "bg-slate-50 text-slate-600",
                )}>
                  {s.urgency}
                </span>
                <span className="text-[10px] text-slate-500">{s.agent}</span>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3b82f6] flex-shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </BlockShell>
  );
}
