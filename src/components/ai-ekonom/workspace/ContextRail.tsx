import { useEffect, useState } from "react";
import { Activity, Bot, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { ConversationListItem } from "./WorkspaceHeader";

interface Props {
  companyId: string | null;
  conversations: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  refreshTick: number;
}

interface AgentActivity {
  id: string;
  text: string;
}
interface AutonomousAction {
  id: string;
  text: string;
  href?: string;
}

const relTime = (iso: string) => {
  const d = new Date(iso).getTime();
  const m = Math.floor((Date.now() - d) / 60000);
  if (m < 1) return "nyss";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export function ContextRail({ companyId, conversations, activeId, onSelect, refreshTick }: Props) {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentActivity[] | null>(null);
  const [actions, setActions] = useState<AutonomousAction[] | null>(null);

  useEffect(() => {
    if (!companyId) { setAgents([]); setActions([]); return; }
    let cancelled = false;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    (async () => {
      // Active agents (running in background) — derived from registry: not paused + recent activity
      try {
        const { data } = await supabase
          .from("ai_agent_registry" as never)
          .select("id, agent_key, name, mission, is_paused, last_run_at")
          .eq("company_id", companyId)
          .eq("is_paused", false)
          .gte("last_run_at", since)
          .order("last_run_at", { ascending: false })
          .limit(4);
        if (!cancelled) {
          const rows = (data || []) as Array<{ id: string; name: string; mission: string | null }>;
          setAgents(rows.map((r) => ({ id: r.id, text: `${r.name} — ${r.mission || "arbetar i bakgrunden"}` })));
        }
      } catch { if (!cancelled) setAgents([]); }

      // Autonomous actions last 24h
      try {
        const items: AutonomousAction[] = [];

        const sb = supabase as any;
        const [autoBooked, dupes, vat, autofix] = await Promise.all([
          sb.from("journal_entries").select("id", { count: "exact", head: true })
            .eq("company_id", companyId).gte("ai_confidence", 0.95).gte("created_at", since),
          sb.from("journal_entries").select("id", { count: "exact", head: true })
            .eq("company_id", companyId).eq("is_duplicate", true).gte("created_at", since),
          sb.from("vat_periods").select("id, period_label").eq("company_id", companyId)
            .gte("updated_at", since).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
          sb.from("autofix_runs").select("findings_applied").eq("company_id", companyId)
            .gte("created_at", since),
        ]);

        const ab = autoBooked.count ?? 0;
        if (ab > 0) items.push({ id: "ab", text: `Bokförde ${ab} transaktion${ab === 1 ? "" : "er"} automatiskt`, href: "/verifications" });
        const d = dupes.count ?? 0;
        if (d > 0) items.push({ id: "dup", text: `Identifierade ${d} dubblettfaktura${d === 1 ? "" : "or"}`, href: "/anomaly-detection" });
        const v = (vat.data as { period_label?: string } | null);
        if (v?.period_label) items.push({ id: "vat", text: `Förberedde momsunderlag för ${v.period_label}`, href: "/moms" });
        const af = ((autofix.data || []) as Array<{ findings_applied: number | null }>).reduce((s, r) => s + (r.findings_applied || 0), 0);
        if (af > 0) items.push({ id: "af", text: `Autofix tillämpade ${af} korrigering${af === 1 ? "" : "ar"}`, href: "/autofix" });

        if (!cancelled) setActions(items);
      } catch { if (!cancelled) setActions([]); }
    })();

    return () => { cancelled = true; };
  }, [companyId, refreshTick]);

  const SectionHeader = ({ icon: Icon, title }: { icon: typeof Activity; title: string }) => (
    <div className="flex items-center gap-1.5 mb-2 px-1">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0 border-l border-border bg-muted/20 p-4 overflow-y-auto">
      {/* Section 1 — currently working */}
      <section>
        <SectionHeader icon={Activity} title="Vad jag arbetar med just nu" />
        <div className="rounded-xl border border-border bg-card p-3">
          {agents === null ? (
            <div className="space-y-2">
              <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
            </div>
          ) : agents.length === 0 ? (
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Inget pågående arbete. Säg till om du vill att jag tar mig an något.
            </p>
          ) : (
            <ul className="space-y-2">
              {agents.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-[12px] text-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="leading-snug">{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Section 2 — autonomous actions last 24h */}
      <section>
        <SectionHeader icon={Sparkles} title="Senaste autonoma åtgärder" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {actions === null ? (
            <div className="p-3 space-y-2">
              <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
            </div>
          ) : actions.length === 0 ? (
            <p className="text-[12px] text-muted-foreground p-3">Inget loggat senaste 24 timmarna.</p>
          ) : (
            <ul className="divide-y divide-border">
              {actions.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => a.href && navigate(a.href)}
                    className="w-full text-left px-3 py-2 text-[12px] text-foreground hover:bg-muted transition flex items-center gap-2"
                  >
                    <span className="flex-1 leading-snug">{a.text}</span>
                    {a.href && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => navigate("/agent")}
            className="w-full text-[11px] text-[#3b82f6] hover:underline px-3 py-2 border-t border-border text-left"
          >
            Se hela aktivitetsloggen →
          </button>
        </div>
      </section>

      {/* Section 3 — recent conversations */}
      <section>
        <SectionHeader icon={MessageSquare} title="Tidigare konversationer" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {conversations.length === 0 ? (
            <p className="text-[12px] text-muted-foreground p-3">Inga sparade konversationer ännu.</p>
          ) : (
            <ul className="divide-y divide-border">
              {conversations.slice(0, 5).map((c) => {
                const isActive = c.id === activeId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => onSelect(c.id)}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-muted transition flex items-center gap-2 ${isActive ? "bg-[#3b82f6]/10" : ""}`}
                    >
                      <span className={`flex-1 truncate leading-snug ${isActive ? "text-[#3b82f6] font-medium" : "text-foreground"}`}>
                        {c.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{relTime(c.updated_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </aside>
  );
}
