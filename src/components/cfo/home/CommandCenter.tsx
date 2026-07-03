import { useState } from "react";
import { useBoardSummary } from "@/hooks/useBoardSummary";
import { useCFODashboard } from "@/hooks/useCFODashboard";
import { useCFOPriorities } from "@/hooks/useCFOPriorities";
import { CommandHeader } from "./CommandHeader";
import { ExecutiveHero } from "./ExecutiveHero";
import { TopPrioritiesSection } from "./TopPrioritiesSection";
import { KPIOverviewGrid } from "./KPIOverviewGrid";
import { ActionsQueue } from "./ActionsQueue";
import { CashRunwayPanel } from "./CashRunwayPanel";
import { AlertsStrip } from "./AlertsStrip";
import { LiveActivityFeed } from "@/components/ai/LiveActivityFeed";
import { CFODashboard } from "@/components/cfo/CFODashboard";
import { FinOSCrossModulePanel } from "@/components/finos/FinOSCrossModulePanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";

interface Props {
  companyId: string;
  companyName?: string;
  userName?: string;
}

export function CommandCenter({ companyId, companyName, userName }: Props) {
  const { data: summary, loading: summaryLoading, refresh } = useBoardSummary(companyId ? [companyId] : [], "BOARD", "month");
  const { data: cfo } = useCFODashboard(companyId);
  const { data: priorities } = useCFOPriorities(companyId);
  const [toolsOpen, setToolsOpen] = useState(false);

  const criticalCount = priorities?.counts?.critical ?? 0;

  // Fallback verdict from cfo data if summary not ready
  const fallbackHeadline =
    cfo && cfo.runway < 3 ? "Stark verksamhet, men akut likviditetsrisk"
    : cfo && cfo.ebitdaMargin < 5 ? "Volym ok — marginalen behöver åtgärdas"
    : cfo && cfo.revenueGrowth < 0 ? "Intäkterna avtar — analys krävs"
    : cfo && cfo.ebitdaMargin >= 20 ? "Stark lönsamhet — bevara momentum"
    : "Verksamheten är stabil";

  const fallbackBullets = cfo ? [
    `Intäkter ${cfo.revenueGrowth >= 0 ? "+" : ""}${cfo.revenueGrowth.toFixed(1)}% MoM`,
    `EBITDA-marginal ${cfo.ebitdaMargin.toFixed(1)}%`,
    `Runway ${cfo.runway} månader`,
    criticalCount > 0 ? `${criticalCount} kritiska prioriteringar` : "Inga kritiska prioriteringar",
  ] : [];

  const tone = criticalCount > 0 ? "risk" : cfo && cfo.ebitdaMargin >= 20 ? "strong" : cfo && cfo.runway < 6 ? "watch" : "neutral";
  const headline = summary?.summary || fallbackHeadline;
  const bullets = summary?.changes?.length
    ? summary.changes.slice(0, 4).map((c) => `${c.label}: ${c.delta_pct ? `${c.delta_pct > 0 ? "+" : ""}${c.delta_pct.toFixed(1)}%` : ""} — ${c.explanation}`)
    : fallbackBullets;
  const recommendation = summary?.opportunities?.[0]?.action || (priorities?.top?.[0]?.title);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 dark:from-[#0a0e1a] dark:via-[#0f1428] dark:to-[#1a1230]">
      <CommandHeader
        companyName={companyName}
        updatedAt={summary?.updated_at || new Date()}
        confidencePct={priorities?.top?.[0]?.confidence ? priorities.top[0].confidence * 100 : null}
        criticalCount={criticalCount}
        onRefresh={refresh}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8">
        <div className="animate-fade-in">
          <ExecutiveHero
            loading={summaryLoading && !cfo}
            headline={headline}
            bullets={bullets}
            recommendation={recommendation}
            confidence={priorities?.top?.[0]?.confidence ? priorities.top[0].confidence * 100 : null}
            tone={tone as "strong" | "watch" | "risk" | "neutral"}
          />
        </div>

        <div className="animate-fade-in" style={{ animationDelay: "60ms" }}>
          <TopPrioritiesSection companyId={companyId} />
        </div>

        {/* FinOS unified cross-module insight layer */}
        <div className="animate-fade-in" style={{ animationDelay: "90ms" }}>
          <FinOSCrossModulePanel
            companyId={companyId}
            title="Plattformsinsikter"
            hint="Samma format i alla moduler · top 5"
            limit={5}
          />
        </div>

        <div className="animate-fade-in" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">KPI-översikt</h2>
            <span className="text-[11px] text-muted-foreground">Klicka för analys</span>
          </div>
          <KPIOverviewGrid companyId={companyId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "180ms" }}>
          <ActionsQueue companyId={companyId} />
          <CashRunwayPanel companyId={companyId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "240ms" }}>
          <AlertsStrip companyId={companyId} />
          <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
            <div className="p-5 md:p-6 border-b border-slate-200/60 dark:border-slate-700/60">
              <h3 className="font-semibold tracking-tight">Live-aktivitet</h3>
              <p className="text-xs text-muted-foreground">Vad AI och systemet gör just nu</p>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              <LiveActivityFeed companyId={companyId} />
            </div>
          </section>
        </div>

        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between hover:bg-white/60 dark:hover:bg-slate-900/40">
              <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Wrench className="h-4 w-4" /> Verktyg: Varningar · Briefing · Chatt · Styrelse
              </span>
              {toolsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <CFODashboard companyId={companyId} userName={userName} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
