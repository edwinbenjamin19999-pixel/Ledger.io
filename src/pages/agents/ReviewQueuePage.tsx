import { useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Check, X, Sparkles, Sliders, Undo2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  mockReviewItems,
  factorsFor,
  type ReviewItem,
  type ReviewSeverity,
} from "@/lib/ai/reviewQueue";
import {
  AGENT_LABELS,
  qualifiesForAutoApproval,
  useAutoThresholds,
  type AgentKey,
} from "@/lib/ai/autoApproveThresholds";
import {
  getEscalatedItems,
  resolveEscalation,
  subscribeEscalations,
} from "@/lib/ai/escalatedAnomalies";
import { formatSEK } from "@/lib/formatNumber";

const AGENT_TABS: { key: AgentKey | "all"; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "bokforing", label: "Bokföring" },
  { key: "kvitto", label: "Kvitto" },
  { key: "autofix", label: "Autofix" },
  { key: "lon", label: "Lön" },
  { key: "ar", label: "AR" },
  { key: "skatt", label: "Skatt" },
  { key: "beslutsmotor", label: "Beslutsmotor" },
];

const severityStyle: Record<ReviewSeverity, { dot: string; chip: string; label: string }> = {
  critical: { dot: "bg-rose-500", chip: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]", label: "Kritisk" },
  important: { dot: "bg-amber-500", chip: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]", label: "Viktig" },
  info: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700 border-slate-200", label: "Info" },
};

function confidenceTone(c: number) {
  if (c >= 90) return "text-[#085041] bg-emerald-50 border-emerald-200";
  if (c >= 75) return "text-[#7A5417] bg-amber-50 border-amber-200";
  return "text-[#7A1A1A] bg-rose-50 border-rose-200";
}

function relative(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60_000);
  if (m < 1) return "nu";
  if (m < 60) return `${m} min sedan`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h sedan`;
  const days = Math.round(h / 24);
  return `${days} d sedan`;
}

type View = "pending" | "decided" | "auto";

interface AutoLogEntry {
  id: string;
  at: Date;
  threshold: number;
}

export default function ReviewQueuePage() {
  const { toast } = useToast();
  const { thresholds, update: updateThreshold, reset: resetThresholds } = useAutoThresholds();

  const [baseItems] = useState<ReviewItem[]>(() => mockReviewItems());
  const [escalated, setEscalated] = useState<ReviewItem[]>(() => getEscalatedItems());
  useEffect(() => {
    const sync = () => setEscalated(getEscalatedItems());
    return subscribeEscalations(sync);
  }, []);
  const items = useMemo(() => [...escalated, ...baseItems], [escalated, baseItems]);
  const [tab, setTab] = useState<(typeof AGENT_TABS)[number]["key"]>("all");
  const [decided, setDecided] = useState<Record<string, "approved" | "rejected">>({});
  const [autoLog, setAutoLog] = useState<Record<string, AutoLogEntry>>({});
  const [view, setView] = useState<View>("pending");

  // Auto-approve qualifying items whenever thresholds or items change.
  // Already-decided or already-auto items are skipped.
  useEffect(() => {
    const newly: Record<string, AutoLogEntry> = {};
    for (const item of items) {
      if (decided[item.id] || autoLog[item.id]) continue;
      if (qualifiesForAutoApproval(item, thresholds)) {
        newly[item.id] = {
          id: item.id,
          at: new Date(),
          threshold: thresholds[item.agentKey],
        };
      }
    }
    if (Object.keys(newly).length) {
      setAutoLog((m) => ({ ...m, ...newly }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, thresholds]);

  const isAuto = (id: string) => Boolean(autoLog[id]);
  const isDecided = (id: string) => Boolean(decided[id]);

  const visibleItems = useMemo(() => {
    return items.filter((i) => {
      if (view === "pending") return !isDecided(i.id) && !isAuto(i.id);
      if (view === "decided") return isDecided(i.id);
      return isAuto(i.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, decided, autoLog, view]);

  const filtered = useMemo(
    () => (tab === "all" ? visibleItems : visibleItems.filter((i) => i.agentKey === tab)),
    [visibleItems, tab],
  );

  const pendingCount = items.filter((i) => !isDecided(i.id) && !isAuto(i.id)).length;
  const decidedCount = Object.keys(decided).length;
  const autoCount = Object.keys(autoLog).length;
  const criticalCount = items.filter(
    (i) => i.severity === "critical" && !isDecided(i.id) && !isAuto(i.id),
  ).length;
  const avgConfidence = items.length
    ? Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length)
    : 0;

  const decide = (item: ReviewItem, decision: "approved" | "rejected") => {
    setDecided((m) => ({ ...m, [item.id]: decision }));
    // Escalated anomalies: mark resolved bidirectionally on approve.
    if (item.id.startsWith("esc-") && decision === "approved") {
      resolveEscalation(item.id);
    }
    toast({
      title: decision === "approved" ? "Godkänd" : "Avvisad",
      description: `${item.agentName}: ${item.action}`,
    });
  };

  const revertAuto = (item: ReviewItem) => {
    setAutoLog((m) => {
      const next = { ...m };
      delete next[item.id];
      return next;
    });
    toast({
      title: "Auto-bokföring återställd",
      description: `${item.agentName}: ${item.action} — flyttad till manuell granskning.`,
    });
    setView("pending");
  };

  // Toast briefly when new auto-approvals fire (e.g. user lowered threshold).
  const lastAutoCount = useRef(0);
  useEffect(() => {
    if (autoCount > lastAutoCount.current && lastAutoCount.current > 0) {
      const delta = autoCount - lastAutoCount.current;
      toast({
        title: `${delta} ${delta === 1 ? "post" : "poster"} auto-bokförda`,
        description: "Se loggen under fliken Auto-bokförda.",
      });
    }
    lastAutoCount.current = autoCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCount]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200/70">
        <div className="px-6 py-5 max-w-[1400px] mx-auto">
          <div className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
            Ledger.io · Exception workspace
          </div>
          <div className="flex items-start justify-between gap-4 mt-0.5">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-[#2563EB]" />
                Att granska
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Alla poster där AI väntar på ditt beslut. Poster med hög konfidens och
                icke-kritisk allvarlighetsgrad bokförs automatiskt enligt dina trösklar
                och hamnar i auto-loggen.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThresholdEditor
                thresholds={thresholds}
                onChange={updateThreshold}
                onReset={resetThresholds}
              />
              <Link
                to="/ai-settings"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full border border-slate-200 bg-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Operating Console
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <SummaryTile label="Väntar på beslut" value={pendingCount} tone={pendingCount > 0 ? "amber" : "emerald"} />
            <SummaryTile label="Kritiska" value={criticalCount} tone={criticalCount > 0 ? "rose" : "emerald"} />
            <SummaryTile label="Snittkonfidens" value={`${avgConfidence}%`} tone={avgConfidence >= 85 ? "emerald" : "amber"} />
            <SummaryTile label="Auto-bokförda" value={autoCount} tone="neutral" />
          </div>
        </div>
      </header>

      <div className="px-6 py-5 max-w-[1400px] mx-auto">
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {([
            { k: "pending" as const, label: "Väntar", n: pendingCount },
            { k: "decided" as const, label: "Beslutade", n: decidedCount },
            { k: "auto" as const, label: "Auto-bokförda", n: autoCount },
          ]).map((v) => {
            const active = view === v.k;
            return (
              <button
                key={v.k}
                onClick={() => { setView(v.k); setTab("all"); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
                  active
                    ? "bg-[#2563EB] text-white border-[#2563EB]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {v.k === "auto" && <Zap className="w-3 h-3" />}
                {v.label}
                <span className={`tabular-nums ${active ? "text-white/80" : "text-slate-400"}`}>{v.n}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {AGENT_TABS.map((t) => {
            const n =
              t.key === "all"
                ? visibleItems.length
                : visibleItems.filter((i) => i.agentKey === t.key).length;
            if (t.key !== "all" && n === 0) return null;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {t.label}
                <span className={`ml-1.5 tabular-nums ${active ? "text-white/70" : "text-slate-400"}`}>{n}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_140px_120px_140px_180px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200 bg-slate-50/60">
            <div>Åtgärd</div>
            <div className="text-right">Belopp</div>
            <div className="text-center">Konfidens</div>
            <div>Agent</div>
            <div className="text-right">{view === "auto" ? "Auto" : "Beslut"}</div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900">
                {view === "auto" ? "Inga auto-bokförda poster ännu" : "Inget kvar att granska"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {view === "auto"
                  ? "Sänk tröskeln eller vänta på fler högkonfidenta förslag."
                  : "Alla AI-förslag är hanterade. Bra jobbat."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const sev = severityStyle[item.severity];
                const decision = decided[item.id];
                const auto = autoLog[item.id];
                return (
                  <li
                    key={item.id}
                    className={`px-5 py-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_120px_140px_180px] gap-4 items-center transition ${
                      decision || auto ? "opacity-80" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${sev.chip}`}>
                          <span className={`w-1 h-1 rounded-full ${sev.dot}`} />
                          {sev.label}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">{relative(item.createdAt)}</span>
                        {auto && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#085041] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            <Zap className="w-2.5 h-2.5" />
                            Auto ≥ {auto.threshold}%
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-900 truncate">{item.action}</div>
                      {item.detail && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{item.detail}</div>
                      )}
                    </div>
                    <div className="text-right tabular-nums font-medium text-slate-900">
                      {item.amount != null ? formatSEK(item.amount) : <span className="text-slate-300">—</span>}
                    </div>
                    <div className="flex justify-center">
                      <ConfidencePill item={item} />
                    </div>
                    <Link
                      to={`/agents/${item.agentKey}`}
                      className="text-xs font-medium text-slate-700 hover:text-[#2563EB] truncate"
                    >
                      {item.agentName}
                    </Link>
                    <div className="flex justify-end gap-2">
                      {auto ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => revertAuto(item)}
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1" />
                          Reversera
                        </Button>
                      ) : decision ? (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            decision === "approved"
                              ? "bg-emerald-50 text-[#085041] border border-emerald-200"
                              : "bg-rose-50 text-[#7A1A1A] border border-rose-200"
                          }`}
                        >
                          {decision === "approved" ? "Godkänd" : "Avvisad"}
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-[#7A1A1A] hover:border-rose-200"
                            onClick={() => decide(item, "rejected")}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Avvisa
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-[#2563EB] hover:bg-[#1D4FD8] text-white"
                            onClick={() => decide(item, "approved")}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Godkänn
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfidencePill({ item }: { item: ReviewItem }) {
  const factors = factorsFor(item);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold tabular-nums cursor-help ${confidenceTone(
            item.confidence,
          )}`}
          aria-label={`Konfidens ${item.confidence}%. Klicka för förklaring.`}
        >
          {item.confidence}%
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72 text-xs space-y-2">
        <div className="font-semibold text-slate-900">
          Varför {item.confidence}%?
        </div>
        <ul className="space-y-1.5">
          {factors.map((f, i) => (
            <li key={i} className="flex gap-2 items-start text-slate-700">
              <span
                className={`mt-[2px] inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                  f.direction === "+"
                    ? "bg-emerald-50 text-[#085041] border border-emerald-200"
                    : "bg-rose-50 text-[#7A1A1A] border border-rose-200"
                }`}
              >
                {f.direction}
              </span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function ThresholdEditor({
  thresholds,
  onChange,
  onReset,
}: {
  thresholds: Record<AgentKey, number>;
  onChange: (agent: AgentKey, value: number) => void;
  onReset: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full border border-slate-200 bg-white">
          <Sliders className="w-3.5 h-3.5" />
          Anpassa auto
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 space-y-3" align="end">
        <div>
          <div className="text-sm font-semibold text-slate-900">Auto-bokföringströsklar</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Poster över tröskeln bokförs automatiskt om de inte är kritiska. Kritiska
            poster stannar alltid i kön.
          </p>
        </div>
        <div className="space-y-3 pt-1">
          {(Object.keys(AGENT_LABELS) as AgentKey[]).map((k) => (
            <div key={k} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{AGENT_LABELS[k]}</span>
                <span className="tabular-nums text-slate-500">≥ {thresholds[k]}%</span>
              </div>
              <Slider
                min={70}
                max={100}
                step={1}
                value={[thresholds[k]]}
                onValueChange={([v]) => onChange(k, v ?? thresholds[k])}
              />
            </div>
          ))}
        </div>
        <button
          onClick={onReset}
          className="text-[11px] text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
        >
          Återställ standardvärden
        </button>
      </PopoverContent>
    </Popover>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "neutral" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    neutral: "text-slate-700 bg-slate-50 border-slate-200",
    emerald: "text-[#085041] bg-emerald-50/60 border-emerald-200/60",
    amber: "text-[#7A5417] bg-amber-50/60 border-amber-200/60",
    rose: "text-[#7A1A1A] bg-rose-50/60 border-rose-200/60",
  } as const;
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}
