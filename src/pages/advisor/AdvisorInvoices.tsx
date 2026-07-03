import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmInvoices, type InvoiceStatusGroup } from "@/hooks/useFirmInvoices";
import { Database } from "lucide-react";
import { OrchestrationInfoBanner } from "@/components/advisor/orchestration/OrchestrationInfoBanner";
import { WLDataDebugBar } from "@/components/advisor/wl-ui/WLDataDebugBar";
import { FirmInvoiceAIPanel } from "@/components/advisor/invoices/FirmInvoiceAIPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Search,
  Send,
  ExternalLink,
  Receipt,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const TABS: Array<{ key: InvoiceStatusGroup | "all"; label: string; icon: typeof FileText; tone: string }> = [
  { key: "all", label: "Alla", icon: Receipt, tone: "text-[#0F172A]" },
  { key: "draft", label: "Utkast", icon: FileText, tone: "text-slate-700" },
  { key: "sent", label: "Skickade", icon: Send, tone: "text-[#3b82f6]" },
  { key: "overdue", label: "Förfallna", icon: AlertTriangle, tone: "text-[#7A1A1A]" },
  { key: "paid", label: "Betalda", icon: CheckCircle2, tone: "text-[#085041]" },
];

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: ccy || "SEK", maximumFractionDigits: 0 }).format(n);

const AdvisorInvoices = () => {
  const navigate = useNavigate();
  const { clients, isLoading } = useAdvisorContext();
  const { data: rows = [], isLoading: invoicesLoading } = useFirmInvoices();

  const [activeTab, setActiveTab] = useState<InvoiceStatusGroup | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seeding, setSeeding] = useState(false);
  const queryClient = useQueryClient();

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-firm-demo-data", {
        body: { surface: "invoices" },
      });
      if (error) throw error;
      toast.success(`Skapade ${data?.inserted ?? 0} demofakturor över ${data?.clients ?? 0} klienter`);
      queryClient.invalidateQueries({ queryKey: ["firm-invoices"] });
    } catch (e: any) {
      toast.error("Kunde inte skapa demodata", { description: e.message });
    } finally {
      setSeeding(false);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab !== "all" && r.group !== activeTab) return false;
      if (clientFilter !== "all" && r.company_id !== clientFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.invoice_number?.toLowerCase().includes(q) &&
          !r.counterparty_name?.toLowerCase().includes(q) &&
          !r.client_name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, activeTab, clientFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, draft: 0, sent: 0, overdue: 0, paid: 0 };
    rows.forEach((r) => (c[r.group] = (c[r.group] ?? 0) + 1));
    return c;
  }, [rows]);

  const totalSelected = useMemo(
    () => filtered.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.total_amount, 0),
    [filtered, selected],
  );

  /** Switch active client context, then navigate inside the WL shell. */
  const enterClient = (companyId: string, target: "list" | "create" = "list") => {
    const qs = target === "create" ? "?new=1" : "";
    navigate(`/wl/app/clients/${companyId}/invoices${qs}`);
  };

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkRemind = () => {
    if (selected.size === 0) {
      toast.info("Välj minst en faktura");
      return;
    }
    toast.success(`Påminnelse köad för ${selected.size} fakturor`, {
      description: "AR-agenten skickar via klientens fakturaflöde.",
    });
    setSelected(new Set());
  };

  const bulkEscalate = () => {
    if (selected.size === 0) {
      toast.info("Välj minst en faktura");
      return;
    }
    toast.success(`${selected.size} fakturor eskalerade till reskontra-agent`);
    setSelected(new Set());
  };

  const onAIAction = (kind: "remind_overdue" | "focus_concentration" | "escalate") => {
    if (kind === "remind_overdue") {
      setActiveTab("overdue");
      const ids = rows.filter((r) => r.group === "overdue" && r.reminder_count === 0).map((r) => r.id);
      setSelected(new Set(ids));
      toast.success(`${ids.length} fakturor markerade — klicka "Skicka påminnelser"`);
    } else if (kind === "focus_concentration") {
      const overdue = rows.filter((r) => r.group === "overdue");
      const byClient = new Map<string, number>();
      overdue.forEach((r) => byClient.set(r.company_id, (byClient.get(r.company_id) ?? 0) + r.total_amount));
      const top = [...byClient.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) {
        setClientFilter(top[0]);
        setActiveTab("overdue");
      }
    } else {
      setActiveTab("overdue");
      bulkEscalate();
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
            Byråportal · Kundfakturor
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">
            Kundfakturering
          </h1>
          <p className="text-[#64748B] mt-1.5">
            Samma motor som standard-Ledger.io — orkestrerad över alla {clients.length} klienter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[220px] h-10">
              <SelectValue placeholder="Alla klienter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla klienter ({clients.length})</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={clientFilter === "all"}
            onClick={() => clientFilter !== "all" && enterClient(clientFilter, "create")}
            style={{ background: "hsl(var(--brand-primary))" }}
            className="h-10"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Ny faktura
          </Button>
        </div>
      </div>

      <OrchestrationInfoBanner feature="Kundfakturor" clientTab="invoices" />

      <WLDataDebugBar module="invoices" />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === t.key ? "text-[#0F172A]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
            style={activeTab === t.key ? { borderColor: "hsl(var(--brand-primary))" } : undefined}
          >
            <t.icon className={`h-4 w-4 ${activeTab === t.key ? t.tone : ""}`} />
            {t.label}
            <span className="ml-1 text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Two-column layout: table + AI panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Sök faktura, klient eller motpart…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-white"
              />
            </div>
            {selected.size > 0 && (
              <>
                <Badge variant="secondary" className="h-10 px-3 rounded-lg">
                  {selected.size} valda · {fmt(totalSelected, "SEK")}
                </Badge>
                <Button variant="outline" size="sm" onClick={bulkRemind} className="h-10">
                  <Mail className="h-4 w-4 mr-1.5" />
                  Skicka påminnelser
                </Button>
                <Button variant="outline" size="sm" onClick={bulkEscalate} className="h-10">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Eskalera
                </Button>
              </>
            )}
          </div>

          {/* Table */}
          <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F8FAFC] grid grid-cols-[24px_1fr_1.4fr_120px_110px_120px_90px] gap-3 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
              <span></span>
              <span>Klient</span>
              <span>Faktura · Motpart</span>
              <span className="text-right">Belopp</span>
              <span>Förfallodatum</span>
              <span>Status</span>
              <span></span>
            </div>

            {isLoading || invoicesLoading ? (
              <div className="py-16 text-center text-sm text-[#94A3B8]">Laddar fakturor…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Receipt className="h-10 w-10 text-[#CBD5E1] mx-auto mb-3" />
                <div className="text-sm font-semibold text-[#0F172A]">Inga fakturor här</div>
                <div className="text-xs text-[#94A3B8] mt-1">Justera filter eller skapa en ny faktura.</div>
                {rows.length === 0 && clients.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={seedDemo}
                    disabled={seeding}
                    className="mt-4 border-[#C8DDF5] text-[#3b82f6] hover:bg-[#EFF6FF]"
                  >
                    <Database className="h-3.5 w-3.5 mr-1.5" />
                    {seeding ? "Skapar…" : "Skapa demofakturor"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {filtered.map((r) => {
                  const overdueDays =
                    r.due_date && r.group === "overdue"
                      ? Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000)
                      : 0;
                  return (
                    <div
                      key={r.id}
                      className="px-4 py-3 grid grid-cols-[24px_1fr_1.4fr_120px_110px_120px_90px] gap-3 items-center hover:bg-[#F8FAFC] transition-colors group"
                    >
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#0F172A] truncate">{r.client_name}</div>
                        <button
                          onClick={() => enterClient(r.company_id, "list")}
                          className="text-[11px] text-[#64748B] hover:underline truncate flex items-center gap-1"
                        >
                          Öppna klient <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-[#0F172A] truncate">
                          {r.counterparty_name || "—"}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] truncate">
                          #{r.invoice_number ?? "utkast"} · {r.invoice_date ?? "—"}
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold text-[#0F172A] tabular-nums">
                        {fmt(r.total_amount, r.currency)}
                      </div>
                      <div className="text-xs text-[#64748B] tabular-nums">
                        {r.due_date ?? "—"}
                        {overdueDays > 0 && (
                          <div className="text-[10px] font-bold text-[#7A1A1A]">+{overdueDays}d</div>
                        )}
                      </div>
                      <div>
                        <StatusBadge group={r.group} reminders={r.reminder_count} />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => enterClient(r.company_id, "list")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2"
                      >
                        Öppna →
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI panel */}
        <FirmInvoiceAIPanel rows={rows} onAction={onAIAction} />
      </div>
    </div>
  );
};

function StatusBadge({ group, reminders }: { group: string; reminders: number }) {
  const map: Record<string, { label: string; tone: string; icon: typeof Clock }> = {
    draft: { label: "Utkast", tone: "bg-slate-100 text-slate-700", icon: FileText },
    sent: { label: "Skickad", tone: "bg-[#EFF6FF] text-[#3b82f6]", icon: Send },
    overdue: { label: "Förfallen", tone: "bg-[#FCE8E8] text-[#7A1A1A]", icon: AlertTriangle },
    paid: { label: "Betald", tone: "bg-[#E1F5EE] text-[#085041]", icon: CheckCircle2 },
  };
  const m = map[group] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${m.tone}`}>
      <m.icon className="h-3 w-3" />
      {m.label}
      {reminders > 0 && <span className="opacity-60">· {reminders}p</span>}
    </span>
  );
}

export default AdvisorInvoices;
