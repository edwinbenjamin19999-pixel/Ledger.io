import { useEffect, useState, useMemo, useCallback } from "react";
import { AccountingSubNav } from "@/components/accounting/AccountingSubNav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, FileText, Eye, ChevronLeft, ChevronRight, Scale, AlertTriangle,
  Clock, CheckCircle2, ChevronDown, Upload, ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { formatSEK } from "@/lib/formatNumber";
import { pickDefaultCompanyId } from "@/lib/company-selection";

// ── Constants ──
const SERIES_OPTIONS = [
  { code: "all", label: "Alla serier" },
  { code: "F", label: "F – Kundfaktura" },
  { code: "L", label: "L – Leverantörsfaktura" },
  { code: "B", label: "B – Bankverifikation" },
  { code: "LB", label: "LB – Likvidbokföring" },
  { code: "LN", label: "LN – Lönebokföring" },
  { code: "M", label: "M – Manuell bokföring" },
  { code: "IB", label: "IB – Ingående balans" },
  { code: "HB", label: "HB – Huvudboksposter" },
];

const SERIES_COLORS: Record<string, string> = {
  F: "bg-[#EFF6FF] text-[#0C447C] border-[#C8DDF5]",
  L: "bg-[#FAEEDA] text-[#A0570F] border-[#EF9F27]",
  B: "bg-[#E1F5EE] text-[#085041] border-[#5DCAA5]",
  LB: "bg-[#E6F4FA] text-[#1D4ED8] border-[#9CCFE3]",
  LN: "bg-[#F1F0F8] text-[#5B4E84] border-[#C9C5E0]",
  M: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]",
  IB: "bg-[#FAEEDA] text-[#A0570F] border-[#EF9F27]",
  HB: "bg-[#FCE8E8] text-[#791F1F] border-[#E5A8A8]",
};

const FILTER_PILLS = [
  { key: "all", label: "Alla" },
  { key: "missing_attachment", label: "Saknar bilaga" },
  { key: "vat", label: "Moms" },
  { key: "salary", label: "Lön" },
  { key: "customer", label: "Kund" },
];

interface JournalEntry {
  id: string;
  entry_date: string;
  description: string | null;
  journal_number: string | null;
  series_code: string | null;
  status: string;
  created_at: string;
  ai_confidence: number | null;
  lines: {
    id: string;
    debit: number;
    credit: number;
    vat_code: string | null;
    vat_amount: number | null;
    account: { account_number: string; account_name: string } | null;
  }[];
}

const PAGE_SIZE = 25;

// ── KPI Card ──
function KPICard({
  icon: Icon, value, label, subtitle, trend, pulse, idx,
}: {
  gradient?: string;
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  subtitle: string;
  trend?: React.ReactNode;
  pulse?: boolean;
  idx: number;
}) {
  return (
    <div
      className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] flex flex-col gap-[6px] animate-fade-in"
      style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center gap-[8px]">
        <Icon className="h-[14px] w-[14px] text-[#475569]" />
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">{label}</span>
      </div>
      <div className="flex items-center gap-[8px]">
        <p className="text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A] leading-tight">{value}</p>
        {pulse && <span className="h-[7px] w-[7px] rounded-full bg-[#EF9F27]" />}
      </div>
      <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
      {trend && <div className="text-[11px] text-[#475569]">{trend}</div>}
    </div>
  );
}

// ── Main component ──
const Verifications = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryParam = searchParams.get("entry") || searchParams.get("id");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [accounts, setAccounts] = useState<{ number: string; name: string; type: string }[]>([]);
  const [activePill, setActivePill] = useState("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [autoOpenHandled, setAutoOpenHandled] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Honor ?filter=pending coming from notifications/badge clicks
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "pending") setStatusFilter("pending_all");
  }, [searchParams]);

  useEffect(() => {
    if (user) loadCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      loadEntries();
      loadAccounts();
    }
  }, [selectedCompany, page, statusFilter, seriesFilter, accountFilter, dateFrom, dateTo]);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("account_number, account_name, account_type")
      .eq("company_id", selectedCompany)
      .order("account_number")
      .limit(500);
    setAccounts((data || []).map((a: any) => ({ number: a.account_number, name: a.account_name, type: a.account_type })));
  };

  useEffect(() => {
    if (entryParam && selectedCompany && !autoOpenHandled && entries.length > 0) {
      const found = entries.find(e => e.id === entryParam);
      if (found) {
        setSelectedEntry(found);
        setAutoOpenHandled(true);
      } else {
        loadSpecificEntry(entryParam);
        setAutoOpenHandled(true);
      }
    }
  }, [entryParam, selectedCompany, entries, autoOpenHandled]);

  const loadSpecificEntry = async (entryId: string) => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(`
          id, entry_date, description, journal_number, series_code, status, created_at, ai_confidence,
          journal_entry_lines (
            id, debit, credit, vat_code, vat_amount,
            chart_of_accounts (account_number, account_name)
          )
        `)
        .eq("id", entryId)
        .maybeSingle();
      if (error || !data) return;
      const mapped: JournalEntry = {
        ...data,
        lines: (data.journal_entry_lines || []).map((l: any) => ({
          id: l.id, debit: l.debit || 0, credit: l.credit || 0,
          vat_code: l.vat_code, vat_amount: l.vat_amount, account: l.chart_of_accounts,
        })),
      };
      setSelectedEntry(mapped);
    } catch (err) {
      console.error("Could not load specific entry:", err);
    }
  };

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) {
      setCompanies(data);
      setSelectedCompany(pickDefaultCompanyId(data));
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("journal_entries")
        .select(`
          id, entry_date, description, journal_number, series_code, status, created_at, ai_confidence,
          journal_entry_lines (
            id, debit, credit, vat_code, vat_amount,
            chart_of_accounts (account_number, account_name)
          )
        `, { count: "exact" })
        .eq("company_id", selectedCompany)
        .order("entry_date", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter === "pending_all") {
        query = query.in("status", ["draft", "pending_approval"] as any);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      if (seriesFilter !== "all") query = query.eq("series_code", seriesFilter as string);
      if (dateFrom) query = query.gte("entry_date", dateFrom);
      if (dateTo) query = query.lte("entry_date", dateTo);

      const { data, error, count } = await query;
      if (error) throw error;

      const mapped = (data || []).map((e: any) => ({
        ...e,
        lines: (e.journal_entry_lines || []).map((l: any) => ({
          id: l.id, debit: l.debit || 0, credit: l.credit || 0,
          vat_code: l.vat_code, vat_amount: l.vat_amount, account: l.chart_of_accounts,
        })),
      }));
      setEntries(mapped);
      setTotalCount(count || 0);
    } catch {
      toast.error("Kunde inte ladda verifikationer");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering ──
  const filteredEntries = useMemo(() => {
    let result = entries;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.description || "").toLowerCase().includes(q) ||
        (e.journal_number || "").toLowerCase().includes(q) ||
        e.lines.some(l => l.account?.account_number.includes(q) || l.account?.account_name.toLowerCase().includes(q))
      );
    }

    // Account filter (client-side since entries already loaded with lines)
    if (accountFilter !== "all") {
      result = result.filter(e =>
        e.lines.some(l => l.account?.account_number === accountFilter)
      );
    }

    if (activePill === "vat") {
      result = result.filter(e => e.lines.some(l => l.vat_code && l.vat_code !== "none"));
    } else if (activePill === "salary") {
      result = result.filter(e => e.series_code === "LN");
    } else if (activePill === "customer") {
      result = result.filter(e => e.series_code === "F");
    } else if (activePill === "missing_attachment") {
      // Placeholder - we don't have attachment data in query
      result = result;
    }

    return result;
  }, [entries, search, activePill, accountFilter]);

  // ── KPI data ──
  const kpiData = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthEntries = entries.filter(e => {
      const d = new Date(e.entry_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const totalDebit = entries.reduce((s, e) => s + e.lines.reduce((ls, l) => ls + l.debit, 0), 0);
    const totalCredit = entries.reduce((s, e) => s + e.lines.reduce((ls, l) => ls + l.credit, 0), 0);
    const diff = Math.round(Math.abs(totalDebit - totalCredit));
    const isBalanced = diff === 0;

    const missingAttachment = 0; // We don't have attachment data in this query

    const latestEntry = entries[0];
    const latestTime = latestEntry
      ? formatDistanceToNow(new Date(latestEntry.created_at), { addSuffix: true, locale: sv })
      : "—";

    return {
      monthCount: thisMonthEntries.length,
      isBalanced,
      diff,
      missingAttachment,
      latestTime,
    };
  }, [entries]);

  // ── Group by date ──
  const groupedEntries = useMemo(() => {
    const groups: { date: string; label: string; entries: JournalEntry[] }[] = [];
    const map = new Map<string, JournalEntry[]>();

    for (const e of filteredEntries) {
      const key = e.entry_date || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }

    for (const [date, items] of map) {
      const d = new Date(date);
      const label = date !== "unknown"
        ? `${format(d, "EEEE d MMMM yyyy", { locale: sv })} — ${items.length} verifikation${items.length > 1 ? "er" : ""}`
        : `Okänt datum — ${items.length} verifikation${items.length > 1 ? "er" : ""}`;
      groups.push({ date, label, entries: items });
    }
    return groups;
  }, [filteredEntries]);

  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: "Utkast", className: "bg-[#FAEEDA] text-[#A0570F] border-[#EF9F27]" },
      pending_approval: { label: "Väntar", className: "bg-[#EFF6FF] text-[#0C447C] border-[#C8DDF5]" },
      approved: { label: "Godkänd", className: "bg-[#E1F5EE] text-[#085041] border-[#5DCAA5]" },
      rejected: { label: "Avvisad", className: "bg-[#FCE8E8] text-[#791F1F] border-[#E5A8A8]" },
    };
    const c = config[status] || { label: status, className: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]" };
    return <span className={`${c.className} border-[0.5px] rounded-full text-[10px] font-medium px-[8px] py-px`}>{c.label}</span>;
  }, []);

  const getSeriesBadge = useCallback((code: string | null) => {
    if (!code) return <span className="text-[#94A3B8] text-[11px]">—</span>;
    const colorClass = SERIES_COLORS[code] || "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]";
    return <span className={`${colorClass} border-[0.5px] rounded-full font-mono text-[10px] font-medium px-[8px] py-px`}>{code}</span>;
  }, []);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authLoading) return null;

  return (
    <div>
      <PageHeader
        title="Verifikationer"
        subtitle="Bokförda händelser med full revisionsspårning"
      />
      <main className="px-8 space-y-[16px]">
        <AccountingSubNav />

        {/* ── Hero KPI Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[8px]">
          <KPICard
            idx={0}
            icon={FileText}
            value={kpiData.monthCount}
            label="Verifikationer denna månad"
            subtitle="Bokförda händelser"
          />
          <KPICard
            idx={1}
            icon={Scale}
            value={kpiData.isBalanced ? "Balanserat" : `Diff: ${formatSEK(kpiData.diff)}`}
            label="Debet / Kredit balans"
            subtitle="Debet = Kredit kontroll"
          />
          <KPICard
            idx={2}
            icon={AlertTriangle}
            value={kpiData.missingAttachment}
            label="Saknar bilaga"
            subtitle="Verifikationer utan underlag"
            pulse={kpiData.missingAttachment > 0}
          />
          <KPICard
            idx={3}
            icon={Clock}
            value={kpiData.latestTime}
            label="Senaste bokföring"
            subtitle="Senast uppdaterad"
          />
        </div>

        {/* ── Balance Banner ── */}
        {entries.length > 0 && (
          kpiData.isBalanced ? (
            <div className="flex items-center gap-[8px] rounded-[8px] bg-[#E1F5EE] border-[0.5px] border-[#5DCAA5] px-[14px] py-[10px]">
              <CheckCircle2 className="h-[14px] w-[14px] text-[#085041]" />
              <span className="text-[12px] text-[#085041] font-medium">Alla perioder i balans</span>
            </div>
          ) : (
            <div className="flex items-center gap-[8px] rounded-[8px] bg-[#FCE8E8] border-[0.5px] border-[#E5A8A8] px-[14px] py-[10px]">
              <AlertTriangle className="h-[14px] w-[14px] text-[#791F1F]" />
              <span className="text-[12px] text-[#791F1F] font-medium">
                Obalans detekterad — {formatSEK(kpiData.diff)} skillnad
              </span>
            </div>
          )
        )}

        {/* ── Pending approval banner ── */}
        {(() => {
          const pending = entries.filter(
            (e) => e.status === "pending_approval" || e.status === "draft",
          );
          if (pending.length === 0 || ["pending_approval", "draft", "pending_all"].includes(statusFilter)) return null;
          return (
            <div className="flex items-center justify-between gap-[12px] rounded-[8px] bg-[#FAEEDA] border-[0.5px] border-[#EF9F27] px-[14px] py-[10px]">
              <div className="flex items-center gap-[12px]">
                <Clock className="h-[14px] w-[14px] text-[#A0570F] shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-[#0F172A]">
                    {pending.length} verifikation{pending.length === 1 ? "" : "er"} väntar på godkännande
                  </p>
                  <p className="text-[11px] text-[#475569]">
                    AI-bokförda förslag som behöver din bekräftelse innan de bokförs i huvudboken.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setStatusFilter("pending_all"); setPage(0); }}
                className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px]"
              >
                Visa &amp; godkänn
              </button>
            </div>
          );
        })()}

        {/* ── Quick Entry Panel ── */}
        <Collapsible open={quickEntryOpen} onOpenChange={setQuickEntryOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full rounded-ds-btn bg-ds-deep p-3 text-left text-white flex items-center justify-between hover:bg-ds-deep/90 transition-colors">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span className="font-medium text-sm">Snabbregistrering</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${quickEntryOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="rounded-t-none border-t-0">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Datum</label>
                    <Input type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Konto debet</label>
                    <Input placeholder="Ex: 1930" className="h-9 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Konto kredit</label>
                    <Input placeholder="Ex: 3010" className="h-9 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Belopp</label>
                    <Input type="number" placeholder="0" className="h-9 tabular-nums" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Beskrivning</label>
                    <Input placeholder="Beskrivning..." className="h-9" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 rounded-ds-btn border-0.5 border-dashed border-ds-border hover:border-ds-deep/40 transition-colors p-4 text-center cursor-pointer">
                    <Upload className="h-5 w-5 mx-auto text-ds-deep mb-1" />
                    <p className="text-xs text-ds-text-secondary">Dra & släpp bilaga</p>
                  </div>
                  <Button className="bg-ds-deep hover:bg-ds-deep/90 text-white border-0 px-6">
                    Bokför
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Search & Filter Bar ── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              {companies.length > 1 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Företag</label>
                  <Select value={selectedCompany} onValueChange={v => { setSelectedCompany(v); setPage(0); }}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sök</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Beskrivning, ver.nr, konto..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 focus-visible:ring-violet-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Serie</label>
                <Select value={seriesFilter} onValueChange={v => { setSeriesFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERIES_OPTIONS.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla</SelectItem>
                    <SelectItem value="pending_all">Väntande (utkast + väntar)</SelectItem>
                    <SelectItem value="draft">Utkast</SelectItem>
                    <SelectItem value="approved">Godkända</SelectItem>
                    <SelectItem value="pending_approval">Väntar</SelectItem>
                    <SelectItem value="rejected">Avvisade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Exportera SIE4
              </Button>
            </div>

            {/* Account & Date filters row */}
            <div className="flex flex-wrap gap-4 items-end mt-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Konto</label>
                <Select value={accountFilter} onValueChange={v => { setAccountFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Alla konton" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">Alla konton</SelectItem>
                    {accounts.map(a => (
                      <SelectItem key={a.number} value={a.number}>
                        <span className="font-mono text-xs">{a.number}</span> {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Från datum</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(0); }}
                  className="w-40 h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Till datum</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(0); }}
                  className="w-40 h-9"
                />
              </div>
              {(accountFilter !== "all" || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => { setAccountFilter("all"); setDateFrom(""); setDateTo(""); setPage(0); }}
                >
                  Rensa filter
                </Button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex gap-[6px] mt-[12px]">
              {FILTER_PILLS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setActivePill(p.key)}
                  className={`text-[11px] px-[10px] h-[28px] rounded-[8px] font-medium transition-colors border-[0.5px] ${
                    activePill === p.key
                      ? "bg-[#1D4ED8] text-[#E6F4FA] border-[#1D4ED8]"
                      : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFB]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Journal Entries Table (grouped by date) ── */}
        <div className="space-y-[12px]">
          {loading ? (
            <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] py-[40px] text-center text-[12px] text-[#94A3B8]">Laddar...</div>
          ) : groupedEntries.length === 0 ? (
            <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] py-[40px] text-center text-[12px] text-[#94A3B8]">
              <FileText className="w-[24px] h-[24px] mx-auto mb-[8px] opacity-40" />
              Inga verifikationer hittades
            </div>
          ) : (
            groupedEntries.map(group => (
              <div key={group.date}>
                {/* Sticky date header */}
                <div className="sticky top-0 z-10 bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] rounded-[8px] px-[12px] py-[6px] mb-[8px]">
                  <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] capitalize">{group.label}</span>
                </div>

                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[90px]" />
                        <col className="w-[70px]" />
                        <col />
                        <col className="w-[120px]" />
                        <col className="w-[120px]" />
                        <col className="w-[100px]" />
                        <col className="w-[60px]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#F8FAFB]">
                          <th className="text-left px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Ver.nr</th>
                          <th className="text-center px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Serie</th>
                          <th className="text-left px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Beskrivning</th>
                          <th className="text-right px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Debet</th>
                          <th className="text-right px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Kredit</th>
                          <th className="text-center px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Status</th>
                          <th className="text-center px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Visa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map(e => {
                          const totalDebit = e.lines.reduce((s, l) => s + l.debit, 0);
                          const totalCredit = e.lines.reduce((s, l) => s + l.credit, 0);
                          return (
                            <tr
                              key={e.id}
                              className="border-t-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB] transition-colors cursor-pointer"
                              onClick={() => setSelectedEntry(e)}
                            >
                              <td className="px-[10px] py-[8px]">
                                <span className="bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0] rounded-full font-mono text-[10px] font-medium px-[8px] py-px">
                                  {e.journal_number || `#${e.id.slice(0, 6)}`}
                                </span>
                              </td>
                              <td className="px-[10px] py-[8px] text-center">{getSeriesBadge(e.series_code)}</td>
                              <td className="px-[10px] py-[8px] max-w-[300px]">
                                <span className="text-[12px] text-[#0F172A] truncate block">
                                  {e.description || "Ingen beskrivning"}
                                </span>
                              </td>
                              <td className="px-[10px] py-[8px] text-right text-[12px] text-[#0F172A] tabular-nums">
                                {totalDebit > 0 ? formatSEK(totalDebit) : "—"}
                              </td>
                              <td className="px-[10px] py-[8px] text-right text-[12px] text-[#0F172A] tabular-nums">
                                {totalCredit > 0 ? formatSEK(totalCredit) : "—"}
                              </td>
                              <td className="px-[10px] py-[8px] text-center">{getStatusBadge(e.status)}</td>
                              <td className="px-[10px] py-[8px] text-center">
                                <button className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[6px] text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9]">
                                  <Eye className="h-[14px] w-[14px]" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Visar {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} av {totalCount}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Detail Dialog ── */}
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Verifikation {selectedEntry?.journal_number || "—"}
                {selectedEntry?.series_code && getSeriesBadge(selectedEntry.series_code)}
              </DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Datum:</span>{" "}
                    <span className="font-medium">
                      {selectedEntry.entry_date ? format(new Date(selectedEntry.entry_date), "dd MMMM yyyy", { locale: sv }) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {getStatusBadge(selectedEntry.status)}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Beskrivning:</span>{" "}
                    <span className="font-medium">{selectedEntry.description || "Ingen"}</span>
                  </div>
                </div>

                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F8FAFB]">
                        <th className="px-[10px] py-[8px] text-left text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Konto</th>
                        <th className="px-[10px] py-[8px] text-right text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Debet</th>
                        <th className="px-[10px] py-[8px] text-right text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Kredit</th>
                        <th className="px-[10px] py-[8px] text-center text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Moms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntry.lines.map(l => (
                        <tr
                          key={l.id}
                          className="border-t-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB] transition-colors cursor-pointer"
                          onClick={() => {
                            if (l.account?.account_number) {
                              navigate(`/account-analysis?company=${selectedCompany}&account=${l.account.account_number}`);
                            }
                          }}
                        >
                          <td className="px-[10px] py-[8px]">
                            <span className="bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0] rounded-full font-mono text-[10px] font-medium px-[8px] py-px mr-[6px]">
                              {l.account?.account_number}
                            </span>
                            <span className="text-[#475569] text-[11px]">{l.account?.account_name}</span>
                          </td>
                          <td className="px-[10px] py-[8px] text-right text-[12px] text-[#0F172A] tabular-nums">
                            {l.debit > 0 ? formatSEK(l.debit) : ""}
                          </td>
                          <td className="px-[10px] py-[8px] text-right text-[12px] text-[#0F172A] tabular-nums">
                            {l.credit > 0 ? formatSEK(l.credit) : ""}
                          </td>
                          <td className="px-[10px] py-[8px] text-center text-[11px] text-[#475569]">
                            {l.vat_code && l.vat_code !== "none" ? `${l.vat_code}%` : "—"}
                            {l.vat_amount ? ` (${l.vat_amount} kr)` : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-[0.5px] border-[#E2E8F0] bg-[#F8FAFB]">
                        <td className="px-[10px] py-[8px] text-[11px] font-medium text-[#0F172A]">Summa</td>
                        <td className="px-[10px] py-[8px] text-right text-[12px] font-medium text-[#0F172A] tabular-nums">
                          {formatSEK(selectedEntry.lines.reduce((s, l) => s + l.debit, 0))}
                        </td>
                        <td className="px-[10px] py-[8px] text-right text-[12px] font-medium text-[#0F172A] tabular-nums">
                          {formatSEK(selectedEntry.lines.reduce((s, l) => s + l.credit, 0))}
                        </td>
                        <td className="px-[10px] py-[8px]"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-[8px] pt-[8px]">
                  {(selectedEntry.status === "pending_approval" || selectedEntry.status === "draft") && (
                    <>
                      <button
                        className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px] inline-flex items-center gap-[5px]"
                        onClick={async () => {
                          const id = selectedEntry.id;
                          const { data: { user } } = await supabase.auth.getUser();
                          const { error } = await supabase
                            .from("journal_entries")
                            .update({ status: "approved", approved_by: user?.id ?? null } as any)
                            .eq("id", id);
                          if (error) { console.error("approve error", error); toast.error(`Kunde inte godkänna: ${error.message}`); return; }
                          toast.success("Verifikation godkänd och bokförd i huvudboken");
                          setSelectedEntry(null);
                          loadEntries();
                        }}
                      >
                        <CheckCircle2 className="w-[14px] h-[14px]" />
                        Godkänn &amp; bokför
                      </button>
                      <button
                        className="bg-white border-[0.5px] border-[#E5A8A8] text-[#791F1F] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px] hover:bg-[#FFF8F8]"
                        onClick={async () => {
                          const id = selectedEntry.id;
                          const { error } = await supabase
                            .from("journal_entries")
                            .update({ status: "rejected" } as any)
                            .eq("id", id);
                          if (error) { toast.error("Kunde inte avvisa"); return; }
                          toast.success("Verifikation avvisad");
                          setSelectedEntry(null);
                          loadEntries();
                        }}
                      >
                        Avvisa
                      </button>
                    </>
                  )}
                  <button
                    className="bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[12px] px-[14px] h-[34px] hover:bg-[#F8FAFB] inline-flex items-center gap-[5px]"
                    onClick={() => {
                      const firstAccount = selectedEntry.lines[0]?.account?.account_number;
                      if (firstAccount) navigate(`/account-analysis?company=${selectedCompany}&account=${firstAccount}`);
                    }}
                  >
                    <Search className="w-[14px] h-[14px]" />
                    Öppna i kontoanalys
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Verifications;
