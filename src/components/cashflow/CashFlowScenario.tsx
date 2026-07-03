import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import type { ScenarioEvent } from "@/hooks/useCashFlow";

const eventTypes = [
  { value: "late_payment", label: "Sen kundbetalning" },
  { value: "early_supplier", label: "Tidig leverantörsbetalning" },
  { value: "investment", label: "Ny investering" },
  { value: "salary_increase", label: "Löneökning" },
  { value: "dividend", label: "Utdelning" },
  { value: "shareholder_contribution", label: "Aktieägartillskott" },
  { value: "extra_tax", label: "Extra skatteinbetalning" },
  { value: "vat_adjustment", label: "Momsjustering" },
];

interface Props { scenarios: ScenarioEvent[];
  onScenariosChange: (scenarios: ScenarioEvent[]) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  hasPendingChanges?: boolean;
  simulationActive?: boolean;
  runwayDelta?: { before: number; after: number };
  balanceDelta?: { before: number; after: number };
}

export function CashFlowScenario({ scenarios,
  onScenariosChange,
  onApply,
  onReset,
  onClose,
  hasPendingChanges,
  simulationActive,
  runwayDelta,
  balanceDelta,
}: Props) { const addEvent = () => { const today = new Date();
    today.setDate(today.getDate() + 14);
    onScenariosChange([
      ...scenarios,
      { id: String(Date.now()),
        type: "investment",
        amount: -100000,
        date: today.toISOString().split("T")[0],
        description: "Ny händelse",
      },
    ]);
  };

  const updateEvent = (id: string, field: keyof ScenarioEvent, value: any) => { onScenariosChange(scenarios.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeEvent = (id: string) => { onScenariosChange(scenarios.filter(s => s.id !== id));
  };

  const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

  return (
    <Card className="border-[#F0DDB7] bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Simulera scenario — "Vad händer om...?"</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {scenarios.map(sc => (
          <div key={sc.id} className="flex items-center gap-2 flex-wrap">
            <Select value={sc.type} onValueChange={v => updateEvent(sc.id, "type", v)}>
              <SelectTrigger className="w-48 h-8 text-xs bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map(et => (
                  <SelectItem key={et.value} value={et.value} className="text-xs">{et.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={sc.amount}
              onChange={e => updateEvent(sc.id, "amount", Number(e.target.value))}
              className="w-32 h-8 text-xs bg-card"
              placeholder="Belopp"
            />
            <span className="text-xs text-muted-foreground">kr</span>
            <Input
              type="date"
              value={sc.date}
              onChange={e => updateEvent(sc.id, "date", e.target.value)}
              className="w-36 h-8 text-xs bg-card"
            />
            <Input
              value={sc.description}
              onChange={e => updateEvent(sc.id, "description", e.target.value)}
              className="flex-1 min-w-[120px] h-8 text-xs bg-card"
              placeholder="Beskrivning"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEvent(sc.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={addEvent}>
            <Plus className="h-3.5 w-3.5 mr-1" />Lägg till händelse
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onApply}
            disabled={scenarios.length === 0 || !hasPendingChanges}
          >
            {simulationActive ? "Uppdatera simulering" : "Utför simulering"}
          </Button>
          {scenarios.length > 0 && (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={onReset}>
              Nollställ
            </Button>
          )}
        </div>

        {scenarios.length > 0 && hasPendingChanges && (
          <p className="text-xs text-muted-foreground">
            Klicka på {simulationActive ? "Uppdatera simulering" : "Utför simulering"} för att uppdatera grafen nedan.
          </p>
        )}

        {runwayDelta && simulationActive && !hasPendingChanges && scenarios.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t flex gap-6">
            <span>
              Runway: {runwayDelta.before}d → <span className={runwayDelta.after < runwayDelta.before ? "text-[#7A1A1A] font-semibold" : "text-[#085041] font-semibold"}>{runwayDelta.after}d</span>
            </span>
            {balanceDelta && (
              <span>
                Saldo: {fmt(balanceDelta.before)} → <span className={balanceDelta.after < balanceDelta.before ? "text-[#7A1A1A] font-semibold" : "text-[#085041] font-semibold"}>{fmt(balanceDelta.after)} kr</span>
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
