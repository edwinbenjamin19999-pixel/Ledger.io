import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props { employeeCount: number;
  currentSalaryTotal: number; // monthly total
}

const SCENARIOS = [
  { id: "arbetsgivaravgift",
    label: "Arbetsgivaravgift ändras",
    description: "Simulera effekten av ändrad arbetsgivaravgift",
    currentValue: 31.42,
    unit: "%",
    affects: "Personalkostnader",
  },
  { id: "friskvard",
    label: "Friskvårdsbidrag ändras",
    description: "Ändring av skattefritt tak för friskvårdsbidrag",
    currentValue: 5000,
    unit: "kr/anställd",
    affects: "Personalförmåner",
  },
  { id: "bolagsskatt",
    label: "Bolagsskattesats ändras",
    description: "Simulera effekten av ändrad bolagsskattesats",
    currentValue: 20.6,
    unit: "%",
    affects: "Skattekostnad",
  },
  { id: "traktamente",
    label: "Traktamentsbelopp ändras",
    description: "Heldagstraktamente vid inrikes tjänsteresa",
    currentValue: 290,
    unit: "kr/dag",
    affects: "Resekostnader",
  },
];

export function RegulatoryChangeSimulator({ employeeCount, currentSalaryTotal }: Props) { const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].id);
  const [newValue, setNewValue] = useState("");
  const [result, setResult] = useState<{ diff: number; explanation: string; direction: "up" | "down" | "neutral" } | null>(null);

  const scenario = SCENARIOS.find(s => s.id === selectedScenario)!;

  const simulate = () => { const val = parseFloat(newValue);
    if (isNaN(val)) return;

    let diff = 0;
    let explanation = "";
    const monthly = currentSalaryTotal || employeeCount * 35000;

    switch (selectedScenario) { case "arbetsgivaravgift": { const oldCost = monthly * (scenario.currentValue / 100) * 12;
        const newCost = monthly * (val / 100) * 12;
        diff = Math.round(newCost - oldCost);
        explanation = `Årlig arbetsgivaravgift ändras från ${Math.round(oldCost).toLocaleString("sv-SE")} kr till ${Math.round(newCost).toLocaleString("sv-SE")} kr baserat på ${employeeCount} anställda med total bruttolön ${monthly.toLocaleString("sv-SE")} kr/mån.`;
        break;
      }
      case "friskvard": { const oldCost = employeeCount * scenario.currentValue;
        const newCost = employeeCount * val;
        diff = Math.round(newCost - oldCost);
        explanation = `Maximal friskvårdskostnad ändras från ${oldCost.toLocaleString("sv-SE")} kr till ${newCost.toLocaleString("sv-SE")} kr/år för ${employeeCount} anställda. Fullt avdragsgillt.`;
        break;
      }
      case "bolagsskatt": { // Estimate annual profit as 15% of revenue
        const estProfit = monthly * 12 * 0.15;
        const oldTax = estProfit * (scenario.currentValue / 100);
        const newTax = estProfit * (val / 100);
        diff = Math.round(newTax - oldTax);
        explanation = `Uppskattad skatteeffekt baserat på beräknad vinst: ${Math.round(estProfit).toLocaleString("sv-SE")} kr. Skatt ändras från ${Math.round(oldTax).toLocaleString("sv-SE")} kr till ${Math.round(newTax).toLocaleString("sv-SE")} kr/år.`;
        break;
      }
      case "traktamente": { const estDays = employeeCount * 10; // assume 10 travel days/employee
        diff = Math.round((val - scenario.currentValue) * estDays);
        explanation = `Uppskattat ${estDays} resdagar/år (10 dagar × ${employeeCount} anställda). Kostnad ändras med ${diff.toLocaleString("sv-SE")} kr/år.`;
        break;
      }
    }

    setResult({ diff,
      explanation,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-5 w-5" /> Regeländringssimulator
        </CardTitle>
        <CardDescription>Simulera hur regeländringar påverkar ditt bolag ekonomiskt</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Välj scenario</Label>
            <Select value={selectedScenario} onValueChange={v => { setSelectedScenario(v); setResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCENARIOS.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nuvarande: {scenario.currentValue} {scenario.unit}</Label>
            <Input
              type="number"
              placeholder={`Nytt värde (${scenario.unit})`}
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={simulate} className="w-full">
              <Calculator className="h-4 w-4 mr-2" /> Simulera
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{scenario.description} · Påverkar: {scenario.affects}</p>

        {result && (
          <div className={`rounded-lg border p-4 ${ result.direction === "up" ? "border-destructive/30 bg-destructive/5" :
            result.direction === "down" ? "border-primary/30 bg-primary/5" : "bg-muted/50"
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {result.direction === "up" ? (
                <TrendingUp className="h-5 w-5 text-destructive" />
              ) : result.direction === "down" ? (
                <TrendingDown className="h-5 w-5 text-primary" />
              ) : (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
              <p className="font-bold text-lg">
                {result.diff > 0 ? "+" : ""}{result.diff.toLocaleString("sv-SE")} kr/år
              </p>
              <Badge variant={result.direction === "up" ? "destructive" : result.direction === "down" ? "default" : "secondary"}>
                {result.direction === "up" ? "Kostnadsökning" : result.direction === "down" ? "Besparing" : "Neutral"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{result.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
