import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Play, Beaker, CheckCircle2, ArrowLeft, Undo2 } from "lucide-react";
import type { ActionableInsight } from "@/lib/cashflow/types";
import { useCashflowAction } from "@/hooks/useCashflowAction";
import type { SimulatedAction } from "@/lib/cashflow/simulate";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

interface Props {
  insight: ActionableInsight | null;
  companyId: string;
  /** Avg daily outflow for runway delta calculations. */
  avgDailyOutflow?: number;
  onClose: () => void;
  onSimulate: (action: SimulatedAction) => void;
  onExecuted: () => void;
}

type Stage = "preview" | "progress" | "result";

export function ActionExecuteSheet({
  insight,
  companyId,
  avgDailyOutflow = 0,
  onClose,
  onSimulate,
  onExecuted,
}: Props) {
  const { invoke } = useCashflowAction();
  const [stage, setStage] = useState<Stage>("preview");
  const [executing, setExecuting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  if (!insight) return null;

  const primary = insight.actions[0];
  const expected7d = Math.round(insight.impactSek * 0.6);
  const expected14d = Math.round(insight.impactSek * 0.85);
  const weighted = insight.impactSek * insight.confidence;
  const runwayDelta = avgDailyOutflow > 0 ? Math.round(weighted / avgDailyOutflow) : 0;
  const riskReduction = Math.round(insight.confidence * 100);

  const reset = () => {
    setStage("preview");
    setExecuting(false);
    setResultMsg(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleExecute = async () => {
    if (!primary) return;
    setStage("progress");
    setExecuting(true);
    try {
      const res = await invoke(primary, {
        companyId,
        insightId: insight.id,
        insightKind: insight.kind,
      });
      setResultMsg(res.message ?? "Åtgärd utförd");
      setStage("result");
      if (res.ok) onExecuted();
    } catch (e) {
      setResultMsg((e as Error).message);
      setStage("result");
    } finally {
      setExecuting(false);
    }
  };

  const handleSimulate = () => {
    onSimulate({
      id: `sim-${insight.id}-${Date.now()}`,
      kind:
        insight.kind === "ar_overdue"
          ? "send_reminders"
          : insight.kind === "ap_pressure"
            ? "delay_ap"
            : "negotiate_terms",
      label: insight.title,
      expectedImpactSek: insight.impactSek,
      daysToImpact: 7,
      confidence: insight.confidence,
      riskLevel: insight.riskLevel,
      insightId: insight.id,
    });
    close();
  };

  return (
    <Sheet open={!!insight} onOpenChange={(v) => !v && close()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {stage === "preview" && "Detta händer"}
            {stage === "progress" && "Utför åtgärd…"}
            {stage === "result" && (
              <>
                <CheckCircle2 className="h-5 w-5 text-[#085041]" />
                Klart
              </>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs">{insight.title}</SheetDescription>
        </SheetHeader>

        {/* PREVIEW */}
        {stage === "preview" && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Påverkan</div>
                <div className="mt-1 text-base font-semibold tabular-nums text-[#085041]">
                  +{fmt(insight.impactSek)}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Runway</div>
                <div className="mt-1 text-base font-semibold tabular-nums text-[#3b82f6]">
                  {runwayDelta >= 0 ? "+" : ""}
                  {runwayDelta} d
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk ↓</div>
                <div className="mt-1 text-base font-semibold tabular-nums">{riskReduction}%</div>
              </Card>
            </div>

            <Card className="p-4 bg-[#EFF6FF] border-[#C8DDF5]">
              <div className="text-[11px] uppercase tracking-wide text-[#3b82f6] dark:text-[#1E3A5F] mb-2">
                Förväntad effekt
              </div>
              <ul className="space-y-1 text-xs">
                <li className="flex justify-between">
                  <span>Inom 7 dagar</span>
                  <span className="tabular-nums font-semibold text-[#085041]">
                    +{fmt(expected7d)} kr
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Inom 14 dagar</span>
                  <span className="tabular-nums font-semibold text-[#085041]">
                    +{fmt(expected14d)} kr
                  </span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Säkerhet</span>
                  <span className="tabular-nums">{Math.round(insight.confidence * 100)}%</span>
                </li>
              </ul>
            </Card>

            <Card className="p-3 bg-[#FAEEDA] border-[#F0DDB7]">
              <div className="text-[11px] uppercase tracking-wide text-[#7A5417] dark:text-[#C28A2B] mb-1">
                Om det inte slår in
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Värsta fall: kassan ökar inte som förväntat — ingen permanent förändring av leverantörsavtal eller bokföring. Åtgärden kan ångras inom 30 sekunder via aktivitetsfeeden.
              </p>
            </Card>

            {primary && (
              <div className="text-xs text-muted-foreground">
                Åtgärd: <span className="text-foreground font-medium">{primary.label}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleSimulate}>
                <Beaker className="h-3.5 w-3.5 mr-1.5" />
                Lägg till i förhandsvisning
              </Button>
              <Button
                className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
                onClick={handleExecute}
                disabled={executing || !primary}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Godkänn & utför
              </Button>
            </div>
          </div>
        )}

        {/* PROGRESS */}
        {stage === "progress" && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
            <p className="text-sm text-muted-foreground">Utför {primary?.label?.toLowerCase()}…</p>
          </div>
        )}

        {/* RESULT */}
        {stage === "result" && (
          <div className="mt-5 space-y-4">
            <Card className="p-5 bg-[#E1F5EE] border-[#BFE6D6] text-center">
              <CheckCircle2 className="h-8 w-8 text-[#085041] mx-auto mb-2" />
              <div className="text-sm font-semibold text-[#085041] dark:text-emerald-300">
                {resultMsg ?? "Åtgärd utförd"}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Förväntad effekt: +{fmt(insight.impactSek)} kr · Runway {runwayDelta >= 0 ? "+" : ""}
                {runwayDelta} d
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStage("preview")}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Ny åtgärd
              </Button>
              <Button variant="outline" className="flex-1">
                <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                Ångra
              </Button>
              <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white" onClick={close}>
                Klart
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
