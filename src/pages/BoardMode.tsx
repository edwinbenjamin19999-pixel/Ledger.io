import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BoardCanvas } from "@/components/board-mode/BoardCanvas";
import { ExecutiveSummaryEngine } from "@/components/board-mode/ExecutiveSummaryEngine";
import { BoardKPIRow } from "@/components/board-mode/BoardKPIRow";
import { WhatChangedPanel } from "@/components/board-mode/WhatChangedPanel";
import { RiskPanel } from "@/components/board-mode/RiskPanel";
import { OpportunitiesPanel } from "@/components/board-mode/OpportunitiesPanel";
import { BoardActionLayer } from "@/components/board-mode/BoardActionLayer";
import { EntityBreakdownPanel } from "@/components/board-mode/EntityBreakdownPanel";
import { BoardModeSwitcher } from "@/components/board-mode/BoardModeSwitcher";
import { BoardEntitySelector } from "@/components/board-mode/BoardEntitySelector";
import { BoardExportMenu } from "@/components/board-mode/BoardExportMenu";
import { BoardDrilldownDrawer, type DrilldownContext } from "@/components/board-mode/BoardDrilldownDrawer";
import { PeriodComparisonChip } from "@/components/board-mode/PeriodComparisonChip";
import { BoardModeToggle } from "@/components/board-mode/BoardModeToggle";
import { useBoardSummary, type ComparisonPeriod, type BoardKPI, type BoardRisk } from "@/hooks/useBoardSummary";
import { useBoardModeState } from "@/hooks/useBoardModeState";
import { useBoardFeedback } from "@/hooks/useBoardFeedback";
import { useCanonicalBoardRisks, mergeBoardRisks } from "@/hooks/useCanonicalBoardRisks";
import { MODE_PROFILES, type BoardModeId } from "@/lib/board-mode/modeProfiles";

const periodToLegacy = (c: "month" | "year" | "custom"): ComparisonPeriod => {
  if (c === "year") return "last_year";
  if (c === "custom") return "budget";
  return "last_month";
};

const BoardMode = () => {
  const { state, setMode, setSelectedCompanyIds, setComparison } = useBoardModeState();
  const [drilldown, setDrilldown] = useState<DrilldownContext | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [narrativeVariant, setNarrativeVariant] = useState<BoardModeId>(state.mode);

  // Bootstrap selectedCompanyIds if missing
  useEffect(() => {
    if (state.selectedCompanyIds.length > 0) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (data?.company_id) setSelectedCompanyIds([data.company_id]);
    })();
  }, [state.selectedCompanyIds.length, setSelectedCompanyIds]);

  // Reset narrative variant to active mode when mode changes
  useEffect(() => { setNarrativeVariant(state.mode); }, [state.mode]);

  const { data, loading, pulsing, refresh } = useBoardSummary(
    state.selectedCompanyIds,
    state.mode,
    periodToLegacy(state.comparison)
  );

  const { log } = useBoardFeedback(state.selectedCompanyIds[0] || null);
  useEffect(() => { if (data) log("viewed"); }, [data?.updated_at]);

  // Kanoniska risker från samma källa som Dashboard (computeUnifiedRunway).
  // Säkerställer att Styrelseläge speglar Dashboardens kritiska likviditetsrisker
  // och aldrig påstår "allt under kontroll" när runway = 0.
  const { risks: canonicalRisks } = useCanonicalBoardRisks(state.selectedCompanyIds[0] || null);
  const mergedRisks = mergeBoardRisks(canonicalRisks, data?.risks || []);

  const profile = MODE_PROFILES[state.mode];

  const handleKPIClick = (kpi: BoardKPI) => {
    if (kpi.value === null) return;
    setDrilldown({
      type: "kpi",
      key: kpi.key,
      label: kpi.label,
      companyId: state.selectedCompanyIds[0] || null,
    });
    setDrillOpen(true);
  };

  const handleRiskClick = (risk: BoardRisk) => {
    log("drilled_in", risk.id);
    setDrilldown({
      type: "risk",
      key: risk.id,
      label: risk.title,
      companyId: state.selectedCompanyIds[0] || null,
    });
    setDrillOpen(true);
  };

  const handleSpecialAction = (key: string) => {
    if (key === "export-board" || key === "export-investor") {
      // Export menu lives in header; just toast hint
      const btn = document.querySelector<HTMLButtonElement>("[data-board-export]");
      btn?.click();
    } else if (key === "regenerate-investor") {
      setNarrativeVariant("INVESTOR");
      refresh("INVESTOR");
    }
  };

  return (
    <BoardCanvas>
      {/* Top header — mode switcher dominant */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-400 font-medium">
            Executive Mode
          </p>
          <BoardModeSwitcher value={state.mode} onChange={setMode} />
          <div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight mt-2">
              {profile.label}
            </h1>
            <p className="text-gray-500 text-sm mt-1 max-w-xl">{profile.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BoardEntitySelector
            selectedIds={state.selectedCompanyIds}
            onChange={setSelectedCompanyIds}
          />
          <PeriodComparisonChip
            value={periodToLegacy(state.comparison)}
            onChange={(v) => setComparison(v === "last_year" ? "year" : v === "budget" ? "custom" : "month")}
          />
          <span data-board-export>
            <BoardExportMenu data={data} summaryText={exportText || data?.summary || ""} />
          </span>
          <BoardModeToggle />
        </div>
      </div>

      <ExecutiveSummaryEngine
        summary={data?.summary || ""}
        updatedAt={data?.updated_at || ""}
        pulsing={pulsing}
        loading={loading}
        mode={state.mode}
        narrativeVariant={narrativeVariant}
        onRegenerate={(variant) => {
          setNarrativeVariant(variant);
          refresh(variant);
        }}
        onUseInExport={(text) => { setExportText(text); }}
      />

      <BoardKPIRow kpis={data?.kpis || []} loading={loading} onKPIClick={handleKPIClick} />

      {state.entityScope === "group" && data?.per_entity_breakdown && data.per_entity_breakdown.length > 0 && (
        <EntityBreakdownPanel breakdown={data.per_entity_breakdown} />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <WhatChangedPanel changes={data?.changes || []} />
        <RiskPanel
          risks={mergedRisks}
          onDrilldown={(id) => {
            const risk = mergedRisks.find(r => r.id === id);
            if (risk) handleRiskClick(risk);
          }}
        />
      </div>


      <OpportunitiesPanel opportunities={data?.opportunities || []} />

      <BoardActionLayer mode={state.mode} onSpecialAction={handleSpecialAction} />

      <BoardDrilldownDrawer
        open={drillOpen}
        onOpenChange={setDrillOpen}
        context={drilldown}
      />
    </BoardCanvas>
  );
};

export default BoardMode;
