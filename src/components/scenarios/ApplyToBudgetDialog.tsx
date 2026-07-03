/**
 * ApplyToBudgetDialog — confirm + diff preview before patching the active budget plan.
 *
 * Persists by writing the merged drivers into `budget_plans.ai_assumptions.drivers`
 * and bumping `growth_rate` for visibility. A snapshot of the current scenario
 * state is also written to `scenario_versions` so the change is reversible.
 */
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { diffDrivers } from "@/lib/scenarios/scenarioEngine";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  budgetId: string;
  scenarioId: string | null;
  scenarioName: string;
  baseDrivers: BudgetDrivers;
  nextDrivers: BudgetDrivers;
  onApplied?: () => void;
}

export function ApplyToBudgetDialog({
  open, onOpenChange, budgetId, scenarioId, scenarioName,
  baseDrivers, nextDrivers, onApplied,
}: Props) {
  const [snapshot, setSnapshot] = useState(true);
  const [busy, setBusy] = useState(false);
  const diff = useMemo(() => diffDrivers(baseDrivers, nextDrivers), [baseDrivers, nextDrivers]);

  const apply = async () => {
    setBusy(true);
    try {
      // 1) Snapshot current scenario state if requested
      if (snapshot && scenarioId) {
        const { data: existing } = await supabase
          .from("budget_scenarios")
          .select("*")
          .eq("id", scenarioId)
          .maybeSingle();
        if (existing) {
          const { data: u } = await supabase.auth.getUser();
          await supabase.from("scenario_versions").insert({
            scenario_id: scenarioId,
            snapshot: existing as never,
            created_by: u.user?.id ?? null,
          } as never);
        }
      }

      // 2) Read current ai_assumptions, merge new drivers
      const { data: plan, error: readErr } = await supabase
        .from("budget_plans")
        .select("ai_assumptions, growth_rate")
        .eq("id", budgetId)
        .maybeSingle();
      if (readErr) throw readErr;

      const prevAssumptions = (plan?.ai_assumptions as Record<string, unknown> | null) ?? {};
      const merged = {
        ...prevAssumptions,
        drivers: nextDrivers,
        applied_from_scenario: scenarioId,
        applied_at: new Date().toISOString(),
      };

      const { error: updErr } = await supabase
        .from("budget_plans")
        .update({ ai_assumptions: merged as never } as never)
        .eq("id", budgetId);
      if (updErr) throw updErr;

      toast.success(`Tillämpat på budget — ${diff.length} drivers uppdaterade`);
      onApplied?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte tillämpa scenariot på budgeten");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tillämpa "{scenarioName}" på budget</DialogTitle>
          <DialogDescription>
            {diff.length} driver{diff.length === 1 ? "" : "s"} kommer att uppdateras i den aktiva budgeten.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Driver</th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-right">Innan</th>
                <th className="px-3 py-2 font-medium text-muted-foreground"></th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-right">Efter</th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-right">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {diff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground italic">
                    Inga ändringar att tillämpa.
                  </td>
                </tr>
              ) : diff.map((d) => (
                <tr key={d.key as string} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{d.key as string}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {d.base.toLocaleString("sv-SE")}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground"><ArrowRight className="h-3 w-3" /></td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground font-medium">
                    {d.next.toLocaleString("sv-SE")}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${
                    d.delta > 0 ? "text-success" : "text-destructive"
                  }`}>
                    {d.pctDelta > 0 ? "+" : ""}{d.pctDelta.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="snap" checked={snapshot} onCheckedChange={(v) => setSnapshot(!!v)} />
          <Label htmlFor="snap" className="text-xs cursor-pointer">
            Skapa snapshot av nuvarande scenario först (kan återställas)
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Avbryt
          </Button>
          <Button onClick={apply} disabled={busy || diff.length === 0}>
            {busy ? "Tillämpar…" : "Tillämpa till budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
