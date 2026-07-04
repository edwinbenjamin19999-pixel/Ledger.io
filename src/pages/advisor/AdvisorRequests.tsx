import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Search, ExternalLink, Sparkles, MessageSquare } from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useClientRequests } from "@/hooks/useClientRequests";
import { setStoredActiveCompanyId } from "@/lib/company-selection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WLEmptyState } from "@/components/advisor/wl-ui/WLEmptyState";

const TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "Alla" },
  { key: "open", label: "Öppna" },
  { key: "awaiting_client", label: "Väntar klient" },
  { key: "responded", label: "Besvarade" },
  { key: "resolved", label: "Avslutade" },
];

const STATUS_META: Record<string, { label: string; tone: string }> = {
  open: { label: "Öppen", tone: "bg-[#EFF6FF] text-[#3b82f6]" },
  awaiting_client: { label: "Väntar klient", tone: "bg-[#FAEEDA] text-[#7A5417]" },
  responded: { label: "Besvarad", tone: "bg-[#EFF6FF] text-blue-700" },
  resolved: { label: "Avslutad", tone: "bg-[#E1F5EE] text-[#085041]" },
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: "bg-[#FCE8E8] text-[#7A1A1A] ring-rose-200",
  high: "bg-[#FAEEDA] text-[#7A5417] ring-amber-200",
  medium: "bg-slate-100 text-slate-700 ring-slate-200",
  low: "bg-slate-50 text-slate-500 ring-slate-200",
};

const AdvisorRequests = () => {
  const navigate = useNavigate();
  const { clients } = useAdvisorContext();
  const { data: rows = [], isLoading } = useClientRequests();
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.title.toLowerCase().includes(q) &&
          !r.client_name.toLowerCase().includes(q) &&
          !(r.message ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const awaitingClient = counts.awaiting_client ?? 0;
  const aiGenerated = rows.filter((r) => r.ai_generated).length;

  const enterClient = (companyId: string) => {
    setStoredActiveCompanyId(companyId);
    navigate("/dashboard");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
          Byråportal · Förfrågningar
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">Klientförfrågningar</h1>
        <p className="text-[#64748B] mt-1.5">
          {rows.length} förfrågningar över {clients.length} klienter — håll dialogen samlad.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totalt", value: rows.length },
          { label: "Öppna", value: counts.open ?? 0 },
          { label: "Väntar klient", value: awaitingClient, tone: awaitingClient > 0 ? "text-[#7A5417]" : undefined },
          { label: "AI-genererade", value: aiGenerated },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white border border-[#E2E8F0] p-4">
            <div className="text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">{k.label}</div>
            <div className={`text-2xl font-bold mt-1 tabular-nums ${k.tone ?? "text-[#0F172A]"}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 border-b border-[#E2E8F0] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key ? "text-[#0F172A]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
            style={tab === t.key ? { borderColor: "hsl(var(--brand-primary))" } : undefined}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder="Sök förfrågan eller klient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-[#94A3B8]">Laddar förfrågningar…</div>
      ) : filtered.length === 0 ? (
        <WLEmptyState
          icon={Inbox}
          title="Inga förfrågningar"
          description="Skapa förfrågningar direkt från en klient eller låt AI föreslå dem automatiskt."
          aiSuggestion="AI kan generera förfrågningar när underlag saknas (kvitto, förklaring, signering)."
          primaryAction={{ label: "Öppna klientlista", onClick: () => navigate("/wl/app/clients") }}
        />
      ) : (
        <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F8FAFC] grid grid-cols-[1fr_180px_120px_120px_140px_90px] gap-3 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
            <span>Förfrågan</span>
            <span>Klient</span>
            <span>Modul</span>
            <span>Prio</span>
            <span>Status</span>
            <span></span>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="px-4 py-3 grid grid-cols-[1fr_180px_120px_120px_140px_90px] gap-3 items-center hover:bg-[#F8FAFC] transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0F172A] truncate flex items-center gap-1.5">
                    {r.ai_generated && <Sparkles className="h-3 w-3 text-[#3b82f6] shrink-0" />}
                    {r.title}
                  </div>
                  {r.message && (
                    <div className="text-[11px] text-[#94A3B8] truncate">{r.message}</div>
                  )}
                </div>
                <div className="text-xs text-[#64748B] truncate">{r.client_name}</div>
                <div className="text-xs text-[#64748B] capitalize">{r.module}</div>
                <div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${
                      PRIORITY_TONE[r.priority] ?? PRIORITY_TONE.medium
                    }`}
                  >
                    {r.priority}
                  </span>
                </div>
                <div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      STATUS_META[r.status]?.tone ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {STATUS_META[r.status]?.label ?? r.status}
                  </span>
                  {r.due_date && (
                    <div className="text-[10px] text-[#94A3B8] mt-0.5 tabular-nums">
                      Förfaller {r.due_date}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
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
        <MessageSquare className="h-4 w-4 text-[#3b82f6] mt-0.5" />
        <div className="text-xs text-[#3b82f6]">
          <strong>Tips:</strong> {awaitingClient} förfrågningar ligger hos klient — skicka påminnelse om svar dröjer mer än 3 dagar.
        </div>
      </div>
    </div>
  );
};

export default AdvisorRequests;
