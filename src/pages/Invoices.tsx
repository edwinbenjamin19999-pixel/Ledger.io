import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingEmptyState } from "@/components/common/OnboardingEmptyState";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, FileText, Send, Loader2, Pencil, Search, Receipt,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertTriangle, Ban, Mail,
  AlertCircle, PlusCircle, Bell, Download, TrendingUp, TrendingDown, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { SupplierInvoiceForm } from "@/components/invoices/SupplierInvoiceForm";
import { InvoicePreviewDrawer } from "@/components/invoices/InvoicePreviewDrawer";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { EmailInbox } from "@/components/invoices/EmailInbox";
import { InvoicePriorityBar } from "@/components/invoices/InvoicePriorityBar";
import { InvoiceRecommendationsCard } from "@/components/invoices/InvoiceRecommendationsCard";
import { PremiumInvoiceRow } from "@/components/invoices/PremiumInvoiceRow";
import { RevenueHealthBar } from "@/components/invoices/RevenueHealthBar";
import { AutoCollectionCard } from "@/components/invoices/AutoCollectionCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  getStoredActiveCompanyId,
  resolvePreferredCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";
import {
  isOpenInvoice,
  isOverdueInvoice,
  selectOpen,
  selectOverdue,
  sumSigned,
  sumOpen,
  sumOverdue,
  signedAmount,
  isCreditInvoice,
} from "@/lib/ar/outstandingSelectors";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  counterparty_name: string;
  counterparty_org_number?: string;
  peppol_id?: string;
  total_amount: number;
  status: string;
  invoice_type: string;
  paid_at?: string;
  sent_at?: string;
  attested_by?: string;
  attested_at?: string;
  reminder_count?: number;
  last_reminder_sent_at?: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

/* ───────── Animated Counter ───────── */
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 1200;
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

/* ───────── KPI Card (neutral standard) ───────── */
const KPICard = ({
  title, subtitle, value, interpretation, trend, delay = 0,
}: {
  icon?: React.ElementType;
  accent?: "cyan" | "rose" | "emerald" | "amber";
  title: string;
  subtitle: string;
  value: React.ReactNode;
  interpretation?: string;
  trend?: { dir: "up" | "down" | "flat"; label: string; tone: "good" | "bad" | "neutral" };
  delay?: number;
}) => {
  const trendTone =
    trend?.tone === "good" ? "text-[#085041] bg-[#E1F5EE]" :
    trend?.tone === "bad" ? "text-[#7A1F1E] bg-[#FCE8E8]" :
    "text-[#475569] bg-[#F1F5F9]";
  return (
    <div
      className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] flex flex-col gap-[6px] animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
        {subtitle}
      </span>
      <span className="text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A]">
        {value}
      </span>
      <span className="text-[11px] text-[#94A3B8]">{title}</span>
      {trend && (
        <div className={`inline-flex items-center gap-1 mt-px px-[8px] py-px rounded-full text-[10px] font-medium w-fit ${trendTone}`}>
          {trend.dir === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : trend.dir === "down" ? <TrendingDown className="h-2.5 w-2.5" /> : null}
          {trend.label}
        </div>
      )}
      {interpretation && (
        <p className="text-[11px] text-[#94A3B8] leading-relaxed">{interpretation}</p>
      )}
    </div>
  );
};

/* ───────── Customer Initials Avatar ───────── */
const CustomerAvatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const colors = [
    "from-violet-500 to-indigo-500", "from-emerald-500 to-blue-500",
    "from-rose-500 to-pink-500", "from-amber-500 to-orange-500",
    "from-blue-500 to-[#3b82f6]", "from-fuchsia-500 to-purple-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
};

/* ───────── Aging Bar ───────── */
const AgingBar = ({ buckets }: { buckets: { label: string; amount: number; color: string }[] }) => {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-5 rounded-full overflow-hidden">
      {buckets.map((b, i) => {
        const pct = (b.amount / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={i}
            className={`${b.color} transition-all duration-700 relative group`}
            style={{ width: `${pct}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {pct > 15 && <span className="text-[9px] text-white font-bold">{fmt(b.amount)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const STATUS_BORDER: Record<string, { border: string; bg: string; dot?: boolean }> = {
  draft: { border: "border-l-4 border-l-muted-foreground", bg: "bg-muted/10" },
  sent: { border: "border-l-4 border-l-violet-500", bg: "bg-[#F1F5F9]" },
  attested: { border: "border-l-4 border-l-blue-500", bg: "bg-[#EFF6FF]" },
  paid: { border: "border-l-4 border-l-emerald-500", bg: "bg-[#E1F5EE]" },
  overdue: { border: "border-l-4 border-l-rose-500", bg: "bg-[#FCE8E8]", dot: true },
  cancelled: { border: "border-l-4 border-l-muted-foreground", bg: "bg-muted/10" },
  credited: { border: "border-l-4 border-l-purple-500", bg: "bg-[#F1F5F9]" },
  partial: { border: "border-l-4 border-l-amber-500", bg: "bg-[#FAEEDA]" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: "Utkast", icon: Clock, color: "text-muted-foreground" },
  sent: { label: "Obetald", icon: ArrowUpRight, color: "text-[#1E3A5F]" },
  attested: { label: "Attesterad", icon: CheckCircle2, color: "text-[#1E3A5F]" },
  paid: { label: "Betald", icon: CheckCircle2, color: "text-[#1D9E75]" },
  overdue: { label: "Förfallen", icon: AlertTriangle, color: "text-[#C73838]" },
  cancelled: { label: "Annullerad", icon: Ban, color: "text-muted-foreground" },
  credited: { label: "Krediterad", icon: ArrowDownRight, color: "text-[#1E3A5F]" },
};

const Invoices = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "outgoing");
  const [outgoingSegment, setOutgoingSegment] = useState<"all" | "action" | "due_soon" | "overdue" | "paid" | "draft">("all");
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);

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
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error(error.message || "Kunde inte ladda fakturor");
    } finally { setIsLoading(false); }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingInvoice(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice", { body: { invoice_id: invoiceId } });
      if (error) throw error;
      toast.success(data.message || "Faktura skickad och bokförd!");
      loadInvoices();
    } catch (error: any) { toast.error(error.message || "Kunde inte skicka faktura"); }
    finally { setSendingInvoice(null); }
  };

  const handleAttestInvoice = async (invoiceId: string) => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Ej inloggad");
      const { error } = await supabase.from("invoices")
        .update({ status: "attested" as const, attested_by: u.id, attested_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (error) throw error;
      toast.success("Faktura attesterad!");
      loadInvoices();
    } catch (err: any) { toast.error(err.message || "Kunde inte attestera"); }
  };

  const handleMarkAPPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase.from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (error) throw error;
      toast.success("Faktura markerad som betald!");
      loadInvoices();
    } catch (err: any) { toast.error(err.message || "Kunde inte uppdatera status"); }
  };

  // Bulk reminder for all overdue
  const handleBulkRemind = async (invoiceIds: string[]) => {
    if (invoiceIds.length === 0) return;
    setBulkActing(true);
    try {
      const updates = invoiceIds.map(id => {
        const inv = invoices.find(i => i.id === id);
        return supabase.from("invoices").update({
          reminder_count: (inv?.reminder_count ?? 0) + 1,
          last_reminder_sent_at: new Date().toISOString(),
          status: "overdue" as const,
          updated_at: new Date().toISOString(),
        }).eq("id", id);
      });
      await Promise.all(updates);
      toast.success(`${invoiceIds.length} ${invoiceIds.length === 1 ? "påminnelse" : "påminnelser"} markerade som skickade`);
      loadInvoices();
    } catch (err: any) {
      toast.error(err.message || "Kunde inte skicka påminnelser");
    } finally { setBulkActing(false); }
  };

  const handleSingleRemind = (invoiceId: string) => handleBulkRemind([invoiceId]);
  const handleCollections = (invoiceId: string) => {
    toast.info("Eskalering till inkasso — använd kunden i AR-agenten för fullständigt flöde");
  };


  // Effective status (sent + past due = overdue)
  const effectiveStatus = (inv: Invoice) => {
    if (inv.status === "sent" && inv.due_date && differenceInDays(new Date(), parseISO(inv.due_date)) > 0) return "overdue";
    return inv.status;
  };

  // Compute Hero KPIs — uses canonical AR selectors so KPI cards, filter
  // pills and the inkassomotor always agree on "utestående" / "förfallna".
  const heroKPIs = useMemo(() => {
    const dir = activeTab === "outgoing" ? "outgoing" : "incoming";
    const dirInv = invoices.filter(i => i.invoice_type === dir);

    const open = selectOpen(dirInv);
    const overdue = selectOverdue(dirInv);
    const now = new Date();
    const thisMonth = dirInv.filter(i => i.status === "paid" && i.paid_at &&
      new Date(i.paid_at).getMonth() === now.getMonth() && new Date(i.paid_at).getFullYear() === now.getFullYear());

    // DSO: average days between invoice_date and paid_at for paid invoices
    const paidWithDates = dirInv.filter(i => i.status === "paid" && i.paid_at);
    const dso = paidWithDates.length > 0
      ? Math.round(paidWithDates.reduce((s, i) => s + Math.max(0, differenceInDays(parseISO(i.paid_at!), parseISO(i.invoice_date))), 0) / paidWithDates.length)
      : 0;

    return {
      unpaidAmount: sumSigned(open),
      unpaidCount: open.length,
      overdueAmount: sumSigned(overdue),
      overdueCount: overdue.length,
      paidAmount: thisMonth.reduce((s, i) => s + i.total_amount, 0),
      paidCount: thisMonth.length,
      dso,
    };
  }, [invoices, activeTab]);

  // Aging analysis
  const agingData = useMemo(() => {
    const dir = activeTab === "outgoing" ? "outgoing" : "incoming";
    const unpaid = invoices.filter(i => i.invoice_type === dir && ["sent", "draft", "attested"].includes(i.status));

    const customerMap: Record<string, { name: string; buckets: number[] }> = {};
    const now = new Date();
    unpaid.forEach(inv => {
      if (!customerMap[inv.counterparty_name]) {
        customerMap[inv.counterparty_name] = { name: inv.counterparty_name, buckets: [0, 0, 0, 0] };
      }
      const days = Math.max(0, differenceInDays(now, parseISO(inv.due_date)));
      const bucket = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
      customerMap[inv.counterparty_name].buckets[bucket] += inv.total_amount;
    });
    return Object.values(customerMap).sort((a, b) =>
      b.buckets.reduce((s, v) => s + v, 0) - a.buckets.reduce((s, v) => s + v, 0)
    ).slice(0, 8);
  }, [invoices, activeTab]);

  // Customer payment behavior insights (avg days late per counterparty)
  const customerInsights = useMemo(() => {
    const map: Record<string, { totalLate: number; count: number }> = {};
    invoices
      .filter(i => i.invoice_type === "outgoing" && i.status === "paid" && i.paid_at)
      .forEach(i => {
        const late = Math.max(0, differenceInDays(parseISO(i.paid_at!), parseISO(i.due_date)));
        if (!map[i.counterparty_name]) map[i.counterparty_name] = { totalLate: 0, count: 0 };
        map[i.counterparty_name].totalLate += late;
        map[i.counterparty_name].count += 1;
      });
    const out: Record<string, { avgDaysLate: number; count: number }> = {};
    Object.entries(map).forEach(([name, v]) => {
      out[name] = { avgDaysLate: Math.round(v.totalLate / v.count), count: v.count };
    });
    return out;
  }, [invoices]);

  // Trend chips (vs previous 30 days) — outgoing only
  const trends = useMemo(() => {
    const out = invoices.filter(i => i.invoice_type === "outgoing");
    const now = new Date();
    const paidLast30 = out.filter(i => i.status === "paid" && i.paid_at && differenceInDays(now, parseISO(i.paid_at)) <= 30);
    const paidPrev30 = out.filter(i => {
      if (i.status !== "paid" || !i.paid_at) return false;
      const d = differenceInDays(now, parseISO(i.paid_at));
      return d > 30 && d <= 60;
    });
    const sumLast = paidLast30.reduce((s, i) => s + i.total_amount, 0);
    const sumPrev = paidPrev30.reduce((s, i) => s + i.total_amount, 0);
    const paidPct = sumPrev > 0 ? Math.round(((sumLast - sumPrev) / sumPrev) * 100) : 0;

    const overdueNow = out.filter(i => effectiveStatus(i) === "overdue");
    const overdueAmount = overdueNow.reduce((s, i) => s + i.total_amount, 0);
    const wasOverduePaid = paidLast30
      .filter(i => differenceInDays(parseISO(i.paid_at!), parseISO(i.due_date)) > 0)
      .reduce((s, i) => s + i.total_amount, 0);
    const overduePct = wasOverduePaid > 0 ? Math.round(((overdueAmount - wasOverduePaid) / wasOverduePaid) * 100) : 0;

    const dueSoon = out.filter(i => {
      if (!["sent", "attested"].includes(i.status)) return false;
      const d = differenceInDays(parseISO(i.due_date), now);
      return d >= 0 && d <= 2;
    }).length;

    return { paidPct, overduePct, dueSoon, paidLast30Count: paidLast30.length };
  }, [invoices]);



  // Filter & search
  const filteredInvoices = useMemo(() => {
    let list = invoices.filter(i => i.invoice_type === activeTab);
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
  }, [invoices, activeTab, statusFilter, searchQuery]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

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
    const days = differenceInDays(parseISO(invoice.due_date), new Date());
    if (invoice.status === "paid") return null;
    if (days < 0) return <span className="text-[10px] font-semibold text-[#C73838]">{days} dagar</span>;
    if (days === 0) return <span className="text-[10px] font-semibold text-[#C28A2B]">Idag</span>;
    return <span className="text-[10px] text-muted-foreground">{days}d kvar</span>;
  };

  const bucketColors = ["bg-emerald-500", "bg-amber-500", "bg-orange-500", "bg-rose-500"];
  const bucketLabels = ["0-30 dagar", "31-60 dagar", "61-90 dagar", ">90 dagar"];

  return (
    <div className="relative">
      <PageHeader
        title="Kundfakturor"
        subtitle="Skapa, skicka och följ upp fakturor"
        actions={
          <div className="flex items-center gap-2">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setStatusFilter("all"); setSearchQuery(""); }}>
          <div className="border-b-[0.5px] border-[#E2E8F0]">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              {[
                { v: "outgoing", label: `Utgående (${invoices.filter(i => i.invoice_type === "outgoing").length})` },
                { v: "incoming", label: `Inkommande (${invoices.filter(i => i.invoice_type === "incoming").length})` },
                { v: "inbox", label: "E-postinkorg", icon: Mail },
              ].map(t => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="rounded-none bg-transparent px-[14px] h-[36px] text-[12px] text-[#475569] data-[state=active]:text-[#1D4ED8] data-[state=active]:border-b-2 data-[state=active]:border-[#1D4ED8] data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  {t.icon && <t.icon className="h-3.5 w-3.5 mr-1" />}
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── PREMIUM KPI ROW (incoming only) ── */}
          {activeTab !== "outgoing" && activeTab !== "inbox" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            <KPICard
              icon={FileText} accent="cyan"
              title="Totalt utestående" subtitle="Utestående fordringar"
              value={<><AnimatedNumber value={heroKPIs.unpaidAmount} /> kr</>}
              interpretation={`${heroKPIs.unpaidCount} ${heroKPIs.unpaidCount === 1 ? "faktura" : "fakturor"} väntar på betalning`}
              delay={0}
            />
            <KPICard
              icon={AlertCircle} accent="rose"
              title="Kräver åtgärd" subtitle="Förfallna fakturor"
              value={<><AnimatedNumber value={heroKPIs.overdueAmount} /> kr</>}
              trend={activeTab === "outgoing" && trends.overduePct !== 0 ? {
                dir: trends.overduePct > 0 ? "up" : "down",
                label: `${trends.overduePct > 0 ? "+" : ""}${trends.overduePct}% vs förra månaden`,
                tone: trends.overduePct > 0 ? "bad" : "good",
              } : undefined}
              interpretation={
                heroKPIs.overdueCount === 0
                  ? "Inga förfallna fakturor"
                  : trends.overduePct > 0
                  ? `${heroKPIs.overdueCount} förfallna — ökande risk`
                  : `${heroKPIs.overdueCount} förfallna — på rätt väg`
              }
              delay={100}
            />
            <KPICard
              icon={CheckCircle2} accent="emerald"
              title="Inbetalningar MTD" subtitle="Betalda denna månad"
              value={<><AnimatedNumber value={heroKPIs.paidAmount} /> kr</>}
              trend={activeTab === "outgoing" && trends.paidPct !== 0 ? {
                dir: trends.paidPct > 0 ? "up" : "down",
                label: `${trends.paidPct > 0 ? "+" : ""}${trends.paidPct}% vs föreg. 30d`,
                tone: trends.paidPct >= 0 ? "good" : "bad",
              } : undefined}
              interpretation={`${heroKPIs.paidCount} ${heroKPIs.paidCount === 1 ? "faktura" : "fakturor"} betalda`}
              delay={200}
            />
            <KPICard
              icon={Clock}
              accent={heroKPIs.dso < 30 ? "emerald" : heroKPIs.dso <= 60 ? "amber" : "rose"}
              title="Days Sales Outstanding" subtitle="DSO (Betalningstid)"
              value={<>{heroKPIs.dso} dagar</>}
              interpretation={
                activeTab === "outgoing" && trends.dueSoon > 0
                  ? `${trends.dueSoon} ${trends.dueSoon === 1 ? "faktura förfaller" : "fakturor förfaller"} inom 48h`
                  : heroKPIs.dso < 30 ? "Bra betalningstid" : heroKPIs.dso <= 60 ? "Normal betalningstid" : "Lång betalningstid"
              }
              delay={300}
            />
          </div>
          )}

          {/* ── REVENUE HEALTH BAR (outgoing only) ── */}
          {activeTab === "outgoing" && (
            <div className="mt-5">
              <RevenueHealthBar
                invoices={invoices}
                customerInsights={customerInsights}
                effectiveStatus={effectiveStatus}
              />
            </div>
          )}

          {/* Search & filter bar (hidden for outgoing — segmentation tabs replace) */}
          {activeTab !== "outgoing" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök fakturanummer, kund..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["all", "sent", "overdue", "paid", "draft"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  className={`px-[12px] h-[28px] rounded-full text-[11px] font-medium border-[0.5px] transition-colors ${statusFilter === s
                    ? "bg-[#1D4ED8] text-[#E6F4FA] border-[#1D4ED8]"
                    : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFB]"}`}
                >
                  {s === "all" ? "Alla" : s === "sent" ? "Obetalda" : s === "overdue" ? "Förfallna" : s === "paid" ? "Betalda" : "Utkast"}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* ── INVOICE LIST (Outgoing — AR command center) ── */}
          <TabsContent value="outgoing" className="mt-5 space-y-6">
            <OutgoingARView
              invoices={invoices.filter(i => i.invoice_type === "outgoing")}
              effectiveStatus={effectiveStatus}
              customerInsights={customerInsights}
              segment={outgoingSegment}
              onSegmentChange={setOutgoingSegment}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onPreview={setPreviewInvoiceId}
              onRemind={handleSingleRemind}
              onCollections={handleCollections}
              onMarkPaid={handleMarkAPPaid}
              onBulkRemind={handleBulkRemind}
              isBulkActing={bulkActing}
              onCreateNew={() => setShowCreateDialog(true)}
              companyId={selectedCompany}
              onUpdate={loadInvoices}
              onEdit={(inv) => setEditingInvoice(inv)}
            />
          </TabsContent>
          <TabsContent value="incoming" className="mt-4">
            <InvoiceList
              invoices={filteredInvoices} sendingInvoice={null}
              onSend={() => {}} onEdit={() => {}}
              getStatusBadge={getStatusBadge} getDaysLabel={getDaysLabel}
              effectiveStatus={effectiveStatus}
              selectedCompany={selectedCompany} onUpdate={loadInvoices}
              onCreateNew={() => setShowCreateDialog(true)}
              isIncoming onAttest={handleAttestInvoice} onMarkPaid={handleMarkAPPaid}
              onPreview={setPreviewInvoiceId}
            />
          </TabsContent>
          <TabsContent value="inbox" className="mt-4">
            <EmailInbox companyId={selectedCompany} companyName={companies.find(c => c.id === selectedCompany)?.name} />
          </TabsContent>
        </Tabs>

        {/* ── AGING ANALYSIS ── */}
        {agingData.length > 0 && activeTab !== "inbox" && (
          <div className="mt-6">
            <h2 className="text-[14px] font-medium text-[#0F172A] mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#475569]" />
              Åldersanalys — Kundfordringar
            </h2>
            <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
              <div className="p-[14px] space-y-4">
                {/* Legend */}
                <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
                  {bucketLabels.map((l, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={`h-[7px] w-[7px] rounded-full ${bucketColors[i]}`} />
                      {l}
                    </div>
                  ))}
                </div>
                {/* Bars */}
                {agingData.map((customer) => (
                  <div key={customer.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CustomerAvatar name={customer.name} />
                        <span className="text-[12px] font-medium text-[#0F172A]">{customer.name}</span>
                      </div>
                      <span className="text-[12px] tabular-nums text-[#0F172A]">
                        {fmt(customer.buckets.reduce((s, v) => s + v, 0))} kr
                      </span>
                    </div>
                    <AgingBar buckets={customer.buckets.map((amount, i) => ({
                      label: bucketLabels[i], amount, color: bucketColors[i],
                    }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invoice Preview Drawer */}
        <InvoicePreviewDrawer
          open={!!previewInvoiceId}
          onOpenChange={(o) => !o && setPreviewInvoiceId(null)}
          invoiceId={previewInvoiceId || ""}
          companyId={selectedCompany}
        />

        {/* Edit dialog */}
        <Dialog open={!!editingInvoice} onOpenChange={(open) => !open && setEditingInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Redigera faktura {editingInvoice?.invoice_number}</DialogTitle></DialogHeader>
            {editingInvoice && (
              <InvoiceForm
                companyId={selectedCompany}
                editInvoiceId={editingInvoice.id}
                onSuccess={() => { setEditingInvoice(null); loadInvoices(); }}
                onCancel={() => setEditingInvoice(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Create dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{activeTab === "incoming" ? "Registrera leverantörsfaktura" : "Skapa ny faktura"}</DialogTitle></DialogHeader>
            {activeTab === "incoming" ? (
              <SupplierInvoiceForm companyId={selectedCompany} onSuccess={() => { setShowCreateDialog(false); loadInvoices(); }} onCancel={() => setShowCreateDialog(false)} />
            ) : (
              <InvoiceForm companyId={selectedCompany} onSuccess={() => { setShowCreateDialog(false); loadInvoices(); }} onCancel={() => setShowCreateDialog(false)} />
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* ── FLOATING ACTION BUTTON ── */}
      <button
        onClick={() => setShowCreateDialog(true)}
        className="fixed bottom-20 md:bottom-8 right-8 bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] px-[14px] h-[36px] flex items-center gap-2 font-medium text-[12px] z-50 transition-colors"
      >
        <PlusCircle className="h-4 w-4" />
        Ny faktura
      </button>
    </div>
  );
};

/* ───────── Invoice List Component ───────── */
interface InvoiceListProps {
  invoices: Invoice[];
  sendingInvoice: string | null;
  onSend: (id: string) => void;
  onEdit: (invoice: Invoice) => void;
  getStatusBadge: (invoice: Invoice) => React.ReactNode;
  getDaysLabel: (invoice: Invoice) => React.ReactNode;
  effectiveStatus: (invoice: Invoice) => string;
  selectedCompany: string;
  onUpdate: () => void;
  onCreateNew: () => void;
  isIncoming?: boolean;
  onAttest?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  onPreview?: (invoiceId: string) => void;
}

const InvoiceList = ({
  invoices, sendingInvoice, onSend, onEdit,
  getStatusBadge, getDaysLabel, effectiveStatus,
  selectedCompany, onUpdate, onCreateNew, isIncoming,
  onAttest, onMarkPaid, onPreview,
}: InvoiceListProps) => {
  if (invoices.length === 0) {
    return (
      <OnboardingEmptyState
        variant="invoices"
        extraAction={{ label: isIncoming ? "Registrera leverantörsfaktura" : "Skapa faktura", onClick: onCreateNew }}
      />
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
              {/* Avatar */}
              <CustomerAvatar name={invoice.counterparty_name} />

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="font-mono font-semibold text-sm text-primary cursor-pointer hover:underline"
                    onClick={() => onPreview?.(invoice.id)}
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

              {/* Amount */}
              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-foreground tabular-nums">{fmt(invoice.total_amount)} kr</span>
                {invoice.status === "paid" && invoice.paid_at && (
                  <div className="text-[10px] text-[#1D9E75]">Betald {invoice.paid_at.substring(0, 10)}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!isIncoming && invoice.status === "draft" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onEdit(invoice)} className="h-7 text-xs px-2">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="sm" onClick={() => onSend(invoice.id)} disabled={sendingInvoice === invoice.id} className="h-7 text-xs px-2">
                      {sendingInvoice === invoice.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </Button>
                  </>
                )}
                {status === "overdue" && !isIncoming && (
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-[#C28A2B] border-[#F0DDB7] hover:bg-[#FAEEDA]">
                    <Bell className="w-3 h-3 mr-1" />Påminnelse
                  </Button>
                )}
                {isIncoming && invoice.status === "draft" && onAttest && (
                  <Button size="sm" onClick={() => onAttest(invoice.id)} className="h-7 text-xs px-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Attestera
                  </Button>
                )}
                {isIncoming && invoice.status === "attested" && onMarkPaid && (
                  <Button size="sm" variant="outline" onClick={() => onMarkPaid(invoice.id)} title="Markera fakturan som betald" className="h-7 text-xs px-2 text-[#085041] border-[#BFE6D6] hover:bg-[#E1F5EE]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Markera betald
                  </Button>
                )}
                {(status === "sent" || status === "overdue") && (
                  <Button size="sm" variant="outline" onClick={() => onMarkPaid?.(invoice.id)} title="Markera fakturan som betald" className="h-7 text-xs px-2 text-[#085041] border-[#BFE6D6] hover:bg-[#E1F5EE]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Markera betald
                  </Button>
                )}
                <InvoiceActions invoiceId={invoice.id} invoiceNumber={invoice.invoice_number} status={invoice.status} companyId={selectedCompany} invoiceType={invoice.invoice_type} onUpdate={onUpdate} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ───────── Outgoing AR Command Center View ───────── */
type OutgoingSegment = "all" | "action" | "due_soon" | "overdue" | "paid" | "draft";

interface OutgoingARViewProps {
  invoices: Invoice[];
  effectiveStatus: (i: Invoice) => string;
  customerInsights: Record<string, { avgDaysLate: number; count: number }>;
  segment: OutgoingSegment;
  onSegmentChange: (s: OutgoingSegment) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPreview: (id: string) => void;
  onRemind: (id: string) => void;
  onCollections: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onBulkRemind: (ids: string[]) => void;
  isBulkActing: boolean;
  onCreateNew: () => void;
  companyId: string;
  onUpdate: () => void;
  onEdit?: (inv: Invoice) => void;
}

const OutgoingARView = ({
  invoices, effectiveStatus, customerInsights, segment, onSegmentChange,
  searchQuery, onSearchChange,
  onPreview, onRemind, onCollections, onMarkPaid, onBulkRemind, isBulkActing, onCreateNew,
  companyId, onUpdate, onEdit,
}: OutgoingARViewProps) => {
  const today = new Date();

  const segments = useMemo(() => {
    const action: Invoice[] = [];
    const dueSoon: Invoice[] = [];
    const overdue: Invoice[] = [];
    const paid: Invoice[] = [];
    const draft: Invoice[] = [];

    invoices.forEach(inv => {
      if (inv.status === "draft") { draft.push(inv); return; }
      if (inv.status === "paid") {
        if (inv.paid_at && differenceInDays(today, parseISO(inv.paid_at)) <= 30) paid.push(inv);
        return;
      }
      const st = effectiveStatus(inv);
      const days = differenceInDays(parseISO(inv.due_date), today);
      const ins = customerInsights[inv.counterparty_name];
      const isLatePayer = ins && ins.count >= 2 && ins.avgDaysLate > 7;

      if (st === "overdue") {
        overdue.push(inv);
        action.push(inv);
      } else if (days >= 0 && days <= 7) {
        dueSoon.push(inv);
        if (days <= 3 && isLatePayer) action.push(inv);
      }
    });

    return { action, dueSoon, overdue, paid, draft };
  }, [invoices, effectiveStatus, customerInsights]);

  // Canonical "all open" set used by both the segment list and the "Alla"
  // pill — credit invoices are netted by signedAmount, so "Alla" agrees with
  // the KPI "Utestående totalt" and the inkassomotor's risk total.
  const openInvoices = useMemo(() => selectOpen(invoices), [invoices]);

  const list = (
    segment === "all" ? openInvoices :
    segment === "action" ? segments.action :
    segment === "due_soon" ? segments.dueSoon :
    segment === "overdue" ? segments.overdue :
    segment === "paid" ? segments.paid :
    segments.draft
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(i =>
      i.invoice_number.toLowerCase().includes(q) ||
      i.counterparty_name.toLowerCase().includes(q) ||
      String(i.total_amount).includes(q)
    );
  }, [list, searchQuery]);

  const segmentMeta: Record<OutgoingSegment, { label: string; dot: string; tone: "rose" | "amber" | "emerald" | "slate" | "cyan" }> = {
    all: { label: "Alla utestående", dot: "bg-[#3b82f6]", tone: "cyan" },
    action: { label: "Behöver åtgärd", dot: "bg-rose-500", tone: "rose" },
    due_soon: { label: "Förfaller snart", dot: "bg-amber-500", tone: "amber" },
    overdue: { label: "Förfallna", dot: "bg-rose-500", tone: "rose" },
    paid: { label: "Betalda", dot: "bg-emerald-500", tone: "emerald" },
    draft: { label: "Utkast", dot: "bg-slate-400", tone: "slate" },
  };

  const segmentCounts: Record<OutgoingSegment, { count: number; total: number }> = {
    all: { count: openInvoices.length, total: sumSigned(openInvoices) },
    action: { count: segments.action.length, total: sumSigned(segments.action) },
    due_soon: { count: segments.dueSoon.length, total: sumSigned(segments.dueSoon) },
    overdue: { count: segments.overdue.length, total: sumSigned(segments.overdue) },
    paid: { count: segments.paid.length, total: segments.paid.reduce((s, i) => s + i.total_amount, 0) },
    draft: { count: segments.draft.length, total: sumSigned(segments.draft) },
  };

  const accentForSegment: "rose" | "amber" | "emerald" | "slate" = segment === "all" ? "slate" : (segmentMeta[segment].tone as "rose" | "amber" | "emerald" | "slate");

  return (
    <div className="space-y-6">
      {/* Auto-collection card (only if overdue exists) */}
      <AutoCollectionCard
        overdueInvoices={segments.overdue}
        customerInsights={customerInsights}
        onBulkRemind={onBulkRemind}
        isBulkActing={isBulkActing}
      />

      {/* Smart segmentation tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(segmentMeta) as OutgoingSegment[]).map(seg => {
          const active = segment === seg;
          const meta = segmentMeta[seg];
          const counts = segmentCounts[seg];
          return (
            <button
              key={seg}
              onClick={() => onSegmentChange(seg)}
              className={`flex items-center gap-2 px-[12px] h-[30px] rounded-full text-[11px] font-medium border-[0.5px] transition-colors ${
                active
                  ? "bg-[#1D4ED8] text-[#E6F4FA] border-[#1D4ED8]"
                  : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFB]"
              }`}
            >
              <span className={`h-[7px] w-[7px] rounded-full ${meta.dot}`} />
              {meta.label}
              <span className={`text-[10px] font-medium rounded-full px-[6px] py-px ${active ? "bg-white/20 text-[#E6F4FA]" : "bg-[#F1F5F9] text-[#475569]"}`}>
                {counts.count}
              </span>
              {counts.total > 0 && (
                <span className={`text-[10px] tabular-nums ${active ? "text-[#E6F4FA]/80" : "text-[#94A3B8]"}`}>· {fmt(counts.total)} kr</span>
              )}
            </button>
          );
        })}

        {/* Inline search */}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Sök fakturanummer, kund..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-[34px] text-[12px] bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px]"
          />
        </div>
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <PremiumEmptyState segment={segment} onCreateNew={onCreateNew} />
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <PremiumInvoiceRow
              key={inv.id}
              invoice={inv}
              effectiveStatus={effectiveStatus(inv)}
              insight={customerInsights[inv.counterparty_name]}
              reminderCount={inv.reminder_count}
              accent={accentForSegment}
              companyId={companyId}
              onPreview={() => onPreview(inv.id)}
              onRemind={() => onRemind(inv.id)}
              onCollections={() => onCollections(inv.id)}
              onMarkPaid={() => onMarkPaid(inv.id)}
              onUpdate={onUpdate}
              onEdit={onEdit ? () => onEdit(inv) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PremiumEmptyState = ({ segment, onCreateNew }: { segment: OutgoingSegment; onCreateNew: () => void }) => {
  const isPaidLike = segment === "paid";
  const headline =
    segment === "all" ? "Inga fakturor ännu" :
    segment === "action" ? "Inga akuta åtgärder" :
    segment === "due_soon" ? "Inga fakturor förfaller den närmaste veckan" :
    segment === "overdue" ? "Inga förfallna fakturor" :
    segment === "paid" ? "Du är fullt betald" :
    "Inga utkast";
  const sub =
    segment === "all" ? "Skapa din första faktura för att komma igång." :
    segment === "action" ? "Allt är under kontroll just nu." :
    segment === "due_soon" ? "Bra rytm i kassaflödet." :
    segment === "overdue" ? "Inga utestående fordringar att jaga." :
    segment === "paid" ? "Inga utestående fordringar just nu." :
    "Skapa en ny faktura för att komma igång.";
  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] py-16 text-center">
      <div className="rounded-full bg-[#EFF6FF] p-3 inline-flex items-center justify-center mb-4 h-14 w-14">
        <CheckCircle2 className="w-6 h-6 text-[#185FA5]" />
      </div>
      <p className="text-[15px] font-medium tracking-[-0.01em] text-[#0F172A]">{headline}</p>
      <p className="text-[12px] text-[#475569] mt-1">{sub}</p>
      <Button variant="outline" className="mt-5 h-[34px] text-[12px] bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] hover:bg-[#F8FAFB]" size="sm" onClick={onCreateNew}>
        <Plus className="w-3.5 h-3.5 mr-1.5" />Skapa ny faktura
      </Button>
    </div>
  );
};

export default Invoices;
