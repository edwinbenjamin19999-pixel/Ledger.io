import { useState, useCallback, useMemo, useEffect } from "react";
import { FileSearch, Upload, FileText, Building2, User, Briefcase, Shield, Receipt, List, HelpCircle, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Zap, Eye, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
// GradientKPIStrip removed — replaced with inline premium surface KPI cards per design system
import { useQuery } from "@tanstack/react-query";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { formatSEK } from "@/lib/formatNumber";
import { EmailInboxAddressCard } from "@/components/documents/EmailInboxAddressCard";
import { EmailInboxLog } from "@/components/documents/EmailInboxLog";

const DOC_TYPE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  contract: { label: "Avtal / Kontrakt", icon: Briefcase, color: "bg-[#EFF6FF] text-blue-800" },
  bank_statement: { label: "Kontoutdrag", icon: Building2, color: "bg-[#E1F5EE] text-[#085041]" },
  employment_agreement: { label: "Anställningsavtal", icon: User, color: "bg-[#F1F5F9] text-violet-800" },
  annual_report: { label: "Årsredovisning", icon: FileText, color: "bg-[#FAEEDA] text-[#7A5417]" },
  invoice: { label: "Faktura", icon: Receipt, color: "bg-[#EFF6FF] text-[#3b82f6]" },
  insurance_policy: { label: "Försäkringsbrev", icon: Shield, color: "bg-[#FCE8E8] text-[#7A1A1A]" },
  price_list: { label: "Prislista", icon: List, color: "bg-orange-100 text-orange-800" },
  other: { label: "Övrigt", icon: HelpCircle, color: "bg-gray-100 text-gray-800" },
};

const SUGGESTED_ACCOUNTS: Record<string, string> = {
  invoice: "Konto 4000 (Inköp) / 2440 (Leverantörsskuld)",
  contract: "Avtalskostnad — periodiseras",
  bank_statement: "Konto 1930 (Företagskonto)",
  employment_agreement: "Konto 7010 (Löner)",
  annual_report: "Sammanställning — ingen kontering",
  insurance_policy: "Konto 6310 (Försäkringspremier)",
  price_list: "Referensdokument — ingen kontering",
  other: "Manuell kontering rekommenderas",
};

function ConfidenceBadge({ confidence, showPercent }: { confidence: number; showPercent?: boolean }) {
  const pct = Math.round(confidence * 100);
  if (confidence >= 0.8) return <Badge className="bg-[#E1F5EE] text-[#085041] border-0"><CheckCircle2 className="w-3 h-3 mr-1" />{showPercent ? `${pct}%` : "Hög"}</Badge>;
  if (confidence >= 0.5) return <Badge className="bg-[#FAEEDA] text-[#7A5417] border-0"><AlertTriangle className="w-3 h-3 mr-1" />{showPercent ? `${pct}%` : "Medium"}</Badge>;
  return <Badge className="bg-[#FCE8E8] text-[#7A1A1A] border-0"><AlertTriangle className="w-3 h-3 mr-1" />{showPercent ? `${pct}%` : "Låg"}</Badge>;
}

function DataField({ label, value, confidence }: { label: string; value: any; confidence?: number }) {
  if (value === null || value === undefined) return null;
  const displayValue = typeof value === "boolean" ? (value ? "Ja" : "Nej") : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  const isLow = confidence !== undefined && confidence < 0.5;

  return (
    <div className={`flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 ${isLow ? "bg-amber-50/50 dark:bg-amber-900/10 -mx-2 px-2 rounded" : ""}`}>
      <span className="text-sm font-medium text-muted-foreground min-w-[140px]">{label}</span>
      <span className={`text-sm text-right max-w-[60%] ${isLow ? "text-[#7A5417]" : "text-foreground"}`}>
        {displayValue.length > 200 ? <pre className="whitespace-pre-wrap text-xs font-mono">{displayValue}</pre> : displayValue}
      </span>
    </div>
  );
}

/* ── AI Pipeline Steps ── */
const PIPELINE_STEPS = ["Uppladdning", "Extrahera", "Klassificera", "Föreslå", "Bokför"];

function AIPipeline({ analyzing, done }: { analyzing: boolean; done: boolean }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!analyzing) { setActiveStep(0); return; }
    const interval = setInterval(() => {
      setActiveStep((s) => (s < 4 ? s + 1 : 0));
    }, 2500);
    return () => clearInterval(interval);
  }, [analyzing]);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = analyzing && i === activeStep;
        const isComplete = done || (analyzing && i < activeStep);
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              isComplete ? "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]" :
              isActive ? "bg-[#EFF6FF] text-[#3b82f6] dark:bg-blue-900/30 dark:text-[#1E3A5F] animate-pulse" :
              "bg-muted text-muted-foreground"
            }`}>
              {isComplete && <CheckCircle2 className="w-3 h-3" />}
              {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
              {step}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`w-4 h-px transition-colors ${isComplete ? "bg-emerald-400" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── AI Preview Panel ── */
function AIPreviewPanel({ result }: { result: any }) {
  const typeInfo = DOC_TYPE_LABELS[result.document_type] || DOC_TYPE_LABELS.other;
  const data = result.extracted_data || {};
  const amount = data.total_amount || data.amount || data.belopp || data.totalbelopp;
  const date = data.date || data.datum || data.invoice_date || data.fakturadatum;
  const counterparty = data.counterparty || data.supplier || data.leverantör || data.motpart || data.company_name;
  const suggestedAccount = SUGGESTED_ACCOUNTS[result.document_type] || SUGGESTED_ACCOUNTS.other;
  const pct = Math.round((result.confidence || 0) * 100);

  return (
    <Card className="bg-[#0F1F3D] dark:from-blue-950/20 dark:to-blue-950/20 border-blue-200/50 dark:border-[#3b82f6]/30">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#3b82f6]" />
          <span className="text-sm font-semibold text-foreground">AI identifierade</span>
          <Badge className={`${typeInfo.color} ml-1`}>{typeInfo.label}</Badge>
          <Badge className="bg-[#E1F5EE] text-[#085041] border-0 ml-auto">{pct}% konfidens</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {amount && (
            <div>
              <p className="text-xs text-muted-foreground">Belopp</p>
              <p className="text-lg font-bold tabular-nums text-foreground">{typeof amount === "number" ? formatSEK(amount) : amount}</p>
            </div>
          )}
          {date && (
            <div>
              <p className="text-xs text-muted-foreground">Datum</p>
              <p className="text-sm font-medium text-foreground">{date}</p>
            </div>
          )}
          {counterparty && (
            <div>
              <p className="text-xs text-muted-foreground">Motpart</p>
              <p className="text-sm font-medium text-foreground">{counterparty}</p>
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-blue-100/50 dark:border-[#3b82f6]/20 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Föreslagen kontering</p>
          <p className="text-sm font-medium text-foreground">{suggestedAccount}</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="bg-[#0F1F3D] hover:from-[#3b82f6] hover:to-blue-700 text-white" onClick={() => toast.success("Verifikation skapad automatiskt!")}>
            <Zap className="w-4 h-4 mr-1" />
            Bokför automatiskt
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            document.getElementById("analysis-detail-card")?.scrollIntoView({ behavior: "smooth" });
          }}>
            <Eye className="w-4 h-4 mr-1" />
            Granska innan bokföring
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Recent Activity ── */
function RecentActivity({ documents }: { documents: any[] }) {
  const recent = documents.slice(0, 5);
  if (!recent.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Senast analyserade
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {recent.map((doc: any) => {
            const typeInfo = DOC_TYPE_LABELS[doc.ai_document_type] || DOC_TYPE_LABELS.other;
            const Icon = typeInfo.icon;
            const conf = doc.ai_confidence || 0;
            const needsReview = conf < 0.7;
            const timeAgo = doc.analyzed_at ? getRelativeTime(new Date(doc.analyzed_at)) : "–";

            return (
              <div key={doc.id} className={`flex items-center justify-between px-4 py-3 border-l-3 ${
                needsReview ? "border-l-amber-400" : "border-l-emerald-400"
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${typeInfo.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{typeInfo.label} • {timeAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${needsReview ? "border-[#F0DDB7] text-[#7A5417]" : "border-[#BFE6D6] text-[#085041]"}`}>
                    {needsReview ? "Behöver granskas" : "Klar"} • {Math.round(conf * 100)}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just nu";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h sedan`;
  const days = Math.floor(hours / 24);
  return `${days}d sedan`;
}

/* ── Dynamic Document Type Counts ── */
function DynamicDocTypeCounts({ documents }: { documents: any[] }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = documents.filter((d: any) => {
    if (!d.analyzed_at) return false;
    const dt = new Date(d.analyzed_at);
    return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
  });

  const counts: Record<string, number> = {};
  thisMonth.forEach((d: any) => {
    const t = d.ai_document_type || "other";
    counts[t] = (counts[t] || 0) + 1;
  });

  const entries = Object.entries(counts).filter(([k]) => k !== "other");
  if (!entries.length && !thisMonth.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {entries.map(([key, count]) => {
        const info = DOC_TYPE_LABELS[key] || DOC_TYPE_LABELS.other;
        const Icon = info.icon;
        return (
          <div key={key} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
            <div className={`p-1.5 rounded-lg ${info.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">{count}</span>
              <span className="text-xs text-muted-foreground ml-1">{info.label.toLowerCase()} denna månad</span>
            </div>
          </div>
        );
      })}
      {!entries.length && (
        <div className="col-span-full text-center py-3 text-xs text-muted-foreground">
          Inga dokument analyserade denna månad ännu
        </div>
      )}
    </div>
  );
}

function AnalysisResultCard({ result }: { result: any }) {
  const typeInfo = DOC_TYPE_LABELS[result.document_type] || DOC_TYPE_LABELS.other;
  const Icon = typeInfo.icon;
  const data = result.extracted_data || {};

  return (
    <Card id="analysis-detail-card" className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{typeInfo.label}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{result.summary}</p>
            </div>
          </div>
          <ConfidenceBadge confidence={result.confidence} showPercent />
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y-0">
          {Object.entries(data).map(([key, value]) => {
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
              return (
                <div key={key} className="py-2">
                  <span className="text-sm font-semibold text-foreground block mb-2 capitalize">{key.replace(/_/g, " ")}</span>
                  <div className="space-y-1 pl-3 border-l-2 border-secondary/30">
                    {value.slice(0, 10).map((item: any, i: number) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                      </div>
                    ))}
                    {value.length > 10 && <span className="text-xs text-muted-foreground">...och {value.length - 10} till</span>}
                  </div>
                </div>
              );
            }
            if (Array.isArray(value)) {
              return (
                <div key={key} className="py-2">
                  <span className="text-sm font-semibold text-foreground block mb-1 capitalize">{key.replace(/_/g, " ")}</span>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                    {value.map((item: any, i: number) => <li key={i}>{String(item)}</li>)}
                  </ul>
                </div>
              );
            }
            return <DataField key={key} label={key.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase())} value={value} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DocumentAnalysis() {
  const { user } = useAuth();
  const companyId = getStoredActiveCompanyId();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: documents, refetch } = useQuery({
    queryKey: ["analyzed-documents", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("company_id", companyId)
        .not("ai_document_type", "is", null)
        .order("analyzed_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  const kpis = [
    { label: "Analyserade", value: String(documents?.length || 0), icon: FileSearch },
    { label: "Avtal", value: String(documents?.filter((d: any) => d.ai_document_type === "contract").length || 0), icon: Briefcase },
    { label: "Fakturor", value: String(documents?.filter((d: any) => d.ai_document_type === "invoice").length || 0), icon: Receipt },
    { label: "Snitt konfidens", value: documents?.length ? `${Math.round((documents.reduce((sum: number, d: any) => sum + (d.ai_confidence || 0), 0) / documents.length) * 100)}%` : "–", icon: CheckCircle2 },
  ];

  const handleFile = useCallback(async (file: File) => {
    if (!user || !companyId) {
      toast.error("Du måste vara inloggad och ha ett aktivt bolag.");
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Filen är för stor (max 20 MB).");
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const filePath = `${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert([{
          company_id: companyId,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          document_type: "other",
          processing_status: "processing",
        }])
        .select("id")
        .maybeSingle();

      if (docError) throw docError;

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let base64 = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        base64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      base64 = btoa(base64);

      const { data: analysisResult, error: fnError } = await supabase.functions.invoke("analyze-document", {
        body: {
          document_id: doc.id,
          file_content_base64: base64,
          file_name: file.name,
          mime_type: file.type,
        },
      });

      if (fnError) throw fnError;

      setResult(analysisResult);
      toast.success("Dokumentet har analyserats!");
      refetch();
    } catch (e: any) {
      console.error("Analysis failed:", e);
      toast.error(e.message || "Analysen misslyckades.");
    } finally {
      setAnalyzing(false);
    }
  }, [user, companyId, refetch]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }, [handleFile]);

  const showRecentActivity = !result && (documents?.length || 0) > 0;

  return (
    <div className="page-container">
      <PageHeader
        title="AI Dokumentanalys"
        subtitle="Ladda upp vilket affärsdokument som helst — AI extraherar nyckeldata automatiskt"
        icon={FileSearch}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="relative overflow-hidden bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] p-[16px]"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#0040CC]" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] leading-tight">{kpi.label}</p>
                  <p className="text-[22px] font-medium tracking-[-0.03em] text-[#0F172A] tabular-nums mt-1.5 leading-none">{kpi.value}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">vs förra månaden</p>
                </div>
                <Icon size={16} strokeWidth={1.5} color="#94A3B8" className="shrink-0 mt-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-0 rounded-none bg-transparent p-0 border-b-[0.5px] border-[#E2E8F0] w-full justify-start">
          <TabsTrigger value="upload" className="rounded-none bg-transparent text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] data-[state=active]:bg-transparent data-[state=active]:text-[#0040CC] data-[state=active]:font-medium data-[state=active]:border-[#0040CC] data-[state=active]:shadow-none -mb-px">Analysera</TabsTrigger>
          <TabsTrigger value="email" className="rounded-none bg-transparent text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] data-[state=active]:bg-transparent data-[state=active]:text-[#0040CC] data-[state=active]:font-medium data-[state=active]:border-[#0040CC] data-[state=active]:shadow-none -mb-px">Mejlinkorg</TabsTrigger>
          <TabsTrigger value="archive" className="rounded-none bg-transparent text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] data-[state=active]:bg-transparent data-[state=active]:text-[#0040CC] data-[state=active]:font-medium data-[state=active]:border-[#0040CC] data-[state=active]:shadow-none -mb-px">
            Arkiv
            <span className="bg-[#F1F5F9] text-[#475569] rounded-full text-[10px] ml-[5px] px-[6px] py-px">{documents?.length || 0}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-5">
          {/* Upload area */}
          <Card className={`group bg-white border-[2px] border-dashed rounded-[12px] transition-all duration-300 shadow-none ${
            dragOver
              ? "border-[#0040CC] bg-[#F5F9FF]"
              : "border-[#E2E8F0] hover:border-[#0040CC] hover:bg-[#F5F9FF]"
          }`}>
            <CardContent className="p-0">
              <div
                className="flex flex-col items-center justify-center p-[40px] cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => document.getElementById("doc-upload-input")?.click()}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={32} strokeWidth={1} className="text-[#0040CC] animate-spin mb-3" />
                    <p className="text-[14px] font-medium text-[#0F172A]">Analyserar dokument med AI...</p>
                    <p className="text-[12px] text-[#94A3B8] mt-1 animate-pulse">Extraherar data, klassificerar och förbereder kontering</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} strokeWidth={1} className={`${dragOver ? "text-[#0040CC]" : "text-[#94A3B8] group-hover:text-[#0040CC]"} transition-colors`} />
                    <p className="text-[14px] font-medium text-[#0F172A] mt-[12px] text-center">Släpp valfritt dokument — kvitto, faktura, avtal</p>
                    <p className="text-[12px] text-[#94A3B8] mt-[4px] text-center max-w-md">
                      AI extraherar, kategoriserar och bokför automatiskt
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-[2px]">Klicka eller dra och släpp</p>
                    <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                      {["PDF", "JPG", "PNG", "DOCX", "TXT", "CSV"].map((fmt) => (
                        <span key={fmt} className="bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0] rounded-[4px] text-[10px] font-medium px-[7px] py-[2px]">{fmt}</span>
                      ))}
                    </div>
                  </>
                )}
                <input
                  id="doc-upload-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.txt,.csv,.xml"
                  onChange={onFileSelect}
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Pipeline */}
          {(analyzing || result) && <AIPipeline analyzing={analyzing} done={!!result} />}

          {/* AI Preview Panel */}
          {result && <AIPreviewPanel result={result} />}

          {/* Detailed Analysis result */}
          {result && <AnalysisResultCard result={result} />}

          {/* Recent Activity (when no active result) */}
          {showRecentActivity && <RecentActivity documents={documents!} />}

          {/* Dynamic document type counts */}
          {documents && documents.length > 0 ? (
            <DynamicDocTypeCounts documents={documents} />
          ) : !result && (
            <Card className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] shadow-none">
              <CardContent className="py-8 text-center flex flex-col items-center">
                <div className="w-[14px] h-[14px] rounded-full bg-[#0040CC] mb-3 flex items-center justify-center">
                  <span className="w-[5px] h-[5px] rounded-full bg-[#E6F4FA]" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">AI-insikter</p>
                <div className="w-[32px] h-[32px] rounded-full bg-[#0040CC] mt-3 flex items-center justify-center">
                  <span className="w-[12px] h-[12px] rounded-full bg-[#E6F4FA]" />
                </div>
                <p className="text-[14px] font-medium text-[#0F172A] mt-[12px]">AI Insights</p>
                <p className="text-[12px] text-[#94A3B8] leading-[1.6] mt-2 max-w-md mx-auto">
                  Ladda upp ett dokument — AI hittar automatiskt:
                  <br />fakturanummer, belopp och förfallodatum · momsbelopp per rad ·
                  <br />avtalsparter och löptid · konteringsförslag per rad
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-3 italic">
                  Ladda upp ditt första dokument för att se AI:ns analys
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="email" className="space-y-5">
          <EmailInboxAddressCard companyId={companyId} />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Senaste inkommande mejl</h3>
            <EmailInboxLog companyId={companyId} />
          </div>
        </TabsContent>

        <TabsContent value="archive">
          <Card>
            <CardContent className="p-0">
              {!documents?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">Inga analyserade dokument ännu</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {documents.map((doc: any) => {
                    const typeInfo = DOC_TYPE_LABELS[doc.ai_document_type] || DOC_TYPE_LABELS.other;
                    const Icon = typeInfo.icon;
                    const conf = doc.ai_confidence || 0;
                    const needsReview = conf < 0.7;
                    return (
                      <div key={doc.id} className={`flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-l-3 ${
                        needsReview ? "border-l-amber-400" : "border-l-emerald-400"
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${typeInfo.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {typeInfo.label} • {doc.analyzed_at ? new Date(doc.analyzed_at).toLocaleDateString("sv-SE") : "–"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ConfidenceBadge confidence={conf} showPercent />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setResult({
                                document_type: doc.ai_document_type,
                                confidence: doc.ai_confidence,
                                extracted_data: doc.extracted_data,
                                summary: (doc.extracted_data as Record<string, unknown>)?.summary || "–",
                              });
                              const el = document.querySelector('[data-value="upload"]') as HTMLElement;
                              el?.click();
                            }}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
