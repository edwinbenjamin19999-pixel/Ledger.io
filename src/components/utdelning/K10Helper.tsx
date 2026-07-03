import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, ArrowLeft, FileText, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { calculateK10, type K10Input } from "@/lib/tax/calculateK10";
import { K10_2025 } from "@/lib/tax/k10Constants2025";
import { usePayrollContext } from "@/hooks/usePayrollAgent";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

const K10_STEPS = [
  {
    title: "Ägaruppgifter",
    description: "Hur stor del av bolaget äger du?",
    fields: [
      { key: "ownershipPercent", label: "Ägarandel (%)", defaultValue: 100 },
    ],
  },
  {
    title: "Anskaffningsutgift",
    description: "Vad betalade du för aktierna? (oftast aktiekapitalet vid start)",
    fields: [
      { key: "acquisitionCost", label: "Anskaffningsutgift (kr)", defaultValue: 25000 },
    ],
  },
  {
    title: "Löneunderlag",
    description: "Total lön utbetald av bolaget under året (alla anställda inkl. dig)",
    fields: [
      { key: "companyTotalSalaries", label: "Totala löner i bolaget (kr)", defaultValue: 480000, autoLabel: "Hämtat från löneregister" },
      { key: "ownerSalary", label: "Din egen bruttolön (kr)", defaultValue: 480000, autoLabel: "Hämtat från löneregister" },
    ],
  },
  {
    title: "Utdelning & sparat utrymme",
    description: "Sparat gränsbelopp och planerad utdelning",
    fields: [
      { key: "previousGransbelopp", label: "Sparat utdelningsutrymme från tidigare år (kr)", defaultValue: 0 },
      { key: "plannedDividend", label: "Planerad utdelning i år (kr)", defaultValue: 200000 },
    ],
  },
  {
    title: "Resultat & export",
    description: "Granska beräknat gränsbelopp och skatteeffekt",
    fields: [],
  },
];

export function K10Helper() {
  const [step, setStep] = useState(0);
  const payroll = usePayrollContext();

  const autoSalaries = payroll.data?.totalMonthlySalary
    ? Math.round(payroll.data.totalMonthlySalary * 12)
    : null;

  const [values, setValues] = useState<Record<string, number>>({
    ownershipPercent: 100,
    acquisitionCost: 25000,
    companyTotalSalaries: autoSalaries ?? 480000,
    ownerSalary: autoSalaries ?? 480000,
    previousGransbelopp: 0,
    plannedDividend: 200000,
  });

  // Sync payroll auto-values once loaded
  const [autoApplied, setAutoApplied] = useState(false);
  if (autoSalaries && !autoApplied) {
    setValues(prev => ({
      ...prev,
      companyTotalSalaries: autoSalaries,
      ownerSalary: autoSalaries,
    }));
    setAutoApplied(true);
  }

  const current = K10_STEPS[step];

  const setValue = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const k10Input: K10Input = {
    ownershipPercent: values.ownershipPercent,
    ownerSalary: values.ownerSalary,
    companyTotalSalaries: values.companyTotalSalaries,
    previousGransbelopp: values.previousGransbelopp,
    acquisitionCost: values.acquisitionCost,
    plannedDividend: values.plannedDividend,
  };

  const result = useMemo(() => calculateK10(k10Input), [
    values.ownershipPercent,
    values.ownerSalary,
    values.companyTotalSalaries,
    values.previousGransbelopp,
    values.acquisitionCost,
    values.plannedDividend,
  ]);

  const handleExportPDF = () => {
    toast.success("K10-bilaga genereras...", {
      description: "Ladda upp den tillsammans med din privata inkomstdeklaration senast 2 maj.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {K10_STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < K10_STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{current.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {current.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs">{f.label}</Label>
                {(f as any).autoLabel && autoSalaries && (
                  <Badge variant="secondary" className="text-[10px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]">
                    {(f as any).autoLabel}
                  </Badge>
                )}
              </div>
              <Input
                type="number"
                value={values[f.key] ?? f.defaultValue}
                onChange={(e) => setValue(f.key, Number(e.target.value))}
              />
            </div>
          ))}

          {/* Summary on last step */}
          {step === K10_STEPS.length - 1 && (
            <div className="space-y-4">
              {/* Results card */}
              <div className="rounded-lg border-2 border-[#E2E8F0] bg-[#F1F5F9] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-violet-500" />
                  <h3 className="font-semibold text-sm">Beräknat utdelningsutrymme</h3>
                </div>

                <div className="text-center py-2">
                  <span className="text-3xl font-bold text-[#0F1F3D]">
                    {fmt(result.totalGransbelopp)} kr
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <SummaryRow label="Schablonbelopp (2,75 × IBB)" value={`${fmt(result.schablonGransbelopp)} kr`} />
                  <SummaryRow
                    label="Löneunderlag (50 %)"
                    value={
                      result.canUseLonunderlag
                        ? `${fmt(result.lonunderlag)} kr`
                        : "Ej kvalificerat"
                    }
                    warn={!result.canUseLonunderlag}
                  />
                  <SummaryRow
                    label={`Vald metod`}
                    value={result.methodUsed === "loner" ? "Löneunderlagsregeln" : "Förenklingsregeln"}
                    bold
                  />
                  {result.sparatUpprakat > 0 && (
                    <SummaryRow
                      label={`Sparat × ${(K10_2025.upprakningsrantan * 100).toFixed(2)} %`}
                      value={`${fmt(result.sparatUpprakat)} kr`}
                    />
                  )}
                </div>
              </div>

              {/* Minimum salary warning */}
              {!result.canUseLonunderlag && values.companyTotalSalaries > 0 && (
                <div className="rounded-lg border border-[#F0DDB7] bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-[#7A5417] dark:text-[#C28A2B]">
                      Din lön ({fmt(values.ownerSalary)} kr) understiger minimumlönen ({fmt(result.minLon)} kr)
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Minimilön = 6 × IBB ({fmt(K10_2025.lon_min_multiplier * K10_2025.ibb)} kr) + 5 % av bolagets löner ({fmt(Math.round(K10_2025.lon_min_bolag_pct * values.companyTotalSalaries))} kr).
                      Schablonbeloppet {fmt(K10_2025.schablonbelopp)} kr används istället.
                    </p>
                  </div>
                </div>
              )}

              {/* Tax breakdown */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Skatteeffekt på planerad utdelning</p>
                <SummaryRow label="Planerad utdelning" value={`${fmt(values.plannedDividend)} kr`} />
                <SummaryRow
                  label="Inom gränsbelopp (20 %)"
                  value={`${fmt(result.qualifiedDividend)} kr → skatt ${fmt(result.taxOnQualified)} kr`}
                />
                {result.excessDividend > 0 && (
                  <SummaryRow
                    label="Över gränsbelopp (tjänst ~52 %)"
                    value={`${fmt(result.excessDividend)} kr → skatt ${fmt(result.taxOnExcess)} kr`}
                    warn
                  />
                )}
                <div className="border-t pt-2 mt-2">
                  <SummaryRow label="TOTAL SKATT" value={`${fmt(result.totalTax)} kr`} bold />
                </div>
              </div>

              {/* Carry forward */}
              <div className="rounded-lg border border-[#BFE6D6] bg-emerald-50/50 dark:bg-emerald-950/20 p-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-[#085041] shrink-0" />
                <p className="text-xs">
                  <span className="font-medium">Sparat utrymme nästa år:</span>{" "}
                  <span className="font-bold text-[#085041] dark:text-[#1D9E75]">{fmt(result.remainingGransbelopp)} kr</span>
                </p>
              </div>

              <div className="rounded-lg border border-[#F0DDB7] dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <p className="text-sm">
                  K10 ska bifogas din privata inkomstdeklaration senast 2 maj.
                </p>
              </div>

              <Button onClick={handleExportPDF} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Ladda ner K10-bilaga som PDF
              </Button>
            </div>
          )}

          <div className="flex justify-between pt-2">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka
              </Button>
            ) : (
              <div />
            )}
            {step < K10_STEPS.length - 1 && (
              <Button onClick={() => setStep(step + 1)}>
                Nästa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value, bold, warn }: { label: string; value: string; bold?: boolean; warn?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={warn ? "text-[#7A5417] dark:text-[#C28A2B]" : ""}>{value}</span>
    </div>
  );
}
