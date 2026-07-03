import { useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { detectAccrualSignal, buildAccrualPlan, type DetectionInput } from "@/lib/accruals/detection";
import { createAccrualSchedule } from "@/lib/accruals/createSchedule";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

interface Props {
  detection: DetectionInput;
  companyId: string;
  userId: string;
  totalAmount: number;
  defaultCostAccount: string;
  sourceInvoiceId?: string | null;
  onCreated?: () => void;
}

export const AccrualSuggestionBanner = ({
  detection,
  companyId,
  userId,
  totalAmount,
  defaultCostAccount,
  sourceInvoiceId,
  onCreated,
}: Props) => {
  const signal = useMemo(() => detectAccrualSignal(detection), [detection]);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(signal.suggestedMonths);
  const [periodStart, setPeriodStart] = useState(signal.suggestedPeriodStart);
  const [costAccount, setCostAccount] = useState(defaultCostAccount);
  const [prepaidAccount, setPrepaidAccount] = useState("1710");
  const [saving, setSaving] = useState(false);

  if (!signal.detected || dismissed) return null;

  const plan = buildAccrualPlan(totalAmount, periodStart, months);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const periodEnd = plan[plan.length - 1].month;
      await createAccrualSchedule({
        companyId,
        description: detection.description || "Periodisering",
        totalAmount,
        periodStart,
        periodEnd,
        monthsTotal: months,
        costAccountNumber: costAccount,
        prepaidAccountNumber: prepaidAccount,
        sourceInvoiceId: sourceInvoiceId || null,
        createdBy: userId,
      });
      toast.success(`Periodisering skapad – ${months} månader à ${Math.round(totalAmount / months)} kr`);
      setOpen(false);
      setDismissed(true);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Kunde inte skapa periodisering");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="p-3 rounded-[10px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF] flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-[#1E3A5F]">
            Denna kostnad verkar avse en period längre än innevarande månad. Vill du att jag periodiserar den automatiskt?
          </p>
          <p className="text-[11px] text-[#3b5a85] mt-0.5">{signal.reason} · förslag: {signal.suggestedMonths} månader</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => setOpen(true)} className="h-[28px] bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              Ja – periodisera automatiskt
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setMonths(signal.suggestedMonths); setOpen(true); }} className="h-[28px]">
              Manuell justering
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} className="h-[28px]">
              Nej tack
            </Button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bekräfta periodisering</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Periodstart</label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Antal månader</label>
                <Input type="number" min={1} value={months} onChange={(e) => setMonths(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Kostnadskonto</label>
                <Input value={costAccount} onChange={(e) => setCostAccount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Förutbetalt-konto</label>
                <Input value={prepaidAccount} onChange={(e) => setPrepaidAccount(e.target.value)} />
              </div>
            </div>
            <div className="rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-[#F8FAFC] p-2 max-h-48 overflow-auto">
              <div className="text-[11px] uppercase text-muted-foreground mb-1">Föreslagna månadsposter</div>
              {plan.map((p) => (
                <div key={p.month} className="flex justify-between text-xs py-0.5 tabular-nums">
                  <span>{format(parseISO(p.month), "MMM yyyy", { locale: sv })}</span>
                  <span>{Math.round(p.amount).toLocaleString("sv-SE")} kr</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button onClick={handleConfirm} disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb]">
              {saving ? "Sparar..." : "Bekräfta & skapa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
