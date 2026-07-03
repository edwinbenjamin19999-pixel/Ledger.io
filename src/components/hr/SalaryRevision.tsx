import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { BankIDReviewScreen } from "@/components/governance/BankIDReviewScreen";
import { LockIcon } from "@/components/governance/LockIcon";
import { AccuracyDisclaimer } from "@/components/governance/AccuracyDisclaimer";
import { TrendingUp, Sparkles, Users, CheckCircle } from "lucide-react";

interface SalaryRevisionProps { companyId: string;
  employees: any[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
const EMPLOYER_FEE_RATE = 0.3142;

interface RevisionPlan { employeeId: string;
  name: string;
  currentSalary: number;
  suggestedIncrease: number;
  newSalary: number;
  performance: number;
  marketMin: number;
  marketMax: number;
}

export const SalaryRevision = ({ companyId, employees }: SalaryRevisionProps) => { const activeEmps = employees.filter(e => e.is_active);
  const [showSign, setShowSign] = useState(false);
  const [bulkPercent, setBulkPercent] = useState(3.5);
  const [revisions, setRevisions] = useState<RevisionPlan[]>(() =>
    activeEmps.map(e => { const salary = e.monthly_salary || 0;
      const increase = Math.round(salary * 0.035);
      return { employeeId: e.id,
        name: `${e.first_name} ${e.last_name}`,
        currentSalary: salary,
        suggestedIncrease: increase,
        newSalary: salary + increase,
        performance: 3,
        marketMin: Math.round(salary * 0.95),
        marketMax: Math.round(salary * 1.15),
      };
    })
  );

  const totalCurrentCost = revisions.reduce((s, r) => s + r.currentSalary, 0);
  const totalNewCost = revisions.reduce((s, r) => s + r.newSalary, 0);
  const totalIncrease = totalNewCost - totalCurrentCost;
  const annualImpact = Math.round(totalIncrease * 12 * (1 + EMPLOYER_FEE_RATE));

  const updateRevision = (idx: number, field: Partial<RevisionPlan>) => { setRevisions(prev => prev.map((r, i) => { if (i !== idx) return r;
      const updated = { ...r, ...field };
      if ("suggestedIncrease" in field) { updated.newSalary = updated.currentSalary + updated.suggestedIncrease;
      }
      return updated;
    }));
  };

  const applyBulk = (pct: number) => { setBulkPercent(pct);
    setRevisions(prev => prev.map(r => { const increase = Math.round(r.currentSalary * (pct / 100));
      return { ...r, suggestedIncrease: increase, newSalary: r.currentSalary + increase };
    }));
  };

  if (showSign) { return (
      <BankIDReviewScreen
        actionType="salary_payment"
        summaryItems={revisions.map(r => ({ label: r.name, value: `${fmt(r.currentSalary)} kr -> ${fmt(r.newSalary)} kr (+${fmt(r.suggestedIncrease)} kr)` }))}
        amount={totalIncrease}
        onSign={async () => { setShowSign(false); }}
        onBack={() => setShowSign(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Lönerevision {new Date().getFullYear()}
              </CardTitle>
              <CardDescription>AI-baserade förslag utifrån inflation, marknad och prestation</CardDescription>
            </div>
            <Badge variant="secondary">{activeEmps.length} anställda</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk adjustment */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-[#0F172A]">Generell justering</p>
              <span className="text-[12px] font-medium text-[#0F172A] tabular-nums">{bulkPercent.toFixed(1)}%</span>
            </div>
            <Slider
              value={[bulkPercent]}
              onValueChange={v => applyBulk(v[0])}
              min={0}
              max={10}
              step={0.5}
              className="w-full"
            />
            <p className="text-[10px] text-[#94A3B8] italic mt-[4px]">Inflation 2025: 3,5% — justera efter prestation per anställd nedan</p>
          </div>

          {/* Per-employee revisions */}
          <div className="space-y-3">
            {revisions.map((r, idx) => {
              const pct = r.currentSalary > 0 ? (r.suggestedIncrease / r.currentSalary) * 100 : 0;
              return (
              <div key={r.employeeId} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.name}</p>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-[#94A3B8]">MARKNADSINTERVALL</span>
                    <span className="text-[12px] font-medium text-[#0B4F6C] tabular-nums">{fmt(r.marketMin)}–{fmt(r.marketMax)} kr</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Nuvarande lön</p>
                    <p className="font-semibold">{fmt(r.currentSalary)} kr</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Höjning</p>
                    <Input
                      type="number"
                      value={r.suggestedIncrease}
                      onChange={e => updateRevision(idx, { suggestedIncrease: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ny lön</p>
                    <p className="text-[14px] font-medium text-[#0F6E56] tabular-nums">{fmt(r.newSalary)} kr</p>
                    <p className="text-[11px] text-[#1D9E75] font-medium tabular-nums">+{pct.toFixed(1)}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prestationsfaktor (1–5)</p>
                  <Slider
                    value={[r.performance]}
                    onValueChange={v => updateRevision(idx, { performance: v[0] })}
                    min={1}
                    max={5}
                    step={1}
                    className="w-32"
                  />
                </div>

                <div className="p-2 bg-muted/50 rounded text-[11px] text-[#94A3B8]">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Kostnad för bolaget: +{fmt(Math.round(r.suggestedIncrease * 12 * (1 + EMPLOYER_FEE_RATE)))} kr/år inkl. arbetsgivaravgifter
                </div>
              </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total löneökning/månad</span>
              <span className="font-bold">+{fmt(totalIncrease)} kr</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Årlig budgetpåverkan (inkl. avgifter)</span>
              <span>+{fmt(annualImpact)} kr</span>
            </div>
          </div>

          <AccuracyDisclaimer />

          <Button
            onClick={() => setShowSign(true)}
            className="bg-[#0B4F6C] hover:bg-[#1074A0] text-[#E6F4FA] w-full rounded-[8px] text-[12px] font-medium h-[40px] border-0"
          >
            <LockIcon /> Godkänn lönerevision med BankID
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
