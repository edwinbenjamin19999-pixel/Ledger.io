import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { RutRotSettings, useRutRotInvoices, useCustomerLimits, calculateDeduction } from "@/hooks/useRutRot";
import { AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

interface Props { open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: RutRotSettings;
}

export function RutRotNewInvoice({ open, onOpenChange, settings }: Props) { const { createRutRotInvoice } = useRutRotInvoices();
  const { limits } = useCustomerLimits();

  const [deductionType, setDeductionType] = useState<"rut" | "rot">(settings.rot_enabled ? "rot" : "rut");
  const [laborCost, setLaborCost] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [travelCost, setTravelCost] = useState("");
  const [customerPid, setCustomerPid] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [propertyDesignation, setPropertyDesignation] = useState("");
  const [workDescription, setWorkDescription] = useState("");

  const labor = parseFloat(laborCost) || 0;
  const material = parseFloat(materialCost) || 0;
  const travel = parseFloat(travelCost) || 0;

  const usedSoFar = useMemo(() => { if (!customerPid) return 0;
    const match = limits.find(
      (l) => l.customer_personal_id === customerPid && l.deduction_type === deductionType
    );
    return match?.total_used || 0;
  }, [customerPid, deductionType, limits]);

  const calc = calculateDeduction(deductionType, labor, usedSoFar);
  const totalInvoice = labor + material + travel;
  const customerTotal = totalInvoice - calc.deductionAmount;

  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const handleSubmit = () => { if (!companyId || !customerPid || labor <= 0) return;
    createRutRotInvoice.mutate(
      { invoice_id: crypto.randomUUID(), // placeholder — link to real invoice
        company_id: companyId,
        deduction_type: deductionType,
        labor_cost: labor,
        material_cost: material,
        travel_cost: travel,
        deduction_amount: calc.deductionAmount,
        customer_pays: customerTotal,
        customer_personal_id: customerPid,
        property_designation: propertyDesignation || null,
        work_description: workDescription || null,
      },
      { onSuccess: () => { onOpenChange(false); resetForm(); } }
    );
  };

  const resetForm = () => { setLaborCost(""); setMaterialCost(""); setTravelCost("");
    setCustomerPid(""); setCustomerName(""); setPropertyDesignation(""); setWorkDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny {deductionType.toUpperCase()}-faktura</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {settings.rut_enabled && settings.rot_enabled && (
            <div>
              <Label>Avdragstyp</Label>
              <Select value={deductionType} onValueChange={(v) => setDeductionType(v as "rut" | "rot")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rot">ROT — Bygg, el, VVS</SelectItem>
                  <SelectItem value="rut">RUT — Städning, hemhjälp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Kundens personnummer</Label>
            <Input
              value={customerPid}
              onChange={(e) => setCustomerPid(e.target.value)}
              placeholder="YYYYMMDD-XXXX"
              required
            />
          </div>

          <div>
            <Label>Kundnamn</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Namn" />
          </div>

          {deductionType === "rot" && (
            <div>
              <Label>Fastighetsbeteckning</Label>
              <Input
                value={propertyDesignation}
                onChange={(e) => setPropertyDesignation(e.target.value)}
                placeholder="T.ex. Stockholm Gärdet 1:2"
              />
            </div>
          )}

          <div>
            <Label>Arbetsbeskrivning</Label>
            <Input value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} placeholder="Kort beskrivning" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Arbetskostnad (kr)</Label>
              <Input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Material (kr)</Label>
              <Input type="number" value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Resa (kr)</Label>
              <Input type="number" value={travelCost} onChange={(e) => setTravelCost(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Calculation preview */}
          <Card className={cn("border-l-4", deductionType === "rot" ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20")}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Totalbelopp (exkl. moms)</span>
                <span className="font-medium">{fmt(totalInvoice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{deductionType.toUpperCase()}-avdrag ({deductionType === "rot" ? "30" : "50"}% av arbete)</span>
                <span className={cn("font-bold", deductionType === "rot" ? "text-[#085041]" : "text-blue-600")}>
                  -{fmt(calc.deductionAmount)}
                </span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-sm font-semibold">
                <span>Kunden betalar</span>
                <span>{fmt(customerTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Skatteverket betalar</span>
                <span className={cn("font-medium", deductionType === "rot" ? "text-[#085041]" : "text-blue-600")}>
                  {fmt(calc.deductionAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {calc.warning && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FAEEDA] border border-[#F0DDB7] dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#7A5417] dark:text-amber-300">{calc.warning}</p>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-[#3b82f6] flex-shrink-0" />
            <span>AI skapar automatiskt bokföring: 1510 kundfordran, 1580 fordran SKV, 3010 intäkt, 2611 moms.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button
              onClick={handleSubmit}
              disabled={createRutRotInvoice.isPending || labor <= 0 || !customerPid}
              className={cn(
                "text-white",
                deductionType === "rot" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-500 hover:bg-blue-600"
              )}
            >
              {createRutRotInvoice.isPending ? "Skapar..." : "Skapa faktura"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
