import { useState } from "react";
import { useFirmAIInsights } from "@/hooks/useFirmAIInsights";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ChevronDown, ChevronRight, RefreshCw, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ProactiveAlertsPanel } from "@/components/advisor/insights/ProactiveAlertsPanel";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  health: { label: "Portföljhälsa", color: "bg-emerald-500/20 text-emerald-200" },
  industry: { label: "Branschanalys", color: "bg-blue-500/20 text-blue-200" },
  automation: { label: "Automation", color: "bg-purple-500/20 text-purple-200" },
  deadlines: { label: "Deadlines", color: "bg-amber-500/20 text-amber-200" },
  anomaly: { label: "Anomalier", color: "bg-red-500/20 text-red-200" },
};

interface AIInsight {
  category: string;
  severity: "critical" | "watch" | "opportunity";
  title: string;
  affected_clients?: string[];
  observation: string;
  recommendation: string;
}

export default function AdvisorInsights() {
  const { data: insights = [], isLoading, refetch, isFetching } = useFirmAIInsights();
  const { firmId } = useAdvisorContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[] | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiUpdatedAt, setAiUpdatedAt] = useState<Date | null>(null);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  const generateNewAnalysis = async () => {
    if (!firmId) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "bureau-ai-portfolio-analysis",
        { body: { firm_id: firmId } },
      );
      if (error) throw error;
      setAiInsights((data?.insights ?? []) as AIInsight[]);
      setAiUpdatedAt(new Date(data?.generated_at ?? Date.now()));
      toast.success("AI-analys uppdaterad");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte generera analys");
    } finally {
      setAiBusy(false);
    }
    refetch();
  };

  const filtered = insights.filter((i: any) =>
    !search || `${i.title ?? ""} ${i.summary ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const recent = filtered.slice(0, 5);
  const archive = filtered.slice(5);

  return (
    <div className="px-6 py-6 max-w-[1100px] mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" /> AI-insikter
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Portföljanalys genererad av Bokfy · Senast uppdaterad{" "}
            {aiUpdatedAt
              ? format(aiUpdatedAt, "yyyy-MM-dd HH:mm")
              : format(new Date(), "yyyy-MM-dd HH:mm")}
          </p>
        </div>
        <Button onClick={generateNewAnalysis} disabled={aiBusy || isFetching} variant="outline">
          {aiBusy ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          {aiBusy ? "Analyserar portföljen…" : "Generera ny analys"}
        </Button>
      </div>

      {/* Proactive alerts (bureau_alerts) */}
      <ProactiveAlertsPanel />

      {/* AI-generated portfolio analysis */}
      {aiInsights && aiInsights.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            AI-genererad portföljanalys
          </p>
          {aiInsights
            .filter((_, idx) => !ignored.has(`ai-${idx}`))
            .map((ai, idx) => {
              const key = `ai-${idx}`;
              const isOpen = open[key] ?? false;
              return (
                <div
                  key={key}
                  className="bg-[#111827] border-[0.5px] border-white/[0.08] rounded-[12px] p-[14px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-white/[0.08] text-white/60 rounded-full text-[10px] px-[8px] py-[2px]">
                      {ai.category}
                    </span>
                    <button
                      onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                      className="text-white/60 hover:text-white"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {ai.affected_clients && ai.affected_clients.length > 0 && (
                    <p className="text-[11px] text-white/40 mb-1.5">
                      {ai.affected_clients.join(", ")}
                    </p>
                  )}
                  <p className="text-[13px] text-white/80 leading-[1.5] font-medium">
                    {ai.title}
                  </p>
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                      <p className="text-[12px] text-white/70 leading-relaxed">
                        <span className="text-white/40">Observation: </span>
                        {ai.observation}
                      </p>
                      <p className="text-[12px] text-white/85 leading-relaxed">
                        <span className="text-purple-300">Rekommendation: </span>
                        {ai.recommendation}
                      </p>
                    </div>
                  )}
                  <div className="mt-3 pt-2 flex items-center gap-2">
                    <button
                      onClick={() => navigate("/wl/app/workflow")}
                      className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[7px] text-[10px] font-medium px-[10px] h-[26px]"
                    >
                      Åtgärda
                    </button>
                    <button
                      onClick={() => setIgnored((s) => new Set(s).add(key))}
                      className="text-white/30 hover:text-white/60 text-[10px]"
                    >
                      Ignorera
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Sök i insikter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {isLoading ? (
        <p className="text-center text-[12px] text-slate-400 p-8">Laddar insikter…</p>
      ) : recent.length === 0 ? (
        <div className="bg-[#0B1929] rounded-[12px] p-8 text-center text-white/70">
          <Sparkles className="h-8 w-8 text-purple-300 mx-auto mb-2" />
          <p className="text-[14px]">Inga insikter ännu.</p>
          <p className="text-[12px] text-white/50 mt-1">
            Insikter genereras automatiskt varje måndag morgon.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recent
            .filter((i: any) => !ignored.has(i.id))
            .map((i: any) => {
              const meta =
                CATEGORY_META[i.category] ?? { label: i.category ?? "Insikt", color: "bg-slate-500/20 text-slate-200" };
              const isOpen = open[i.id] ?? false;
              const affectedNames = (i.affected ?? [])
                .slice(0, 3)
                .map((a: any) => a.name)
                .join(", ");
              return (
                <div
                  key={i.id}
                  className="bg-[#111827] border-[0.5px] border-white/[0.08] rounded-[12px] p-[14px] text-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-[8px] py-[2px] rounded-full text-[10px] font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <button
                      onClick={() => setOpen((o) => ({ ...o, [i.id]: !isOpen }))}
                      className="text-white/60 hover:text-white"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {affectedNames && (
                    <p className="text-[11px] text-white/40 mb-1.5">{affectedNames}</p>
                  )}
                  <p className="text-[13px] text-white/80 leading-[1.5] font-medium">
                    {i.title ?? "AI-insikt"}
                  </p>
                  <p className="text-[12px] text-white/65 leading-relaxed mt-1.5">
                    {i.description ?? i.summary ?? ""}
                  </p>
                  {isOpen && (i.detail || i.body || i.notifyMessage) && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                      {i.affected && i.affected.length > 0 && (
                        <p className="text-[11px] text-white/50">
                          Berör {i.affected.length} klient
                          {i.affected.length === 1 ? "" : "er"}:{" "}
                          {i.affected.map((a: any) => a.name).join(", ")}
                        </p>
                      )}
                      {(i.detail || i.body) && (
                        <p className="text-[12px] text-white/70 whitespace-pre-wrap leading-relaxed">
                          {i.detail ?? i.body}
                        </p>
                      )}
                      {i.notifyMessage && (
                        <p className="text-[12px] text-white/85">
                          <span className="text-purple-300">Rekommendation: </span>
                          {i.notifyMessage}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-3 pt-2 flex items-center gap-2">
                    <button
                      onClick={() => navigate(i.fixRoute ?? "/wl/app/workflow")}
                      className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[7px] text-[10px] font-medium px-[10px] h-[26px]"
                    >
                      Åtgärda
                    </button>
                    <button
                      onClick={() => setIgnored((s) => new Set(s).add(i.id))}
                      className="text-white/30 hover:text-white/60 text-[10px]"
                    >
                      Ignorera
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ARCHIVE */}
      {archive.length > 0 && (
        <div>
          <button
            onClick={() => setArchiveOpen((o) => !o)}
            className="text-[12px] text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            {archiveOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Arkiv ({archive.length} äldre insikter)
          </button>
          {archiveOpen && (
            <div className="mt-3 space-y-2">
              {archive.map((i: any) => (
                <div key={i.id} className="bg-white border border-slate-200 rounded-md p-3 text-[12px]">
                  <p className="font-medium text-slate-800">{i.title}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{i.summary ?? i.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
