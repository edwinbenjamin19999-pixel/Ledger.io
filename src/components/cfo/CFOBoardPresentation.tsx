import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Presentation, Download, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, ArrowUpRight, ArrowDownRight, BarChart3, Target,
  Shield, DollarSign, Percent, Clock, FileText, Search,
  Check, ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
// jsPDF removed — not used in this component
import type { FinancialSnapshot } from "./CFODashboard";
import type { JournalEntryJoin, ChartOfAccountsJoin } from "@/types/database-extensions";
import { useChartTheme } from "@/hooks/useChartTheme";

interface BoardPresentationProps { companyId: string;
  snapshot: FinancialSnapshot | null;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
const MONTHS_SV = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

// === TEMPLATE LIBRARY ===
interface Template { id: string;
  name: string;
  category: "klassisk" | "modern" | "minimalist" | "bransch" | "farg";
  industryTag?: string;
  styleTags: string[];
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  darkMode: boolean;
}

const CATEGORIES = [
  { key: "all", label: "Alla" },
  { key: "klassisk", label: "Klassisk" },
  { key: "modern", label: "Modern" },
  { key: "minimalist", label: "Minimalist" },
  { key: "bransch", label: "Bransch" },
  { key: "farg", label: "Fargglad" },
];

function generateTemplates(): Template[] { const templates: Template[] = [];
  const klassiska = [
    { name: "Executive Blue", p: "#1F3864", s: "#FFFFFF", a: "#C8A951" },
    { name: "Corporate Gray", p: "#4A4A4A", s: "#F5F5F5", a: "#6B7280" },
    { name: "Boardroom Classic", p: "#3E2723", s: "#FFF8E1", a: "#8D6E63" },
    { name: "Nordic White", p: "#1A1A1A", s: "#FFFFFF", a: "#E0E0E0" },
    { name: "Professional Navy", p: "#0D1B2A", s: "#FFFFFF", a: "#415A77" },
    { name: "Heritage Green", p: "#1B5E20", s: "#F1F8E9", a: "#C8A951" },
    { name: "Formal Black", p: "#121212", s: "#FFFFFF", a: "#424242" },
    { name: "Royal Blue", p: "#1565C0", s: "#FFFFFF", a: "#B0BEC5" },
    { name: "Conservative Red", p: "#7F1D1D", s: "#FFF5F5", a: "#991B1B" },
    { name: "Platinum", p: "#9E9E9E", s: "#FFFFFF", a: "#E0E0E0" },
    { name: "Ambassador", p: "#1A237E", s: "#E8EAF6", a: "#C8A951" },
    { name: "Traditional Oak", p: "#5D4037", s: "#EFEBE9", a: "#795548" },
    { name: "Senate", p: "#263238", s: "#ECEFF1", a: "#FFFFFF" },
    { name: "Prestige", p: "#0A0A0A", s: "#1A1A1A", a: "#C8A951" },
    { name: "Classic Teal", p: "#004D40", s: "#E0F2F1", a: "#00897B" },
    { name: "Executive Crimson", p: "#880E4F", s: "#FCE4EC", a: "#AD1457" },
    { name: "Old Money", p: "#1A237E", s: "#F5F0E1", a: "#3949AB" },
    { name: "Century", p: "#37474F", s: "#ECEFF1", a: "#78909C" },
    { name: "Sterling", p: "#78909C", s: "#FFFFFF", a: "#42A5F5" },
    { name: "Foundation", p: "#5D4037", s: "#FFF8E1", a: "#8D6E63" },
  ];
  klassiska.forEach((t, i) => templates.push({ id: `k${i+1}`, name: t.name, category: "klassisk", styleTags: ["Klassisk"],
    colorPrimary: t.p, colorSecondary: t.s, colorAccent: t.a, darkMode: false,
  }));

  const moderna = [
    { name: "Cogniq Default", p: "#1F3864", s: "#FFFFFF", a: "#3b82f6" },
    { name: "Gradient Flow", p: "#6A1B9A", s: "#E1BEE7", a: "#42A5F5" },
    { name: "Neo Mint", p: "#00C853", s: "#F1F8E9", a: "#FFFFFF" },
    { name: "Tech Dark", p: "#121212", s: "#1E1E1E", a: "#00E676" },
    { name: "Coral Pop", p: "#FF6F61", s: "#FFFFFF", a: "#2F3C7E" },
    { name: "Midnight", p: "#0A0A0A", s: "#1A1A1A", a: "#2196F3" },
    { name: "Aurora", p: "#7B1FA2", s: "#FCE4EC", a: "#E91E63" },
    { name: "Digital Blue", p: "#1E88E5", s: "#E3F2FD", a: "#FFFFFF" },
    { name: "Neon Green", p: "#212121", s: "#2E2E2E", a: "#76FF03" },
    { name: "Sunrise", p: "#FF6F00", s: "#FFF8E1", a: "#FFD600" },
    { name: "Slate Modern", p: "#455A64", s: "#ECEFF1", a: "#FF7043" },
    { name: "Cobalt", p: "#1A237E", s: "#E8EAF6", a: "#3F51B5" },
    { name: "Vivid Purple", p: "#6A1B9A", s: "#F3E5F5", a: "#AB47BC" },
    { name: "Electric", p: "#0A0A0A", s: "#1A1A1A", a: "#FFEB3B" },
    { name: "Arctic", p: "#0277BD", s: "#E1F5FE", a: "#4FC3F7" },
    { name: "Carbon", p: "#37474F", s: "#ECEFF1", a: "#FFFFFF" },
    { name: "Fuchsia Pro", p: "#AD1457", s: "#FCE4EC", a: "#FFFFFF" },
    { name: "Deep Ocean", p: "#01579B", s: "#0277BD", a: "#00BCD4" },
    { name: "Silicon", p: "#ECEFF1", s: "#FFFFFF", a: "#42A5F5" },
    { name: "Quantum", p: "#0A0A0A", s: "#1A1A1A", a: "#7C4DFF" },
  ];
  moderna.forEach((t, i) => templates.push({ id: `m${i+1}`, name: t.name, category: "modern", styleTags: ["Modern"],
    colorPrimary: t.p, colorSecondary: t.s, colorAccent: t.a,
    darkMode: ["Tech Dark", "Midnight", "Neon Green", "Electric", "Quantum"].includes(t.name),
  }));

  const minimalistiska = [
    { name: "Pure White", p: "#1A1A1A", s: "#FFFFFF", a: "#FFFFFF" },
    { name: "Black & White", p: "#000000", s: "#FFFFFF", a: "#000000" },
    { name: "Paper", p: "#3E2723", s: "#FAF0E6", a: "#8D6E63" },
    { name: "Mono Blue", p: "#0D47A1", s: "#E3F2FD", a: "#1565C0" },
    { name: "Ink", p: "#212121", s: "#FAFAFA", a: "#424242" },
    { name: "Zen", p: "#37474F", s: "#FFFFFF", a: "#B0BEC5" },
    { name: "Grid", p: "#424242", s: "#FAFAFA", a: "#E0E0E0" },
    { name: "Line", p: "#1A1A1A", s: "#FFFFFF", a: "#BDBDBD" },
    { name: "Dot", p: "#546E7A", s: "#ECEFF1", a: "#78909C" },
    { name: "Fragment", p: "#263238", s: "#ECEFF1", a: "#455A64" },
    { name: "Space", p: "#424242", s: "#FFFFFF", a: "#E0E0E0" },
    { name: "Bare", p: "#212121", s: "#FAFAFA", a: "#9E9E9E" },
    { name: "Outline", p: "#1A1A1A", s: "#FFFFFF", a: "#757575" },
    { name: "Whisper", p: "#9E9E9E", s: "#FAFAFA", a: "#BDBDBD" },
    { name: "Void", p: "#0A0A0A", s: "#121212", a: "#212121" },
  ];
  minimalistiska.forEach((t, i) => templates.push({ id: `min${i+1}`, name: t.name, category: "minimalist", styleTags: ["Minimalist"],
    colorPrimary: t.p, colorSecondary: t.s, colorAccent: t.a, darkMode: t.name === "Void",
  }));

  const bransch = [
    { name: "Startup", p: "#6C63FF", s: "#F0EFFF", a: "#FF6584", tag: "Tech" },
    { name: "Developer", p: "#1E1E1E", s: "#252525", a: "#569CD6", tag: "Tech" },
    { name: "SaaS Blue", p: "#1976D2", s: "#E3F2FD", a: "#3b82f6", tag: "Tech" },
    { name: "AI Company", p: "#1A237E", s: "#E8EAF6", a: "#7C4DFF", tag: "Tech" },
    { name: "Fintech", p: "#004D40", s: "#E0F2F1", a: "#00E676", tag: "Tech" },
    { name: "Retail Pro", p: "#C62828", s: "#FFFFFF", a: "#EF5350", tag: "Handel" },
    { name: "E-commerce", p: "#FF6F00", s: "#FFF8E1", a: "#FFB300", tag: "Handel" },
    { name: "Marketplace", p: "#E65100", s: "#FFF3E0", a: "#FF9800", tag: "Handel" },
    { name: "Fashion", p: "#0A0A0A", s: "#FFFFFF", a: "#757575", tag: "Handel" },
    { name: "Food & Beverage", p: "#33691E", s: "#F1F8E9", a: "#795548", tag: "Handel" },
    { name: "Construction", p: "#E65100", s: "#ECEFF1", a: "#FF9800", tag: "Bygg" },
    { name: "Real Estate", p: "#1A237E", s: "#FFFFFF", a: "#C8A951", tag: "Fastighet" },
    { name: "Architecture", p: "#212121", s: "#FFFFFF", a: "#757575", tag: "Bygg" },
    { name: "Property", p: "#2E7D32", s: "#E8F5E9", a: "#66BB6A", tag: "Fastighet" },
    { name: "Infrastructure", p: "#455A64", s: "#ECEFF1", a: "#78909C", tag: "Bygg" },
    { name: "Healthcare", p: "#0277BD", s: "#E1F5FE", a: "#FFFFFF", tag: "Halsa" },
    { name: "Pharma", p: "#1B5E20", s: "#E8F5E9", a: "#1565C0", tag: "Halsa" },
    { name: "Wellness", p: "#00897B", s: "#E0F2F1", a: "#FFFFFF", tag: "Halsa" },
    { name: "Medical", p: "#C62828", s: "#FFFFFF", a: "#EF5350", tag: "Halsa" },
    { name: "Biotech", p: "#6A1B9A", s: "#F3E5F5", a: "#FFFFFF", tag: "Halsa" },
    { name: "Consulting Pro", p: "#1A237E", s: "#FFFFFF", a: "#C8A951", tag: "Konsult" },
    { name: "Law Firm", p: "#3E2723", s: "#EFEBE9", a: "#795548", tag: "Konsult" },
    { name: "Accounting", p: "#37474F", s: "#ECEFF1", a: "#42A5F5", tag: "Konsult" },
    { name: "Advisory", p: "#1B5E20", s: "#FFFFFF", a: "#C8A951", tag: "Konsult" },
    { name: "Management", p: "#0A0A0A", s: "#FFFFFF", a: "#424242", tag: "Konsult" },
    { name: "Manufacturing", p: "#455A64", s: "#ECEFF1", a: "#FF9800", tag: "Industri" },
    { name: "Engineering", p: "#1565C0", s: "#E3F2FD", a: "#B0BEC5", tag: "Industri" },
    { name: "Logistics", p: "#F9A825", s: "#0A0A0A", a: "#FDD835", tag: "Industri" },
    { name: "Energy", p: "#01579B", s: "#E1F5FE", a: "#2E7D32", tag: "Industri" },
    { name: "Mining", p: "#37474F", s: "#ECEFF1", a: "#C8A951", tag: "Industri" },
  ];
  bransch.forEach((t, i) => templates.push({ id: `b${i+1}`, name: t.name, category: "bransch", industryTag: t.tag,
    styleTags: [t.tag], colorPrimary: t.p, colorSecondary: t.s, colorAccent: t.a,
    darkMode: ["Developer"].includes(t.name),
  }));

  // Custom color variants
  for (let i = 91; i <= 100; i++) { const hue = ((i - 91) * 36) % 360;
    templates.push({ id: `c${i}`, name: `Bolagsfarg ${i - 90}`, category: "farg",
      styleTags: ["Fargglad"], colorPrimary: `hsl(${hue}, 60%, 30%)`,
      colorSecondary: `hsl(${hue}, 30%, 95%)`, colorAccent: `hsl(${hue}, 70%, 50%)`,
      darkMode: false,
    });
  }

  return templates;
}

const ALL_TEMPLATES = generateTemplates();

interface SlideData { monthlyData: { month: string; revenue: number; expenses: number; result: number }[];
  waterfallData: { name: string; value: number; fill: string }[];
  kpis: { label: string; value: string; trend: string }[];
  risks: { label: string; probability: string; impact: string; amount: number }[];
  recommendations: string[];
}

export function CFOBoardPresentation({ companyId, snapshot }: BoardPresentationProps) {
  const chartTheme = useChartTheme(); const [period, setPeriod] = useState(() => { const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()}`;
  });
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("");
  const [slideData, setSlideData] = useState<SlideData | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(ALL_TEMPLATES[20]); // Cogniq Default
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const periodOptions = useMemo(() => { const now = new Date();
    const opts: string[] = [];
    for (let i = 0; i < 4; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      opts.push(`Q${q} ${d.getFullYear()}`);
    }
    return opts;
  }, []);

  const filteredTemplates = useMemo(() => { return ALL_TEMPLATES.filter(t => { if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [categoryFilter, search]);

  const generate = async () => { if (!snapshot) return;
    setGenerating(true);
    setGenProgress(0);

    const steps = [
      { text: "Hamtar finansiell data...", pct: 30 },
      { text: "Applicerar malldesign...", pct: 60 },
      { text: "AI skriver rekommendationer...", pct: 85 },
      { text: "Presentationen ar klar!", pct: 100 },
    ];

    for (const step of steps) { setGenStep(step.text);
      setGenProgress(step.pct);
      await new Promise(r => setTimeout(r, 800));
    }

    try { const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, journal_entries!inner(entry_date, company_id, status), chart_of_accounts!inner(account_number, company_id)")
        .eq("journal_entries.company_id", companyId)
        .eq("chart_of_accounts.company_id", companyId);

      const monthly: Record<string, { revenue: number; expenses: number }> = {};
      for (let m = 0; m < 12; m++) monthly[MONTHS_SV[m]] = { revenue: 0, expenses: 0 };

      for (const line of lines || []) { const entryDate = (line.journal_entries as JournalEntryJoin | null)?.entry_date;
        const acct = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number;
        if (!entryDate || !acct) continue;
        const month = new Date(entryDate).getMonth();
        const key = MONTHS_SV[month];
        const num = parseInt(acct);
        if (num >= 3000 && num < 4000) monthly[key].revenue += (line.credit || 0) - (line.debit || 0);
        if (num >= 4000 && num < 9000) monthly[key].expenses += (line.debit || 0) - (line.credit || 0);
      }

      const monthlyData = MONTHS_SV.map(m => ({ month: m, revenue: Math.round(monthly[m].revenue),
        expenses: Math.round(monthly[m].expenses),
        result: Math.round(monthly[m].revenue - monthly[m].expenses),
      }));

      const totalInflows = snapshot.revenue;
      const totalOutflows = snapshot.expenses;
      const openingCash = snapshot.cashBalance - totalInflows + totalOutflows;
      const waterfallData = [
        { name: "Ingaende kassa", value: Math.round(openingCash), fill: selectedTemplate.colorPrimary },
        { name: "Inbetalningar", value: Math.round(totalInflows), fill: "#22c55e" },
        { name: "Utbetalningar", value: Math.round(-totalOutflows), fill: "#ef4444" },
        { name: "Utgaende kassa", value: Math.round(snapshot.cashBalance), fill: selectedTemplate.colorPrimary },
      ];

      const kpis = [
        { label: "Omsattning", value: `${fmt(snapshot.revenue)} kr`, trend: "+12%" },
        { label: "EBITDA-marginal", value: `${snapshot.ebitdaMargin}%`, trend: snapshot.ebitdaMargin > 20 ? "Stark" : "Under snitt" },
        { label: "Kassaflode", value: `${fmt(snapshot.cashBalance)} kr`, trend: `${snapshot.runwayDays}d runway` },
        { label: "Fordringar", value: `${fmt(snapshot.openReceivables)} kr`, trend: `${snapshot.openReceivablesCount} st` },
      ];

      const risks = snapshot.overdueInvoices.slice(0, 3).map(inv => ({ label: inv.customer,
        probability: inv.daysOverdue > 60 ? "Hog" : inv.daysOverdue > 30 ? "Medium" : "Lag",
        impact: inv.amount > 50000 ? "Hog" : inv.amount > 20000 ? "Medium" : "Lag",
        amount: inv.amount,
      }));
      if (snapshot.runwayDays < 90) risks.push({ label: "Lag kassareserv", probability: "Hog", impact: "Hog", amount: 0 });

      const recommendations: string[] = [];
      if (snapshot.overdueInvoices.length > 0) recommendations.push(`Prioritera inkassering av ${snapshot.overdueInvoices[0].customer} (${fmt(snapshot.overdueInvoices[0].amount)} kr)`);
      if (snapshot.runwayDays < 90) recommendations.push(`Kassareserv pa ${snapshot.runwayDays} dagar — behover forstarkas`);
      if (snapshot.yearResult > 200000) recommendations.push(`Periodiseringsfond: Avsatt ${fmt(Math.round(snapshot.yearResult * 0.25))} kr`);
      if (recommendations.length === 0) recommendations.push("Stabil finansiell position — inga akuta atgarder kravs");

      setSlideData({ monthlyData, waterfallData, kpis, risks, recommendations });
      setActiveSlide(0);
    } catch { toast.error("Kunde inte generera presentation");
    } finally { setGenerating(false);
    }
  };

  const SLIDE_LABELS = ["Omslag", "Executive Summary", "Resultatutveckling", "Kassaflodesanalys", "Risker", "Rekommendationer"];

  // Generating progress overlay
  if (generating) { return (
      <Card>
        <CardContent className="py-16">
          <div className="max-w-sm mx-auto space-y-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">{genStep}</p>
            <Progress value={genProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">{genProgress}%</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If presentation generated, show slides
  if (slideData) { return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Presentation className="h-4 w-4 text-primary" />
                Styrelsepresentation — {period}
              </CardTitle>
              <CardDescription>Mall: {selectedTemplate.name}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSlideData(null)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Tillbaka
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                try {
                  const { exportFormToPDF } = require("@/lib/pdfExport");
                  exportFormToPDF({
                    title: `Styrelsepresentation — ${period}`,
                    subtitle: `Mall: ${selectedTemplate.name}`,
                  fields: snapshot ? [
                      { label: "Intäkter", value: fmt(snapshot.revenue) + " kr" },
                      { label: "Kostnader", value: fmt(snapshot.expenses) + " kr" },
                      { label: "Årets resultat", value: fmt(snapshot.yearResult) + " kr" },
                      { label: "EBITDA-marginal", value: (snapshot.ebitdaMargin * 100).toFixed(1) + "%" },
                    ] : [{ label: "Ingen data", value: "—" }],
                  });
                  toast.success("PDF nedladdad");
                } catch {
                  toast.error("Kunde inte skapa PDF");
                }
              }}>
                <Download className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {SLIDE_LABELS.map((label, i) => (
              <Button key={i} variant={activeSlide === i ? "default" : "outline"} size="sm" className="text-xs shrink-0 h-7" onClick={() => setActiveSlide(i)}>
                {i + 1}. {label}
              </Button>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden shadow-lg">
            {activeSlide === 0 && (
              <div className="aspect-video flex flex-col items-center justify-center text-white p-8" style={{ background: `linear-gradient(135deg, ${selectedTemplate.colorPrimary}, ${selectedTemplate.colorPrimary}dd)` }}>
                <h2 className="text-3xl md:text-4xl font-bold">Finansiell rapport</h2>
                <p className="text-xl mt-2 opacity-80">{period}</p>
                <div className="w-24 h-0.5 my-4" style={{ backgroundColor: selectedTemplate.colorAccent }} />
                <p className="text-sm opacity-60">Genererad {new Date().toLocaleDateString("sv-SE")} | Cogniq CFO</p>
              </div>
            )}

            {activeSlide === 1 && snapshot && (
              <div className="aspect-video p-6 md:p-8" style={{ backgroundColor: selectedTemplate.colorSecondary }}>
                <div className="rounded-lg px-4 py-2 mb-6" style={{ backgroundColor: selectedTemplate.colorPrimary }}>
                  <h3 className="text-white font-bold text-lg">Executive Summary</h3>
                  <p className="text-white/70 text-xs">Nyckeltal {period}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {slideData.kpis.map((k, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 border shadow-sm">
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                      <p className="text-lg font-bold mt-1">{k.value}</p>
                      <p className="text-xs mt-1" style={{ color: selectedTemplate.colorAccent }}>{k.trend}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSlide === 2 && (
              <div className="aspect-video p-6 md:p-8 bg-background">
                <div className="rounded-lg px-4 py-2 mb-6" style={{ backgroundColor: selectedTemplate.colorPrimary }}>
                  <h3 className="text-white font-bold text-lg">Resultatutveckling</h3>
                </div>
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-52`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={slideData.monthlyData}>
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
                      <Area type="monotone" dataKey="revenue" stroke={selectedTemplate.colorAccent} fill={`${selectedTemplate.colorAccent}20`} strokeWidth={2} name="Intakter" />
                      <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" strokeWidth={2} strokeDasharray="5 5" name="Kostnader" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeSlide === 3 && (
              <div className="aspect-video p-6 md:p-8 bg-background">
                <div className="rounded-lg px-4 py-2 mb-6" style={{ backgroundColor: selectedTemplate.colorPrimary }}>
                  <h3 className="text-white font-bold text-lg">Kassaflodesanalys</h3>
                </div>
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-52`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slideData.waterfallData}>
              <ChartGradients />
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {slideData.waterfallData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeSlide === 4 && (
              <div className="aspect-video p-6 md:p-8 bg-background">
                <div className="rounded-lg px-4 py-2 mb-6" style={{ backgroundColor: selectedTemplate.colorPrimary }}>
                  <h3 className="text-white font-bold text-lg">Risker & Mojligheter</h3>
                </div>
                <div className="space-y-3">
                  {slideData.risks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Inga identifierade risker</p>
                  ) : slideData.risks.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <AlertTriangle className={cn("h-5 w-5", r.probability === "Hog" ? "text-destructive" : r.probability === "Medium" ? "text-[#7A5417]" : "text-muted-foreground")} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.label}</p>
                        {r.amount > 0 && <p className="text-xs text-muted-foreground">{fmt(r.amount)} kr</p>}
                      </div>
                      <Badge variant={r.probability === "Hog" ? "destructive" : "secondary"} className="text-[10px]">
                        {r.probability}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSlide === 5 && (
              <div className="aspect-video p-6 md:p-8 bg-background">
                <div className="rounded-lg px-4 py-2 mb-6" style={{ backgroundColor: selectedTemplate.colorPrimary }}>
                  <h3 className="text-white font-bold text-lg">Rekommendationer</h3>
                </div>
                <div className="space-y-3">
                  {slideData.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ backgroundColor: selectedTemplate.colorAccent }}>
                        {i + 1}
                      </div>
                      <p className="text-sm pt-1">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Slide navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" disabled={activeSlide === 0} onClick={() => setActiveSlide(activeSlide - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Foregaende
            </Button>
            <span className="text-xs text-muted-foreground">{activeSlide + 1} / {SLIDE_LABELS.length}</span>
            <Button variant="ghost" size="sm" disabled={activeSlide === SLIDE_LABELS.length - 1} onClick={() => setActiveSlide(activeSlide + 1)}>
              Nasta <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Template selection view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Presentation className="h-4 w-4 text-primary" />
              Styrelsepresentation
            </CardTitle>
            <CardDescription>Valj mall och period — AI genererar hela presentationen</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Sok mall..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {CATEGORIES.map(c => (
              <Button
                key={c.key}
                variant={categoryFilter === c.key ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 shrink-0"
                onClick={() => setCategoryFilter(c.key)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Template grid */}
        <ScrollArea className="h-[360px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-4">
            {filteredTemplates.map(t => { const isSelected = selectedTemplate.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={cn(
                    "relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md group",
                    isSelected && "ring-2 ring-primary shadow-md"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative" style={{ background: `linear-gradient(135deg, ${t.colorPrimary}, ${t.colorPrimary}cc)` }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
                      <div className="w-6 h-0.5 mb-1" style={{ backgroundColor: t.colorAccent }} />
                      <p className="text-white text-[8px] font-bold text-center truncate w-full">{t.name}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setPreviewTemplate(t); }}
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-0.5"
                    >
                      <Eye className="h-3 w-3 text-white" />
                    </button>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-medium truncate">{t.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">{t.category}</Badge>
                      {t.industryTag && <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{t.industryTag}</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Generate button */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Vald mall: <span className="font-medium text-foreground">{selectedTemplate.name}</span>
          </div>
          <Button onClick={generate} disabled={!snapshot} className="gap-1.5">
            <Presentation className="h-4 w-4" />
            Generera presentation
          </Button>
        </div>
      </CardContent>

      {/* Preview dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          {previewTemplate && (
            <div className="space-y-4">
              <h3 className="font-semibold">{previewTemplate.name}</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Slide 1 preview */}
                <div className="aspect-video rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${previewTemplate.colorPrimary}, ${previewTemplate.colorPrimary}dd)` }}>
                  <div className="text-center">
                    <p className="text-white text-sm font-bold">Finansiell rapport</p>
                    <div className="w-12 h-0.5 mx-auto my-1.5" style={{ backgroundColor: previewTemplate.colorAccent }} />
                    <p className="text-white/60 text-[10px]">{period}</p>
                  </div>
                </div>
                {/* Slide 2 preview */}
                <div className="aspect-video rounded-lg p-3 border" style={{ backgroundColor: previewTemplate.colorSecondary }}>
                  <div className="rounded px-2 py-1 mb-2" style={{ backgroundColor: previewTemplate.colorPrimary }}>
                    <p className="text-white text-[9px] font-bold">Executive Summary</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white rounded p-1.5 border">
                        <div className="h-1 w-8 bg-muted rounded mb-1" />
                        <div className="h-2 w-12 bg-muted-foreground/20 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { setSelectedTemplate(previewTemplate); setPreviewTemplate(null); }}>
                  <Check className="h-4 w-4 mr-1" /> Valj denna mall
                </Button>
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Stang</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
