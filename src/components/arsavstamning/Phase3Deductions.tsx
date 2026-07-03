import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { ProcessedReceipt, Deduction } from "@/pages/ArsavstamningPage";

function formatKr(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
}

interface Phase3Props { receipts: ProcessedReceipt[];
  deductions: Deduction[];
  setDeductions: (d: Deduction[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Phase3Deductions({ receipts, deductions, setDeductions, onNext, onBack }: Phase3Props) { useEffect(() => { if (deductions.length > 0) return;

    // Generate sample deductions based on receipts
    const officeMaterial = receipts
      .filter((r) => r.category === "Kontorsmaterial")
      .reduce((s, r) => s + r.amount, 0);
    const travel = receipts
      .filter((r) => r.category === "Resor")
      .reduce((s, r) => s + r.amount, 0);
    const software = receipts
      .filter((r) => r.category === "Programvara")
      .reduce((s, r) => s + r.amount, 0);

    const suggestions: Deduction[] = [];
    if (officeMaterial > 0) { suggestions.push({ id: "1",
        category: "Hemmakontor",
        description: `Du verkar ha köpt kontorsmaterial för ${formatKr(officeMaterial)} — avdragsgillt`,
        amount: officeMaterial,
        taxImpact: Math.round(officeMaterial * 0.32),
        accepted: true,
      });
    }
    if (travel > 0) { suggestions.push({ id: "2",
        category: "Bil/resor",
        description: `Resekostnader på ${formatKr(travel)} — avdragsgillt som tjänsteresa`,
        amount: travel,
        taxImpact: Math.round(travel * 0.32),
        accepted: true,
      });
    }
    if (software > 0) { suggestions.push({ id: "3",
        category: "Programvara",
        description: `Licensavgifter och prenumerationer för ${formatKr(software)} — fullt avdragsgillt`,
        amount: software,
        taxImpact: Math.round(software * 0.32),
        accepted: true,
      });
    }
    suggestions.push({ id: "4",
      category: "Kompetensutveckling",
      description: "Kurskostnader och facklitteratur — fullt avdragsgillt",
      amount: 2500 + Math.round(Math.random() * 10000),
      taxImpact: 0,
      accepted: true,
    });
    suggestions[suggestions.length - 1].taxImpact = Math.round(
      suggestions[suggestions.length - 1].amount * 0.32
    );

    setDeductions(suggestions);
  }, [receipts, deductions.length, setDeductions]);

  const totalTaxImpact = deductions
    .filter((d) => d.accepted)
    .reduce((s, d) => s + d.taxImpact, 0);

  const toggleDeduction = (id: string) => { setDeductions(
      deductions.map((d) => (d.id === id ? { ...d, accepted: !d.accepted } : d))
    );
  };

  const acceptAll = () => { setDeductions(deductions.map((d) => ({ ...d, accepted: true })));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-6 text-center space-y-2">
          <Sparkles className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">AI har hittat möjliga avdrag</p>
          <p className="text-3xl font-bold text-primary">
            Minskar din skatt med ca {formatKr(totalTaxImpact)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Föreslagna avdrag</CardTitle>
            <Button variant="outline" size="sm" onClick={acceptAll}>
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Godkänn alla
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {deductions.map((d) => (
            <div
              key={d.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${ d.accepted ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-[#BFE6D6] dark:border-emerald-800" : "bg-muted/30"
              }`}
            >
              <Switch
                checked={d.accepted}
                onCheckedChange={() => toggleDeduction(d.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {d.category}
                  </Badge>
                </div>
                <p className="text-sm">{d.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatKr(d.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  Skatteffekt: ~{formatKr(d.taxImpact)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>
        <Button onClick={onNext}>
          Nästa steg
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
