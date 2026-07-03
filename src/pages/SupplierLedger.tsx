import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useScopedNavigate } from "@/hooks/useScopedNavigate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Loader2, Download, Search, ShoppingCart,
  CreditCard, Building, Bell,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgeingAnalysis } from "@/components/reports/AgeingAnalysis";
import { APInsightBar } from "@/components/supplier-ledger/APInsightBar";
import { PaymentSimulator } from "@/components/supplier-ledger/PaymentSimulator";
import { CashProtectionBar } from "@/components/supplier-ledger/CashProtectionBar";
import { SmartAPRow } from "@/components/supplier-ledger/SmartAPRow";
import { APBulkActionBar } from "@/components/supplier-ledger/APBulkActionBar";
import { UploadInvoiceFAB } from "@/components/supplier-ledger/UploadInvoiceFAB";
import { classify, CLASS_META, type APClass } from "@/lib/supplier-ledger/classifyAP";
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import {
  getStoredActiveCompanyId,
  resolvePreferredCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Supplier {
  id: string; name: string; org_number?: string; email?: string;
  phone?: string; bankgiro?: string; payment_terms?: number; is_active?: boolean;
}
interface Invoice {
  id: string; invoice_number: string; invoice_date: string; due_date: string;
  counterparty_name: string; total_amount: number; status: string; attested_at?: string;
}

/* ── Animated counter ── */
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 1200; const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{fmt(display)}{suffix}</>;
};

/* ── KPI Card (white + accent border) ── */
const KPICard = ({ icon: Icon, accent, title, value, interpretation, trend, delay = 0 }: {
  icon: React.ElementType;
  accent: "rose" | "amber" | "emerald" | "cyan" | "slate";
  title: string;
  value: React.ReactNode;
  interpretation?: React.ReactNode;
  trend?: { dir: "up" | "down" | "flat"; label: string; favorable?: boolean };
  delay?: number;
}) => {
  const accentMap = {
    rose: { bar: "bg-rose-500", icon: "text-[#7A1A1A]", iconBg: "bg-[#FCE8E8]" },
    amber: { bar: "bg-amber-500", icon: "text-[#7A5417]", iconBg: "bg-[#FAEEDA]" },
    emerald: { bar: "bg-emerald-500", icon: "text-[#085041]", iconBg: "bg-[#E1F5EE]" },
    cyan: { bar: "bg-[#3b82f6]", icon: "text-[#3b82f6]", iconBg: "bg-[#EFF6FF]" },
    slate: { bar: "bg-slate-400", icon: "text-slate-600", iconBg: "bg-slate-100" },
  }[accent];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentMap.bar}`} />
      <div className="p-5 pl-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className={`h-8 w-8 rounded-lg ${accentMap.iconBg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${accentMap.icon}`} />
          </div>
          {trend && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              trend.favorable === false ? "bg-[#FCE8E8] text-[#7A1A1A]" : trend.favorable ? "bg-[#E1F5EE] text-[#085041]" : "bg-slate-100 text-slate-600"
            }`}>
              {trend.label}
            </span>
          )}
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{title}</p>
        <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value}</div>
        {interpretation && <p className="text-xs text-slate-600">{interpretation}</p>}
      </div>
    </div>
  );
};

/* ── Supplier Avatar ── */
const SupplierAvatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const colors = [
    "from-rose-500 to-pink-500", "from-amber-500 to-orange-500",
    "from-emerald-500 to-teal-500", "from-blue-500 to-[#3b82f6]",
    "from-violet-500 to-indigo-500", "from-fuchsia-500 to-purple-500",
  ];
  return (
    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
};

/* ── Mini Payment Calendar ── */
const PaymentCalendar = ({ invoices }: { invoices: Invoice[] }) => {
  const [month, setMonth] = useState(new Date());
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const startPad = (getDay(start) + 6) % 7; // Monday = 0

  const paymentsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.status === "paid" || inv.status === "cancelled" || inv.status === "credited") return;
      const key = inv.due_date;
      map[key] = (map[key] || 0) + inv.total_amount;
    });
    return map;
  }, [invoices]);

  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-[#1E3A5F]" />
            Betalningskalender
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs font-medium text-muted-foreground w-24 text-center capitalize">{format(month, "MMMM yyyy", { locale: sv })}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map(d => (
            <div key={d} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
            const amount = paymentsByDay[key] || 0;
            const isToday = isSameDay(day, new Date());
            const dotColor = amount > 100000 ? "bg-rose-500" : amount > 50000 ? "bg-amber-500" : amount > 0 ? "bg-blue-400" : "";
            return (
              <TooltipProvider key={key} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`h-8 flex flex-col items-center justify-center rounded-md text-xs transition-colors ${isToday ? "ring-1 ring-primary" : ""} ${amount > 0 ? "bg-muted/40 hover:bg-muted/70 cursor-default" : ""}`}>
                      <span className={`text-[11px] ${isToday ? "font-bold text-foreground" : "text-muted-foreground"}`}>{day.getDate()}</span>
                      {amount > 0 && <span className={`h-1.5 w-1.5 rounded-full ${dotColor} mt-0.5`} />}
                    </div>
                  </TooltipTrigger>
                  {amount > 0 && (
                    <TooltipContent side="top" className="text-xs">
                      <span className="font-mono font-bold">{fmt(amount)} kr</span> förfaller
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" />&lt; 50k</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />50k–100k</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />&gt; 100k</span>
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Status config ── */
const STATUS_BORDER: Record<string, { border: string; bg: string; dot?: boolean }> = {
  draft: { border: "border-l-4 border-l-rose-500", bg: "bg-[#FCE8E8]" },
  sent: { border: "border-l-4 border-l-rose-500", bg: "bg-[#FCE8E8]" },
  attested: { border: "border-l-4 border-l-blue-500", bg: "bg-[#EFF6FF]" },
  paid: { border: "border-l-4 border-l-emerald-500", bg: "bg-[#E1F5EE]" },
  overdue: { border: "border-l-4 border-l-amber-500", bg: "bg-[#FAEEDA]", dot: true },
  cancelled: { border: "border-l-4 border-l-muted-foreground", bg: "bg-muted/10" },
};

const SupplierLedger = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const scopedNavigate = useScopedNavigate();
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierInvoices, setSupplierInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "ledger");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<APClass, boolean>>({
    pay_now: false, pay_soon: false, can_wait: true, strategic_delay: true,
  });
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) loadData(); }, [selectedCompany]);
  useEffect(() => { if (selectedCompany) setStoredActiveCompanyId(selectedCompany); }, [selectedCompany]);

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) {
      setCompanies(data);
      setSelectedCompany(cur => resolvePreferredCompanyId(data, cur, getStoredActiveCompanyId()));
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invRes, supRes, cashRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("company_id", selectedCompany).eq("invoice_type", "incoming").order("due_date", { ascending: false }).limit(500),
        supabase.from("suppliers").select("*").eq("company_id", selectedCompany).order("name"),
        supabase.from("journal_entry_lines").select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, status)")
          .eq("journal_entries.company_id", selectedCompany)
          .eq("journal_entries.status", "approved")
          .in("chart_of_accounts.account_number", ["1910", "1920", "1930"]),
      ]);
      setInvoices(invRes.data || []);
      setSuppliers(supRes.data || []);
      const cashRows = (cashRes.data ?? []) as Array<{ debit?: number | null; credit?: number | null }>;
      if (cashRows.length) {
        const bal = cashRows.reduce((s, r) => s + (Number(r.debit) || 0) - (Number(r.credit) || 0), 0);
        setCashBalance(bal);
      } else {
        setCashBalance(null);
      }
    } catch { toast.error("Kunde inte ladda data"); }
    finally { setIsLoading(false); }
  };

  const openInvoices = useMemo(() =>
    invoices.filter(i => i.status !== "paid" && i.status !== "cancelled" && i.status !== "credited"),
    [invoices]
  );

  const effectiveStatus = (inv: Invoice) => {
    if (inv.status !== "paid" && inv.due_date && differenceInDays(new Date(), parseISO(inv.due_date)) > 0 && inv.status !== "cancelled") return "overdue";
    return inv.status;
  };

  // KPI computations
  const kpis = useMemo(() => {
    const totalAP = openInvoices.reduce((s, i) => s + i.total_amount, 0);
    const now = new Date();
    const within7 = openInvoices.filter(i => {
      const d = differenceInDays(parseISO(i.due_date), now);
      return d >= 0 && d <= 7;
    });
    const dueIn7 = within7.reduce((s, i) => s + i.total_amount, 0);
    const dueIn7Count = within7.length;
    const paidThisMonth = invoices.filter(i => i.status === "paid" && i.attested_at &&
      isSameMonth(parseISO(i.attested_at), now));
    const paidMTD = paidThisMonth.reduce((s, i) => s + i.total_amount, 0);
    const activeSuppliers = new Set(openInvoices.map(i => i.counterparty_name)).size;
    return { totalAP, dueIn7, dueIn7Count, paidMTD, paidCount: paidThisMonth.length, activeSuppliers };
  }, [openInvoices, invoices]);

  const filteredInvoices = useMemo(() => {
    let list = openInvoices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.counterparty_name.toLowerCase().includes(q) || i.invoice_number.toLowerCase().includes(q));
    }
    return list.sort((a, b) => parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime());
  }, [openInvoices, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.org_number || "").includes(q));
  }, [suppliers, searchQuery]);

  const handleAttest = async (invoiceId: string) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { error } = await supabase.from("invoices").update({ status: "attested" as const, attested_by: u.id, attested_at: new Date().toISOString() }).eq("id", invoiceId);
    if (error) { toast.error("Kunde inte attestera"); return; }
    toast.success("Attesterad!");
    loadData();
  };

  const handleOpenDirectPayment = (invoiceId: string) => {
    if (selectedCompany) {
      setStoredActiveCompanyId(selectedCompany);
      scopedNavigate(`/direct-payment?${new URLSearchParams({ companyId: selectedCompany, invoiceId }).toString()}`);
      return;
    }
    scopedNavigate("/direct-payment");
  };

  const handleExport = () => {
    const rows = openInvoices.map(inv => ({
      Leverantör: inv.counterparty_name, Fakturanr: inv.invoice_number,
      Fakturadatum: inv.invoice_date, Förfallodatum: inv.due_date,
      Dagar: differenceInDays(new Date(), parseISO(inv.due_date)),
      Belopp: inv.total_amount, Attesterad: inv.attested_at ? "Ja" : "Nej",
    }));
    const headers = ["Leverantör", "Fakturanr", "Fakturadatum", "Förfallodatum", "Dagar", "Belopp", "Attesterad"];
    const csvRows = rows.map(r => headers.map(h => String((r as Record<string, unknown>)[h] ?? "")).join(";"));
    const csv = [headers.join(";"), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `leverantorsreskontra_${selectedCompany.slice(0, 8)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Exporterad!");
  };

  const openSupplierCard = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    const { data } = await supabase.from("invoices").select("*").eq("company_id", selectedCompany)
      .eq("invoice_type", "incoming").ilike("counterparty_name", `%${supplier.name}%`)
      .order("invoice_date", { ascending: false }).limit(50);
    setSupplierInvoices(data || []);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedTotal = useMemo(() => {
    return openInvoices.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + i.total_amount, 0);
  }, [selectedIds, openInvoices]);

  const getDaysLabel = (inv: Invoice) => {
    const days = differenceInDays(parseISO(inv.due_date), new Date());
    if (inv.status === "paid") return null;
    if (days < 0) return <span className="text-[10px] font-semibold text-[#C73838]">{days} dagar</span>;
    if (days === 0) return <span className="text-[10px] font-semibold text-[#C28A2B]">Idag</span>;
    return <span className="text-[10px] text-muted-foreground">{days}d kvar</span>;
  };

  if (loading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="relative">
      <PageHeader
        icon={ShoppingCart}
        title="Leverantörsreskontra"
        subtitle="Betalningskontroll och kassaskydd"
        actions={
          <div className="flex items-center gap-2">
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1.5" />Exportera</Button>
          </div>
        }
      />
      <main className="px-8 space-y-8 pb-24">

        {/* ── CASH PROTECTION BAR ── */}
        <CashProtectionBar invoices={openInvoices} cashBalance={cashBalance} />

        {/* ── AI INSIGHT + SIMULATOR ── */}
        {openInvoices.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <APInsightBar
                invoices={openInvoices}
                cashBalance={cashBalance}
                onOptimize={(ids) => {
                  setSelectedIds(new Set(ids));
                  toast.success(`${ids.length} kritiska fakturor markerade för optimerad betalning`);
                }}
              />
            </div>
            <PaymentSimulator invoices={openInvoices} cashBalance={cashBalance} />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSearchQuery(""); setSelectedIds(new Set()); }}>
          <TabsList>
            <TabsTrigger value="ledger">Reskontra</TabsTrigger>
            <TabsTrigger value="calendar">Betalningskalender</TabsTrigger>
            <TabsTrigger value="ageing">Åldersanalys</TabsTrigger>
            <TabsTrigger value="suppliers">Leverantörer ({suppliers.length})</TabsTrigger>
          </TabsList>

          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök leverantör, fakturanummer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          {/* ── LEDGER TAB ── */}
          <TabsContent value="ledger" className="mt-4 space-y-8">
            {filteredInvoices.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Inga öppna leverantörsfakturor</p>
            )}
            {(["pay_now", "pay_soon", "can_wait", "strategic_delay"] as APClass[]).map(group => {
              const items = filteredInvoices.filter(inv => classify(inv) === group);
              if (items.length === 0) return null;
              const meta = CLASS_META[group];
              const groupTotal = items.reduce((s, i) => s + i.total_amount, 0);
              const isCollapsed = collapsed[group];
              return (
                <section key={group} className="space-y-2">
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [group]: !c[group] }))}
                    className="w-full flex items-center justify-between gap-3 px-1 group"
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] group-hover:text-[#475569] transition-colors">
                        {meta.label}
                      </h3>
                      <span className="text-[10px] text-[#94A3B8]">· {items.length} fakturor</span>
                      <span className="text-[11px] font-mono font-medium text-[#475569] tabular-nums">{fmt(groupTotal)} kr</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-[#94A3B8] transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-2">
                      {items.map(inv => (
                        <SmartAPRow
                          key={inv.id}
                          invoice={inv}
                          group={group}
                          isSelected={selectedIds.has(inv.id)}
                          cashBalance={cashBalance}
                          companyId={selectedCompany}
                          onToggleSelect={toggleSelect}
                          onSchedule={() => toast.info("Schemalagd för senare betalning")}
                          onDispute={() => toast.info("Faktura markerad som bestridd")}
                          onUpdated={loadData}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </TabsContent>

          {/* ── CALENDAR TAB ── */}
          <TabsContent value="calendar" className="mt-4">
            <PaymentCalendar invoices={invoices} />
          </TabsContent>

          {/* ── AGEING TAB ── */}
          <TabsContent value="ageing" className="mt-4">
            <AgeingAnalysis companyId={selectedCompany} type="AP" />
          </TabsContent>

          {/* ── SUPPLIERS TAB ── */}
          <TabsContent value="suppliers" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leverantör</TableHead>
                  <TableHead>Org.nr</TableHead>
                  <TableHead>Bankgiro</TableHead>
                  <TableHead className="text-right">Utestående</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map(s => {
                  const supInv = openInvoices.filter(i => i.counterparty_name === s.name);
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openSupplierCard(s)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SupplierAvatar name={s.name} />
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.org_number || "—"}</TableCell>
                      <TableCell className="text-sm">{s.bankgiro || "—"}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{fmt(supInv.reduce((sum, i) => sum + i.total_amount, 0))} kr</TableCell>
                      <TableCell>
                        <Badge variant={s.is_active !== false ? "default" : "secondary"}>
                          {s.is_active !== false ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        {/* Supplier sheet */}
        <Sheet open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader><SheetTitle>{selectedSupplier?.name}</SheetTitle></SheetHeader>
            {selectedSupplier && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Org.nr:</span> {selectedSupplier.org_number || "—"}</div>
                  <div><span className="text-muted-foreground">E-post:</span> {selectedSupplier.email || "—"}</div>
                  <div><span className="text-muted-foreground">Bankgiro:</span> {selectedSupplier.bankgiro || "—"}</div>
                  <div><span className="text-muted-foreground">Betalningsvillkor:</span> {selectedSupplier.payment_terms || 30} dagar</div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Fakturahistorik ({supplierInvoices.length})</h4>
                  {supplierInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border text-sm">
                      <div>
                        <span className="font-mono">#{inv.invoice_number}</span>
                        <span className="text-muted-foreground ml-2">{inv.invoice_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{fmt(inv.total_amount)} kr</span>
                        <Badge variant="outline" className="text-xs">{inv.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </main>

      {/* ── BULK ACTION BAR ── */}
      <APBulkActionBar
        invoices={openInvoices}
        selectedIds={selectedIds}
        cashBalance={cashBalance}
        onClear={() => setSelectedIds(new Set())}
        onPay={() => {
          const ids = Array.from(selectedIds);
          if (ids.length === 1) handleOpenDirectPayment(ids[0]);
          else { setStoredActiveCompanyId(selectedCompany); navigate(`/direct-payment?companyId=${selectedCompany}`); }
        }}
        onSchedule={() => navigate(`/direct-payment?companyId=${selectedCompany}&schedule=1`)}
        onOptimize={(next) => {
          setSelectedIds(next);
          toast.success(`Optimerat: ${next.size} kritiska valda, övriga bevarar likviditet`);
        }}
      />

      {/* ── FLOATING UPLOAD FAB ── */}
      <UploadInvoiceFAB />
    </div>
  );
};

export default SupplierLedger;
