/**
 * ApplyToForecastDialog — promote a scenario into a labelled forecast version (P1–P4 / custom).
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";
import type { ScenarioRunResult, ScenarioKpis } from "@/lib/scenarios/scenarioEngine";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  budgetId: string;
  scenarioId: string | null;
  scenarioName: string;
  drivers: BudgetDrivers;
  result: ScenarioRunResult;
  kpis: ScenarioKpis;
  onApplied?: () => void;
}

const TARGETS = [
  { value: "P1", label: "P1 — Q1 prognos" },
  { value: "P2", label: "P2 — H1 prognos" },
  { value: "P3", label: "P3 — Q3 prognos" },
  { value: "P4", label: "P4 — Helår prognos" },
  { value: "custom", label: "Anpassad version" },
];

export function ApplyToForecastDialog({
  open, onOpenChange, companyId, budgetId, scenarioId, scenarioName,
  drivers, result, kpis, onApplied,
}: Props) {
  const [target, setTarget] = useState("P2");
  const [label, setLabel] = useState(`${scenarioName} → ${target}`);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const fiscalYear = new Date().getFullYear();
      const versionLabel = label.trim() || `${scenarioName} → ${target}`;

      const snapshot = {
        source: "scenario",
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        target_period: target,
        drivers,
        kpis,
        rr: result.rr,
        kf: result.kf,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("forecast_versions").insert([{
        company_id: companyId,
        budget_id: budgetId,
        fiscal_year: fiscalYear,
        version_label: versionLabel,
        period: target,
        snapshot: snapshot as never,
        base_confidence: 75,
        locked_by: u.user?.id ?? null,
      } as never] as never);
      if (error) throw error;

      toast.success(`Forecast-version "${versionLabel}" skapad`);
      onApplied?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte skapa forecast-version");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tillämpa "{scenarioName}" på prognos</DialogTitle>
          <DialogDescription>
            Skapar en ny, låst prognosversion baserad på det här scenariots drivers och KPI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Målperiod</Label>
            <Select value={target} onValueChange={(v) => { setTarget(v); setLabel(`${scenarioName} → ${v}`); }}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGETS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Etikett</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" />
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">EBIT (år)</span>
              <span className="font-medium tabular-nums">{kpis.annualEbit.toLocaleString("sv-SE")} kr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kassa december</span>
              <span className="font-medium tabular-nums">{kpis.endingCash.toLocaleString("sv-SE")} kr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Runway</span>
              <span className="font-medium tabular-nums">
                {kpis.runwayMonths != null ? `${kpis.runwayMonths} mån` : "Lönsam"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Avbryt</Button>
          <Button onClick={apply} disabled={busy}>
            {busy ? "Skapar…" : "Skapa forecast-version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
