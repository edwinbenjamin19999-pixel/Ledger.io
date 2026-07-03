import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Tabs replaced with explicit button switcher (Radix Tabs click handling regressed under sticky layout)
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Users, Download, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgeingAnalysis } from "@/components/reports/AgeingAnalysis";
import { differenceInDays, parseISO, addDays, format } from "date-fns";
import { useSendReminder } from "@/hooks/useInvoiceReminders";


const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Customer { id: string;
  name: string;
  org_number?: string;
  email?: string;
  phone?: string;
  payment_terms?: number;
  is_active?: boolean;
}

interface Invoice { id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  counterparty_name: string;
  total_amount: number;
  status: string;
  paid_at?: string;
}

const CustomerLedger = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTabState] = useState(searchParams.get("tab") || "ledger");
  const setActiveTab = useCallback((value: string) => {
    setActiveTabState(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const sendReminder = useSendReminder();

  const handleSendReminder = async (inv: Invoice) => {
    setRemindingId(inv.id);
    try {
      const reminderNumber = ((inv as any).reminder_count ?? 0) + 1;
      const res = await sendReminder.mutateAsync({ invoiceId: inv.id, reminderNumber });
      toast.success(`Påminnelse skickad till ${res.sent_to}`, {
        description: `Faktura #${inv.invoice_number} · PDF bifogad`,
      });
      loadData();
    } catch (e) {
      // error toast hanteras i hook
    } finally {
      setRemindingId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) loadData(); }, [selectedCompany]);

  const loadCompanies = async () => { const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) { setCompanies(data); setSelectedCompany(data[0].id); }
  };

  const loadData = async () => { setIsLoading(true);
    try { const [invRes, custRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("company_id", selectedCompany).eq("invoice_type", "outgoing").order("due_date", { ascending: false }).limit(500),
        supabase.from("customers").select("*").eq("company_id", selectedCompany).order("name"),
      ]);
      setInvoices(invRes.data || []);
      setCustomers(custRes.data || []);
    } catch { toast.error("Kunde inte ladda data");
    } finally { setIsLoading(false);
    }
  };

  const openInvoices = useMemo(() =>
    invoices.filter(i => i.status !== "paid" && i.status !== "cancelled" && i.status !== "credited"),
    [invoices]
  );

  const agingGroups = useMemo(() => { const today = new Date();
    const groups = { notDue: [] as Invoice[], d1_30: [] as Invoice[], d31_60: [] as Invoice[], d61_90: [] as Invoice[], d90plus: [] as Invoice[] };
    openInvoices.forEach(inv => { const days = differenceInDays(today, parseISO(inv.due_date));
      if (days <= 0) groups.notDue.push(inv);
      else if (days <= 30) groups.d1_30.push(inv);
      else if (days <= 60) groups.d31_60.push(inv);
      else if (days <= 90) groups.d61_90.push(inv);
      else groups.d90plus.push(inv);
    });
    return groups;
  }, [openInvoices]);

  const totalAR = openInvoices.reduce((s, i) => s + i.total_amount, 0);

  const handleExport = () => { const rows = openInvoices.map(inv => ({ Kund: inv.counterparty_name,
      Fakturanr: inv.invoice_number,
      Fakturadatum: inv.invoice_date,
      Förfallodatum: inv.due_date,
      Dagar: differenceInDays(new Date(), parseISO(inv.due_date)),
      Belopp: inv.total_amount,
    }));
    const headers = ["Kund", "Fakturanr", "Fakturadatum", "Förfallodatum", "Dagar", "Belopp"];
    const csvRows = rows.map(r => headers.map(h => String((r as Record<string, unknown>)[h] ?? "")).join(";"));
    const csv = [headers.join(";"), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kundreskontra_${selectedCompany.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exporterad!");
  };

  const openCustomerCard = async (customer: Customer) => { setSelectedCustomer(customer);
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("company_id", selectedCompany)
      .eq("invoice_type", "outgoing")
      .ilike("counterparty_name", `%${customer.name}%`)
      .order("invoice_date", { ascending: false })
      .limit(50);
    setCustomerInvoices(data || []);
  };

  const filteredCustomers = useMemo(() => { if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.org_number || "").includes(q));
  }, [customers, searchQuery]);

  const overdueInvoices = useMemo(
    () => [...agingGroups.d1_30, ...agingGroups.d31_60, ...agingGroups.d61_90, ...agingGroups.d90plus],
    [agingGroups]
  );
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalNotDue = agingGroups.notDue.reduce((s, i) => s + i.total_amount, 0);
  const expectedRecovery = Math.round(totalOverdue * 0.442);

  const selectedInvoiceObjs = useMemo(
    () => openInvoices.filter(i => selectedIds.has(i.id)),
    [openInvoices, selectedIds]
  );
  const selectedSum = selectedInvoiceObjs.reduce((s, i) => s + i.total_amount, 0);

  if (loading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const renderAgingSection = (label: string, items: Invoice[], tone: "neutral" | "warn" | "danger" = "neutral") => (
    items.length > 0 && (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
            {label} · {items.length}
          </span>
          <span className="text-[11px] font-mono font-medium text-[#475569]">
            {fmt(items.reduce((s, i) => s + i.total_amount, 0))} kr
          </span>
        </div>
        {items.map(inv => {
          const overdueDays = differenceInDays(new Date(), parseISO(inv.due_date));
          const isOverdue = overdueDays > 0;
          const expectedInflow = isOverdue
            ? format(addDays(new Date(), 14), "yyyy-MM-dd")
            : inv.due_date;
          const checked = selectedIds.has(inv.id);
          return (
            <div
              key={inv.id}
              className="flex items-center gap-[12px] bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] px-[16px] py-[12px]"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSelected(inv.id)}
                className="w-[14px] h-[14px] rounded-[3px] border-[1.5px] border-[#D1D5DB] accent-[#1D4ED8] cursor-pointer"
                aria-label={`Välj faktura ${inv.invoice_number}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#0F172A] truncate">{inv.counterparty_name}</div>
                <div className="text-[11px] font-mono text-[#64748B]">#{inv.invoice_number}</div>
                {isOverdue ? (
                  <div className="text-[10px] text-[#791F1F] mt-[2px]">Försenad {overdueDays} dagar</div>
                ) : (
                  <div className="text-[10px] text-[#94A3B8] mt-[2px]">Förväntat inflöde {expectedInflow}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[13px] font-mono font-medium text-[#0F172A]">{fmt(inv.total_amount)} kr</div>
                <div className="text-[10px] text-[#94A3B8]">Förfaller {inv.due_date}</div>
              </div>
              <button
                type="button"
                disabled={remindingId === inv.id}
                onClick={() => handleSendReminder(inv)}
                className="text-[11px] font-medium text-[#1D4ED8] hover:text-[#1074A0] px-[8px] disabled:opacity-50 inline-flex items-center gap-1"
              >
                {remindingId === inv.id && <Loader2 className="w-3 h-3 animate-spin" />}
                Påminn
              </button>
            </div>
          );
        })}
      </div>
    )
  );

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Kundreskontra"
        subtitle="Kundregister, reskontra och faktureringsöversikt"
        actions={ <div className="flex items-center gap-2">
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
      <div className="px-8 space-y-5">

      {/* Summary KPIs — TYP 1 / TYP 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[10px]">
        {[
          { label: "Totalt utestående", value: `${fmt(totalAR)} kr`, sub: "Öppna fakturor", valueClass: "text-[#0F172A]", variant: "type1" as const },
          { label: "Ej förfallna", value: `${fmt(totalNotDue)} kr`, sub: "Inom betalningsvillkor", valueClass: "text-[#0F6E56]", variant: "green" as const },
          { label: "Förfallna", value: `${fmt(totalOverdue)} kr`, sub: "Kräver uppföljning", valueClass: "text-[#791F1F]", variant: "red" as const },
          { label: "Kunder", value: String(customers.length), sub: "Aktiva kunder", valueClass: "text-[#0F172A]", variant: "type1" as const },
        ].map((kpi, i) => {
          const styles =
            kpi.variant === "green"
              ? { bg: "bg-[#F2FBF7]", border: "border-[#A7E3C7]", line: "bg-[#1D9E75]" }
              : kpi.variant === "red"
                ? { bg: "bg-[#FFF5F5]", border: "border-[#FBBEBE]", line: "bg-[#E24B4A]" }
                : { bg: "bg-[#FAFBFC]", border: "border-[#DFE4EA]", line: "bg-[#1D4ED8]" };
          return (
            <div key={i} className={`relative overflow-hidden ${styles.bg} border-[0.5px] ${styles.border} rounded-[12px] p-[16px]`}>
              <span aria-hidden className={`absolute top-0 left-0 right-0 h-[1.5px] ${styles.line} rounded-t-[12px]`} />
              <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">{kpi.label}</div>
              <div className={`text-[22px] font-medium tracking-[-0.03em] mt-[6px] tabular-nums ${kpi.valueClass}`}>{kpi.value}</div>
              <div className="text-[10px] text-[#94A3B8] mt-[2px]">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* AI Inkassoanalys */}
      <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] px-[14px] py-[10px] flex items-center gap-[10px]">
        <div className="w-[18px] h-[18px] rounded-full bg-[#1D4ED8] flex items-center justify-center flex-shrink-0">
          <div className="w-[7px] h-[7px] rounded-full bg-[#E6F4FA]" />
        </div>
        <div className="flex flex-col leading-tight flex-1 min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C]">AI-INKASSOANALYS</span>
          <span className="text-[12px] text-[#185FA5]">
            {overdueInvoices.length} förfallna · {fmt(totalOverdue)} kr risk · Förväntad återvinning {fmt(expectedRecovery)} kr
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/invoice-reminders")}
          className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[11px] font-medium px-[12px] h-[32px] transition-colors flex-shrink-0"
        >
          Skicka påminnelser automatiskt
        </button>
      </div>

      <div>
        <div
          role="tablist"
          aria-label="Kundreskontra-vyer"
          className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground gap-1"
        >
          {[
            { value: "ledger", label: "Reskontra (Aging)" },
            { value: "ageing", label: "Åldersanalys" },
            { value: "customers", label: `Kundregister (${customers.length})` },
            { value: "overview", label: "Faktureringsöversikt" },
          ].map(t => {
            const active = activeTab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`tabpanel-${t.value}`}
                id={`tab-${t.value}`}
                data-state={active ? "active" : "inactive"}
                onClick={() => setActiveTab(t.value)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "ledger" && (
          <div role="tabpanel" id="tabpanel-ledger" aria-labelledby="tab-ledger" className="mt-4 space-y-4 pb-24">
            {renderAgingSection("Ej förfallna", agingGroups.notDue, "neutral")}
            {renderAgingSection("1–30 dagar förfallna", agingGroups.d1_30, "warn")}
            {renderAgingSection("31–60 dagar förfallna", agingGroups.d31_60, "warn")}
            {renderAgingSection("61–90 dagar förfallna", agingGroups.d61_90, "danger")}
            {renderAgingSection("Över 90 dagar förfallna", agingGroups.d90plus, "danger")}
            {openInvoices.length === 0 && <p className="text-center text-muted-foreground py-12">Inga öppna fakturor</p>}
          </div>
        )}

        {activeTab === "ageing" && (
          <div role="tabpanel" id="tabpanel-ageing" aria-labelledby="tab-ageing" className="mt-4">
            <AgeingAnalysis companyId={selectedCompany} type="AR" />
          </div>
        )}

        {activeTab === "customers" && (
          <div role="tabpanel" id="tabpanel-customers" aria-labelledby="tab-customers" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök kund..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Inga kunder hittade</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kundnamn</TableHead>
                    <TableHead>Org.nr</TableHead>
                    <TableHead>E-post</TableHead>
                    <TableHead className="text-right">Utestående</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(c => { const custInv = openInvoices.filter(i => i.counterparty_name === c.name);
                    const outstanding = custInv.reduce((s, i) => s + i.total_amount, 0);
                    return (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openCustomerCard(c)}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="font-mono text-sm">{c.org_number || "—"}</TableCell>
                        <TableCell className="text-sm">{c.email || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(outstanding)} kr</TableCell>
                        <TableCell><Badge variant={c.is_active !== false ? "default" : "secondary"}>{c.is_active !== false ? "Aktiv" : "Inaktiv"}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {activeTab === "overview" && (
          <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" className="mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Fakturerat denna månad", val: invoices.filter(i => i.invoice_date >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)).reduce((s, i) => s + i.total_amount, 0) },
                { label: "Totalt utestående", val: totalAR },
                { label: "Förfallet", val: [...agingGroups.d1_30, ...agingGroups.d31_60, ...agingGroups.d61_90, ...agingGroups.d90plus].reduce((s, i) => s + i.total_amount, 0) },
                { label: "Betalt denna månad", val: invoices.filter(i => i.status === "paid" && i.paid_at && i.paid_at >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)).reduce((s, i) => s + i.total_amount, 0) },
              ].map((kpi, i) => (
                <Card key={i}><CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold font-mono">{fmt(kpi.val)} kr</p>
                </CardContent></Card>
              ))}
            </div>
            <Button variant="outline" onClick={() => navigate("/invoices")}>Visa alla fakturor →</Button>
          </div>
        )}
      </div>


      {/* Customer card sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedCustomer?.name}</SheetTitle>
          </SheetHeader>
          {selectedCustomer && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Org.nr:</span> {selectedCustomer.org_number || "—"}</div>
                <div><span className="text-muted-foreground">E-post:</span> {selectedCustomer.email || "—"}</div>
                <div><span className="text-muted-foreground">Telefon:</span> {selectedCustomer.phone || "—"}</div>
                <div><span className="text-muted-foreground">Betalningsvillkor:</span> {selectedCustomer.payment_terms || 30} dagar</div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Fakturahistorik ({customerInvoices.length})</h4>
                {customerInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b text-sm">
                    <div>
                      <span className="font-mono">#{inv.invoice_number}</span>
                      <span className="text-muted-foreground ml-2">{inv.invoice_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{fmt(inv.total_amount)} kr</span>
                      <Badge variant={inv.status === "paid" ? "default" : "outline"} className="text-xs">
                        {inv.status === "paid" ? "Betald" : inv.status === "sent" ? "Skickad" : inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Utestående saldo: </span>
                <span className="font-bold font-mono">{fmt(customerInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.total_amount, 0))} kr</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      </div>

      {/* Sticky bottom action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-[0.5px] border-[#E2E8F0] px-[16px] py-[10px] flex items-center justify-between">
          <div className="text-[12px] text-[#475569]">
            <span className="font-medium">{selectedIds.size} valda</span> · {fmt(selectedSum)} kr
          </div>
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[12px] font-medium text-[#475569] hover:text-[#0F172A] rounded-[8px] px-[12px] h-[32px]"
            >
              Avvisa
            </button>
            <button
              type="button"
              onClick={() => toast.success(`${selectedIds.size} fakturor schemalagda`)}
              className="text-[12px] font-medium text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-[8px] px-[12px] h-[32px]"
            >
              Schemalägg
            </button>
            <button
              type="button"
              onClick={() => navigate("/invoice-reminders")}
              className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[32px] transition-colors"
            >
              Skicka påminnelse
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLedger;
