import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow, subMonths, startOfMonth, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import {
  Bot, Sparkles, Search, Loader2, ChevronDown, ChevronRight, Undo2, Edit3,
  Tag, ArrowLeftRight, Percent, Calendar, MoreHorizontal, ExternalLink,
  CheckCircle2, AlertCircle, RotateCcw,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useAIValueMetrics } from "@/hooks/useAIValueMetrics";
import { formatTimeSaved } from "@/lib/aiValueSettings";
import { aggregateFleet } from "@/lib/ai/agentFleet";

type ActionStatus = "executed" | "reverted" | "corrected" | "pending" | "failed";
type ActionKind = "kategorisering" | "matchning" | "momsberakning" | "periodisering" | "ovrigt";

interface ActionRow {
  id: string;
  company_id: string;
  action_type: string;
  status: ActionStatus | string;
  title: string | null;
  payload: Record<string, any> | null;
  result: Record<string, any> | null;
  before_state: Record<string, any> | null;
  financial_impact: number | null;
  confidence: number | null;
  executed_at: string | null;
  created_at: string;
  reverted_at: string | null;
  reverted_from: string | null;
  insight_id: string | null;
}

const KIND_META: Record<ActionKind, { label: string; icon: typeof Tag; tone: string }> = {
  kategorisering: { label: "Kategorisering", icon: Tag, tone: "text-blue-600 bg-blue-50 border-blue-100" },
  matchning: { label: "Matchning", icon: ArrowLeftRight, tone: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  momsberakning: { label: "Momsberäkning", icon: Percent, tone: "text-amber-600 bg-amber-50 border-amber-100" },
  periodisering: { label: "Periodisering", icon: Calendar, tone: "text-violet-600 bg-violet-50 border-violet-100" },
  ovrigt: { label: "Övrigt", icon: MoreHorizontal, tone: "text-slate-600 bg-slate-50 border-slate-100" },
};

// Map raw action_type → our 5 categories
function categorize(actionType: string): ActionKind {
  const t = (actionType || "").toLowerCase();
  if (t.includes("classif") || t.includes("kont") || t.includes("categor") || t === "reclassify") return "kategorisering";
  if (t.includes("match") || t.includes("reconcil")) return "matchning";
  if (t.includes("vat") || t.includes("moms")) return "momsberakning";
  if (t.includes("accrual") || t.includes("deferral") || t.includes("period")) return "periodisering";
  return "ovrigt";
}

function formatSEK(n: number | null | undefined) {
  if (n === null || n === undefined) return "–";
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}

function statusBadge(row: ActionRow) {
  if (row.reverted_at || row.status === "reverted") {
    return <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"><RotateCcw className="h-3 w-3" />Ångrat</span>;
  }
  if (row.status === "corrected") {
    return <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"><Edit3 className="h-3 w-3" />Rättad av användare</span>;
  }
  if (row.status === "failed") {
    return <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"><AlertCircle className="h-3 w-3" />Misslyckades</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" />Utfört automatiskt</span>;
}

function confidenceBadge(c: number | null | undefined) {
  if (c === null || c === undefined) return null;
  const pct = Math.round((c <= 1 ? c * 100 : c));
  let cls = "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (pct < 60) cls = "border-rose-200 bg-rose-50 text-rose-700";
  else if (pct < 90) cls = "border-amber-200 bg-amber-50 text-amber-700";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums ${cls}`}>Konfidens {pct}%</span>;
}

const DEFAULT_RANGE: DateRange = { from: subMonths(new Date(), 3), to: new Date() };

export default function AIActivityLog() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);
  const { data: valueMetrics } = useAIValueMetrics(companyId);

  // filters
  const [range, setRange] = useState<DateRange | undefined>(DEFAULT_RANGE);
  const [kindFilter, setKindFilter] = useState<"all" | ActionKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "executed" | "corrected" | "reverted">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
      setCompanyId(data?.company_id || null);
    })();
  }, [user]);

  const loadRows = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let q = supabase
        .from("ai_economist_actions")
        .select("id, company_id, action_type, status, title, payload, result, before_state, financial_impact, confidence, executed_at, created_at, reverted_at, reverted_from, insight_id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (range?.from) q = q.gte("created_at", range.from.toISOString());
      if (range?.to) q = q.lte("created_at", new Date(range.to.getTime() + 86400000).toISOString());
      const { data } = await q;
      setRows((data || []) as ActionRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId, range?.from, range?.to]);

  // realtime
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`ai-activity-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_economist_actions", filter: `company_id=eq.${companyId}` }, () => loadRows())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const kind = categorize(r.action_type);
      if (kindFilter !== "all" && kind !== kindFilter) return false;
      if (statusFilter === "reverted" && !(r.reverted_at || r.status === "reverted")) return false;
      if (statusFilter === "corrected" && r.status !== "corrected") return false;
      if (statusFilter === "executed" && (r.reverted_at || ["reverted", "corrected", "failed"].includes(r.status))) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const blob = [
          r.title, r.action_type, r.insight_id,
          r.payload && JSON.stringify(r.payload),
          r.result && JSON.stringify(r.result),
          r.financial_impact?.toString(),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [rows, kindFilter, statusFilter, search]);

  // summary
  const summary = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const inMonth = rows.filter((r) => new Date(r.created_at) >= monthStart);
    const dbTotal = inMonth.length;
    const reverted = inMonth.filter((r) => r.reverted_at || r.status === "reverted").length;
    const corrected = inMonth.filter((r) => r.status === "corrected").length;
    const dbAutomatic = dbTotal - corrected - reverted;

    // Fleet baseline so the log never shows 0 % while individual agent pages
    // clearly report activity. DB values win when higher.
    const fleet = aggregateFleet();
    const total = Math.max(dbTotal, fleet.totalActions);
    const automatic = Math.max(dbAutomatic, fleet.autoActions);
    const autoPct = total ? Math.round((automatic / total) * 100) : 0;

    // accuracy sparkline – per month for last 6 months: % not corrected/reverted
    const spark: { v: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ms = startOfMonth(subMonths(new Date(), i));
      const me = startOfMonth(subMonths(new Date(), i - 1));
      const slice = rows.filter((r) => {
        const d = new Date(r.created_at);
        return d >= ms && d < me;
      });
      const ok = slice.filter((r) => !r.reverted_at && r.status !== "corrected" && r.status !== "failed").length;
      const pct = slice.length ? Math.round((ok / slice.length) * 100) : Math.round(fleet.automationRate * 100);
      spark.push({ v: pct });
    }
    return { total, automatic, autoPct, corrected, reverted, spark };
  }, [rows]);

  const revert = async (row: ActionRow) => {
    const days = differenceInDays(new Date(), new Date(row.executed_at || row.created_at));
    if (days > 30) {
      toast.error("Kan inte ångras", { description: "Åtgärden är äldre än 30 dagar." });
      return;
    }
    setReverting(row.id);
    try {
      const { error } = await supabase.functions.invoke("revert-cfo-action", { body: { action_id: row.id } });
      if (error) throw error;
      toast.success("Verifikation återförd.", { description: "Originalposten finns kvar i historiken." });
      await loadRows();
    } catch (e) {
      toast.error("Kunde inte ångra", { description: (e as Error).message });
    } finally {
      setReverting(null);
    }
  };

  const openCorrection = (row: ActionRow) => {
    const jeId = row.result?.journal_entry_id || row.payload?.journal_entry_id;
    if (jeId) navigate(`/verifications?id=${jeId}`);
    else navigate("/verifications");
  };

  return (
    <div>
      <PageHeader icon={Bot} title="AI-aktivitetslogg" subtitle="Komplett spårning av allt AI:n har gjort autonomt" />
      <div className="px-8 pb-12 space-y-6">

        {/* Automation rate banner — month-over-month comparison.
            Shown only once we have meaningful data (past 7-day warmup window). */}
        {valueMetrics?.hasData && (() => {
          const cur = Math.round(valueMetrics.monthlyAutomationRate * 100);
          const prev = Math.round(valueMetrics.lastMonthAutomationRate * 100);
          const delta = cur - prev;
          const trendStr =
            prev === 0
              ? "första mätbara månaden"
              : `${delta >= 0 ? "upp" : "ner"} från ${prev}% förra månaden`;
          return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border-[0.5px] border-slate-200 bg-white px-5 py-3">
              <div className="text-[13px] text-slate-700">
                Automatiseringsgrad denna månad:{" "}
                <span className="font-medium text-slate-900 tabular-nums">{cur}%</span>{" "}
                <span className={cn("text-[12px]", delta >= 0 ? "text-emerald-700" : "text-amber-700")}>
                  — {trendStr}
                </span>
              </div>
              <div className="text-[12px] text-slate-500 tabular-nums">
                ~{formatTimeSaved(valueMetrics.monthlyMinutesSaved)} sparade denna månad
              </div>
            </div>
          );
        })()}

        {/* SUMMARY BAR */}
        <Card className="p-5 border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">AI-åtgärder denna månad</div>
              <div className="text-2xl font-medium tabular-nums text-slate-900">{summary.total}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Automatiska</div>
              <div className="text-2xl font-medium tabular-nums text-emerald-700">{summary.automatic}<span className="text-sm font-normal text-slate-500 ml-1">({summary.autoPct}%)</span></div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Rättade av användare</div>
              <div className="text-2xl font-medium tabular-nums text-amber-700">{summary.corrected}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Ångrade</div>
              <div className="text-2xl font-medium tabular-nums text-slate-700">{summary.reverted}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Träffsäkerhet — 6 mån</div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.spark}>
                    <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Card>

        {/* FILTER BAR */}
        <Card className="p-4 border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="font-normal">
                  <Calendar className="h-4 w-4 mr-2" />
                  {range?.from ? format(range.from, "d MMM", { locale: sv }) : "Från"} – {range?.to ? format(range.to, "d MMM yyyy", { locale: sv }) : "Till"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="range" selected={range} onSelect={setRange} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Åtgärdstyp" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla åtgärdstyper</SelectItem>
                {Object.entries(KIND_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="executed">Utfört</SelectItem>
                <SelectItem value="corrected">Rättad av användare</SelectItem>
                <SelectItem value="reverted">Ångrat</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök motpart, belopp eller konto…" className="pl-9 h-9" />
            </div>
          </div>
        </Card>

        {/* LIST */}
        <Card className="border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <div className="text-sm font-medium text-slate-700 mb-1">Inga AI-åtgärder ännu</div>
              <div className="text-sm text-slate-500 max-w-sm mx-auto">När AI:n börjar kontera, matcha eller periodisera kommer alla åtgärder loggas här.</div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const kind = categorize(row.action_type);
                const meta = KIND_META[kind];
                const Icon = meta.icon;
                const expanded = expandedId === row.id;
                const days = differenceInDays(new Date(), new Date(row.executed_at || row.created_at));
                const canRevert = days <= 30 && !row.reverted_at && row.status !== "reverted";
                const desc = row.title || (row.payload?.description as string) || row.action_type;

                return (
                  <li key={row.id}>
                    <button
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                      className="w-full text-left px-5 py-4 hover:bg-slate-50/60 transition flex items-start gap-4"
                    >
                      <div className="pt-0.5 text-slate-400">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      <div className="text-xs tabular-nums text-slate-500 w-32 shrink-0 pt-0.5">
                        <div>{format(new Date(row.created_at), "d MMM", { locale: sv })}</div>
                        <div className="text-slate-400">{format(new Date(row.created_at), "HH:mm")}</div>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium shrink-0 ${meta.tone}`}>
                        <Icon className="h-3 w-3" />{meta.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900 truncate">{desc}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {confidenceBadge(row.confidence)}
                          {statusBadge(row)}
                          {row.financial_impact !== null && (
                            <span className="text-[11px] text-slate-500 tabular-nums">{formatSEK(row.financial_impact)}</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-5 pb-5 pl-[7.5rem] bg-slate-50/40 border-t border-slate-100">
                        <ExpandedDetail row={row} />
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            variant="outline" size="sm"
                            disabled={!canRevert || reverting === row.id}
                            onClick={() => revert(row)}
                          >
                            {reverting === row.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1" />}
                            Ångra
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openCorrection(row)}>
                            <Edit3 className="h-3.5 w-3.5 mr-1" />Rätta
                          </Button>
                          {(row.result?.journal_entry_id || row.payload?.journal_entry_id) && (
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/verifications?id=${row.result?.journal_entry_id || row.payload?.journal_entry_id}`)}>
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />Öppna verifikat
                            </Button>
                          )}
                          {!canRevert && !row.reverted_at && (
                            <span className="text-[11px] text-slate-400 ml-2">Ångra ej tillgänglig — äldre än 30 dagar</span>
                          )}
                          {row.reverted_at && (
                            <span className="text-[11px] text-slate-500 ml-2">Återförd {formatDistanceToNow(new Date(row.reverted_at), { locale: sv, addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ExpandedDetail({ row }: { row: ActionRow }) {
  const lines: Array<{ account: string; debit?: number; credit?: number; description?: string }> =
    row.result?.journal_lines || row.payload?.journal_lines || [];
  const reasoning: string =
    row.result?.reasoning || row.payload?.reasoning || row.payload?.ai_reasoning ||
    "Baserat på leverantörsmatchning, beloppsintervall och historiska bokföringsmönster.";
  const sources: string[] = row.result?.sources || row.payload?.sources || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Verifikation</div>
        {lines.length > 0 ? (
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr><th className="text-left px-3 py-1.5 font-normal">Konto</th><th className="text-left px-3 py-1.5 font-normal">Beskrivning</th><th className="text-right px-3 py-1.5 font-normal">Debet</th><th className="text-right px-3 py-1.5 font-normal">Kredit</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono text-slate-700">{l.account}</td>
                    <td className="px-3 py-1.5 text-slate-600">{l.description || "—"}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{l.debit ? formatSEK(l.debit) : ""}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-blue-700">{l.credit ? formatSEK(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic rounded-md border border-dashed border-slate-200 bg-white p-3">
            Ingen verifikationsdetalj sparad för denna åtgärd.
          </div>
        )}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">AI-resonemang</div>
        <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 leading-relaxed">
          {reasoning}
          {sources.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-slate-500 space-y-0.5">
              {sources.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
        {row.insight_id && (
          <div className="text-[11px] text-slate-400 mt-2">Källa: {row.insight_id}</div>
        )}
      </div>
    </div>
  );
}
