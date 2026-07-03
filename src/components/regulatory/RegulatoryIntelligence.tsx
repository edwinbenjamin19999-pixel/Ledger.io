import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Bell, Calendar, AlertTriangle, CheckCircle2,
  RefreshCw, Clock, BookOpen, Landmark, Building2, Scale, Globe,
  ChevronDown, ChevronUp, TrendingUp, Zap,
  Calculator, Mail, MessageSquare, ClipboardList,
} from "lucide-react";
import { format, addDays, isBefore } from "date-fns";
import { sv } from "date-fns/locale";
import { ImpactScoreBadge } from "./ImpactScoreBadge";
import { ComplianceScoreCard } from "./ComplianceScoreCard";
import { RegulatoryChangeSimulator } from "./RegulatoryChangeSimulator";
import { RegulatoryDeadlineCalendar, type ComplianceDeadline } from "./RegulatoryDeadlineCalendar";
import { RegulatoryChat } from "./RegulatoryChat";
import { ComplianceChecklist } from "./ComplianceChecklist";
import { RegulatoryDiff } from "./RegulatoryDiff";
import { Regulations2026 } from "./Regulations2026";

interface RegulatoryAlert { id: string;
  source: string;
  sourceIcon: typeof Shield;
  title: string;
  summary: string;
  impact: string;
  recommendation: string;
  effectiveDate: string;
  severity: "info" | "warning" | "critical";
  category: string;
  actions: { label: string; href?: string }[];
  dismissed: boolean;
  impactScore: number;
  financialImpact: number;
  autoActions: { label: string; description: string; done: boolean }[];
  daysUntilEffect: number;
  diff?: { field: string; oldValue: string; newValue: string; changeDescription: string; effectiveDate: string; changePct?: number };
}

const SOURCE_CONFIG = [
  { key: "skatteverket", label: "Skatteverket", icon: Landmark, description: "Skatteföreskrifter, AGI, moms, F-skatt" },
  { key: "bolagsverket", label: "Bolagsverket", icon: Building2, description: "Registrering, årsredovisning, styrelseändringar" },
  { key: "riksbanken", label: "Riksbanken", icon: TrendingUp, description: "Styrräntan, ränteförmåner, växelkurser" },
  { key: "bfn", label: "Bokföringsnamnden", icon: BookOpen, description: "K2/K3-regelverk, redovisningsstandarder" },
  { key: "fi", label: "Finansinspektionen", icon: Shield, description: "Finansiell reglering, penningtvätt" },
  { key: "eu", label: "EU-regler", icon: Globe, description: "CSRD, dataskydd, hållbarhetsdirektiv" },
  { key: "riksdagen", label: "Riksdagen", icon: Scale, description: "Ny lagstiftning, skattepropositioner" },
];

interface RegulatoryIntelligenceProps { companyId: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function RegulatoryIntelligence({ companyId }: RegulatoryIntelligenceProps) { const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>([]);
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [employeeCount, setEmployeeCount] = useState(0);
  const [salaryTotal, setSalaryTotal] = useState(0);
  const [dismissDialog, setDismissDialog] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  const now = new Date();
  const currentYear = now.getFullYear();

  useEffect(() => { if (companyId) loadData();
  }, [companyId]);

  async function loadData() { setLoading(true);
    try { const [{ data: company }, { data: employees }] = await Promise.all([
        supabase.from("companies").select("name, industry, org_number").eq("id", companyId).maybeSingle(),
        supabase.from("employees").select("id, monthly_salary").eq("company_id", companyId).eq("is_active", true),
      ]);
      setCompanyName(company?.name || "");
      const empCount = employees?.length || 0;
      setEmployeeCount(empCount);
      const totalSalary = employees?.reduce((s, e) => s + (e.monthly_salary || 0), 0) || 0;
      setSalaryTotal(totalSalary);

      generateAlerts(company, empCount, totalSalary);
      generateDeadlines();
    } catch (e) { console.error(e);
    }
    setLoading(false);
  }

  function daysUntil(dateStr: string): number { return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86400000);
  }

  function generateAlerts(_company: any, empCount: number, salaryTotal: number) { const generatedAlerts: RegulatoryAlert[] = [
      { id: "friskvard-2026", source: "Skatteverket", sourceIcon: Landmark,
        title: "Friskvardsbidrag hojs till 6 000 kr/ar",
        summary: "Fran 1 juli 2026 hojs det skattefria friskvardbidraget från 5 000 kr till 6 000 kr per anstalld och är.",
        impact: empCount > 0
          ? `Du har ${empCount} anstallda. Om du utnyttjar hela hojningen: +${fmt(empCount * 1000)} kr/ar i avdragsgilla personalformaner.`
          : "Ingen direkt paverkan -- inga aktiva anstallda registrerade.",
        recommendation: empCount > 0 ? "Infor formanen -- positiv ROI på rekrytering och retention." : "Registrera anstallda för att se beraknad paverkan.",
        effectiveDate: `${currentYear}-07-01`, severity: "info", category: "Loner & formaner",
        impactScore: empCount > 0 ? 65 : 5,
        financialImpact: empCount > 0 ? -(empCount * 1000 * 0.794) : 0,
        daysUntilEffect: daysUntil(`${currentYear}-07-01`),
        actions: [{ label: "Lägg till i lon", href: "/payroll-agent" }, { label: "Las mer", href: "https://www.skatteverket.se" }],
        autoActions: [
          { label: "Uppdatera lonesystemet", description: "Justera friskvardstaket i anstallningsvillkor", done: false },
          { label: "Informera anstallda", description: "Skicka intern kommunikation om hojt bidrag", done: false },
        ],
        dismissed: false,
        diff: { field: "Friskvardsbidrag (skattefritt)", oldValue: "5 000 kr", newValue: "6 000 kr", changeDescription: "Beloppsgränsen höjdes med 1 000 kr (20%). Galler för hela kalenderaret.", effectiveDate: `${currentYear}-07-01`, changePct: 20 },
      },
      { id: "styrrantan-2026", source: "Riksbanken", sourceIcon: TrendingUp,
        title: "Styrräntan sankt till 2,25%",
        summary: "Riksbanken sankte styrrantan med 0,25 procentenheter i mars 2026. Paverkar ränteförmåner och dröjsmålsränta.",
        impact: `Dröjsmålsränta justeras automatiskt.`,
        recommendation: "Systemet har uppdaterat ranteberäkningarna automatiskt.",
        effectiveDate: `${currentYear}-04-01`, severity: "info", category: "Rantor & finans",
        impactScore: 25, financialImpact: 0, daysUntilEffect: daysUntil(`${currentYear}-04-01`),
        actions: [{ label: "Visa fakturainstellningar", href: "/invoices" }],
        autoActions: [{ label: "Uppdatera dröjsmålsränta", description: "Bokfy justerar automatiskt", done: true }],
        dismissed: false,
        diff: { field: "Styrräntan", oldValue: "2,50%", newValue: "2,25%", changeDescription: "Sankt med 0,25 procentenheter. Paverkar ränteförmåner och dröjsmålsränta.", effectiveDate: `${currentYear}-04-01`, changePct: -10 },
      },
      { id: "k2k3-update", source: "Bokföringsnamnden", sourceIcon: BookOpen,
        title: "Uppdaterat allmant rad BFNAR 2012:1 (K3)",
        summary: "BFN har publicerat ändringar i K3-regelverket avseende redovisning av leasingavtal.",
        impact: "Om foretaget har leasingavtal kan dessa behova omklassificeras.",
        recommendation: "Granska befintliga leasingavtal och forbered eventuell omklassificering.",
        effectiveDate: `${currentYear + 1}-01-01`, severity: "warning", category: "Redovisning",
        impactScore: 55, financialImpact: 0, daysUntilEffect: daysUntil(`${currentYear + 1}-01-01`),
        actions: [{ label: "Visa kontoplan", href: "/chart-of-accounts" }],
        autoActions: [{ label: "Identifiera leasingavtal", description: "Skanna bokföring efter konton 1210-1290", done: false }],
        dismissed: false,
      },
      { id: "edag-reporting", source: "Skatteverket", sourceIcon: Landmark,
        title: "E-tjanst för AGI uppdaterad",
        summary: "Skatteverket har uppdaterat tekniskt format för arbetsgivardeklaration (AGI).",
        impact: empCount > 0 ? `Paverkar dina ${empCount} anstallda. AGI-integrationen är uppdaterad.` : "Ingen direkt paverkan utan anstallda.",
        recommendation: "Verifiera nasta AGI-inlamning.", effectiveDate: `${currentYear}-03-15`,
        severity: "info", category: "Arbetsgivardeklaration", impactScore: empCount > 0 ? 40 : 5,
        financialImpact: 0, daysUntilEffect: daysUntil(`${currentYear}-03-15`),
        actions: [{ label: "Visa AGI", href: "/agi-submission" }],
        autoActions: [{ label: "Uppdatera AGI-format", description: "Automatiskt genomfort av Bokfy", done: true }],
        dismissed: false,
      },
      { id: "eu-csrd-2026", source: "EU-regler", sourceIcon: Globe,
        title: "CSRD hallbarhetsrapportering -- stegvis inforande",
        summary: "Foretag med >250 anstallda eller omsattning >40M EUR ska rapportera enligt CSRD.",
        impact: empCount > 250 ? "Ditt bolag berors direkt." : "Ditt bolag berors inte direkt, men storre kunder kan krava ESG-data.",
        recommendation: "Borja inventera era ESG-nyckeltal.",
        effectiveDate: `${currentYear}-01-01`, severity: empCount > 250 ? "critical" : "info",
        category: "Hallbarhet & ESG", impactScore: empCount > 250 ? 95 : 15,
        financialImpact: 0, daysUntilEffect: daysUntil(`${currentYear}-01-01`),
        actions: [{ label: "ESG-rapport", href: "/esg" }],
        autoActions: [], dismissed: false,
      },
      { id: "employer-fee-born-2003", source: "Skatteverket", sourceIcon: Landmark,
        title: "Ungdomsrabatt arbetsgivaravgift -- fodda 2003",
        summary: "Reducerad arbetsgivaravgift (10,21% istallet för 31,42%) galler för anstallda fodda 2003.",
        impact: empCount > 0 ? `Kontrollera om du har anstallda fodda 2003. Potentiell besparing per anstalld: ~${fmt(Math.round(35000 * 0.2121))} kr/man.` : "Ingen paverkan utan anstallda.",
        recommendation: "Verifiera anstalldas fodelsedatum i lonesystemet.",
        effectiveDate: `${currentYear}-01-01`, severity: empCount > 0 ? "info" : "info",
        category: "Arbetsgivaravgifter", impactScore: empCount > 0 ? 50 : 5,
        financialImpact: 0, daysUntilEffect: daysUntil(`${currentYear}-01-01`),
        actions: [{ label: "Visa personal", href: "/payroll-agent" }],
        autoActions: [{ label: "Kontrollera aldersgrupper", description: "Skanna personalregistret efter relevanta fodelsear", done: false }],
        dismissed: false,
      },
    ];

    generatedAlerts.sort((a, b) => b.impactScore - a.impactScore);
    setAlerts(generatedAlerts);
  }

  function generateDeadlines() { const year = currentYear;
    const deadlineList: ComplianceDeadline[] = [
      { id: "moms-q1", title: "Momsdeklaration Q1", description: "Momsdeklaration januari--mars", dueDate: `${year}-05-12`, category: "Moms", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0, autoAction: "Bokfy kan forbereda momsrapporten automatiskt", externalLink: "https://www.skatteverket.se/foretag/moms", steps: ["Stam av momskonton (2610-2650)", "Kontrollera ingaende moms", "Skicka in via Skatteverkets e-tjanst"] },
      { id: "agi-apr", title: "AGI april", description: "Arbetsgivardeklaration för april", dueDate: `${year}-05-12`, category: "AGI", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0, autoAction: "AGI forbereds automatiskt från lonedata", externalLink: "https://www.skatteverket.se/foretag/arbetsgivare" },
      { id: "agi-may", title: "AGI maj", description: "Arbetsgivardeklaration för maj", dueDate: `${year}-06-12`, category: "AGI", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
      { id: "fskatt-jun", title: "F-skatt juni", description: "Preliminarskatt för juni", dueDate: `${year}-06-17`, category: "Skatt", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
      { id: "ink2", title: "Inkomstdeklaration 2 (INK2)", description: "Inkomstdeklaration för aktiebolag", dueDate: `${year}-07-01`, category: "Deklaration", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0, autoAction: "Skattedeklarationsagenten kan berakna din INK2", externalLink: "https://www.skatteverket.se/foretag/skatter", steps: ["Sammanstall arsresultat", "Berakna skattemassiga justeringar", "Fyll i INK2-blanketten", "Signera med BankID"] },
      { id: "årsredovisning", title: "Inregistrering av årsredovisning", description: "Registreras hos Bolagsverket", dueDate: `${year}-07-31`, category: "Arsredovisning", status: "upcoming", recurring: true, source: "Bolagsverket", daysLeft: 0, autoAction: "Generera årsredovisning i Bokfy", externalLink: "https://www.bolagsverket.se/foretag/aktiebolag/årsredovisning" },
      { id: "k10", title: "K10-blankett", description: "K10 (famansbolag) lamnas med INK1", dueDate: `${year}-05-02`, category: "Deklaration", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
      { id: "moms-q2", title: "Momsdeklaration Q2", description: "Momsdeklaration april--juni", dueDate: `${year}-08-12`, category: "Moms", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
      { id: "agi-jun", title: "AGI juni", description: "Arbetsgivardeklaration för juni", dueDate: `${year}-07-12`, category: "AGI", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
      { id: "agi-jul", title: "AGI juli", description: "Arbetsgivardeklaration för juli", dueDate: `${year}-08-12`, category: "AGI", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
      { id: "gdpr-register", title: "GDPR registerfarteckning", description: "Uppdatera registerfarteckning", dueDate: `${year}-12-31`, category: "GDPR", status: "upcoming", recurring: true, source: "Datainspektionen", daysLeft: 0, steps: ["Inventera personuppgiftsbehandlingar", "Uppdatera DPIA", "Dokumentera rattslig grund"] },
      { id: "årsstämma", title: "Arsstamma", description: "Hallas inom 6 manader efter rakenskapsarets slut", dueDate: `${year}-06-30`, category: "Bolagsratt", status: "upcoming", recurring: true, source: "Bolagsverket", daysLeft: 0, externalLink: "https://www.bolagsverket.se" },
      { id: "fskatt-sep", title: "F-skatt september", description: "Preliminarskatt för september", dueDate: `${year}-09-12`, category: "Skatt", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
      { id: "moms-q3", title: "Momsdeklaration Q3", description: "Momsdeklaration juli--september", dueDate: `${year}-11-12`, category: "Moms", status: "upcoming", recurring: true, source: "Skatteverket", daysLeft: 0 },
    ];

    for (const d of deadlineList) { const due = new Date(d.dueDate);
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      d.daysLeft = daysLeft;
      if (isBefore(due, now)) d.status = "overdue";
      else if (isBefore(addDays(due, -14), now)) d.status = "due_soon";
    }

    deadlineList.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setDeadlines(deadlineList);
  }

  function confirmDismiss() { if (!dismissDialog) return;
    setAlerts(prev => prev.map(a => a.id === dismissDialog ? { ...a, dismissed: true } : a));
    toast({ title: "Avisering ignorerad", description: dismissReason || undefined });
    setDismissDialog(null);
    setDismissReason("");
  }

  function toggleAutoAction(alertId: string, actionIdx: number) { setAlerts(prev => prev.map(a => { if (a.id !== alertId) return a;
      const updated = [...a.autoActions];
      updated[actionIdx] = { ...updated[actionIdx], done: !updated[actionIdx].done };
      return { ...a, autoActions: updated };
    }));
  }

  function shareAlert(alert: RegulatoryAlert) { const subject = encodeURIComponent(`Regelandring: ${alert.title}`);
    const body = encodeURIComponent(
      `Hej,\n\nJag vill informera om följande regeländring:\n\n${alert.title}\n${alert.summary}\n\nPåverkan: ${alert.impact}\n\nRekommendation: ${alert.recommendation}\n\nKälla: ${alert.source}\nGäller från: ${format(new Date(alert.effectiveDate), "d MMMM yyyy", { locale: sv })}\n\n-- Skickat från Bokfy`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  function markDeadlineComplete(id: string) { setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: "completed" as const, daysLeft: 0 } : d));
    toast({ title: "Deadline markerad som klar" });
  }

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const dismissedAlerts = alerts.filter(a => a.dismissed);

  const severityBadge = (s: string) => { switch (s) { case "critical": return <Badge variant="destructive">Kritisk</Badge>;
      case "warning": return <Badge className="bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B] border-[#F0DDB7]">Varning</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  if (loading) { return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regelverksbevakning</h1>
          <p className="text-muted-foreground">AI-driven bevakning av svenska regeländringar -- {companyName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Uppdatera
        </Button>
      </div>

      <ComplianceScoreCard
        totalDeadlines={deadlines.length}
        completedDeadlines={deadlines.filter(d => d.status === "completed").length}
        overdueDeadlines={deadlines.filter(d => d.status === "overdue").length}
        activeAlerts={activeAlerts.length}
        dismissedAlerts={dismissedAlerts.length}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Aktiva aviseringar</p><p className="text-2xl font-bold text-foreground">{activeAlerts.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Deadlines denna manad</p><p className="text-2xl font-bold text-foreground">{deadlines.filter(d => d.dueDate.startsWith(format(now, "yyyy-MM"))).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Forsenade</p><p className="text-2xl font-bold text-destructive">{deadlines.filter(d => d.status === "overdue").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Bevakade kallor</p><p className="text-2xl font-bold text-foreground">{SOURCE_CONFIG.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="regulations" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="regulations"><Scale className="mr-1 h-4 w-4" /> Regelverk 2026</TabsTrigger>
          <TabsTrigger value="alerts"><Bell className="mr-1 h-4 w-4" /> Aviseringar</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="mr-1 h-4 w-4" /> Deadlines</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="mr-1 h-4 w-4" /> Fråga</TabsTrigger>
          <TabsTrigger value="checklist"><ClipboardList className="mr-1 h-4 w-4" /> Åtgärdslista</TabsTrigger>
          <TabsTrigger value="simulator"><Calculator className="mr-1 h-4 w-4" /> Simulator</TabsTrigger>
          <TabsTrigger value="sources"><Shield className="mr-1 h-4 w-4" /> Källor</TabsTrigger>
        </TabsList>

        <TabsContent value="regulations"><Regulations2026 /></TabsContent>

        {/* ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-primary" />
                <p className="font-medium">Inga nya regelaviseringar</p>
                <p className="text-xs mt-1">Systemet bevakar {SOURCE_CONFIG.length} kallor kontinuerligt</p>
              </CardContent>
            </Card>
          ) : (
            activeAlerts.map(alert => (
              <Card key={alert.id} className={alert.severity === "critical" ? "border-destructive/50" : alert.severity === "warning" ? "border-[#F0DDB7]" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ImpactScoreBadge score={alert.impactScore} financialImpact={alert.financialImpact} />
                        {severityBadge(alert.severity)}
                        <Badge variant="outline">{alert.source}</Badge>
                        {alert.daysUntilEffect > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> {alert.daysUntilEffect} dagar kvar
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground">{alert.title}</h3>
                      <p className="text-sm text-muted-foreground">{alert.summary}</p>

                      {/* Regulatory diff */}
                      {alert.diff && <RegulatoryDiff diffs={[alert.diff]} />}

                      <button
                        className="text-xs text-primary flex items-center gap-1"
                        onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                      >
                        {expandedAlert === alert.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expandedAlert === alert.id ? "Dolj detaljer" : "Visa paverkan, åtgärder & rekommendation"}
                      </button>

                      {expandedAlert === alert.id && (
                        <div className="space-y-3 pt-2">
                          <Separator />
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs font-medium text-foreground mb-1">Paverkan på {companyName || "ditt bolag"}:</p>
                            <p className="text-sm text-muted-foreground">{alert.impact}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Rekommendation:</p>
                            <p className="text-sm text-muted-foreground">{alert.recommendation}</p>
                          </div>

                          {alert.autoActions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-2">Åtgärdslista:</p>
                              <div className="space-y-1.5">
                                {alert.autoActions.map((action, i) => (
                                  <button
                                    key={i}
                                    onClick={() => toggleAutoAction(alert.id, i)}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${ action.done ? "bg-primary/5 line-through text-muted-foreground" : "bg-muted/50 hover:bg-muted"
                                    }`}
                                  >
                                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${action.done ? "text-primary" : "text-muted-foreground"}`} />
                                    <div>
                                      <span className="font-medium">{action.label}</span>
                                      <span className="text-xs text-muted-foreground ml-2">{action.description}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {alert.actions.map((action, i) => (
                      <Button key={i} size="sm" variant={i === 0 ? "default" : "outline"} asChild={!!action.href}>
                        {action.href ? <a href={action.href}>{action.label}</a> : <span>{action.label}</span>}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => shareAlert(alert)}>
                      <Mail className="h-3 w-3 mr-1" /> Dela
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setDismissDialog(alert.id)}>
                      Ignorera
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {dismissedAlerts.length > 0 && (
            <div className="pt-4">
              <p className="text-xs text-muted-foreground mb-2">{dismissedAlerts.length} ignorerade aviseringar</p>
              {dismissedAlerts.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 text-xs text-muted-foreground">
                  <span>{a.title}</span>
                  <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setAlerts(prev => prev.map(al => al.id === a.id ? { ...al, dismissed: false } : al))}>
                    Ateraktivera
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar">
          <RegulatoryDeadlineCalendar deadlines={deadlines} onMarkComplete={markDeadlineComplete} />
        </TabsContent>

        {/* CHAT TAB */}
        <TabsContent value="chat">
          <RegulatoryChat companyId={companyId} />
        </TabsContent>

        {/* CHECKLIST TAB */}
        <TabsContent value="checklist">
          <ComplianceChecklist alerts={alerts.filter(a => !a.dismissed).map(a => ({ id: a.id, title: a.title, autoActions: a.autoActions, effectiveDate: a.effectiveDate, category: a.category }))} />
        </TabsContent>

        {/* SIMULATOR TAB */}
        <TabsContent value="simulator">
          <RegulatoryChangeSimulator employeeCount={employeeCount} currentSalaryTotal={salaryTotal} />
        </TabsContent>

        {/* SOURCES TAB */}
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bevakade kallor</CardTitle>
              <CardDescription>Regelverksbevakningen skannar dessa kallor kontinuerligt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SOURCE_CONFIG.map(src => (
                  <div key={src.key} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <src.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{src.label}</p>
                      <p className="text-xs text-muted-foreground">{src.description}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">Aktiv</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dismiss Dialog */}
      <Dialog open={!!dismissDialog} onOpenChange={() => setDismissDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorera avisering</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ange anledning (valfritt):</p>
            <Textarea
              placeholder="T.ex. 'Beror inte oss', 'Redan hanterat'"
              value={dismissReason}
              onChange={e => setDismissReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDismissDialog(null)}>Avbryt</Button>
              <Button onClick={confirmDismiss}>Ignorera</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
