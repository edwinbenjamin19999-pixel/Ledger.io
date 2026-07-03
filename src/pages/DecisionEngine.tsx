/**
 * /decision-engine — unified Budget · Forecast · Scenarios workspace.
 *
 * Layout:
 *   ModeBar (sticky)
 *   UnifiedKPIStrip
 *   UnifiedMainGraph
 *   AIPriorityPanel + DriverImpactPanel
 *   ModeDrivenTable
 *   LiveSimulationPanel (right sheet)
 */
import { useState } from "react";
import { Brain, Play } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { DecisionEngineProvider, useDecisionEngine } from "@/contexts/DecisionEngineContext";
import { ModeBar } from "@/components/decision-engine/ModeBar";
import { UnifiedKPIStrip } from "@/components/decision-engine/UnifiedKPIStrip";
import { UnifiedMainGraph } from "@/components/decision-engine/UnifiedMainGraph";
import { AIPriorityPanel } from "@/components/decision-engine/AIPriorityPanel";
import { DriverImpactPanel } from "@/components/decision-engine/DriverImpactPanel";
import { ModeDrivenTable } from "@/components/decision-engine/ModeDrivenTable";
import { LiveSimulationPanel } from "@/components/decision-engine/LiveSimulationPanel";
import { toast } from "sonner";

function DecisionEngineInner() {
  const { openSimulation } = useDecisionEngine();
  const [, setSelectedRow] = useState<string | null>(null);

  const headerActions = (
    <Button onClick={openSimulation} className="bg-[hsl(192_91%_36%)] hover:bg-[hsl(192_91%_30%)] text-white">
      <Play className="h-4 w-4 mr-2" />
      Simulera
    </Button>
  );

  return (
    <PageLayout
      title="Beslutsmotor"
      subtitle="Unified Budget · Forecast · Scenarios — varje siffra leder till handling"
      actions={headerActions}
    >
      <ModeBar />
      <UnifiedKPIStrip onDrilldown={(k) => toast.message(`Drilldown: ${k}`, { description: "Detaljvy kommer snart" })} />
      <UnifiedMainGraph onBarClick={(m) => toast.message(`Månad ${m + 1} vald`, { description: "Tabellen filtreras nedan" })} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AIPriorityPanel />
        <DriverImpactPanel />
      </div>
      <ModeDrivenTable onRowClick={(label) => setSelectedRow(label)} />
      <LiveSimulationPanel />
    </PageLayout>
  );
}

export default function DecisionEngine() {
  return (
    <DecisionEngineProvider>
      <DecisionEngineInner />
    </DecisionEngineProvider>
  );
}
