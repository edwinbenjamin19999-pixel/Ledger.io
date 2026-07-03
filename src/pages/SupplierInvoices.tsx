import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, FileText, Loader2, Search, CreditCard,
  Clock, CheckCircle2, AlertTriangle, Ban, Mail,
  AlertCircle, PlusCircle, ArrowDownRight, TrendingUp, TrendingDown, Settings as SettingsIcon, ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SupplierInvoiceForm } from "@/components/invoices/SupplierInvoiceForm";
import { InvoicePreviewDrawer } from "@/components/invoices/InvoicePreviewDrawer";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { SupplierInvoiceApprovalActions } from "@/components/invoices/SupplierInvoiceApprovalActions";
import { WorkflowStateBadge } from "@/components/supplier-invoices/WorkflowStateBadge";
import { buildApprovalChain } from "@/hooks/useInvoiceApproval";
import { EmailInbox } from "@/components/invoices/EmailInbox";
import { AgeingAnalysis } from "@/components/reports/AgeingAnalysis";
import { APControlView } from "@/components/supplier-invoices/APControlView";
import { AttestModelSettings, attestModeLabel, loadAttestSettings } from "@/components/supplier-invoices/AttestModelSettings";
import {
  getStoredActiveCompanyId,
  resolvePreferredCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  counterparty_name: string;
  counterparty_org_number?: string;
  total_amount: number;
  status: string;
  invoice_type: string;
  paid_at?: string;
  attested_by?: string;
  attested_at?: string;
  workflow_state?: string;
  approval_step?: number | null;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

/* ───────── Animated Counter ───────── */
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{fmt(display)}{suffix}</>;
};

/* ───────── KPI Card (white surface + accent) ───────── */
const KPICard = ({
  icon: Icon, accent, title, subtitle, value, interpretation, delay = 0,
}: {
  icon: React.ElementType;
  accent: "cyan" | "rose" | "emerald" | "amber";
  title: string;
  subtitle: string;
  value: React.ReactNode;
  interpretation?: string;
  delay?: number;
}) => {
  const accentMap = {
    cyan: "border-l-[#3b82f6] bg-[#EFF6FF] text-[#3b82f6]",
    rose: "border-l-rose-500 bg-[#FCE8E8] text-[#7A1A1A]",
    emerald: "border-l-emerald-500 bg-[#E1F5EE] text-[#085041]",
    amber: "border-l-amber-500 bg-[#FAEEDA] text-[#7A5417]",
  };
  const [borderClass, iconBg, iconColor] = accentMap[accent].split(" ");
  return (
    <div
      className={`relative rounded-2xl bg-white border border-slate-200/70 border-l-[3px] ${borderClass} shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow p-5 animate-fade-in`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span className={`h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
            </span>
            {subtitle}
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 mt-3">{value}</div>
          <div className="text-sm text-slate-500 mt-0.5">{title}</div>
          {interpretation && (
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{interpretation}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const SupplierAvatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const colors = [
    "from-violet-500 to-indigo-500", "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500", "from-amber-500 to-orange-500",
    "from-blue-500 to-[#3b82f6]", "from-fuchsia-500 to-purple-500",
  ];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return (
    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
};

const STATUS_BORDER: Record<string, { border: string; bg: string; dot?: boolean }> = {
  draft: { border: "border-l-4 border-l-muted-foreground", bg: "bg-muted/10" },
  sent: { border: "border-l-4 border-l-violet-500", bg: "bg-[#F1F5F9]" },
  attested: { border: "border-l-4 border-l-blue-500", bg: "bg-[#EFF6FF]" },
  paid: { border: "border-l-4 border-l-emerald-500", bg: "bg-[#E1F5EE]" },
  overdue: { border: "border-l-4 border-l-rose-500", bg: "bg-[#FCE8E8]", dot: true },
  rejected: { border: "border-l-4 border-l-rose-400", bg: "bg-[#FCE8E8]" },
  cancelled: { border: "border-l-4 border-l-muted-foreground", bg: "bg-muted/10" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: "Utkast", icon: Clock, color: "text-muted-foreground" },
  sent: { label: "Obetald", icon: ArrowDownRight, color: "text-violet-500" },
  attested: { label: "Attesterad", icon: CheckCircle2, color: "text-blue-500" },
  paid: { label: "Betald", icon: CheckCircle2, color: "text-[#085041]" },
  overdue: { label: "Förfallen", icon: AlertTriangle, color: "text-[#7A1A1A]" },
  rejected: { label: "Avvisad", icon: Ban, color: "text-[#C73838]" },
  cancelled: { label: "Annullerad", icon: Ban, color: "text-muted-foreground" },
};

const SupplierInvoices = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // "ai-v4" tab is removed — AI now lives embedded in the Review Workspace.
  // Migrate any legacy URL param to the new "list" tab (which now hosts APControlView).
  const initialTab = (() => {
    const t = searchParams.get("tab");
    if (!t || t === "ai-v4") return "list";
    return t;
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [showAttestSettings, setShowAttestSettings] = useState(false);
  const [attestVersion, setAttestVersion] = useState(0);
  const attestLabel = useMemo(
    () => (selectedCompany ? attestModeLabel(loadAttestSettings(selectedCompany)) : ""),
    [selectedCompany, attestVersion],
  );

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) loadInvoices(); }, [selectedCompany]);
  useEffect(() => { if (selectedCompany) setStoredActiveCompanyId(selectedCompany); }, [selectedCompany]);

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) {
      setCompanies(data);
      setSelectedCompany((cur) => resolvePreferredCompanyId(data, cur, getStoredActiveCompanyId()));
    }
  };

  const loadInvoices = async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices").select("*")
        .eq("company_id", selectedCompany)
        .or(
          "invoice_direction.eq.incoming,and(invoice_type.eq.incoming,invoice_direction.eq.outgoing),and(invoice_type.eq.incoming,invoice_direction.is.null)",
        )
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      setInvoices((data as Invoice[]) || []);
    } catch (error: any) {
      toast.error(error.message || "Kunde inte ladda leverantörsfakturor");
    } finally { setIsLoading(false); }
  };

  const handleAttest = async (invoiceId: string) => {
    try {
      const inv = invoices.find(i => i.id === invoiceId);
      if (!inv) throw new Error("Faktura saknas");
      const { useInvoiceApproval, buildApprovalChain } = await import("@/hooks/useInvoiceApproval");
      // Use the same logic as the drawer for consistency (multi-step + 4-eyes)
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Ej inloggad");

      const { requiredSteps, chain } = buildApprovalChain(selectedCompany, inv.total_amount);
      const currentStep = (inv as any).approval_step ?? 0;
      const nextStep = currentStep + 1;
      if (requiredSteps > 1 && (inv as any).attested_by === u.id && currentStep >= 1) {
        throw new Error("Fyra-ögonsprincipen: en annan person måste attestera nästa steg");
      }
      const isFinalStep = nextStep >= requiredSteps;
      const update: Record<string, unknown> = {
        approval_step: nextStep,
        next_approver_email: !isFinalStep ? chain[nextStep]?.email ?? null : null,
      };
      if (isFinalStep) {
        update.status = "attested";
        update.attested_by = u.id;
        update.attested_at = new Date().toISOString();
      } else if (currentStep === 0) {
        update.attested_by = u.id;
      }

      const { error } = await supabase.from("invoices").update(update).eq("id", invoiceId);
      if (error) throw error;
      toast.success(isFinalStep ? "Faktura attesterad!" : `Steg ${nextStep}/${requiredSteps} klart`);
      loadInvoices();
    } catch (err: any) { toast.error(err.message || "Kunde inte attestera"); }
  };

  const effectiveStatus = (inv: Invoice) => {
    if (inv.status === "sent" && inv.due_date && differenceInDays(new Date(), parseISO(inv.due_date)) > 0) return "overdue";
    return inv.status;
  };

  const heroKPIs = useMemo(() => {
    const unpaid = invoices.filter(i => ["sent", "draft", "attested"].includes(i.status));
    const overdue = invoices.filter(i => effectiveStatus(i) === "overdue");
    const now = new Date();
    const thisMonth = invoices.filter(i => i.status === "paid" && i.paid_at &&
      new Date(i.paid_at).getMonth() === now.getMonth() && new Date(i.paid_at).getFullYear() === now.getFullYear());

    // DPO: average days between invoice_date and paid_at
    const paidWithDates = invoices.filter(i => i.status === "paid" && i.paid_at);
    const dpo = paidWithDates.length > 0
      ? Math.round(paidWithDates.reduce((s, i) => s + Math.max(0, differenceInDays(parseISO(i.paid_at!), parseISO(i.invoice_date))), 0) / paidWithDates.length)
      : 0;

    return {
      unpaidAmount: unpaid.reduce((s, i) => s + i.total_amount, 0),
      unpaidCount: unpaid.length,
      overdueAmount: overdue.reduce((s, i) => s + i.total_amount, 0),
      overdueCount: overdue.length,
      paidAmount: thisMonth.reduce((s, i) => s + i.total_amount, 0),
      paidCount: thisMonth.length,
      dpo,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "all") list = list.filter(i => effectiveStatus(i) === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.counterparty_name.toLowerCase().includes(q) ||
        String(i.total_amount).includes(q)
      );
    }
    return list;
  }, [invoices, statusFilter, searchQuery]);

  const getStatusBadge = (invoice: Invoice) => {
    const status = effectiveStatus(invoice);
    const cfg = STATUS_CONFIG[status] || { label: status, icon: FileText, color: "" };
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`${cfg.color} border-current/30 gap-1`}>
        {status === "overdue" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  const getDaysLabel = (invoice: Invoice) => {
    if (invoice.status === "paid") return null;
    const days = differenceInDays(parseISO(invoice.due_date), new Date());
    if (days < 0) return <span className="text-[10px] font-semibold text-[#7A1A1A]">{days} dagar</span>;
    if (days === 0) return <span className="text-[10px] font-semibold text-[#7A5417]">Idag</span>;
    return <span className="text-[10px] text-muted-foreground">{days}d kvar</span>;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="relative">
      <PageHeader
        icon={CreditCard}
        title="Leverantörsfakturor"
        subtitle="Hantera, attestera och betala inkommande fakturor"
        actions={
          <div className="flex items-center gap-2">
            {selectedCompany && (
              <button
                onClick={() => setShowAttestSettings(true)}
                className="hidden sm:inline-flex items-center gap-[6px] bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[11px] text-[#475569] px-[10px] h-[32px] hover:bg-[#F8FAFB] transition-colors"
                title="Ändra attestmodell"
              >
                <ShieldCheck className="h-3 w-3" strokeWidth={1.8} />
                Attestmodell: {attestLabel}
                <SettingsIcon className="h-3 w-3 opacity-60" />
              </button>
            )}
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Välj bolag" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />
      <main className="px-8 space-y-6 pb-24">

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            setStatusFilter("all");
            setSearchQuery("");
            const next = new URLSearchParams(searchParams);
            if (v === "list") next.delete("tab"); else next.set("tab", v);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList className="bg-transparent p-0 h-auto border-b-[0.5px] border-[#E2E8F0] rounded-none w-full justify-start gap-0">
            <TabsTrigger
              value="list"
              className="px-[14px] py-[8px] text-[12px] text-[#475569] border-b-2 border-transparent -mb-px rounded-none data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none hover:text-[#0F172A] transition-colors"
            >
              Inkommande
            </TabsTrigger>
            <TabsTrigger
              value="ageing"
              className="px-[14px] py-[8px] text-[12px] text-[#475569] border-b-2 border-transparent -mb-px rounded-none data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none hover:text-[#0F172A] transition-colors flex items-center gap-[5px]"
            >
              <TrendingUp className="h-3 w-3" strokeWidth={1.8} />Åldersanalys
            </TabsTrigger>
            <TabsTrigger
              value="inbox"
              className="px-[14px] py-[8px] text-[12px] text-[#475569] border-b-2 border-transparent -mb-px rounded-none data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none hover:text-[#0F172A] transition-colors flex items-center gap-[5px]"
            >
              <Mail className="h-3 w-3" strokeWidth={1.8} />E-postinkorg
            </TabsTrigger>
          </TabsList>

          {/*
            KPI cards, search and filter chips for the invoice list now live INSIDE
            APControlView → APInvoiceList. They read from the same useAPInvoices()
            source as the list itself, so KPI · filter · list always stay in sync.
            (Removed duplicated page-level KPI row + filter chips that conflicted.)
          */}

          <TabsContent value="list" className="mt-4">
            {selectedCompany ? (
              <APControlView companyId={selectedCompany} />
            ) : (
              <div className="text-sm text-muted-foreground p-6">Välj ett bolag för att se fakturor.</div>
            )}
          </TabsContent>

          <TabsContent value="ageing" className="mt-4">
            {selectedCompany && (
              <AgeingAnalysis companyId={selectedCompany} type="AP" />
            )}
          </TabsContent>

          <TabsContent value="inbox" className="mt-4">
            <EmailInbox companyId={selectedCompany} companyName={companies.find(c => c.id === selectedCompany)?.name} />
          </TabsContent>
        </Tabs>

        <InvoicePreviewDrawer
          open={!!previewInvoiceId}
          onOpenChange={(o) => !o && setPreviewInvoiceId(null)}
          invoiceId={previewInvoiceId || ""}
          companyId={selectedCompany}
        />

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrera leverantörsfaktura</DialogTitle></DialogHeader>
            <SupplierInvoiceForm
              companyId={selectedCompany}
              onSuccess={() => { setShowCreateDialog(false); loadInvoices(); }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {selectedCompany && (
          <AttestModelSettings
            companyId={selectedCompany}
            open={showAttestSettings}
            onOpenChange={setShowAttestSettings}
            onSaved={() => setAttestVersion((v) => v + 1)}
          />
        )}
      </main>

      <button
        onClick={() => setShowCreateDialog(true)}
        className="fixed bottom-20 md:bottom-8 right-8 bg-[#0B4F6C] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[36px] transition-colors flex items-center gap-[6px] z-50"
      >
        <PlusCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
        Registrera faktura
      </button>
    </div>
  );
};

interface ListProps {
  invoices: Invoice[];
  getStatusBadge: (invoice: Invoice) => React.ReactNode;
  getDaysLabel: (invoice: Invoice) => React.ReactNode;
  effectiveStatus: (invoice: Invoice) => string;
  selectedCompany: string;
  onUpdate: () => void;
  onCreateNew: () => void;
  onAttest: (id: string) => void;
  onPreview: (invoiceId: string) => void;
}

const SupplierInvoiceList = ({
  invoices, getStatusBadge, getDaysLabel, effectiveStatus,
  selectedCompany, onUpdate, onCreateNew, onAttest, onPreview,
}: ListProps) => {
  if (invoices.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="h-[3px] bg-[#3b82f6]" />
        <CardContent className="py-16 text-center">
          <div className="rounded-2xl bg-[#EFF6FF] dark:bg-cyan-900/30 p-3 inline-block mb-4">
            <FileText className="w-12 h-12 text-[#3b82f6] dark:text-[#3b82f6]" />
          </div>
          <p className="text-slate-500 font-medium">
            Inga leverantörsfakturor matchar filtret
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" size="sm" onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-1.5" />Registrera leverantörsfaktura
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {invoices.map((invoice) => {
        const status = effectiveStatus(invoice);
        const borderStyle = STATUS_BORDER[status] || STATUS_BORDER.draft;
        return (
          <div
            key={invoice.id}
            className={`rounded-xl ${borderStyle.border} ${borderStyle.bg} p-4 hover:bg-muted/20 transition-colors`}
          >
            <div className="flex items-center gap-4">
              <SupplierAvatar name={invoice.counterparty_name} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="font-mono font-semibold text-sm text-primary cursor-pointer hover:underline"
                    onClick={() => onPreview(invoice.id)}
                  >
                    {invoice.invoice_number}
                  </span>
                  {getStatusBadge(invoice)}
                  {borderStyle.dot && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
                </div>
                <p className="text-sm text-foreground truncate">{invoice.counterparty_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">{invoice.invoice_date}</span>
                  <span className="text-xs text-muted-foreground/50">→</span>
                  <span className="text-xs text-muted-foreground">{invoice.due_date}</span>
                  {getDaysLabel(invoice)}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-foreground tabular-nums">{fmt(invoice.total_amount)} kr</span>
                {invoice.status === "paid" && invoice.paid_at && (
                  <div className="text-[10px] text-[#085041]">Betald {invoice.paid_at.substring(0, 10)}</div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {selectedCompany && (
                  <WorkflowStateBadge
                    state={
                      invoice.workflow_state ??
                      (invoice.status === "paid"
                        ? "PAID"
                        : invoice.status === "attested"
                          ? "APPROVED_FOR_PAYMENT"
                          : invoice.status === "rejected" || invoice.status === "cancelled"
                            ? "REJECTED"
                            : (invoice.approval_step ?? 0) > 0
                              ? "IN_APPROVAL_FLOW"
                              : "INVOICE_LOGGED")
                    }
                    approvalStep={invoice.approval_step ?? 0}
                    requiredSteps={
                      buildApprovalChain(selectedCompany, invoice.total_amount).requiredSteps
                    }
                  />
                )}
                {selectedCompany && (
                  <SupplierInvoiceApprovalActions
                    invoice={invoice as any}
                    companyId={selectedCompany}
                    onUpdated={onUpdate}
                  />
                )}
                {selectedCompany && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <InvoiceActions
                      invoiceId={invoice.id}
                      invoiceNumber={invoice.invoice_number}
                      status={invoice.status}
                      companyId={selectedCompany}
                      invoiceType={invoice.invoice_type}
                      onUpdate={onUpdate}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SupplierInvoices;
