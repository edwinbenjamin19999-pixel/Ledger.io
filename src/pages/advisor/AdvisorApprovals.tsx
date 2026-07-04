import { useFirmApprovalQueue } from "@/hooks/useFirmApprovalQueue";
import { useFirmApprovalHistory } from "@/hooks/useFirmApprovalHistory";
import { useApprovalAnomalies } from "@/hooks/useApprovalAnomalies";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useNavigate } from "react-router-dom";
import { useScopedNavigate } from "@/hooks/useScopedNavigate";
import { CheckSquare, Filter, ShieldCheck, AlertTriangle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AnomalyAlertBar } from "@/components/advisor/approvals/AnomalyAlertBar";
import { SendReminderButton } from "@/components/advisor/approvals/SendReminderButton";
import { RequestSigningDialog } from "@/components/advisor/approvals/RequestSigningDialog";
import { ApprovalTimeline } from "@/components/advisor/approvals/ApprovalTimeline";
import { NewApprovalRequestDialog } from "@/components/advisor/actions/WLCreateDialogs";

const CARD_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(15,23,42,0.06)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
};

const ENTITY_LABEL: Record<string, string> = {
  vat_declaration: "Momsdeklaration",
  payroll_run: "Lönekörning",
  agi_submission: "AGI",
  income_tax_declaration: "INK2",
  payment: "Utbetalning",
  invoice: "Faktura",
  journal_entry: "Verifikation",
  annual_report: "Årsredovisning",
  financial_report: "Finansiell rapport",
};

const ENTITY_ROUTE: Record<string, string> = {
  vat_declaration: "/moms",
  payroll_run: "/hr",
  agi_submission: "/agi",
  income_tax_declaration: "/tax-calculation",
  payment: "/direct-payment",
  invoice: "/invoices",
  journal_entry: "/verifikationer",
  annual_report: "/annual-report",
  financial_report: "/financial-analysis",
};

type Tab = "pending" | "timeline" | "signed" | "rejected";

const AdvisorApprovals = () => {
  const { data: items = [], isLoading } = useFirmApprovalQueue();
  const { data: history = [] } = useFirmApprovalHistory(150);
  const anomalies = useApprovalAnomalies(items);
  const { setActiveClient } = useAdvisorActiveClient();
  const navigate = useNavigate();
  const scopedNavigate = useScopedNavigate();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tab, setTab] = useState<Tab>("pending");
  const [signingFor, setSigningFor] = useState<typeof items[number] | null>(null);
  const [newApprovalOpen, setNewApprovalOpen] = useState(false);

  const types = useMemo(
    () => Array.from(new Set(items.map((i) => i.entity_type))),
    [items],
  );

  const filtered = items.filter((i) => typeFilter === "all" || i.entity_type === typeFilter);
  const signed = useMemo(
    () => history.filter((h) => h.status === "approved" || h.status === "signed"),
    [history],
  );
  const rejected = useMemo(() => history.filter((h) => h.status === "rejected"), [history]);
  const anomalyMap = useMemo(() => new Map(anomalies.map((a) => [a.requestId, a])), [anomalies]);

  const handleReview = (item: typeof items[number]) => {
    setActiveClient({ id: item.company_id, name: item.company_name });
    scopedNavigate(ENTITY_ROUTE[item.entity_type] ?? "/dashboard");
  };

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "pending", label: "Väntande", count: items.length },
    { key: "timeline", label: "Tidslinje", count: history.length },
    { key: "signed", label: "Signerade", count: signed.length },
    { key: "rejected", label: "Avvisade", count: rejected.length },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
            Godkännanden
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">
            Klientgodkännanden & BankID
          </h1>
          <p className="text-[#64748B] mt-1.5">
            {items.length} väntande · {signed.length} signerade · {rejected.length} avvisade
          </p>
        </div>
        <button
          onClick={() => setNewApprovalOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 h-9"
          style={{ background: "hsl(var(--brand-primary))" }}
        >
          <Plus className="h-4 w-4" />
          Begär godkännande
        </button>
      </div>

      <NewApprovalRequestDialog open={newApprovalOpen} onOpenChange={setNewApprovalOpen} />

      <AnomalyAlertBar anomalies={anomalies} />

      <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-current text-[#0F172A]"
                : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
            style={tab === t.key ? { borderColor: "hsl(var(--brand-primary))" } : undefined}
          >
            {t.label}
            <span className="ml-1.5 text-[11px] font-bold tabular-nums text-[#94A3B8]">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <>
          {types.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-[#94A3B8]" />
              {[
                { v: "all", label: "Alla" },
                ...types.map((t) => ({ v: t, label: ENTITY_LABEL[t] ?? t })),
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTypeFilter(t.v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    typeFilter === t.v
                      ? "text-white"
                      : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                  style={typeFilter === t.v ? { background: "hsl(var(--brand-primary))" } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-3xl overflow-hidden" style={CARD_STYLE}>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-[#94A3B8]">Laddar…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <div
                  className="h-12 w-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "hsl(var(--brand-primary) / 0.1)" }}
                >
                  <CheckSquare className="h-5 w-5" style={{ color: "hsl(var(--brand-primary))" }} />
                </div>
                <p className="text-sm text-[#64748B]">Inga väntande godkännanden.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                <div className="px-6 py-3 bg-[#F8FAFC] grid grid-cols-[1fr_auto_auto] gap-4 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
                  <span>Klient · Typ</span>
                  <span>Status</span>
                  <span>Åtgärd</span>
                </div>
                {filtered.map((item) => {
                  const ageColor =
                    item.ageDays > 7 ? "text-[#7A1A1A]" : item.ageDays > 3 ? "text-[#7A5417]" : "text-[#64748B]";
                  const anomaly = anomalyMap.get(item.id);
                  return (
                    <div key={item.id} className="px-6 py-4 grid grid-cols-[1fr_auto_auto] items-center gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#0F172A] truncate flex items-center gap-2">
                          {item.company_name}
                          {anomaly && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                                anomaly.severity === "critical"
                                  ? "bg-[#FCE8E8] text-[#7A1A1A]"
                                  : "bg-[#FAEEDA] text-[#7A5417]"
                              }`}
                              title={anomaly.detail}
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              AI: {anomaly.detail}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#94A3B8] mt-0.5">
                          {ENTITY_LABEL[item.entity_type] ?? item.entity_type}
                          <span className={`ml-2 font-semibold tabular-nums ${ageColor}`}>
                            · {item.ageDays} d gammal
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[#FAEEDA] text-[#7A5417] ring-1 ring-amber-200">
                        Pending
                      </span>
                      <div className="flex items-center gap-2">
                        <SendReminderButton
                          companyId={item.company_id}
                          companyName={item.company_name}
                          entityType={item.entity_type}
                          requestId={item.id}
                        />
                        <button
                          onClick={() => handleReview(item)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                        >
                          Granska
                        </button>
                        <button
                          onClick={() => setSigningFor(item)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
                          style={{ background: "hsl(var(--brand-primary))" }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Signera
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "timeline" && (
        <div className="rounded-3xl p-6" style={CARD_STYLE}>
          <ApprovalTimeline items={history} />
        </div>
      )}
      {tab === "signed" && (
        <div className="rounded-3xl p-6" style={CARD_STYLE}>
          <ApprovalTimeline items={signed} />
        </div>
      )}
      {tab === "rejected" && (
        <div className="rounded-3xl p-6" style={CARD_STYLE}>
          <ApprovalTimeline items={rejected} />
        </div>
      )}

      {signingFor && (
        <RequestSigningDialog
          open={!!signingFor}
          onOpenChange={(v) => !v && setSigningFor(null)}
          companyId={signingFor.company_id}
          companyName={signingFor.company_name}
          entityType={signingFor.entity_type}
          requestId={signingFor.id}
        />
      )}
    </div>
  );
};

export default AdvisorApprovals;
