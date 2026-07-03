import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PreliminaryTaxState } from "@/lib/skatteagent/preliminaryTaxEngine";

interface AdjustFTaxDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  state: PreliminaryTaxState;
}

export function AdjustFTaxDialog({ open, onOpenChange, companyId, state }: AdjustFTaxDialogProps) {
  const recommendedMonthly = Math.max(0, Math.round(state.expectedAnnualTax / 12));
  const [proposed, setProposed] = useState(recommendedMonthly);
  const [busy, setBusy] = useState(false);

  const monthlyDiff = proposed - state.currentMonthlyFtax;
  const yearlyDiff = monthlyDiff * 12;
  const direction: "raise" | "lower" | "same" =
    monthlyDiff > 0 ? "raise" : monthlyDiff < 0 ? "lower" : "same";

  async function handleSubmit() {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("skatteverket-tax-deduction", {
        body: {
          company_id: companyId,
          proposed_monthly_amount: proposed,
          current_monthly_amount: state.currentMonthlyFtax,
          reasoning: `AI-rekommendation: förväntad årsskatt ${state.expectedAnnualTax} kr.`,
        },
      });
      if (error) throw error;
      toast.success("Jämkningsbegäran förberedd — granska i Skatteverket-flödet");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte förbereda jämkning");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Förbered jämkning av F-skatt
          </DialogTitle>
          <DialogDescription>
            Skatteagenten föreslår en justerad F-skatt baserat på årets förväntade resultat.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Nuvarande</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {state.currentMonthlyFtax.toLocaleString("sv-SE")} kr
            </div>
            <div className="text-xs text-slate-500 mt-1">/månad</div>
          </div>
          <div className="rounded-xl border border-[#C8DDF5] bg-indigo-50/50 p-4">
            <div className="text-xs uppercase tracking-wide text-indigo-700">AI-förslag</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-indigo-900">
              {recommendedMonthly.toLocaleString("sv-SE")} kr
            </div>
            <div className="text-xs text-indigo-700 mt-1">/månad</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="proposed">Föreslagen F-skatt (kr/månad)</Label>
            <Input
              id="proposed"
              type="number"
              value={proposed}
              onChange={(e) => setProposed(Math.max(0, Number(e.target.value)))}
              className="tabular-nums"
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Månadsdiff</span>
              <span className={`font-semibold tabular-nums ${direction === "lower" ? "text-[#085041]" : direction === "raise" ? "text-[#7A1A1A]" : "text-slate-700"}`}>
                {direction === "lower" && <TrendingDown className="w-3.5 h-3.5 inline mr-1" />}
                {direction === "raise" && <TrendingUp className="w-3.5 h-3.5 inline mr-1" />}
                {monthlyDiff > 0 ? "+" : ""}{monthlyDiff.toLocaleString("sv-SE")} kr
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500">Årseffekt</span>
              <span className={`font-semibold tabular-nums ${yearlyDiff < 0 ? "text-[#085041]" : yearlyDiff > 0 ? "text-[#7A1A1A]" : "text-slate-700"}`}>
                {yearlyDiff > 0 ? "+" : ""}{yearlyDiff.toLocaleString("sv-SE")} kr
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Beslutet skickas via Skatteverkets jämkningsflöde. Du godkänner med BankID i nästa steg.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={busy || proposed === state.currentMonthlyFtax}>
            {busy ? "Förbereder…" : "Förbered SKV-jämkning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
