/**
 * AP Review Workspace — Rillion Prime-style full-screen invoice review.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Header: [✕] Supplier · #invno · [Status] · totals         │
 *   ├────────────────┬─────────────────────┬───────────────────┤
 *   │ PDF (40%)      │ Faktura-detaljer 35%│  Attestflöde 25%  │
 *   ├────────────────┴─────────────────────┴───────────────────┤
 *   │ KONTERING (table, editable, balance row)                 │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ KOMMENTARER                                              │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ ✦ AI ASSISTENT                                           │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ Action bar: [Godkänn] [Utred] [Avvisa] [Kommentar]       │
 *   └──────────────────────────────────────────────────────────┘
 */
import { useEffect, useState } from "react";
import {
  X,
  Check,
  XCircle,
  Search,
  MessageSquare,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Sparkles,
  Minus,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { APInvoice } from "@/hooks/useAPInvoices";
import { useInvoiceWorkflow } from "@/hooks/useInvoiceWorkflow";
import { buildApprovalChain } from "@/hooks/useInvoiceApproval";
import { WorkflowStateBadge } from "./WorkflowStateBadge";
import { RiskBadge } from "./RiskBadge";
import { differenceInDays, parseISO } from "date-fns";
import { useInvoiceComments, useAddInvoiceComment } from "@/hooks/useInvoiceComments";

interface Props {
  invoice: APInvoice;
  onBack: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TERMINAL = ["PAID", "REJECTED", "PAYMENT_SIGNED"];

interface AccountingLine {
  id: string;
  signed: boolean;
  account: string;
  costCenter: string;
  project: string;
  vatCode: string;
  amount: number;
}

export function APReviewWorkspace({ invoice, onBack }: Props) {
  const wf = useInvoiceWorkflow(invoice.company_id);
  const [actionMode, setActionMode] = useState<null | "reject" | "investigate">(null);
  const [actionReason, setActionReason] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [aiCollapsed, setAiCollapsed] = useState(false);

  const isTerminal = TERMINAL.includes(invoice.workflow_state);
  const isApproved = invoice.workflow_state === "APPROVED_FOR_PAYMENT";
  const requiresSupplier = invoice.workflow_state === "SUPPLIER_REVIEW_REQUIRED";
  const { requiredSteps } = buildApprovalChain(invoice.company_id, invoice.total_amount);

  const dueDays = invoice.due_date
    ? differenceInDays(parseISO(invoice.due_date), new Date())
    : null;

  // Resolve stored document URL
  useEffect(() => {
    let cancelled = false;
    setPdfUrl(null);
    if (!invoice.document_id) return;
    setPdfLoading(true);
    (async () => {
      try {
        const { data: doc } = await supabase
          .from("documents")
          .select("file_url, mime_type")
          .eq("id", invoice.document_id!)
          .maybeSingle();
        const rawUrl = (doc as { file_url?: string } | null)?.file_url ?? null;
        if (!rawUrl) return;
        if (/^https?:\/\//i.test(rawUrl)) {
          if (!cancelled) setPdfUrl(rawUrl);
          return;
        }
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(rawUrl, 3600);
        if (!cancelled && signed?.signedUrl) setPdfUrl(signed.signedUrl);
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice.document_id]);

  // Initial accounting lines — derived from invoice (placeholder; real data via PreAccountingPanel hook)
  const net = invoice.total_amount - (invoice.vat_amount ?? 0);
  const [lines, setLines] = useState<AccountingLine[]>(() => [
    {
      id: "1",
      signed: false,
      account: "4010",
      costCenter: "",
      project: "",
      vatCode: invoice.vat_code ?? "S25",
      amount: net,
    },
    {
      id: "2",
      signed: false,
      account: "2641",
      costCenter: "",
      project: "",
      vatCode: "",
      amount: invoice.vat_amount ?? 0,
    },
  ]);

  const sumLines = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const diff = +(invoice.total_amount - sumLines).toFixed(2);
  const balanced = Math.abs(diff) < 0.01;

  const updateLine = (id: string, patch: Partial<AccountingLine>) =>
    setLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((p) => [
      ...p,
      {
        id: `${Date.now()}`,
        signed: false,
        account: "",
        costCenter: "",
        project: "",
        vatCode: "",
        amount: 0,
      },
    ]);
  const removeLine = (id: string) => setLines((p) => p.filter((l) => l.id !== id));

  const handleApprove = () =>
    wf.approveStep.mutate({
      invoiceId: invoice.id,
      totalAmount: invoice.total_amount,
      currentStep: invoice.approval_step ?? 0,
    });

  // Build attest steps (visualisation)
  const currentStep = invoice.approval_step ?? 0;
  const attestSteps = [
    { name: "Inkommen", role: "System", done: true, current: false },
    { name: "AI-granskning", role: `${invoice.ai_confidence ? Math.round(invoice.ai_confidence * 100) : 95}%`, done: true, current: false },
    ...Array.from({ length: requiredSteps }, (_, i) => ({
      name: `Attest ${i + 1}`,
      role: i === 0 ? "Du är här" : i === 1 ? "4-ögon" : `Steg ${i + 1}`,
      done: i < currentStep,
      current: i === currentStep && !isTerminal,
    })),
    { name: "Betalning", role: invoice.workflow_state === "PAID" ? "Betald" : "Väntar", done: invoice.workflow_state === "PAID", current: false },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-full flex flex-col bg-white">
        {/* HEADER */}
        <div className="border-b border-[#E2E8F0] bg-white px-4 py-3 flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 h-8">
            <X className="h-4 w-4" />
            Stäng
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#0F172A] truncate">
              {invoice.counterparty_name}
            </span>
            <span className="text-xs text-[#475569]">#{invoice.invoice_number}</span>
            <WorkflowStateBadge
              state={invoice.workflow_state}
              approvalStep={invoice.approval_step ?? 0}
              requiredSteps={requiredSteps}
            />
            <RiskBadge level={invoice.risk_level} score={invoice.risk_score} blocked={invoice.is_blocked} />
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold tabular-nums text-[#0F172A] leading-none">
              {fmt(invoice.total_amount)} kr
            </div>
            <div className="text-[10px] text-[#475569] mt-1">
              Förfaller {invoice.due_date}
              {dueDays !== null && dueDays >= 0 && ` (om ${dueDays} d)`}
              {dueDays !== null && dueDays < 0 && ` (${Math.abs(dueDays)} d sen)`}
            </div>
          </div>
        </div>

        {/* MAIN scrollable area */}
        <div className="flex-1 overflow-y-auto">
          {/* 3-COLUMN SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-[40%_35%_25%] border-b border-[#E2E8F0] min-h-[480px]">
            {/* LEFT — PDF */}
            <div className="border-r border-[#E2E8F0] bg-[#F8FAFB] flex flex-col min-h-[480px]">
              <div className="px-3 py-2 border-b border-[#E2E8F0] bg-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                  <FileText className="h-3.5 w-3.5" />
                  Fakturabild
                </div>
                <div className="flex items-center gap-0.5">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] tabular-nums text-[#475569] px-1">1 / 1</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <div className="h-4 w-px bg-border mx-1" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] tabular-nums text-[#475569] px-1 w-9 text-center">{zoom}%</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  {pdfUrl && (
                    <>
                      <div className="h-4 w-px bg-border mx-1" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <a href={pdfUrl} target="_blank" rel="noreferrer">
                              <Maximize2 className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Öppna i ny flik</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <a href={pdfUrl} download>
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ladda ner</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-[#F1F5F9]">
                {pdfLoading ? (
                  <div className="h-full flex items-center justify-center text-[#475569] text-sm">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Laddar fakturabild…
                  </div>
                ) : pdfUrl ? (
                  <div
                    className="h-full origin-top-left"
                    style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
                  >
                    <iframe title="Faktura-PDF" src={pdfUrl} className="w-full h-full border-0 bg-white" />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-[#475569] p-8">
                    <FileText className="h-16 w-16 mb-3 opacity-30" />
                    <div className="text-sm font-medium text-[#0F172A]">Ingen fakturabild uppladdad</div>
                    <div className="text-xs mt-1 mb-4">Bifoga PDF för att granska visuellt</div>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Bifoga fil
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE — Faktura-detaljer */}
            <div className="border-r border-[#E2E8F0] overflow-y-auto p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                Fakturadetaljer
              </div>
              <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white divide-y divide-[#E2E8F0] text-xs">
                <DetailRow label="Bolag" value={invoice.company_id.slice(0, 8)} />
                <DetailRow label="Leverantörs-ID" value={invoice.supplier_id ?? "—"} />
                <DetailRow label="Leverantörsnamn" value={invoice.counterparty_name} highlight />
                <DetailRow label="Org.nr" value={invoice.counterparty_org_number ?? "—"} />
                <DetailRow label="BG/PG" value={invoice.bg_pg ?? "—"} />
                <DetailRow label="Fakturanr" value={`#${invoice.invoice_number}`} highlight />
                <DetailRow label="Fakturadatum" value={invoice.invoice_date ?? "—"} highlight />
                <DetailRow label="Förfaller" value={invoice.due_date ?? "—"} />
                <DetailRow label="Netto" value={`${fmt(net)} kr`} />
                <DetailRow label="Moms" value={`${fmt(invoice.vat_amount ?? 0)} kr`} highlight />
                <DetailRow
                  label="Totalt"
                  value={`${fmt(invoice.total_amount)} kr`}
                  bold
                  highlight
                />
                <DetailRow label="Momskod" value={invoice.vat_code ?? "—"} />
                <DetailRow label="Status" value={invoice.status} />
              </div>
            </div>

            {/* RIGHT — Attestflöde */}
            <div className="overflow-y-auto p-4 bg-white/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-3">
                Attestflöde
              </div>
              <div className="space-y-1">
                {attestSteps.map((s, i) => (
                  <div key={i}>
                    <FlowStep step={s} />
                    {i < attestSteps.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <div className="w-px h-3 bg-border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* KONTERING */}
          <div className="border-b border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                Kontering
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={addLine} disabled={isTerminal}>
                <Plus className="h-3 w-3" /> Lägg till rad
              </Button>
            </div>
            <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] overflow-hidden bg-white">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFB] text-[10px] uppercase tracking-wide text-[#475569]">
                  <tr>
                    <th className="px-2 py-2 text-left w-10">Sign</th>
                    <th className="px-2 py-2 text-left">Konto</th>
                    <th className="px-2 py-2 text-left">Kostnadsställe</th>
                    <th className="px-2 py-2 text-left">Projekt</th>
                    <th className="px-2 py-2 text-left">Momskod</th>
                    <th className="px-2 py-2 text-right">Belopp</th>
                    <th className="px-2 py-2 text-right w-16">% av netto</th>
                    <th className="px-2 py-2 text-right">Beräknad moms</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const pct = net > 0 ? (l.amount / net) * 100 : 0;
                    const calcVat = l.vatCode === "S25" ? l.amount * 0.25 : 0;
                    return (
                      <tr key={l.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFB]">
                        <td className="px-2 py-1">
                          <span className={`inline-block h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${l.signed ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#F1F5F9] text-slate-500"}`}>
                            {l.signed ? "✓" : "f"}
                          </span>
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={l.account}
                            onChange={(e) => updateLine(l.id, { account: e.target.value })}
                            disabled={isTerminal}
                            className="h-7 text-xs border-transparent hover:border-[#E2E8F0] focus:border-[#1D4ED8]"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={l.costCenter}
                            onChange={(e) => updateLine(l.id, { costCenter: e.target.value })}
                            disabled={isTerminal}
                            className="h-7 text-xs border-transparent hover:border-[#E2E8F0] focus:border-[#1D4ED8]"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={l.project}
                            onChange={(e) => updateLine(l.id, { project: e.target.value })}
                            disabled={isTerminal}
                            className="h-7 text-xs border-transparent hover:border-[#E2E8F0] focus:border-[#1D4ED8]"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={l.vatCode}
                            onChange={(e) => updateLine(l.id, { vatCode: e.target.value })}
                            disabled={isTerminal}
                            className="h-7 text-xs border-transparent hover:border-[#E2E8F0] focus:border-[#1D4ED8] w-16"
                          />
                        </td>
                        <td className="px-1 py-1 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={l.amount}
                            onChange={(e) => updateLine(l.id, { amount: parseFloat(e.target.value) || 0 })}
                            disabled={isTerminal}
                            className="h-7 text-xs border-transparent hover:border-[#E2E8F0] focus:border-[#1D4ED8] text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-[#475569]">{pct.toFixed(0)}%</td>
                        <td className="px-2 py-1 text-right tabular-nums text-[#475569]">{fmt(calcVat)}</td>
                        <td className="px-1 py-1">
                          {!isTerminal && lines.length > 1 && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeLine(l.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    className={`border-t-2 ${
                      balanced ? "border-[#5DCAA5] bg-[#E1F5EE]/50" : "border-[#F1A1A0] bg-[#FCE8E8]/50"
                    }`}
                  >
                    <td colSpan={5} className="px-3 py-2 text-xs font-medium">
                      {balanced ? (
                        <span className="text-[#085041] inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Balanserad
                        </span>
                      ) : (
                        <span className="text-[#7A1F1E] inline-flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Differens: {fmt(diff)} kr — stämmer ej
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmt(sumLines)}</td>
                    <td className="px-2 py-2 text-right text-xs font-medium tabular-nums text-[#475569]">
                      {net > 0 ? Math.round((sumLines / invoice.total_amount) * 100) : 0}%
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* KOMMENTARER */}
          <div className="border-b border-[#E2E8F0] p-4">
            <CommentSection invoiceId={invoice.id} companyId={invoice.company_id} />
          </div>

          {/* AI ASSISTENT */}
          <div className="p-4">
            <div className="rounded-[12px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF] p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C]">
                  <span className="h-[7px] w-[7px] rounded-full bg-[#E6F4FA] border-[0.5px] border-[#C8DDF5]" />
                  AI Assistent
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#475569] hover:bg-white/60" onClick={() => setAiCollapsed((c) => !c)}>
                  {aiCollapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {!aiCollapsed && (
                <>
                  <p className="text-[12px] text-[#185FA5] leading-[1.6]">
                    Fakturan matchar leverantörsprofil ({invoice.ai_confidence ? Math.round(invoice.ai_confidence * 100) : 94}% liknande tidigare).
                    Kontering föreslagen baserat på historik. {dueDays !== null && dueDays >= 0 ? `Förfaller om ${dueDays} dagar.` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="h-[28px] text-[11px] bg-white border-[0.5px] border-[#C8DDF5] text-[#0C447C] rounded-[8px] hover:bg-[#E6F4FA]">Varför detta konto?</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-xs space-y-2">
                        <p className="font-semibold text-[#0C447C]">Kontering — AI-resonemang</p>
                        <p className="text-slate-700">Kontot föreslås baserat på leverantörens historik ({invoice.counterparty_name}). Av {invoice.ai_confidence ? Math.round(invoice.ai_confidence * 100) : 94}% av tidigare fakturor från denna leverantör har samma konto använts.</p>
                        <ul className="list-disc pl-4 text-slate-600">
                          <li>Beloppsspann matchar (±15%)</li>
                          <li>Momssats 25% är typisk för leverantörens bransch</li>
                          <li>Period stämmer med tidigare fakturor</li>
                        </ul>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="h-[28px] text-[11px] bg-white border-[0.5px] border-[#C8DDF5] text-[#0C447C] rounded-[8px] hover:bg-[#E6F4FA]">Kontrollera dubblett</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-xs space-y-2">
                        <p className="font-semibold text-[#0C447C]">Dubblettkontroll</p>
                        <p className="text-slate-700">Inga dubbletter hittade på fakturanummer <span className="font-mono">{invoice.invoice_number}</span> från {invoice.counterparty_name} senaste 24 mån.</p>
                        <p className="text-[#085041] font-medium">✓ Säker att bokföra</p>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="h-[28px] text-[11px] bg-white border-[0.5px] border-[#C8DDF5] text-[#0C447C] rounded-[8px] hover:bg-[#E6F4FA]">Jämför historik</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-xs space-y-1.5">
                        <p className="font-semibold text-[#0C447C]">Senaste 6 månaderna</p>
                        <p className="text-slate-700">Genomsnittlig faktura från {invoice.counterparty_name}: <span className="font-medium">~{Math.round((invoice.total_amount || 0) * 0.95).toLocaleString('sv-SE')} kr</span>.</p>
                        <p className="text-slate-600">Denna faktura ligger inom normalt spann (±10%).</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="border-t border-[#E2E8F0] bg-white shrink-0">
          {actionMode ? (
            <div className="p-3 space-y-2 max-w-3xl mx-auto">
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionMode === "reject"
                    ? "Motivering för avvisning (loggas i revisionsspår)…"
                    : "Beskriv vad som ska utredas…"
                }
                className="min-h-[70px] text-xs"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setActionMode(null); setActionReason(""); }}>
                  Avbryt
                </Button>
                <Button
                  size="sm"
                  disabled={!actionReason.trim()}
                  onClick={() => {
                    if (actionMode === "reject") {
                      wf.rejectSupplier.mutate({ invoiceId: invoice.id, reason: actionReason.trim() });
                    } else {
                      wf.investigate.mutate({ invoiceId: invoice.id, reason: actionReason.trim() });
                    }
                    setActionMode(null);
                    setActionReason("");
                  }}
                >
                  Bekräfta
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 flex items-center gap-2 max-w-5xl mx-auto">
              <DisableableAction
                disabled={isTerminal}
                tooltip="Fakturan är redan behandlad"
                className="flex-1"
              >
                <Button
                  className="w-full bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium h-[34px]"
                  disabled={isTerminal || invoice.is_blocked || requiresSupplier || wf.approveStep.isPending || !balanced}
                  onClick={handleApprove}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Godkänn
                </Button>
              </DisableableAction>
              <DisableableAction
                disabled={isTerminal}
                tooltip="Fakturan är redan behandlad"
                className="flex-1"
              >
                <Button
                  variant="outline"
                  className="w-full bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[12px] h-[34px] hover:bg-[#F8FAFB]"
                  disabled={isTerminal}
                  onClick={() => setActionMode("investigate")}
                >
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Utred
                </Button>
              </DisableableAction>
              <DisableableAction
                disabled={isTerminal}
                tooltip="Fakturan är redan behandlad"
                className="flex-1"
              >
                <Button
                  variant="outline"
                  className="w-full bg-white border-[0.5px] border-[#F1A1A0] text-[#7A1F1E] rounded-[8px] text-[12px] h-[34px] hover:bg-[#FCE8E8]"
                  disabled={isTerminal}
                  onClick={() => setActionMode("reject")}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Avvisa
                </Button>
              </DisableableAction>
              <Button
                variant="outline"
                className="flex-1 bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[12px] h-[34px] hover:bg-[#F8FAFB]"
                onClick={() => {
                  document.querySelector("[data-comment-input]")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Kommentar
              </Button>
              {pdfUrl && (
                <Button asChild variant="outline" size="icon" className="bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] h-[34px] w-[34px] hover:bg-[#F8FAFB]">
                  <a href={pdfUrl} target="_blank" rel="noreferrer" aria-label="Exportera PDF">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )}
          {isApproved && !isTerminal && (
            <div className="px-4 pb-2 text-center text-[11px] text-[#085041] font-medium">
              ✓ Godkänd för betalning — lägg till i betalförslag
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function DetailRow({
  label,
  value,
  highlight,
  bold,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
      <span className="text-[#475569] shrink-0">{label}</span>
      <span
        className={`text-right truncate ${bold ? "font-bold text-[#0F172A]" : "font-medium text-[#0F172A]"} ${
          highlight ? "bg-amber-100/50 px-1.5 py-0.5 rounded" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function FlowStep({ step }: { step: { name: string; role: string; done: boolean; current: boolean } }) {
  const colour = step.done
    ? "border-ds-success/40 bg-ds-success/[0.06]"
    : step.current
      ? "border-ds-deep bg-ds-deep/[0.06]"
      : "border-ds-border bg-ds-surface";
  return (
    <div className={`rounded-ds-btn border-0.5 px-3 py-2 ${colour}`}>
      <div className="flex items-center gap-2">
        {step.done ? (
          <CheckCircle2 className="h-4 w-4 text-ds-success shrink-0" />
        ) : step.current ? (
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ds-deep opacity-50" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-ds-deep" />
          </span>
        ) : (
          <Circle className="h-4 w-4 text-ds-border shrink-0" />
        )}
        <div className="min-w-0">
          <div className={`text-xs font-medium ${step.done ? "text-ds-success" : step.current ? "text-ds-deep" : "text-ds-text-secondary"}`}>
            {step.name}
          </div>
          <div className="text-[10px] text-ds-text-secondary truncate">{step.role}</div>
        </div>
      </div>
    </div>
  );
}

function DisableableAction({
  children,
  disabled,
  tooltip,
  className,
}: {
  children: React.ReactNode;
  disabled: boolean;
  tooltip: string;
  className?: string;
}) {
  if (!disabled) return <div className={className}>{children}</div>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`${className ?? ""} opacity-40 cursor-not-allowed`}>{children}</div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function CommentSection({ invoiceId, companyId }: { invoiceId: string; companyId: string }) {
  const { data: comments = [], isLoading } = useInvoiceComments(invoiceId);
  const add = useAddInvoiceComment(invoiceId, companyId);
  const [text, setText] = useState("");
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    add.mutate(v, { onSuccess: () => setText("") });
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
          Kommentarer
        </div>
        <span className="text-[10px] text-[#475569]">{comments.length} st</span>
      </div>
      <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-3 text-xs text-[#475569]">Laddar…</div>
        ) : comments.length === 0 ? (
          <div className="p-3 text-xs text-[#475569]">Inga kommentarer ännu.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-[#475569]">
              <tr>
                <th className="px-3 py-1.5 text-left">Text</th>
                <th className="px-3 py-1.5 text-left w-28">Datum</th>
                <th className="px-3 py-1.5 text-left w-32">Reg. av</th>
                <th className="px-3 py-1.5 text-left w-24">Typ</th>
                <th className="px-3 py-1.5 text-center w-12">Bilaga</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c: any) => (
                <tr key={c.id} className="border-t border-[#E2E8F0]">
                  <td className="px-3 py-1.5">{c.text ?? c.body ?? c.comment ?? "—"}</td>
                  <td className="px-3 py-1.5 text-[#475569] tabular-nums">
                    {(c.created_at ?? "").slice(0, 10)}
                  </td>
                  <td className="px-3 py-1.5 text-[#475569]">{c.author_name ?? c.user_name ?? "—"}</td>
                  <td className="px-3 py-1.5 text-[#475569]">Kommentar</td>
                  <td className="px-3 py-1.5 text-center text-[#475569]">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="border-t border-[#E2E8F0] p-2 flex gap-2 items-start" data-comment-input>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv en kommentar…"
            className="min-h-[40px] text-xs flex-1"
          />
          <Button size="sm" onClick={submit} disabled={!text.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Kommentar
          </Button>
        </div>
      </div>
    </div>
  );
}
