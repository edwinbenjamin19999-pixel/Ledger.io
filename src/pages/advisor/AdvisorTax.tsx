import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmTax, type TaxStage, type FirmTaxRow } from "@/hooks/useFirmTax";
import { OrchestrationInfoBanner } from "@/components/advisor/orchestration/OrchestrationInfoBanner";
import { WLDataDebugBar } from "@/components/advisor/wl-ui/WLDataDebugBar";
import { FirmTaxAIPanel } from "@/components/advisor/tax/FirmTaxAIPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewTaxDeclarationDialog } from "@/components/advisor/actions/WLCreateDialogs";
import { nextLabel, runStageUpdate } from "@/components/advisor/actions/wlStageActions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Banknote,
  FileWarning,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

const TABS: Array<{ key: TaxStage | "all"; label: string; icon: typeof Calculator }> = [
  { key: "all", label: "Alla", icon: Calculator },
  { key: "draft", label: "Utkast", icon: FileText },
  { key: "review", label: "Granskning", icon: FileText },
  { key: "awaiting_client", label: "Väntar klient", icon: Clock },
  { key: "ready", label: "Redo", icon: CheckCircle2 },
  { key: "submitted", label: "Inlämnad", icon: Send },
  { key: "settled", label: "Betald", icon: Banknote },
  { key: "missing_data", label: "Saknar underlag", icon: FileWarning },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

const AdvisorTax = () => {
  const navigate = useNavigate();
  const { clients, isLoading } = useAdvisorContext();
  const { data: rows = [], isLoading: taxLoading } = useFirmTax();
  const qc = useQueryClient();
  const invalidateTax = () => qc.invalidateQueries({ queryKey: ["firm-tax"] });
  const [createOpen, setCreateOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TaxStage | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab !== "all" && r.stage !== activeTab) return false;
      if (clientFilter !== "all" && r.company_id !== clientFilter) return false;
      if (riskFilter !== "all" && r.risk !== riskFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.client_name.toLowerCase().includes(q) &&
          !r.declaration_type.toLowerCase().includes(q) &&
          !String(r.tax_year).includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, activeTab, clientFilter, riskFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => (c[r.stage] = (c[r.stage] ?? 0) + 1));
    return c;
  }, [rows]);

  /** Switch active client context, then navigate inside the WL shell. */
  const enterClient = (companyId: string) => {
    navigate(`/wl/app/clients/${companyId}/tax`);
  };

  const requestApproval = (r: FirmTaxRow) => {
    toast.success(`Klientgodkännande begärt — ${r.client_name}`, {
      description: `${r.declaration_type.toUpperCase()} ${r.tax_year} skickad till klientportal för signering.`,
    });
  };

  const onAIAction = (kind: "focus_high_risk" | "focus_missing" | "focus_deadline" | "focus_deviation") => {
    if (kind === "focus_high_risk") {
      setRiskFilter("high");
      setActiveTab("all");
    } else if (kind === "focus_missing") {
      setActiveTab("missing_data");
      setRiskFilter("all");
    } else if (kind === "focus_deadline") {
      setActiveTab("all");
      setRiskFilter("high");
      toast.info("Visar deklarationer med försenad eller akut deadline");
    } else if (kind === "focus_deviation") {
      setRiskFilter("high");
      setActiveTab("all");
      toast.info("Filtrerar på avvikelser mot föregående år");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
            Byråportal · Skatt
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">Skatteorkestrering</h1>
          <p className="text-[#64748B] mt-1.5">
            Samma skattemotor som standard-Cogniq — orkestrerad över alla {clients.length} klienter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla risknivåer</SelectItem>
              <SelectItem value="high">Hög risk</SelectItem>
              <SelectItem value="medium">Medel risk</SelectItem>
              <SelectItem value="low">Låg risk</SelectItem>
            </SelectContent>
          </Select>
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
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Ny skatteberäkning
          </Button>
        </div>
      </div>

      <OrchestrationInfoBanner feature="Skatt" clientTab="tax" />

      <WLDataDebugBar module="tax" />

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
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className="ml-1 text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Sök klient, deklarationstyp eller år…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white"
            />
          </div>

          <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F8FAFC] grid grid-cols-[1fr_120px_120px_120px_120px_120px_90px] gap-3 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
              <span>Klient · Deklaration</span>
              <span>År / Period</span>
              <span className="text-right">Belopp</span>
              <span className="text-right">Δ vs föreg.</span>
              <span>Deadline</span>
              <span>Status / Risk</span>
              <span></span>
            </div>

            {isLoading || taxLoading ? (
              <div className="py-16 text-center text-sm text-[#94A3B8]">Laddar skattedata…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Calculator className="h-10 w-10 text-[#CBD5E1] mx-auto mb-3" />
                <div className="text-sm font-semibold text-[#0F172A]">Inga skattedeklarationer här</div>
                <div className="text-xs text-[#94A3B8] mt-1">Justera filter eller starta en ny beräkning från en klient.</div>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-3 grid grid-cols-[1fr_120px_120px_120px_120px_120px_90px] gap-3 items-center hover:bg-[#F8FAFC] transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#0F172A] truncate">{r.client_name}</div>
                      <div className="text-[11px] text-[#64748B] truncate">
                        {r.declaration_type.toUpperCase()}
                        {r.risk_reason && (
                          <span className="text-[#7A5417] ml-1.5">· {r.risk_reason}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#0F172A] tabular-nums">
                      {r.tax_year}
                      {r.period && <div className="text-[10px] text-[#94A3B8]">{r.period}</div>}
                    </div>
                    <div className="text-right text-sm font-semibold text-[#0F172A] tabular-nums">
                      {fmt(r.amount)}
                    </div>
                    <div className="text-right text-xs tabular-nums">
                      {r.delta_pct !== null ? (
                        <span
                          className={
                            Math.abs(r.delta_pct) > 40
                              ? "text-[#7A1A1A] font-semibold"
                              : "text-[#64748B]"
                          }
                        >
                          {r.delta_pct >= 0 ? "+" : ""}
                          {r.delta_pct.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[#CBD5E1]">—</span>
                      )}
                    </div>
                    <div className="text-xs text-[#64748B] tabular-nums">
                      {r.due_date ?? "—"}
                      {r.days_to_due !== null && r.days_to_due < 0 && r.stage !== "submitted" && r.stage !== "settled" && (
                        <div className="text-[10px] font-bold text-[#7A1A1A]">+{Math.abs(r.days_to_due)}d sen</div>
                      )}
                      {r.days_to_due !== null && r.days_to_due >= 0 && r.days_to_due < 14 && r.stage !== "submitted" && r.stage !== "settled" && (
                        <div className="text-[10px] font-bold text-[#7A5417]">om {r.days_to_due}d</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <StageBadge stage={r.stage} />
                      <RiskBadge risk={r.risk} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {(() => {
                        const n = nextLabel("tax", r.stage);
                        return n ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runStageUpdate("tax", r.id, n.next, invalidateTax)}
                            className="h-7 px-2 text-[11px]"
                          >
                            {n.label}
                          </Button>
                        ) : null;
                      })()}
                      {(r.stage === "review" || r.stage === "ready") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestApproval(r)}
                          className="h-7 px-2 text-[11px]"
                        >
                          Begär godk.
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => enterClient(r.company_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-[11px]"
                      >
                        Öppna <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <FirmTaxAIPanel rows={rows} onAction={onAIAction} />
      </div>
      <NewTaxDeclarationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

function StageBadge({ stage }: { stage: TaxStage }) {
  const map: Record<TaxStage, { label: string; tone: string }> = {
    draft: { label: "Utkast", tone: "bg-slate-100 text-slate-700" },
    review: { label: "Granskning", tone: "bg-[#EFF6FF] text-[#3b82f6]" },
    awaiting_client: { label: "Klient", tone: "bg-[#FAEEDA] text-[#7A5417]" },
    ready: { label: "Redo", tone: "bg-[#E1F5EE] text-[#085041]" },
    submitted: { label: "Inlämnad", tone: "bg-[#EFF6FF] text-blue-700" },
    settled: { label: "Betald", tone: "bg-[#E1F5EE] text-[#085041]" },
    missing_data: { label: "Saknar data", tone: "bg-[#FCE8E8] text-[#7A1A1A]" },
  };
  const m = map[stage];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${m.tone}`}>
      {m.label}
    </span>
  );
}

function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  if (risk === "low") return null;
  const tone =
    risk === "high"
      ? "bg-[#FCE8E8] text-[#7A1A1A] ring-red-200"
      : "bg-[#FAEEDA] text-[#7A5417] ring-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${tone}`}>
      <AlertTriangle className="h-2.5 w-2.5" />
      {risk === "high" ? "Hög risk" : "Medel"}
    </span>
  );
}

export default AdvisorTax;
