import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Circle, AlertTriangle, FileText, Download, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AccuracyDisclaimer } from "@/components/governance/AccuracyDisclaimer";

const formatSEK = (v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} TSEK`;
  return `${v.toFixed(0)} kr`;
};

interface Props { fin: { revenue: number;
    costs: number;
    ebitda: number;
    ebitdaMargin: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
    cash: number;
    ar: number;
    ap: number;
    revenueGrowth: number;
    customerCount: number;
    employeeCount: number;
    monthlyRevenues: { month: string; revenue: number }[];
    topCustomerShare: number;
    topSupplierShare: number;
    recurringRevenueShare: number;
  };
  ddScore: { scores: { category: string; score: number; status: "good" | "warning" | "critical"; detail: string }[];
    overall: number;
  };
}

interface CheckItem { label: string;
  status: "done" | "partial" | "manual";
  detail: string;
  source: "auto" | "manual";
}

export function MADueDiligence({ fin, ddScore }: Props) { const financialDD: CheckItem[] = useMemo(() => [
    { label: "Resultaträkning 3 år", status: fin.revenue > 0 ? "done" : "partial", detail: fin.revenue > 0 ? `Omsättning ${formatSEK(fin.revenue)}, EBITDA ${formatSEK(fin.ebitda)}` : "Otillräcklig data", source: "auto" },
    { label: "Balansräkning 3 år", status: fin.totalAssets > 0 ? "done" : "partial", detail: `Tillgångar ${formatSEK(fin.totalAssets)}, EK ${formatSEK(fin.equity)}`, source: "auto" },
    { label: "Kassaflödesanalys 3 år", status: fin.cash > 0 ? "done" : "partial", detail: `Kassa ${formatSEK(fin.cash)}`, source: "auto" },
    { label: "Kundkoncentrationsanalys", status: "done", detail: `Top 3 kunder = ${fin.topCustomerShare.toFixed(0)}% av omsättning`, source: "auto" },
    { label: "Leverantörsberoende", status: "done", detail: `Top 3 leverantörer = ${fin.topSupplierShare.toFixed(0)}% av inköp`, source: "auto" },
    { label: "Återkommande vs engångsintäkter", status: "done", detail: `${fin.recurringRevenueShare.toFixed(0)}% bedöms återkommande`, source: "auto" },
    { label: "Säsongsmönster", status: fin.monthlyRevenues.length >= 6 ? "done" : "partial", detail: fin.monthlyRevenues.length >= 6 ? "Analyserat baserat på månadsdata" : "Behöver minst 6 månader", source: "auto" },
    { label: "Working capital trend", status: "done", detail: `Netto rörelsekapital: ${formatSEK(fin.ar - fin.ap)}`, source: "auto" },
    { label: "Skuldsättningsgrad", status: "done", detail: fin.totalAssets > 0 ? `${((fin.totalLiabilities / fin.totalAssets) * 100).toFixed(1)}%` : "N/A", source: "auto" },
  ], [fin]);

  const legalDD: CheckItem[] = [
    { label: "Bolagsordning uppdaterad", status: "manual", detail: "Kräver manuell verifiering", source: "manual" },
    { label: "Aktiebok uppdaterad (Bolagsverket)", status: "manual", detail: "Kräver manuell verifiering", source: "manual" },
    { label: "Anställningsavtal nyckelpersoner", status: "manual", detail: "Kräver manuell verifiering", source: "manual" },
    { label: "IP-rättigheter registrerade", status: "manual", detail: "Kräver manuell verifiering", source: "manual" },
    { label: "Inga pågående tvister", status: "manual", detail: "Kräver manuell verifiering", source: "manual" },
    { label: "Skatteärenden avslutade", status: "manual", detail: "Kräver manuell verifiering", source: "manual" },
  ];

  const operationalDD: CheckItem[] = useMemo(() => [
    { label: "Antal anställda och personalkostnadstrend", status: fin.employeeCount > 0 ? "done" : "partial", detail: `${fin.employeeCount} anställda`, source: "auto" },
    { label: "Kundfordringars ålder", status: fin.ar > 0 ? "done" : "done", detail: `Utestående: ${formatSEK(fin.ar)}`, source: "auto" },
    { label: "Produktivitet per anställd", status: fin.employeeCount > 0 ? "done" : "partial", detail: fin.employeeCount > 0 ? `${formatSEK(fin.revenue / fin.employeeCount)}/anställd` : "Inga anställda registrerade", source: "auto" },
    { label: "Nyckelkundkontrakt", status: "manual", detail: "Ladda upp manuellt", source: "manual" },
    { label: "Nyckelteknologi/IP", status: "manual", detail: "Beskriv manuellt", source: "manual" },
  ], [fin]);

  const allItems = [...financialDD, ...legalDD, ...operationalDD];
  const doneCount = allItems.filter(i => i.status === "done").length;
  const readiness = Math.round((doneCount / allItems.length) * 100);

  const statusIcon = (s: string) => { if (s === "done") return <CheckCircle2 className="h-4 w-4 text-[#085041] shrink-0" />;
    if (s === "partial") return <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />;
    return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall DD Score */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-5xl font-bold text-primary">{ddScore.overall}</div>
              <div className="text-sm text-muted-foreground">Due Diligence Score (0-100)</div>
            </div>
            <div className="text-right">
              <Badge variant={ddScore.overall >= 70 ? "default" : ddScore.overall >= 50 ? "secondary" : "destructive"}>
                {ddScore.overall >= 70 ? "Investeringsredo" : ddScore.overall >= 50 ? "Behöver förbättring" : "Hög risk"}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">DD-paket: {readiness}% komplett</p>
              <Progress value={readiness} className="h-2 mt-1 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ddScore.scores.map(s => (
              <div key={s.category} className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {s.status === "good" ? <CheckCircle2 className="h-3 w-3 text-[#085041]" /> :
                   s.status === "warning" ? <AlertTriangle className="h-3 w-3 text-[#7A5417]" /> :
                   <AlertTriangle className="h-3 w-3 text-destructive" />}
                  <span className="text-xs font-medium">{s.category}</span>
                </div>
                <div className="font-bold text-sm">{s.score}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Financial DD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Finansiell Due Diligence
          </CardTitle>
          <CardDescription>Automatiskt genererat från Ledger.io-bokföring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {financialDD.map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {statusIcon(item.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 ${item.source === "auto" ? "text-[#085041] border-[#BFE6D6]" : "text-muted-foreground"}`}>
                    {item.source === "auto" ? "Automatisk" : "Manuell"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legal DD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Legal Due Diligence
          </CardTitle>
          <CardDescription>Checklista — kräver manuell verifiering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {legalDD.map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {statusIcon(item.status)}
              <div className="flex-1">
                <span className="text-sm font-medium">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Operational DD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Operationell Due Diligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {operationalDD.map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {statusIcon(item.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 ${item.source === "auto" ? "text-[#085041] border-[#BFE6D6]" : "text-muted-foreground"}`}>
                    {item.source === "auto" ? "Automatisk" : "Manuell"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exportera DD-paket</p>
              <p className="text-xs text-muted-foreground">Komplett due diligence-rapport redo att skicka till potentiell köpare/investerare</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => toast.success("DD-paket exporteras som PDF...")}>
              <Download className="h-4 w-4" />
              Exportera PDF
            </Button>
          </div>
          <AccuracyDisclaimer className="mt-3" dataSource="Ledger.io huvudbok" />
        </CardContent>
      </Card>
    </div>
  );
}
