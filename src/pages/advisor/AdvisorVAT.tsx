import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Receipt, Search, ExternalLink, AlertTriangle, Sparkles, FileText, Clock, CheckCircle2, Send, Banknote, Plus } from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmVAT, type VATStage } from "@/hooks/useFirmVAT";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WLEmptyState } from "@/components/advisor/wl-ui/WLEmptyState";
import { WLDataDebugBar } from "@/components/advisor/wl-ui/WLDataDebugBar";
import { StartVatPeriodDialog } from "@/components/advisor/actions/WLCreateDialogs";
import { nextLabel, runStageUpdate } from "@/components/advisor/actions/wlStageActions";

const TABS: Array<{ key: VATStage | "all"; label: string; icon: typeof Receipt }> = [
  { key: "all", label: "Alla", icon: Receipt },
  { key: "draft", label: "Utkast", icon: FileText },
  { key: "review", label: "Granskning", icon: FileText },
  { key: "awaiting_client", label: "Väntar klient", icon: Clock },
  { key: "ready", label: "Redo", icon: CheckCircle2 },
  { key: "submitted", label: "Inlämnad", icon: Send },
  { key: "settled", label: "Reglerad", icon: Banknote },
];

const STAGE_META: Record<VATStage, { label: string; tone: string }> = {
  draft: { label: "Utkast", tone: "bg-slate-100 text-slate-700" },
  review: { label: "Granskning", tone: "bg-[#EFF6FF] text-[#3b82f6]" },
  awaiting_client: { label: "Klient", tone: "bg-[#FAEEDA] text-[#7A5417]" },
  ready: { label: "Redo", tone: "bg-[#E1F5EE] text-[#085041]" },
  submitted: { label: "Inlämnad", tone: "bg-[#EFF6FF] text-blue-700" },
  settled: { label: "Reglerad", tone: "bg-[#E1F5EE] text-[#085041]" },
  missing_data: { label: "Saknar data", tone: "bg-[#FCE8E8] text-[#7A1A1A]" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

const AdvisorVAT = () => {
  const navigate = useNavigate();
  const { clients } = useAdvisorContext();
  const { data: rows = [], isLoading } = useFirmVAT();
  const qc = useQueryClient();
  const [tab, setTab] = useState<VATStage | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["firm-vat"] });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.stage !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.client_name.toLowerCase().includes(q) && !r.period_label.includes(q))
          return false;
      }
      return true;
    });
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => (c[r.stage] = (c[r.stage] ?? 0) + 1));
    return c;
  }, [rows]);

  const overdue = rows.filter(
    (r) => r.days_to_due !== null && r.days_to_due < 0 && r.stage !== "submitted" && r.stage !== "settled",
  ).length;
  const totalDue = rows
    .filter((r) => r.stage === "ready" || r.stage === "review")
    .reduce((s, r) => s + r.net_amount, 0);

  const enterClient = (companyId: string) => {
    navigate(`/wl/app/clients/${companyId}/vat`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
            Byråportal · Moms
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">Momsorkestrering</h1>
          <p className="text-[#64748B] mt-1.5">
            Samma momsmotor som standard — orkestrerad över {clients.length} klienter.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Starta momsperiod
        </Button>
      </div>

      

      <WLDataDebugBar module="vat" />

      {/* KPI strip — premium surface with top accent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totalt antal", value: rows.length, sub: `${rows.length} period(er)`, accent: "#0040CC" },
          {
            label: "Försenade",
            value: overdue,
            sub: overdue > 0 ? "kräver omedelbar åtgärd" : "Inga förseningar ✓",
            accent: overdue > 0 ? "#E24B4A" : "#1D9E75",
            valueClass: overdue > 0 ? "text-[#791F1F]" : "text-[#0F172A]",
          },
          { label: "Inlämnade", value: counts.submitted ?? 0, sub: "till Skatteverket", accent: "#1D9E75" },
          { label: "Totalt att betala", value: fmt(totalDue), sub: "ready + review", accent: "#0040CC" },
        ].map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-[12px] bg-[#FAFBFC] p-4"
            style={{ border: "0.5px solid #DFE4EA" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: k.accent }} />
            <div className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] font-semibold">{k.label}</div>
            <div className={`text-[22px] font-medium mt-1.5 tabular-nums ${k.valueClass ?? "text-[#0F172A]"}`}>
              {k.value}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
              tab === t.key ? "text-[#0F172A]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
            style={tab === t.key ? { borderColor: "hsl(var(--brand-primary))" } : undefined}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className="ml-1 text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder="Sök klient eller period…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-[#94A3B8]">Laddar momsperioder…</div>
      ) : filtered.length === 0 ? (
        <WLEmptyState
          icon={Receipt}
          title="Inga momsperioder i portföljen ännu"
          description="Skapa en momsperiod för en klient för att börja arbeta i radarn."
          aiSuggestion={overdue > 0 ? `${overdue} klient(er) har försenad momsinlämning — prioritera dem först.` : undefined}
          primaryAction={{ label: "Starta momsperiod", onClick: () => setCreateOpen(true) }}
          clientChips={clients.slice(0, 12).map((c) => ({
            id: c.id,
            name: c.name,
            onOpen: () => enterClient(c.id),
          }))}
        />
      ) : (
        <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F8FAFC] grid grid-cols-[1fr_180px_120px_140px_140px_90px] gap-3 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
            <span>Klient</span>
            <span>Period</span>
            <span className="text-right">Belopp</span>
            <span>Deadline</span>
            <span>Status / Risk</span>
            <span></span>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="px-4 py-3 grid grid-cols-[1fr_180px_120px_140px_140px_90px] gap-3 items-center hover:bg-[#F8FAFC] transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0F172A] truncate">{r.client_name}</div>
                  {r.risk_reason && (
                    <div className="text-[11px] text-[#7A5417] truncate">· {r.risk_reason}</div>
                  )}
                </div>
                <div className="text-xs text-[#0F172A] tabular-nums">
                  {r.period_start} → {r.period_end}
                  <div className="text-[10px] text-[#94A3B8]">{r.period_type}</div>
                </div>
                <div className="text-right text-sm font-semibold text-[#0F172A] tabular-nums">
                  {fmt(r.net_amount)}
                </div>
                <div className="text-xs text-[#64748B] tabular-nums">
                  {r.due_date ?? "—"}
                  {r.days_to_due !== null && r.days_to_due < 0 && r.stage !== "submitted" && r.stage !== "settled" && (
                    <div className="text-[10px] font-bold text-[#7A1A1A]">+{Math.abs(r.days_to_due)}d sen</div>
                  )}
                  {r.days_to_due !== null && r.days_to_due >= 0 && r.days_to_due < 7 && r.stage !== "submitted" && r.stage !== "settled" && (
                    <div className="text-[10px] font-bold text-[#7A5417]">om {r.days_to_due}d</div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${STAGE_META[r.stage].tone}`}>
                    {STAGE_META[r.stage].label}
                  </span>
                  {r.risk !== "low" && (
                    <span
                      className={`block w-fit px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${
                        r.risk === "high"
                          ? "bg-[#FCE8E8] text-[#7A1A1A] ring-red-200"
                          : "bg-[#FAEEDA] text-[#7A5417] ring-amber-200"
                      }`}
                    >
                      <AlertTriangle className="h-2.5 w-2.5 inline mr-1" />
                      {r.risk === "high" ? "Hög risk" : "Medel"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {(() => {
                    const n = nextLabel("vat", r.stage);
                    return n ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runStageUpdate("vat", r.id, n.next, invalidate)}
                        className="h-7 px-2 text-[11px]"
                      >
                        {n.label}
                      </Button>
                    ) : null;
                  })()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => enterClient(r.company_id)}
                    className="opacity-0 group-hover:opacity-100 h-7 px-2 text-[11px]"
                  >
                    Öppna <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[#C8DDF5] bg-blue-50/40 p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5" />
        <div className="text-xs text-[#3b82f6]">
          <strong>AI-radar:</strong> Filtrera på "Saknar data" eller "Hög risk" för att hitta klienter som behöver akut momsåtgärd.
        </div>
      </div>
      <StartVatPeriodDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default AdvisorVAT;
