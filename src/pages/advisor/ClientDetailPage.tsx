import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Clock, Send, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { supabase } from "@/integrations/supabase/client";
import { ClientHealthCard, type HealthIndicator, type RiskSignal } from "@/components/advisor/clients/ClientHealthCard";
import { ClientFinancialSummary } from "@/components/advisor/clients/ClientFinancialSummary";
import { ClientDeadlinesPanel, type DeadlineItem } from "@/components/advisor/clients/ClientDeadlinesPanel";
import { ClientTasksTab } from "@/components/advisor/clients/ClientTasksTab";
import { ClientNotesTab } from "@/components/advisor/clients/ClientNotesTab";
import { ClientAIAnalysisTab } from "@/components/advisor/clients/ClientAIAnalysisTab";
import { format } from "date-fns";

const TABS = [
  { key: "overview", label: "Översikt" },
  { key: "tasks", label: "Uppgifter" },
  { key: "ai", label: "AI-analys" },
  { key: "notes", label: "Anteckningar" },
];

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { firmId, clients } = useAdvisorContext();
  const [tab, setTab] = useState<string>("overview");
  const [risk, setRisk] = useState<{ score: number; signals: RiskSignal[]; updatedAt: string | null }>({
    score: 0,
    signals: [],
    updatedAt: null,
  });
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);

  const client = clients.find((c) => c.id === clientId);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data: r } = await supabase
        .from("bureau_client_risk")
        .select("score, signals, calculated_at")
        .eq("company_id", clientId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (r) {
        setRisk({
          score: Number(r.score ?? 0),
          signals: (((r.signals as unknown) as any[]) ?? []).slice(0, 4).map((s: any) => ({
            level: s.severity === "critical" ? "critical" : "warning",
            message: s.message ?? s.label ?? "Signal",
          })),
          updatedAt: r.calculated_at,
        });
      }
      const { data: d } = await supabase
        .from("firm_deadlines")
        .select("id, deadline_type, title, due_date")
        .eq("company_id", clientId)
        .gte("due_date", new Date(Date.now() - 14 * 86400000).toISOString())
        .order("due_date", { ascending: true })
        .limit(8);
      setDeadlines(
        ((d ?? []) as any[]).map((x) => ({
          id: x.id,
          type: x.deadline_type ?? "",
          title: x.title ?? x.deadline_type ?? "Deadline",
          date: x.due_date,
        }))
      );
    })();
  }, [clientId]);

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-500">Klient hittades inte.</p>
        <Button variant="ghost" onClick={() => navigate("/wl/app/clients")} className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>
      </div>
    );
  }

  const indicators: HealthIndicator[] = useMemo(() => {
    const sigByType = (t: string) => risk.signals.find((s) => s.message.toLowerCase().includes(t));
    return [
      { label: "Bokföring", status: sigByType("bokför") ? "warning" : "ok", detail: sigByType("bokför")?.message ?? "Uppdaterad" },
      { label: "Bankavstämning", status: sigByType("bank") ? "warning" : "ok", detail: sigByType("bank")?.message ?? "Klar" },
      { label: "Moms", status: sigByType("moms") ? (sigByType("moms")?.level === "critical" ? "critical" : "warning") : "ok", detail: sigByType("moms")?.message ?? "Inlämnad" },
      { label: "Årsredovisning", status: sigByType("årsred") ? "warning" : "ok", detail: sigByType("årsred")?.message ?? "Ej deadline" },
      { label: "Underlag", status: sigByType("kvitto") || sigByType("bilaga") ? "warning" : "ok", detail: sigByType("kvitto")?.message ?? "Allt klart" },
    ];
  }, [risk.signals]);

  const monthLabel = format(new Date(), "MMMM yyyy");

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => navigate("/wl/app/clients")}
            className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Klienter
          </button>
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-slate-900">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-[12px] text-[#94A3B8]">{client.org_number ?? "—"}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              client.urgency === "high" ? "bg-red-50 text-red-700"
              : client.urgency === "medium" ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
            }`}>
              {client.urgency === "high" ? "Kritisk" : client.urgency === "medium" ? "Varning" : "OK"}
            </span>
            {risk.updatedAt && (
              <span className="text-[11px] text-slate-400">
                Uppdaterad {format(new Date(risk.updatedAt), "yyyy-MM-dd HH:mm")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/wl/app/clients/${clientId}/overview`)}>
            <ExternalLink className="h-4 w-4 mr-1.5" /> Öppna klientvy
          </Button>
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-1.5" /> Logga tid
          </Button>
          <Button variant="outline">
            <Send className="h-4 w-4 mr-1.5" /> Skicka rapport
          </Button>
          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition ${
                tab === t.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-5">
            <ClientHealthCard
              riskScore={risk.score}
              indicators={indicators}
              signals={risk.signals}
              lastScanAt={risk.updatedAt ? format(new Date(risk.updatedAt), "yyyy-MM-dd HH:mm") : undefined}
            />
            <ClientFinancialSummary
              monthLabel={monthLabel}
              income={0}
              costs={0}
              result={0}
              vsPrevPct={0}
              cash={0}
              receivables={0}
              liabilities={0}
              solidityPct={0}
            />
          </div>
          <div className="space-y-5">
            <ClientDeadlinesPanel items={deadlines} />
            <div className="bg-white border border-slate-200 rounded-[12px] p-[14px]">
              <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 mb-3">
                Nedlagd tid — {monthLabel}
              </h3>
              <p className="text-[13px] text-slate-400">Ingen tid loggad denna månad.</p>
              <Link to="#" className="text-[12px] text-blue-600 hover:underline mt-2 inline-block">Logga mer tid →</Link>
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && firmId && clientId && (
        <ClientTasksTab companyId={clientId} firmId={firmId} />
      )}

      {tab === "ai" && (
        <ClientAIAnalysisTab
          clientName={client.name}
          generatedAt={format(new Date(), "yyyy-MM-dd HH:mm")}
          sections={[
            { key: "rev", title: "Intäktsutveckling", body: `${client.name} har en löpande intäktsbas. AI-genererad sammanfattning visas här när bokföringsdata är synkad.` },
            { key: "cost", title: "Kostnadsutveckling", body: "Kostnadsmönster analyseras kontinuerligt. Inga avvikelser flaggade just nu." },
            { key: "liq", title: "Likviditetssituation", body: "Likviditeten bedöms utifrån tillgängliga kassaposter och förväntade in- och utbetalningar." },
            { key: "comp", title: "Compliance-status", body: "Moms, AGI och årsredovisning bevakas via deadline-motorn." },
            { key: "risk", title: "Riskbedömning", body: risk.signals.length > 0 ? risk.signals.map((s) => `• ${s.message}`).join("\n") : "Inga aktiva risksignaler." },
          ]}
          risks={risk.signals.map((s) => ({
            signal: s.message,
            current: "—",
            threshold: "—",
            trend: "flat" as const,
            action: s.level === "critical" ? "Åtgärda omgående" : "Bevaka",
          }))}
          anomalies={[]}
        />
      )}

      {tab === "notes" && firmId && clientId && (
        <ClientNotesTab companyId={clientId} firmId={firmId} />
      )}
    </div>
  );
}
