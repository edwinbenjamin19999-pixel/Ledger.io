import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertTriangle, FileText, ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface CSRDComplianceProps { co2Total: number;
  co2Scope3: number;
  onTimePaymentRate: number;
  auditSpend: number;
  employeeCount: number;
  healthcareSpend: number;
  revenue: number;
}

interface ComplianceItem { id: string;
  requirement: string;
  category: "E" | "S" | "G";
  esrs: string;
  status: "done" | "partial" | "missing";
  detail: string;
  action?: string;
}

export function CSRDCompliance({ co2Total, co2Scope3, onTimePaymentRate, auditSpend, employeeCount, healthcareSpend, revenue }: CSRDComplianceProps) { // CSRD obligation check
  const isObligated = revenue > 40_000_000 || employeeCount >= 250;
  const isApproaching = revenue > 20_000_000 || employeeCount >= 50;

  const items: ComplianceItem[] = [
    { id: "scope12",
      requirement: "Klimatpåverkan rapporterad (Scope 1+2)",
      category: "E",
      esrs: "ESRS E1",
      status: co2Total > 0 ? "done" : "missing",
      detail: co2Total > 0 ? `${co2Total.toFixed(1)} ton CO₂ beräknat från bokföringsdata` : "Ingen data",
    },
    { id: "scope3",
      requirement: "Scope 3 (leverantörskedja)",
      category: "E",
      esrs: "ESRS E1",
      status: co2Scope3 > 0 ? "partial" : "missing",
      detail: co2Scope3 > 0 ? `Estimat finns (${co2Scope3.toFixed(1)} ton), verifiering saknas` : "Ingen data",
      action: "Begär klimatdata från leverantörer",
    },
    { id: "energy",
      requirement: "Energiförbrukning och energimix",
      category: "E",
      esrs: "ESRS E1",
      status: co2Total > 0 ? "partial" : "missing",
      detail: "Energikostnader bokförda — kWh-data kräver verifiering",
    },
    { id: "workforce",
      requirement: "Arbetsstyrka och arbetsvillkor",
      category: "S",
      esrs: "ESRS S1",
      status: employeeCount > 0 ? "done" : "missing",
      detail: employeeCount > 0 ? `${employeeCount} anställda registrerade med löne- och sjukdata` : "Ingen anställd registrerad",
    },
    { id: "health",
      requirement: "Arbetsmiljö och hälsa",
      category: "S",
      esrs: "ESRS S1",
      status: healthcareSpend > 0 ? "done" : "partial",
      detail: healthcareSpend > 0 ? "Friskvårdssatsning aktiv" : "Ingen friskvårdsutgift registrerad",
    },
    { id: "gender",
      requirement: "Könsfördelning rapporterad",
      category: "S",
      esrs: "ESRS S1",
      status: employeeCount > 0 ? "partial" : "missing",
      detail: employeeCount > 0 ? "Personaldata finns, könsfördelning kan beräknas" : "Ingen data",
    },
    { id: "child_labor",
      requirement: "Sociala minimikrav (leverantörspolicy)",
      category: "S",
      esrs: "ESRS S2",
      status: "missing",
      detail: "Ingen policy för mänskliga rättigheter i leverantörskedjan",
      action: "Skapa leverantörspolicy",
    },
    { id: "anti_corruption",
      requirement: "Anti-korruptionspolicy",
      category: "G",
      esrs: "ESRS G1",
      status: "missing",
      detail: "Ingen anti-korruptionspolicy registrerad",
      action: "Skapa anti-korruptionspolicy",
    },
    { id: "payment_times",
      requirement: "Betalningstider leverantörer",
      category: "G",
      esrs: "ESRS G1",
      status: onTimePaymentRate > 0 ? "done" : "missing",
      detail: `${onTimePaymentRate.toFixed(0)}% betalda i tid — rapporterat`,
    },
    { id: "audit",
      requirement: "Extern revision",
      category: "G",
      esrs: "ESRS G1",
      status: auditSpend > 0 ? "done" : "missing",
      detail: auditSpend > 0 ? "Revisionskostnad registrerad" : "Ingen revision registrerad",
    },
  ];

  const doneCount = items.filter(i => i.status === "done").length;
  const partialCount = items.filter(i => i.status === "partial").length;
  const readiness = Math.round(((doneCount + partialCount * 0.5) / items.length) * 100);

  const statusIcon = (status: string) => { if (status === "done") return <CheckCircle2 className="h-4 w-4 text-[#085041] shrink-0" />;
    if (status === "partial") return <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />;
    return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  const catColor = { E: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300",
    S: "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    G: "bg-[#F1F5F9] text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <div className="space-y-6">
      {/* CSRD Obligation Status */}
      <Card className={`border-l-4 ${isObligated ? "border-l-red-500" : isApproaching ? "border-l-amber-500" : "border-l-emerald-500"}`}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {isObligated
                  ? "CSRD gäller för ditt bolag"
                  : `Ditt bolag (omsättning ${revenue > 0 ? `${(revenue / 1_000_000).toFixed(1)} MSEK` : "okänd"}, ${employeeCount} anställda)`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isObligated
                  ? "Du uppfyller tröskelvärdena (>40 MSEK omsättning eller >250 anställda). CSRD-rapportering är obligatorisk."
                  : isApproaching
                  ? "Du närmar dig CSRD-tröskelvärdena. Förbered rapportering proaktivt."
                  : "CSRD gäller ej obligatoriskt — men kunder och banker kan kräva ESG-data från 2025."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSRD/VSME Beredskapsanalys {new Date().getFullYear()}</CardTitle>
          <CardDescription>
            European Sustainability Reporting Standards (ESRS) — VSME-standarden för SME
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={readiness} className="h-3" />
            </div>
            <Badge variant={readiness >= 70 ? "default" : readiness >= 40 ? "secondary" : "destructive"}>
              {readiness}% klar
            </Badge>
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                {statusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catColor[item.category]}`}>{item.category}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{item.esrs}</Badge>
                    <span className="text-sm font-medium">{item.requirement}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                </div>
                {item.action && (
                  <ComingSoonButton variant="ghost" tooltipText={`${item.action} lanseras snart`}>{item.action}</ComingSoonButton>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2 flex-wrap">
            <ComingSoonButton tooltipText="CSRD/ESRS-rapport i iXBRL-format">
              Generera ESRS-rapport
            </ComingSoonButton>
            <ComingSoonButton tooltipText="GRI Standards-rapport i PDF">
              Generera GRI-rapport
            </ComingSoonButton>
            <ComingSoonButton tooltipText="AI-driven åtgärdsplan för full CSRD-beredskap">
              Identifiera åtgärder för 100%
            </ComingSoonButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
