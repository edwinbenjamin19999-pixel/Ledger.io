import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { Copy, Check, FileText, Leaf } from "lucide-react";
import { useESGFormData } from "@/hooks/useESGFormData";
import { toast } from "sonner";

export function ESGExport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: esg, isLoading } = useESGFormData(year);
  const [copied, setCopied] = useState(false);

  if (isLoading) return <Skeleton className="h-64" />;

  if (!esg) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Leaf className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">Ingen ESG-data för {year}</p>
          <p className="text-sm text-muted-foreground mt-1">Fyll i formuläret under fliken "Inmatning" först.</p>
        </CardContent>
      </Card>
    );
  }

  const fmt = (v: number | null | undefined) => Number(v || 0).toLocaleString("sv-SE", { maximumFractionDigits: 2 });

  const reportText = `ESG-RAPPORT ${year}
${"=".repeat(40)}

MILJÖ (E)
─────────────────────────────
Scope 1 CO₂ (egna utsläpp):     ${fmt(esg.scope1_co2_tonnes)} ton
Scope 2 CO₂ (köpt energi):      ${fmt(esg.scope2_co2_tonnes)} ton
Scope 3 CO₂ (leverantörer):     ${fmt(esg.scope3_co2_tonnes)} ton
Total CO₂:                      ${fmt(Number(esg.scope1_co2_tonnes) + Number(esg.scope2_co2_tonnes) + Number(esg.scope3_co2_tonnes))} ton
Energiförbrukning:               ${fmt(esg.energy_kwh)} kWh
Andel förnybar energi:           ${fmt(esg.renewable_energy_percent)}%
Vattenförbrukning:               ${fmt(esg.water_m3)} m³
Avfall:                          ${fmt(esg.waste_tonnes)} ton
Återvunnen andel:                ${fmt(esg.recycled_percent)}%

SOCIALT (S)
─────────────────────────────
Andel kvinnor i styrelsen:       ${fmt(esg.female_board_percent)}%
Personalomsättning:              ${fmt(esg.employee_turnover_percent)}%
Sjukdagar per anställd:          ${fmt(esg.sick_days_per_employee)}
Sociala investeringar:           ${fmt(esg.social_investment_sek)} kr

STYRNING (G)
─────────────────────────────
Uppförandekod:                   ${esg.has_code_of_conduct ? "Ja" : "Nej"}
Visselblåsarfunktion:            ${esg.has_whistleblower ? "Ja" : "Nej"}
Anti-korruptionsutbildning:      ${fmt(esg.anti_corruption_training_percent)}%

${esg.notes ? `NOTER\n${esg.notes}` : ""}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    toast.success("Rapporttext kopierad");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[2023, 2024, 2025, 2026].map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-3">
        <ComingSoonButton tooltipText="iXBRL ESRS-export Q3 2026">
          <FileText className="h-4 w-4 mr-1.5" /> Generera ESG-rapport (PDF)
        </ComingSoonButton>
        <ComingSoonButton tooltipText="GRI-rapport i PDF Q3 2026">
          <FileText className="h-4 w-4 mr-1.5" /> Ladda ner GRI-sammanfattning
        </ComingSoonButton>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Rapportsammanfattning</CardTitle>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Kopierad" : "Kopiera rapporttext"}
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-muted/50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {reportText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
