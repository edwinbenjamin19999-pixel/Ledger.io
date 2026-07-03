import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, Loader2, CheckCircle, AlertTriangle, Eye, Edit3, ArrowRight } from "lucide-react";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { exportAnnualReportPDF } from "@/lib/annual-report-pdf";
import { BolagsverketSubmissionPanel } from "@/components/annual-report/BolagsverketSubmissionPanel";
import { AnnualReportSigningPanel } from "@/components/annual-report/AnnualReportSigningPanel";
import { NoteEditor } from "@/components/annual-report/NoteEditor";
import { useAnnualReportNotes, useSaveAnnualReportNote } from "@/hooks/useAnnualReportNotes";
import { CashFlowStatement } from "@/components/annual-report/CashFlowStatement";
import { ManagementReportEditor } from "@/components/annual-report/ManagementReportEditor";
import { INCOME_STATEMENT_ROWS, BALANCE_SHEET_ROWS, sumAccountRange } from "@/lib/annual-report-rows";
import { filterTemplatesForFramework, getFrameworkRef } from "@/lib/annual-report-notes";
import { formatSEK } from "@/lib/formatNumber";
import { OverviewHeaderCard } from "@/components/annual-report/OverviewHeaderCard";
import { KeyMetricsRow, type MetricPill } from "@/components/annual-report/KeyMetricsRow";
import { WorkflowSteps, type WorkflowStep } from "@/components/annual-report/WorkflowSteps";
import { DocumentPartsGrid, type DocPart } from "@/components/annual-report/DocumentPartsGrid";
import { AIAssistantBanner, type AISuggestion } from "@/components/annual-report/AIAssistantBanner";
import { ContentSidebar, type SidebarItem } from "@/components/annual-report/ContentSidebar";
import { evaluateCompliance, summarize } from "@/lib/annual-report-compliance";
import { EditorToolbar, type SaveState } from "@/components/annual-report/EditorToolbar";
import { ComplianceValidatorPanel } from "@/components/annual-report/ComplianceValidatorPanel";
import { BackToTopButton } from "@/components/annual-report/BackToTopButton";
import { useScrollSpy, scrollToSection } from "@/hooks/useScrollSpy";
import { useAnnualReportId } from "@/hooks/useAnnualReportId";
import DeferredTaxWorkspace from "@/components/annual-report/k3/DeferredTaxWorkspace";
import LeaseRegister from "@/components/annual-report/k3/LeaseRegister";
import FrameworkSwitchDialog from "@/components/annual-report/k3/FrameworkSwitchDialog";
import FinancialInstrumentsRegister from "@/components/annual-report/k3/FinancialInstrumentsRegister";
import RiskDisclosures from "@/components/annual-report/k3/RiskDisclosures";
import OCISection, { OCIState, computeOCITotals } from "@/components/annual-report/k3/OCISection";
import SubsidiaryBanner from "@/components/annual-report/k3/SubsidiaryBanner";

interface Company { id: string; name: string; org_number: string; accounting_framework?: string; group_id?: string | null; }

interface ReportLine { label: string;
  autoValue: number;
  adjustedValue: number;
  accountRange?: string;
  isHeader?: boolean;
  isTotal?: boolean;
  isNet?: boolean;
  indent?: number;
}

const fmt = (n: number) => { if (n === 0) return "–";
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  return neg ? `- ${s}` : s;
};

type NoteInstance = { id: string; code: string; title: string; content: string;
  category: "obligatorisk" | "rekommenderad" | "valfri";
  isEditing: boolean; isAIGenerated: boolean;
};

/* ─── Sidebar items ─── */
const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "overview", label: "Översikt" },
  { id: "div1", label: "", isDivider: true },
  { id: "forvaltning", label: "Förvaltningsberättelse" },
  { id: "forvaltning_verksamhet", label: "Allmänt om verksamheten", indent: 1 },
  { id: "forvaltning_handelser", label: "Väsentliga händelser", indent: 1 },
  { id: "forvaltning_flerarsoverikt", label: "Flerårsöversikt", indent: 1 },
  { id: "forvaltning_nyckeltal", label: "Nyckeltal", indent: 1 },
  { id: "forvaltning_disposition", label: "Resultatdisposition", indent: 1 },
  { id: "div2", label: "", isDivider: true },
  { id: "resultatrakning", label: "Resultaträkning" },
  { id: "balansrakning", label: "Balansräkning" },
  { id: "balansrakning_tillgangar", label: "Tillgångar", indent: 1 },
  { id: "balansrakning_ekskulder", label: "EK och skulder", indent: 1 },
  { id: "kassaflodesanalys", label: "Kassaflödesanalys", k3Only: true },
  { id: "deferred_tax", label: "Uppskjuten skatt", k3Only: true },
  { id: "leases", label: "Leasing (K3 kap 20)", k3Only: true },
  { id: "fin_instruments", label: "Finansiella instrument", k3Only: true },
  { id: "risk_disclosures", label: "Riskupplysningar", k3Only: true },
  { id: "div3", label: "", isDivider: true },
  { id: "notes", label: "Tilläggsupplysningar (Noter)" },
  { id: "note_principer", label: "Not 1 — Redovisningsprinciper", indent: 1 },
  { id: "note_anstallda", label: "Not 2 — Anställda", indent: 1 },
  { id: "note_add", label: "Lägg till not", indent: 1, isAction: true },
  { id: "div4", label: "", isDivider: true },
  { id: "signing", label: "Revisionsberättelse" },
  { id: "div5", label: "", isDivider: true },
  { id: "underskrifter", label: "Underskrifter" },
  { id: "div6", label: "", isDivider: true },
  { id: "signing_bankid", label: "Signering" },
  { id: "export", label: "Export & Inlämning" },
];

const AnnualReport = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState((new Date().getFullYear() - 1).toString());
  const [regelverk, setRegelverk] = useState<"K2" | "K3">("K2");
  const [status, setStatus] = useState<"draft" | "review" | "signing" | "ready" | "submitted">("draft");
  const [loadingData, setLoadingData] = useState(false);
  const [acctMap, setAcctMap] = useState<Map<string, { name: string; debit: number; credit: number }>>(new Map());
  const [notes, setNotes] = useState<NoteInstance[]>([]);
  const [forvaltning, setForvaltning] = useState({ verksamhet: "", handelser: "", vinstdisposition: "", framtid: "" });
  const { data: savedNotes } = useAnnualReportNotes(selectedCompany || null, parseInt(selectedYear));
  const saveNoteMutation = useSaveAnnualReportNote(selectedCompany || null);
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | undefined>();
  const [showZeroRows, setShowZeroRows] = useState(false);
  const [pendingFramework, setPendingFramework] = useState<"K2" | "K3" | null>(null);
  const [ociState, setOciState] = useState<OCIState>({ pension: 0, translation: 0, hedge: 0 });
  const { annualReportId } = useAnnualReportId(selectedCompany || null, parseInt(selectedYear), regelverk);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany && selectedYear) fetchData(); }, [selectedCompany, selectedYear]);

  const loadCompanies = async () => { const { data } = await supabase.from("companies").select("id, name, org_number, accounting_framework, group_id").order("name");
    if (data?.length) { setCompanies(data); setSelectedCompany(data[0].id); if (data[0].accounting_framework) setRegelverk(data[0].accounting_framework as "K2" | "K3"); }
  };

  const fetchData = async () => { setLoadingData(true);
    try { const year = parseInt(selectedYear);
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: entries } = await supabase
        .from("journal_entries").select("id")
        .eq("company_id", selectedCompany).eq("status", "approved")
        .gte("entry_date", startDate).lte("entry_date", endDate);

      const entryIds = (entries || []).map(e => e.id);
      let allLines: any[] = [];
      for (let i = 0; i < entryIds.length; i += 100) { const batch = entryIds.slice(i, i + 100);
        const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts(account_number, account_name)")
          .in("journal_entry_id", batch);
        allLines.push(...(lines || []));
      }

      const map = new Map<string, { name: string; debit: number; credit: number }>();
      for (const l of allLines) { const num = l.chart_of_accounts?.account_number || "";
        const name = l.chart_of_accounts?.account_name || "";
        if (!map.has(num)) map.set(num, { name, debit: 0, credit: 0 });
        const a = map.get(num)!;
        a.debit += l.debit || 0;
        a.credit += l.credit || 0;
      }
      setAcctMap(map);

      const templates = filterTemplatesForFramework(regelverk);
      const obligatoriska = templates.filter(t => t.category === "obligatorisk");
      const defaultNotes: NoteInstance[] = obligatoriska.map(t => {
        const defaultContent = t.template
          .replace("{{framework_ref}}", getFrameworkRef(regelverk))
          .replace("{{k2_max_5ar}}", regelverk === "K2" ? " Nyttjandeperioden uppgår till högst 5 år enligt K2." : "")
          .replace(/\{\{[^}]+\}\}/g, "[—]");
        return {
          id: `note-${t.code}`,
          code: t.code,
          title: t.name,
          content: savedNotes?.[t.code] ?? defaultContent,
          category: t.category,
          isEditing: false,
          isAIGenerated: !savedNotes?.[t.code],
        };
      });
      setNotes(defaultNotes);
    } catch (e: any) { toast.error("Kunde inte hämta data: " + (e.message || ""));
    } finally { setLoadingData(false);
    }
  };

  const sumRange = (from: string, to: string, sign: "debit" | "credit" | "net" = "net") => { return sumAccountRange(acctMap as any, `${from}-${to}`, sign);
  };

  const { isLines, bsLines, cashFlowValues, keyFigures } = useMemo(() => {
    const revenue = sumRange("3000", "3999", "credit") - sumRange("3000", "3999", "debit");
    const lagerforandring = -(sumRange("4900", "4999", "debit") - sumRange("4900", "4999", "credit"));
    const aktiverat = sumRange("3800", "3899", "credit") - sumRange("3800", "3899", "debit");
    const ovrigaIntakt = sumRange("3900", "3999", "credit") - sumRange("3900", "3999", "debit");
    const sumRevenue = revenue + lagerforandring + aktiverat + ovrigaIntakt;

    const ravaror = -(sumRange("4000", "4899", "debit") - sumRange("4000", "4899", "credit"));
    const extKostn = -(sumRange("5000", "6999", "debit") - sumRange("5000", "6999", "credit"));
    const personal = -(sumRange("7000", "7699", "debit") - sumRange("7000", "7699", "credit"));
    const avskrImmat = -(sumRange("7810", "7819", "debit") - sumRange("7810", "7819", "credit"));
    const avskrMat = -(sumRange("7820", "7839", "debit") - sumRange("7820", "7839", "credit"));
    const nedskrOms = -(sumRange("7840", "7849", "debit") - sumRange("7840", "7849", "credit"));
    const ovrigaRorelse = -(sumRange("7900", "7999", "debit") - sumRange("7900", "7999", "credit"));
    const ebit = sumRevenue + ravaror + extKostn + personal + avskrImmat + avskrMat + nedskrOms + ovrigaRorelse;

    const finKoncern = sumRange("8010", "8069", "credit") - sumRange("8010", "8069", "debit");
    const finIntresse = sumRange("8110", "8119", "credit") - sumRange("8110", "8119", "debit");
    const finOvrigt = sumRange("8120", "8199", "credit") - sumRange("8120", "8199", "debit");
    const ranteInt = sumRange("8300", "8399", "credit") - sumRange("8300", "8399", "debit");
    const ranteKostn = -(sumRange("8400", "8499", "debit") - sumRange("8400", "8499", "credit"));
    const resultAfterFin = ebit + finKoncern + finIntresse + finOvrigt + ranteInt + ranteKostn;

    const erhKoncernbidrag = sumRange("8820", "8820", "credit") - sumRange("8820", "8820", "debit");
    const lamKoncernbidrag = -(sumRange("8830", "8830", "debit") - sumRange("8830", "8830", "credit"));
    const forPeriodFond = sumRange("8811", "8819", "credit") - sumRange("8811", "8819", "debit");
    const forOveravskr = sumRange("8850", "8859", "credit") - sumRange("8850", "8859", "debit");
    const resultBeforeTax = resultAfterFin + erhKoncernbidrag + lamKoncernbidrag + forPeriodFond + forOveravskr;

    const skatteAr = -(sumRange("8910", "8910", "debit") - sumRange("8910", "8910", "credit"));
    const ovrigaSkatter = -(sumRange("8990", "8999", "debit") - sumRange("8990", "8999", "credit"));
    const netResult = resultBeforeTax + skatteAr + ovrigaSkatter;

    const isData: [string, number][] = [
      ["Nettoomsättning", revenue],
      ["Förändring av varulager, PIA m.m.", lagerforandring],
      ["Aktiverat arbete för egen räkning", aktiverat],
      ["Övriga rörelseintäkter", ovrigaIntakt],
      ["Summa rörelsens intäkter", sumRevenue],
      ["Råvaror och förnödenheter", ravaror],
      ["Övriga externa kostnader", extKostn],
      ["Personalkostnader", personal],
      ["Av- och nedskrivningar av immat. AT", avskrImmat],
      ["Av- och nedskrivningar av mat. AT", avskrMat],
      ["Nedskrivningar omsättningstillg.", nedskrOms],
      ["Övriga rörelsekostnader", ovrigaRorelse],
      ["Rörelseresultat", ebit],
      ["Resultat från andelar i koncernföretag", finKoncern],
      ["Resultat från andelar i intresseföretag", finIntresse],
      ["Resultat från övriga finansiella AT", finOvrigt],
      ["Ränteintäkter och liknande", ranteInt],
      ["Räntekostnader och liknande", ranteKostn],
      ["Resultat efter finansiella poster", resultAfterFin],
      ["Erhållna koncernbidrag", erhKoncernbidrag],
      ["Lämnade koncernbidrag", lamKoncernbidrag],
      ["Förändring av periodiseringsfond", forPeriodFond],
      ["Förändring av överavskrivningar", forOveravskr],
      ["Resultat före skatt", resultBeforeTax],
      ["Skatt på årets resultat", skatteAr],
      ["Övriga skatter", ovrigaSkatter],
      ["ÅRETS RESULTAT", netResult],
    ];
    const isValueMap = new Map(isData);

    const isLines: ReportLine[] = INCOME_STATEMENT_ROWS.map(row => { if (row.k3Only && regelverk === "K2") return null;
      const val = isValueMap.get(row.label) ?? 0;
      return { label: row.label,
        autoValue: val,
        adjustedValue: val,
        accountRange: row.accountRange,
        isHeader: row.isSection,
        isTotal: row.isSubtotal,
        isNet: row.isGrandTotal,
        indent: row.indent,
      };
    }).filter(Boolean) as ReportLine[];

    const bsSum = (from: string, to: string) => sumRange(from, to, "net");
    const bsSumInv = (from: string, to: string) => -(sumRange(from, to, "net"));

    const sumImmat = bsSum("1010", "1099");
    const sumMat = bsSum("1100", "1299");
    const sumFin = bsSum("1300", "1399");
    const sumAT = sumImmat + sumMat + sumFin;
    const sumLager = bsSum("1400", "1499");
    const sumKfFordr = bsSum("1500", "1799");
    const kfPlac = bsSum("1800", "1879");
    const kassaBank = bsSum("1900", "1989");
    const sumOT = sumLager + sumKfFordr + kfPlac + kassaBank;
    const sumTillgangar = sumAT + sumOT;

    const aktiekapital = bsSumInv("2081", "2081");
    const ejRegAktie = bsSumInv("2082", "2082");
    const uppskrivn = bsSumInv("2085", "2085");
    const reservfond = bsSumInv("2086", "2086");
    const fondVerkl = bsSumInv("2087", "2087");
    const sumBundetEK = aktiekapital + ejRegAktie + uppskrivn + reservfond + (regelverk === "K3" ? fondVerkl : 0);

    const overkurs = bsSumInv("2084", "2084");
    const balaRes = bsSumInv("2091", "2098");
    const aretsRes = netResult;
    const sumFrittEK = overkurs + balaRes + aretsRes;
    const sumEK = sumBundetEK + sumFrittEK;

    const sumObesk = bsSumInv("2100", "2199");
    const sumAvsattningar = regelverk === "K3" ? bsSumInv("2210", "2299") : 0;
    const sumLangSkulder = bsSumInv("2300", "2399");
    const sumKortSkulder = bsSumInv("2400", "2999");
    const sumEKSkulder = sumEK + sumObesk + sumAvsattningar + sumLangSkulder + sumKortSkulder;

    const bsLines: ReportLine[] = [];
    const addBs = (label: string, val: number, opts: Partial<ReportLine> = {}) => { bsLines.push({ label, autoValue: val, adjustedValue: val, ...opts });
    };

    addBs("TILLGÅNGAR", 0, { isHeader: true });
    addBs("Anläggningstillgångar", 0, { isHeader: true, indent: 1 });
    addBs("Immateriella AT", sumImmat, { accountRange: "1010-1099", indent: 2 });
    addBs("Materiella AT", sumMat, { accountRange: "1100-1299", indent: 2 });
    addBs("Finansiella AT", sumFin, { accountRange: "1300-1399", indent: 2 });
    addBs("Summa anläggningstillgångar", sumAT, { isTotal: true, indent: 1 });
    addBs("Omsättningstillgångar", 0, { isHeader: true, indent: 1 });
    addBs("Varulager", sumLager, { accountRange: "1400-1499", indent: 2 });
    addBs("Kundfordringar", bsSum("1500", "1599"), { accountRange: "1500-1599", indent: 2 });
    addBs("Övriga fordringar", bsSum("1600", "1799"), { accountRange: "1600-1799", indent: 2 });
    addBs("Kortfristiga placeringar", kfPlac, { accountRange: "1800-1879", indent: 2 });
    addBs("Kassa och bank", kassaBank, { accountRange: "1900-1989", indent: 2 });
    addBs("Summa omsättningstillgångar", sumOT, { isTotal: true, indent: 1 });
    addBs("SUMMA TILLGÅNGAR", sumTillgangar, { isNet: true });

    addBs("EGET KAPITAL OCH SKULDER", 0, { isHeader: true });
    addBs("Eget kapital", 0, { isHeader: true, indent: 1 });
    addBs("Aktiekapital", aktiekapital, { accountRange: "2081", indent: 2 });
    addBs("Balanserat resultat", balaRes, { accountRange: "2091-2098", indent: 2 });
    addBs("Årets resultat", aretsRes, { indent: 2 });
    addBs("Summa eget kapital", sumEK, { isTotal: true, indent: 1 });
    addBs("Obeskattade reserver", sumObesk, { accountRange: "2100-2199", indent: 1 });
    addBs("Långfristiga skulder", sumLangSkulder, { accountRange: "2300-2399", indent: 1 });
    addBs("Kortfristiga skulder", sumKortSkulder, { accountRange: "2400-2999", indent: 1 });
    addBs("SUMMA EGET KAPITAL OCH SKULDER", sumEKSkulder, { isNet: true });

    const depreciations = sumRange("7810", "7849", "debit") - sumRange("7810", "7849", "credit");
    const cfBeforeWC = ebit + depreciations;
    const kassaBankVal = bsSum("1900", "1989");
    const cfValues = new Map<string, number>([
      ["ebit", ebit], ["non_cash", 0], ["cf_before_wc", cfBeforeWC],
      ["delta_fordr", 0], ["delta_lager", 0], ["delta_skulder", 0],
      ["cf_operations", cfBeforeWC], ["invest_mat", 0], ["sale_mat", 0],
      ["invest_fin", 0], ["cf_invest", 0], ["emission", 0], ["new_loans", 0],
      ["amort", 0], ["dividend", 0], ["cf_finance", 0], ["cf_total", cfBeforeWC],
      ["cash_ib", 0], ["cash_ub", kassaBankVal],
    ]);

    const balansomslutning = sumTillgangar;
    const rörelsemarginal = revenue !== 0 ? (ebit / revenue) * 100 : 0;
    const soliditet = balansomslutning !== 0 ? (sumEK / balansomslutning) * 100 : 0;
    const kassalikviditet = sumKortSkulder !== 0 ? ((sumOT - sumLager) / sumKortSkulder) * 100 : 0;

    return { isLines, bsLines, cashFlowValues: cfValues,
      keyFigures: { revenue, ebit, netResult, sumEK, rörelsemarginal, balansomslutning, soliditet, kassalikviditet },
    };
  }, [acctMap, regelverk]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;

  const company = companies.find(c => c.id === selectedCompany);
  const year = parseInt(selectedYear);
  const totalAssets = bsLines.find(r => r.label === "SUMMA TILLGÅNGAR")?.adjustedValue || 0;
  const totalEKSkulder = bsLines.find(r => r.label === "SUMMA EGET KAPITAL OCH SKULDER")?.adjustedValue || 0;
  const balanced = Math.abs(totalAssets - totalEKSkulder) < 1;
  const netResult = isLines.find(r => r.label === "ÅRETS RESULTAT")?.adjustedValue || 0;
  const revenue = isLines.find(r => r.label === "Nettoomsättning")?.adjustedValue || 0;
  const resultAfterFin = isLines.find(r => r.label === "Resultat efter finansiella poster")?.adjustedValue || 0;
  const balanserat = bsLines.find(r => r.label === "Balanserat resultat")?.adjustedValue || 0;
  const frittEK = balanserat + netResult;
  const statusLabels: Record<string, string> = { draft: "Utkast", review: "Granskning", signing: "Signering", ready: "Klar", submitted: "Inlämnad" };

  // Compliance evaluation drives all status indicators
  const complianceChecks = useMemo(() => evaluateCompliance({
    framework: regelverk,
    forvaltning,
    netResult,
    revenue,
    totalAssets,
    totalEKSkulder,
    notes: notes.map(n => ({ code: n.code, content: n.content, category: n.category })),
    hasComparisonYear: false,
    signedAt: null,
  }), [regelverk, forvaltning, netResult, revenue, totalAssets, totalEKSkulder, notes]);
  const complianceSummary = useMemo(() => summarize(complianceChecks), [complianceChecks]);
  const sectionPct = (s: string) => complianceSummary.bySection.find(b => b.section === s)?.pct ?? 0;
  const completionPct = complianceSummary.pct;

  const hasForvaltning = sectionPct("forvaltning") > 0;
  const hasRRBR = revenue !== 0 || totalAssets !== 0;
  const missingNotes = complianceChecks.filter(c => c.section === "notes" && c.mandatory && c.status !== "complete").length;

  // Key dates
  const fyEnd = new Date(year, 11, 31);
  const submissionDeadline = new Date(year + 1, 6, 31);
  const agmDeadline = new Date(year + 1, 5, 30);
  const boardMeeting = new Date(year + 1, 2, 15);
  const today = new Date();
  const daysToSubmission = Math.max(0, Math.ceil((submissionDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const FinRow = ({ line, showNot }: { line: ReportLine; showNot?: boolean }) => { if (!showZeroRows && !line.isHeader && !line.isTotal && !line.isNet && line.adjustedValue === 0) return null;
    const indent = (line.indent || 0) * 16;
    return (
      <tr className={`
        ${line.isNet ? "border-t-2 border-b-[3px] border-foreground" : ""}
        ${line.isTotal ? "border-t border-foreground/30" : ""}
      `}>
        <td className={`py-0.5 pr-4 ${line.isHeader ? "font-bold pt-3 text-xs uppercase tracking-wide" : ""} ${line.isTotal || line.isNet ? "font-bold" : ""}`} style={{ paddingLeft: `${indent}px` }}>
          {line.label}
        </td>
        {showNot && <td className="py-0.5 px-2 text-center italic text-muted-foreground text-xs w-10"></td>}
        <td className={`py-0.5 pl-4 text-right tabular-nums w-28 ${line.isTotal || line.isNet ? "font-bold" : ""}`}>
          {line.isHeader ? "" : fmt(line.adjustedValue)}
        </td>
        <td className="py-0.5 pl-4 text-right tabular-nums text-muted-foreground w-28"></td>
      </tr>
    );
  };

  const DocPage = ({ children, title, pageNum }: { children: React.ReactNode; title?: string; pageNum?: string }) => (
    <div className="bg-background border border-border rounded shadow-sm mx-auto mb-6" style={{ maxWidth: "680px", padding: "40px 48px 32px" }}>
      <div className="flex justify-between items-start mb-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{company?.name || "—"}</span>
        {pageNum && <span>{pageNum}</span>}
      </div>
      {title && (
        <>
          <h2 className="text-lg font-bold mt-4 mb-0.5 text-foreground">{title}</h2>
          <div className="h-[2px] bg-foreground w-48 mb-4" />
        </>
      )}
      {children}
    </div>
  );

  const mainSection = activeTab === "overview" ? "overview"
    : activeTab.startsWith("forvaltning") ? "forvaltning"
    : activeTab.startsWith("balansrakning") ? "balansrakning"
    : activeTab;

  // Scroll-spy: when reading FB page, sync sidebar highlight to scrolled-to anchor
  const fbAnchors = mainSection === "forvaltning"
    ? ["forvaltning_verksamhet", "forvaltning_handelser", "forvaltning_disposition", "forvaltning_framtid", "forvaltning_flerarsoverikt"]
    : [];
  const spied = useScrollSpy(fbAnchors);
  useEffect(() => {
    if (spied && spied !== activeTab) setActiveTab(spied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spied]);

  // ─── Overview Sections ───
  const renderOverview = () => {
    // Workflow steps mapped to compliance state
    const fbDone = sectionPct("forvaltning") === 100;
    const fbInProgress = sectionPct("forvaltning") > 0 && !fbDone;
    const rrBrDone = sectionPct("resultatrakning") === 100 && sectionPct("balansrakning") === 100;
    const notesPct = sectionPct("notes");
    const notesDone = notesPct === 100;
    const partsAllDone = fbDone && rrBrDone && notesDone;

    const step2Substeps = [
      { label: "Förvaltningsberättelse", done: fbDone },
      { label: "RR/BR", done: rrBrDone },
      { label: `${complianceChecks.filter(c => c.section === "notes" && c.status === "complete").length} av ${complianceChecks.filter(c => c.section === "notes").length} noter`, done: notesDone },
    ];

    const workflowSteps: WorkflowStep[] = [
      { id: "close",  title: "Bokslutsstängning",            subtitle: "Alla perioder stängda och avstämda", status: "complete", onAction: () => navigate("/closing") },
      { id: "parts",  title: "Årsredovisningens delar",      subtitle: "Förvaltningsberättelse, RR, BR, noter",
        status: partsAllDone ? "complete" : (fbInProgress || rrBrDone || notesPct > 0) ? "in_progress" : "todo",
        substeps: step2Substeps,
        onAction: () => setActiveTab("forvaltning_verksamhet"),
      },
      { id: "audit",  title: "Revisorsgranskning",           subtitle: "Extern revisor granskar årsredovisningen",
        status: partsAllDone ? "awaiting" : "locked", lockedReason: "Slutför steg 2 först" },
      { id: "board",  title: "Styrelsegodkännande",          subtitle: "Styrelsen godkänner årsredovisningen", status: "locked", lockedReason: "Slutför steg 3 först" },
      { id: "sign",   title: "Digital signering via BankID", subtitle: "Signera med BankID", status: "locked", lockedReason: "Slutför steg 4 först", onAction: () => setActiveTab("signing_bankid") },
      { id: "submit", title: "Inlämning Bolagsverket",       subtitle: "Lämna in årsredovisningen digitalt", status: "locked", lockedReason: "Slutför steg 5 först", onAction: () => setActiveTab("export") },
    ];

    // Document parts grid
    const docParts: DocPart[] = [
      { id: "forvaltning",     title: "Förvaltningsberättelse", completion: sectionPct("forvaltning"),   onEdit: () => setActiveTab("forvaltning") },
      { id: "resultatrakning", title: "Resultaträkning",        completion: sectionPct("resultatrakning"), onEdit: () => setActiveTab("resultatrakning") },
      { id: "balansrakning",   title: "Balansräkning",          completion: sectionPct("balansrakning"), attention: !balanced && totalAssets !== 0, onEdit: () => setActiveTab("balansrakning") },
      { id: "kassaflodesanalys", title: "Kassaflödesanalys",    completion: regelverk === "K3" ? sectionPct("kassaflodesanalys") : 0,
        disabled: regelverk === "K2", disabledReason: "Endast K3", onEdit: () => setActiveTab("kassaflodesanalys") },
      { id: "notes",           title: "Noter",                  completion: notesPct, onEdit: () => setActiveTab("notes") },
      { id: "signing",         title: "Revisionsberättelse",    completion: sectionPct("signing"), onEdit: () => setActiveTab("signing") },
    ];

    // AI suggestions
    const aiSuggestions: AISuggestion[] = [];
    if (!hasRRBR)        aiSuggestions.push({ id: "rrbr",  text: "Koppla bokföringen — fyll i RR och BR automatiskt", cta: "Koppla", onClick: () => navigate("/bankintegration") });
    if (missingNotes > 0) aiSuggestions.push({ id: "notes", text: `${missingNotes} obligatoriska noter saknas — AI kan generera utkast`, cta: "Generera", onClick: () => setActiveTab("notes") });
    if (!hasForvaltning)  aiSuggestions.push({ id: "fb",    text: "Generera förvaltningsberättelse med AI", cta: "Starta", onClick: () => setActiveTab("forvaltning") });
    if (partsAllDone && aiSuggestions.length === 0) aiSuggestions.push({ id: "review", text: "Årsredovisningen ser komplett ut — skicka till revisor", cta: "Skicka", onClick: () => setActiveTab("signing") });

    // Metrics
    const metrics: MetricPill[] = [
      { label: "Nettoomsättning", value: `${fmt(revenue)} kr` },
      { label: "Årets resultat",  value: `${fmt(netResult)} kr`, tone: netResult >= 0 ? "positive" : "negative" },
      { label: "Eget kapital",    value: `${fmt(keyFigures.sumEK)} kr` },
      { label: "Soliditet",       value: `${keyFigures.soliditet.toFixed(1)}%` },
      { label: "Antal anställda", value: "—", hint: "från noter" },
      { label: "Utdelning",       value: "—", hint: "från FB" },
    ];

    return (
      <div className="space-y-5">
        <OverviewHeaderCard
          companyName={company?.name || "—"}
          framework={regelverk}
          year={year}
          status={statusLabels[status]}
          balanced={balanced}
          completionPct={completionPct}
          bySection={complianceSummary.bySection}
          deadlines={[
            { label: "Bokslutsdatum", date: fyEnd, done: true },
            { label: "Styrelsemöte",  date: boardMeeting, done: boardMeeting < today },
            { label: "Inlämning BV",  date: submissionDeadline, countdown: daysToSubmission },
            { label: "AGM deadline",  date: agmDeadline, done: agmDeadline < today },
          ]}
        />

        {/* Selectors */}
        <div className="flex items-center gap-3">
          <Select value={selectedCompany} onValueChange={id => { setSelectedCompany(id); const c = companies.find(x => x.id === id); if (c?.accounting_framework) setRegelverk(c.accounting_framework as "K2" | "K3"); }}>
            <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue placeholder="Välj företag" /></SelectTrigger>
            <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={regelverk} onValueChange={v => { const next = v as "K2" | "K3"; if (next !== regelverk) setPendingFramework(next); }}>
            <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="K2">K2 (BFNAR 2016:10)</SelectItem>
              <SelectItem value="K3">K3 (BFNAR 2012:1)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <KeyMetricsRow metrics={metrics} />
        <WorkflowSteps steps={workflowSteps} />
        <DocumentPartsGrid parts={docParts} />
        <AIAssistantBanner suggestions={aiSuggestions} />

        {regelverk === "K3" && company?.group_id && (
          <SubsidiaryBanner hasSubsidiaries={true} />
        )}

        {/* Export shortcut */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            className="bg-[#1D4ED8] hover:bg-[#08374b] text-white"
            onClick={() => { if (!company) return toast.error("Inget företag valt");
              exportAnnualReportPDF({ companyName: company.name, orgNumber: company.org_number, year, regelverk, bsLines, isLines, notes: notes.map((n, i) => ({ id: String(i + 1), title: n.title, content: n.content, required: n.category === "obligatorisk" })), forvaltning });
              toast.success("PDF exporterad!");
            }}
          >
            <Download className="w-4 h-4 mr-2" />Ladda ner PDF
          </Button>
          <ComingSoonButton tooltipText="Word-export aktiveras Q4 2026" variant="outline">
            <Download className="w-4 h-4 mr-2" />Word .docx
          </ComingSoonButton>
          <ComingSoonButton tooltipText="iXBRL-export för Bolagsverket" variant="outline">
            <Download className="w-4 h-4 mr-2" />XBRL / iXBRL
          </ComingSoonButton>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {loadingData && mainSection === "overview" ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : mainSection === "overview" ? (
        renderOverview()
      ) : (
        <>
          {/* Slim header for document editing modes */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("overview")} className="text-muted-foreground">
                <ArrowRight className="w-3.5 h-3.5 mr-1 rotate-180" />Översikt
              </Button>
              <div className="h-5 w-px bg-border" />
              <h1 className="text-lg font-bold truncate">{company?.name || "Årsredovisning"} {year}</h1>
              <Badge variant="outline">{statusLabels[status]}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)} className="text-muted-foreground">
              {editMode ? <><Eye className="w-3.5 h-3.5 mr-1" />Förhandsgranska</> : <><Edit3 className="w-3.5 h-3.5 mr-1" />Redigera</>}
            </Button>
          </div>

          <div className="flex gap-6">
            {/* Left sidebar */}
            <div className="space-y-3">
              <ContentSidebar
                activeId={activeTab}
                framework={regelverk}
                items={SIDEBAR_ITEMS.map(item => {
                  // Map compliance status onto matching items
                  const checkById = complianceChecks.find(c => c.id === item.id || c.navTarget === item.id);
                  let status: SidebarItem["status"] = undefined;
                  if (checkById) {
                    status = checkById.status === "complete" ? "complete"
                      : checkById.status === "attention" ? "attention"
                      : checkById.mandatory ? "missing_mandatory" : "incomplete";
                  } else if (item.id === "notes") {
                    const allDone = complianceChecks.filter(c => c.section === "notes").every(c => c.status === "complete");
                    status = allDone ? "complete" : undefined;
                  }
                  return { ...item, status };
                })}
                checks={complianceChecks}
                onSelect={(id) => {
                  if (id === "note_add") { setActiveTab("notes"); return; }
                  // Sub-anchors inside Förvaltningsberättelse: keep tab and smooth-scroll
                  if (id.startsWith("forvaltning_") && document.getElementById(id)) {
                    if (mainSection !== "forvaltning") setActiveTab("forvaltning");
                    requestAnimationFrame(() => scrollToSection(id));
                    return;
                  }
                  setActiveTab(id);
                  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
                }}
              />

              <div className={`p-3 rounded-lg text-xs ml-2 ${balanced ? "bg-[#E1F5EE] text-[#085041]" : "bg-destructive/10 text-destructive"}`}>
                {balanced ? (
                  <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /><span>Balansräkningen stämmer</span></div>
                ) : (
                  <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /><span>Obalans: {fmt(totalAssets - totalEKSkulder)} kr</span></div>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer ml-2">
                <input type="checkbox" checked={showZeroRows} onChange={e => setShowZeroRows(e.target.checked)} className="rounded" />
                Visa alla rader (inkl. 0)
              </label>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Persistent editor toolbar */}
              {!loadingData && mainSection !== "overview" && (
                <EditorToolbar
                  breadcrumb={[
                    "Årsredovisning",
                    SIDEBAR_ITEMS.find(i => i.id === activeTab)?.label
                      ?? SIDEBAR_ITEMS.find(i => i.id === mainSection)?.label
                      ?? "Sektion",
                  ]}
                  saveState={saveNoteMutation.isPending ? "saving" : saveState}
                  savedAt={savedAt}
                  onAIFill={mainSection === "forvaltning" || mainSection === "notes" ? () => {
                    toast.info("AI-fyll initieras…");
                  } : undefined}
                  onPreview={() => setActiveTab("preview")}
                />
              )}
              {loadingData ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : mainSection === "preview" ? (
                <div className="bg-muted/30 rounded-lg p-6">
                  <DocPage>
                    <div className="text-center py-12 space-y-3">
                      <p className="text-sm text-muted-foreground">Årsredovisning för</p>
                      <h1 className="text-2xl font-bold">{company?.name || "—"}</h1>
                      <p className="text-sm text-muted-foreground">{company?.org_number || "—"}</p>
                      <p className="text-sm text-muted-foreground mt-6">Räkenskapsåret {year}-01-01 – {year}-12-31</p>
                    </div>
                    <div className="mt-8 mx-auto" style={{ maxWidth: "300px" }}>
                      <p className="font-bold text-sm mb-2">Innehållsförteckning:</p>
                      <table className="w-full text-sm">
                        <tbody>
                          {[
                            ["Förvaltningsberättelse", "1"],
                            ["Resultaträkning", "2"],
                            ["Balansräkning", "3–4"],
                            ...(regelverk === "K3" ? [["Kassaflödesanalys", "5"]] : []),
                            ["Noter", regelverk === "K3" ? "6" : "5"],
                          ].map(([name, page]) => (
                            <tr key={name}><td className="py-0.5">{name}</td><td className="py-0.5 text-right">{page}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-10 pt-6 border-t border-border">
                      <h3 className="font-bold text-sm mb-2">Fastställelseintyg</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Undertecknad styrelseledamot intygar att resultaträkningen och balansräkningen i årsredovisningen har fastställts vid stämman.
                      </p>
                    </div>
                  </DocPage>

                  <DocPage title="Förvaltningsberättelse" pageNum="1">
                    <p className="text-xs leading-relaxed mb-4">
                      Styrelsen för {company?.name || "—"}, {company?.org_number || "—"}, får härmed avge årsredovisning för räkenskapsåret {year}.
                    </p>
                    <h3 className="font-bold text-sm mt-4 mb-1">Verksamheten</h3>
                    <p className="text-xs leading-relaxed mb-4">
                      {forvaltning.verksamhet || `${company?.name || "Bolaget"} med org.nr ${company?.org_number || "—"} bedriver verksamhet inom [bransch].`}
                    </p>
                    <h3 className="font-bold text-sm mt-4 mb-1">Väsentliga händelser under räkenskapsåret</h3>
                    <p className="text-xs leading-relaxed mb-4">
                      {forvaltning.handelser || "Inga väsentliga händelser har inträffat under räkenskapsåret."}
                    </p>
                    <h3 className="font-bold text-sm mt-4 mb-1">Flerårsöversikt</h3>
                    <table className="text-xs w-full mb-4">
                      <thead><tr><th className="text-left font-normal py-0.5"></th><th className="text-right italic py-0.5">{year}</th></tr></thead>
                      <tbody>
                        <tr><td className="py-0.5">Nettoomsättning</td><td className="text-right tabular-nums py-0.5">{fmt(revenue)}</td></tr>
                        <tr><td className="py-0.5">Rörelseresultat</td><td className="text-right tabular-nums py-0.5">{fmt(keyFigures.ebit)}</td></tr>
                        <tr><td className="py-0.5">Rörelsemarginal</td><td className="text-right tabular-nums py-0.5">{keyFigures.rörelsemarginal.toFixed(1)}%</td></tr>
                        <tr><td className="py-0.5">Balansomslutning</td><td className="text-right tabular-nums py-0.5">{fmt(keyFigures.balansomslutning)}</td></tr>
                        <tr><td className="py-0.5">Soliditet</td><td className="text-right tabular-nums py-0.5">{keyFigures.soliditet.toFixed(1)}%</td></tr>
                        <tr><td className="py-0.5">Resultat efter finansiella poster</td><td className="text-right tabular-nums py-0.5">{fmt(resultAfterFin)}</td></tr>
                      </tbody>
                    </table>
                    <h3 className="font-bold text-sm mt-4 mb-1">Resultatdisposition</h3>
                    <p className="text-xs leading-relaxed mb-2">
                      Styrelsen föreslår att fritt eget kapital, {fmt(frittEK)} kronor, disponeras enligt följande:
                    </p>
                    <table className="text-xs ml-8 mb-2">
                      <tbody>
                        <tr><td className="py-0.5 pr-8">Balanserat resultat</td><td className="text-right tabular-nums py-0.5">{fmt(balanserat)}</td></tr>
                        <tr><td className="py-0.5 pr-8">Årets resultat</td><td className="text-right tabular-nums py-0.5">{fmt(netResult)}</td></tr>
                        <tr className="font-bold"><td className="py-0.5 pr-8">Totalt</td><td className="text-right tabular-nums py-0.5">{fmt(frittEK)}</td></tr>
                      </tbody>
                    </table>
                    <table className="text-xs ml-8">
                      <tbody>
                        <tr><td className="py-0.5 pr-8">Balanseras i ny räkning</td><td className="text-right tabular-nums py-0.5">{fmt(frittEK)}</td></tr>
                      </tbody>
                    </table>
                  </DocPage>

                  <DocPage title="Resultaträkning" pageNum="2">
                    <p className="text-xs italic text-muted-foreground mb-2">Belopp i kr</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-foreground/30">
                          <th className="text-left font-normal py-1"></th>
                          <th className="text-center font-normal italic py-1 w-10 text-muted-foreground">Not</th>
                          <th className="text-right font-normal italic py-1 w-28">{year}-01-01–<br />{year}-12-31</th>
                          <th className="text-right font-normal italic py-1 w-28 text-muted-foreground">{year - 1}-01-01–<br />{year - 1}-12-31</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLines.map((line, i) => <FinRow key={i} line={line} showNot />)}
                      </tbody>
                    </table>
                  </DocPage>

                  <DocPage title="Balansräkning" pageNum="3">
                    <p className="text-xs italic text-muted-foreground mb-2">Belopp i kr</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-foreground/30">
                          <th className="text-left font-normal py-1"></th>
                          <th className="text-center font-normal italic py-1 w-10 text-muted-foreground">Not</th>
                          <th className="text-right font-normal italic py-1 w-28">{year}-12-31</th>
                          <th className="text-right font-normal italic py-1 w-28 text-muted-foreground">{year - 1}-12-31</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bsLines.map((line, i) => <FinRow key={i} line={line} showNot />)}
                      </tbody>
                    </table>
                  </DocPage>

                  {regelverk === "K3" && (
                    <DocPage title="Kassaflödesanalys" pageNum="5">
                      <CashFlowStatement year={year} values={cashFlowValues} />
                    </DocPage>
                  )}

                  <DocPage title="Noter" pageNum={regelverk === "K3" ? "6" : "5"}>
                    <p className="text-xs text-muted-foreground mb-4">Belopp i kr om inget annat anges.</p>
                    {notes.filter(n => n.content || n.title).map((note, i) => (
                      <div key={note.id} className="mb-4">
                        <h4 className="font-bold text-xs mb-0.5">Not {i + 1} {note.title}</h4>
                        <p className="text-xs leading-relaxed whitespace-pre-line">{note.content}</p>
                      </div>
                    ))}
                  </DocPage>
                </div>
              ) : mainSection === "forvaltning" ? (
                <ManagementReportEditor
                  forvaltning={forvaltning}
                  onForvaltningChange={(f) => {
                    setForvaltning(f);
                    setSaveState("saving");
                    // Local-only save with debounce-style feedback
                    setTimeout(() => {
                      setSaveState("saved");
                      setSavedAt(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }));
                    }, 400);
                  }}
                  companyName={company?.name || "—"}
                  orgNumber={company?.org_number || "—"}
                  year={year}
                  keyFigures={keyFigures}
                  onAIFillSection={async (key) => {
                    // Stub — replace with edge-function call when available
                    const templates: Record<string, string> = {
                      verksamhet: `${company?.name || "Bolaget"} med org.nr ${company?.org_number || "—"} bedriver verksamhet inom sin bransch. Räkenskapsåret avser perioden ${year}-01-01 – ${year}-12-31.`,
                      handelser: "Inga väsentliga händelser har inträffat under räkenskapsåret som påverkar bolagets resultat eller ställning.",
                      vinstdisposition: `Styrelsen föreslår att fritt eget kapital, ${frittEK.toLocaleString("sv-SE")} kr, balanseras i ny räkning.`,
                      framtid: "Styrelsen bedömer att verksamheten kommer att utvecklas i linje med tidigare år.",
                    };
                    return templates[key] ?? "";
                  }}
                />
              ) : mainSection === "resultatrakning" ? (
                <div className="bg-muted/30 rounded-lg p-6">
                  <DocPage title="Resultaträkning" pageNum="2">
                    <p className="text-xs italic text-muted-foreground mb-2">Belopp i kr</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-foreground/30">
                          <th className="text-left font-normal py-1"></th>
                          <th className="text-center font-normal italic py-1 w-10 text-muted-foreground">Not</th>
                          <th className="text-right font-normal italic py-1 w-28">{year}-01-01–<br />{year}-12-31</th>
                          <th className="text-right font-normal italic py-1 w-28 text-muted-foreground">{year - 1}-01-01–<br />{year - 1}-12-31</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLines.map((line, i) => <FinRow key={i} line={line} showNot />)}
                      </tbody>
                    </table>
                  </DocPage>
                  {regelverk === "K3" && (
                    <div className="mt-4">
                      <OCISection netResult={netResult} taxRate={0.206} value={ociState} onChange={setOciState} />
                    </div>
                  )}
                </div>
              ) : mainSection === "balansrakning" ? (
                <div className="bg-muted/30 rounded-lg p-6">
                  <DocPage title="Balansräkning" pageNum="3">
                    <p className="text-xs italic text-muted-foreground mb-2">Belopp i kr</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-foreground/30">
                          <th className="text-left font-normal py-1"></th>
                          <th className="text-center font-normal italic py-1 w-10 text-muted-foreground">Not</th>
                          <th className="text-right font-normal italic py-1 w-28">{year}-12-31</th>
                          <th className="text-right font-normal italic py-1 w-28 text-muted-foreground">{year - 1}-12-31</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          if (regelverk !== "K3") {
                            return bsLines.map((line, i) => <FinRow key={i} line={line} showNot />);
                          }
                          const t = computeOCITotals(ociState, netResult, 0.206);
                          const ociDelta = t.oci;
                          const augmented: ReportLine[] = [];
                          for (const line of bsLines) {
                            if (line.label === "Summa eget kapital") {
                              augmented.push({ label: "Omräkningsreserv", autoValue: t.translationNet, adjustedValue: t.translationNet, indent: 2 });
                              augmented.push({ label: "Säkringsreserv", autoValue: t.hedgeNet, adjustedValue: t.hedgeNet, indent: 2 });
                              augmented.push({ label: "Aktuariell reserv (pensioner)", autoValue: t.pensionNet, adjustedValue: t.pensionNet, indent: 2 });
                              augmented.push({ ...line, autoValue: line.autoValue + ociDelta, adjustedValue: line.adjustedValue + ociDelta });
                            } else if (line.label === "SUMMA EGET KAPITAL OCH SKULDER") {
                              augmented.push({ ...line, autoValue: line.autoValue + ociDelta, adjustedValue: line.adjustedValue + ociDelta });
                            } else {
                              augmented.push(line);
                            }
                          }
                          return augmented.map((line, i) => <FinRow key={i} line={line} showNot />);
                        })()}
                      </tbody>
                    </table>
                    {regelverk === "K3" && (ociState.pension !== 0 || ociState.translation !== 0 || ociState.hedge !== 0) && (
                      <p className="mt-3 text-[11px] italic text-muted-foreground">
                        Eget kapital inkluderar OCI-reserver från övrigt totalresultat ({computeOCITotals(ociState, netResult, 0.206).oci.toLocaleString("sv-SE")} kr).
                      </p>
                    )}
                  </DocPage>
                </div>
              ) : mainSection === "kassaflodesanalys" && regelverk === "K3" ? (
                <div className="bg-muted/30 rounded-lg p-6">
                  <DocPage title="Kassaflödesanalys">
                    <CashFlowStatement year={year} values={cashFlowValues} />
                  </DocPage>
                </div>
              ) : mainSection === "deferred_tax" && regelverk === "K3" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Uppskjuten skatt</h2>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
                  </div>
                  {annualReportId ? (
                    <DeferredTaxWorkspace
                      annualReportId={annualReportId}
                      resultBeforeTax={netResult}
                      taxRate={0.206}
                    />
                  ) : <div className="text-sm text-muted-foreground">Laddar…</div>}
                </div>
              ) : mainSection === "leases" && regelverk === "K3" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Leasing (K3 kapitel 20)</h2>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
                  </div>
                  {annualReportId ? (
                    <LeaseRegister annualReportId={annualReportId} />
                  ) : <div className="text-sm text-muted-foreground">Laddar…</div>}
                </div>
              ) : mainSection === "fin_instruments" && regelverk === "K3" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Finansiella instrument</h2>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
                  </div>
                  {annualReportId ? (
                    <FinancialInstrumentsRegister annualReportId={annualReportId} />
                  ) : <div className="text-sm text-muted-foreground">Laddar…</div>}
                </div>
              ) : mainSection === "risk_disclosures" && regelverk === "K3" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Riskupplysningar</h2>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
                  </div>
                  {annualReportId ? (
                    <RiskDisclosures
                      annualReportId={annualReportId}
                      customerReceivables={Math.max(0, sumAccountRange(acctMap, "1510-1519"))}
                      cashAndBank={Math.max(0, sumAccountRange(acctMap, "1910-1999"))}
                      suppliersPayable={Math.abs(sumAccountRange(acctMap, "2410-2499"))}
                      bankLoans={Math.abs(sumAccountRange(acctMap, "2310-2399"))}
                    />
                  ) : <div className="text-sm text-muted-foreground">Laddar…</div>}
                </div>
              ) : mainSection === "notes" ? (
                <NoteEditor
                  framework={regelverk}
                  notes={notes}
                  onNotesChange={(updated) => {
                    setNotes(updated);
                    for (const note of updated) {
                      const prev = notes.find(n => n.code === note.code);
                      if (prev && prev.content !== note.content) {
                        saveNoteMutation.mutate({ year, noteKey: note.code, content: note.content });
                      }
                    }
                  }}
                  acctMap={acctMap as any}
                />
              ) : mainSection === "signing" ? (
                company ? (
                  <AnnualReportSigningPanel
                    companyId={company.id}
                    companyName={company.name}
                    fiscalYear={year}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Välj ett bolag först.
                  </div>
                )
              ) : mainSection === "export" ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => { if (!company) return toast.error("Inget företag valt");
                      exportAnnualReportPDF({ companyName: company.name, orgNumber: company.org_number, year, regelverk, bsLines, isLines, notes: notes.map((n, i) => ({ id: String(i + 1), title: n.title, content: n.content, required: n.category === "obligatorisk" })), forvaltning });
                      toast.success("PDF exporterad!");
                    }}><Download className="w-4 h-4 mr-2" />Förhandsvisning / Ladda ner PDF</Button>
                    <ComingSoonButton tooltipText="iXBRL-export för Bolagsverket aktiveras när Bolagsverkets API går live"><Download className="w-4 h-4 mr-2" />Exportera iXBRL (snart)</ComingSoonButton>
                  </div>
                  {company && (
                    <BolagsverketSubmissionPanel
                      companyId={company.id}
                      companyName={company.name}
                      orgNumber={company.org_number}
                      fiscalYear={year}
                      fiscalYearEnd={`${year}-12-31`}
                      onPdfDownload={() => {
                        exportAnnualReportPDF({ companyName: company.name, orgNumber: company.org_number, year, regelverk, bsLines, isLines, notes: notes.map((n, i) => ({ id: String(i + 1), title: n.title, content: n.content, required: n.category === "obligatorisk" })), forvaltning });
                        toast.success("PDF nedladdad");
                      }}
                    />
                  )}
                </div>
              ) : null}
            </div>

            {/* Right: compliance validator */}
            <ComplianceValidatorPanel
              framework={regelverk}
              checks={complianceChecks}
              onNavigate={(target) => {
                if (target.startsWith("forvaltning_") && document.getElementById(target)) {
                  if (mainSection !== "forvaltning") setActiveTab("forvaltning");
                  requestAnimationFrame(() => scrollToSection(target));
                  return;
                }
                setActiveTab(target);
                requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
              }}
            />
          </div>
          <BackToTopButton />
        </>
      )}
      <FrameworkSwitchDialog
        open={pendingFramework !== null}
        fromFramework={regelverk}
        toFramework={pendingFramework ?? regelverk}
        onCancel={() => setPendingFramework(null)}
        onConfirm={() => { if (pendingFramework) setRegelverk(pendingFramework); setPendingFramework(null); }}
      />
    </div>
  );
};

export default AnnualReport;
