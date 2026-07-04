import { Sparkles, ChevronRight, AlertTriangle, TrendingUp, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FirmClientEnriched } from "@/hooks/useFirmDashboard";

interface AdvisorAIOverviewProps {
  clients: FirmClientEnriched[];
  onSeeAll: () => void;
}

interface Insight {
  text: string;
  Icon: typeof AlertTriangle;
  tone: "critical" | "warning" | "info";
}

function buildInsights(clients: FirmClientEnriched[]): Insight[] {
  const out: Insight[] = [];
  const overdue = clients.filter((c) => c.overdueInvoices > 0);
  if (overdue.length > 0) {
    out.push({
      text: `${overdue.length} ${overdue.length === 1 ? "klient har" : "klienter har"} förfallna kundfakturor`,
      Icon: AlertTriangle,
      tone: "critical",
    });
  }
  const heavyDrafts = clients.filter((c) => c.draftEntries > 10);
  if (heavyDrafts.length > 0) {
    out.push({
      text: `${heavyDrafts.length} klienter har >10 utkast som väntar på granskning`,
      Icon: FileWarning,
      tone: "warning",
    });
  }
  const stable = clients.filter((c) => c.urgency === "low").length;
  if (stable > 0 && clients.length > 0) {
    const pct = Math.round((stable / clients.length) * 100);
    out.push({
      text: `${pct}% av portfolion är i friskt skick denna månad`,
      Icon: TrendingUp,
      tone: "info",
    });
  }
  return out.slice(0, 3);
}

export const AdvisorAIOverview = ({ clients, onSeeAll }: AdvisorAIOverviewProps) => {
  const insights = buildInsights(clients);
  if (insights.length === 0) return null;

  return (
    <div className="px-4">
      <div className={cn(
        "rounded-2xl p-4 backdrop-blur-xl border border-white/10",
        "bg-gradient-to-br from-[hsl(var(--brand-primary)/0.12)] via-white/[0.04] to-white/[0.02]",
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#3b82f6]/30 to-blue-500/30 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-[#3b82f6]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-none">AI-översikt</div>
              <div className="text-[10px] text-white/40 mt-0.5">Beta</div>
            </div>
          </div>
        </div>
        <ul className="space-y-2">
          {insights.map((ins, i) => {
            const Icon = ins.Icon;
            const tone = ins.tone === "critical" ? "text-rose-300"
              : ins.tone === "warning" ? "text-amber-300"
              : "text-[#3b82f6]";
            return (
              <li key={i} className="flex items-start gap-2.5">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0", tone)} />
                <span className="text-xs text-white/80 leading-relaxed">{ins.text}</span>
              </li>
            );
          })}
        </ul>
        <button
          onClick={onSeeAll}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-[#3b82f6] hover:text-[#3b82f6] active:scale-[0.98] transition-all py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08]"
        >
          Visa alla insikter <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
