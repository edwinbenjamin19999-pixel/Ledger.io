import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bug,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Search as SearchIcon,
  Download,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type FixStatus =
  | "pending"
  | "analyzing"
  | "fixed"
  | "manual"
  | "failed"
  | "resolved";

interface ErrorRow {
  id: string;
  error_id: string;
  message: string;
  stack: string | null;
  component_stack: string | null;
  url: string | null;
  occurred_at: string;
  user_agent: string | null;
  breadcrumbs: Array<{ description?: string; timestamp?: string; type?: string }>;
  fix_status: FixStatus;
  fix_analysis: string | null;
  fix_root_cause: string | null;
  fix_description: string | null;
  fix_code: string | null;
  fix_filename: string | null;
  fix_affected_lines: string | null;
  fix_confidence: number | null;
  fix_requires_manual_review: boolean;
  resolved_at: string | null;
  created_at: string;
}

type TabKey = "all" | "manual" | "fixed" | "failed";
type RangeKey = "24h" | "7d" | "30d" | "all";

const STATUS_LABELS: Record<FixStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Väntar", bg: "bg-[#F1F5F9]", text: "text-[#475569]" },
  analyzing: { label: "Analyseras…", bg: "bg-[#EFF6FF]", text: "text-[#0C447C]" },
  fixed: { label: "Auto-fixad", bg: "bg-[#E1F5EE]", text: "text-[#085041]" },
  manual: { label: "Kräver granskning", bg: "bg-[#FAEEDA]", text: "text-[#412402]" },
  failed: { label: "Misslyckades", bg: "bg-[#FCEBEB]", text: "text-[#501313]" },
  resolved: { label: "Löst", bg: "bg-[#E1F5EE]", text: "text-[#085041]" },
};

function rangeToDate(range: RangeKey): Date | null {
  const now = Date.now();
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000);
  if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return null;
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null;
  const cls =
    value >= 90
      ? "bg-[#E1F5EE] text-[#085041]"
      : value >= 70
      ? "bg-[#FAEEDA] text-[#412402]"
      : "bg-[#FCEBEB] text-[#501313]";
  return (
    <span className={`inline-flex items-center rounded-full px-[8px] py-[2px] text-[10px] font-medium ${cls}`}>
      {value}% säker
    </span>
  );
}

function StatusBadge({ status }: { status: FixStatus }) {
  const meta = STATUS_LABELS[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-[8px] py-[2px] text-[10px] font-medium ${meta.bg} ${meta.text}`}
    >
      {meta.label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[16px] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
      <div className="text-[11px] uppercase tracking-wide text-[#94A3B8] mb-[6px]">{label}</div>
      <div className="text-[26px] font-semibold text-[#0B1929] leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-[#94A3B8] mt-[4px]">{sub}</div>}
    </div>
  );
}

function buildFixPrompt(row: ErrorRow): string {
  return `Fix this error that occurred in production:

Error: ${row.message}
File: ${row.fix_filename ?? "(okänd)"}
Lines: ${row.fix_affected_lines ?? "(okänt)"}
Root cause: ${row.fix_root_cause ?? "(okänd)"}

Replace the content of ${row.fix_filename ?? "the affected file"} with this corrected code:

${row.fix_code ?? "(ingen kod tillgänglig)"}

Do NOT change any other files or logic. Only apply this specific fix.`;
}

export default function ErrorAdmin() {
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin();

  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [range, setRange] = useState<RangeKey>("7d");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Initial load + realtime
  useEffect(() => {
    if (!isPlatformAdmin) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (!cancelled) {
        if (error) {
          toast.error("Kunde inte ladda fel: " + error.message);
        } else {
          setErrors((data ?? []) as ErrorRow[]);
        }
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("error-logs-admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "error_logs" },
        (payload) => {
          const row = payload.new as ErrorRow;
          setErrors((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
          toast.error(`Nytt fel: ${row.message.slice(0, 60)}…`, {
            duration: 5000,
            action: { label: "Visa", onClick: () => setExpanded(row.id) },
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "error_logs" },
        (payload) => {
          const row = payload.new as ErrorRow;
          setErrors((prev) => prev.map((r) => (r.id === row.id ? row : r)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isPlatformAdmin]);

  // Filtering
  const filtered = useMemo(() => {
    const fromDate = rangeToDate(range);
    return errors.filter((e) => {
      if (fromDate && new Date(e.occurred_at) < fromDate) return false;
      if (tab === "manual" && e.fix_status !== "manual") return false;
      if (tab === "fixed" && e.fix_status !== "fixed") return false;
      if (tab === "failed" && e.fix_status !== "failed") return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !e.message.toLowerCase().includes(q) &&
          !e.error_id.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [errors, tab, range, search]);

  // KPIs (week-based per spec)
  const kpis = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const week = errors.filter((e) => new Date(e.occurred_at) >= weekAgo);
    return {
      total: week.length,
      fixed: week.filter((e) => e.fix_status === "fixed").length,
      manual: week.filter((e) => e.fix_status === "manual").length,
      failed: week.filter((e) => e.fix_status === "failed").length,
    };
  }, [errors]);

  // 14-day chart data
  const chartData = useMemo(() => {
    const days: { date: string; fel: number; fixade: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayErrors = errors.filter((e) => {
        const t = new Date(e.occurred_at);
        return t >= d && t < next;
      });
      days.push({
        date: d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" }),
        fel: dayErrors.length,
        fixade: dayErrors.filter((e) => e.fix_status === "fixed").length,
      });
    }
    return days;
  }, [errors]);

  // Top 5 most frequent errors (grouped by message prefix)
  const topErrors = useMemo(() => {
    const groups = new Map<
      string,
      { message: string; count: number; lastSeen: string; status: FixStatus }
    >();
    for (const e of errors) {
      const key = e.message.slice(0, 80);
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        if (e.occurred_at > existing.lastSeen) {
          existing.lastSeen = e.occurred_at;
          existing.status = e.fix_status;
        }
      } else {
        groups.set(key, {
          message: e.message,
          count: 1,
          lastSeen: e.occurred_at,
          status: e.fix_status,
        });
      }
    }
    return Array.from(groups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [errors]);

  // Actions
  async function triggerAnalysis(row: ErrorRow) {
    setAnalyzingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("fix-error", {
        body: {
          errorId: row.error_id,
          message: row.message,
          stack: row.stack,
          componentStack: row.component_stack,
          url: row.url,
          timestamp: row.occurred_at,
          breadcrumbs: row.breadcrumbs,
        },
      });
      if (error) throw error;
      if ((data as { status?: string })?.status === "failed") {
        toast.error("AI kunde inte analysera felet.");
      } else {
        toast.success("AI-analys klar");
      }
    } catch (err) {
      toast.error("Kunde inte köra AI-analys: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAnalyzingId(null);
    }
  }

  async function copyCode(row: ErrorRow) {
    if (!row.fix_code) {
      toast.error("Ingen kod tillgänglig");
      return;
    }
    try {
      await navigator.clipboard.writeText(row.fix_code);
      toast.success("Kopierad!");
    } catch {
      toast.error("Kunde inte kopiera");
    }
  }

  async function copyFixPrompt(row: ErrorRow) {
    try {
      await navigator.clipboard.writeText(buildFixPrompt(row));
      toast.success("Fix-prompt kopierad till urklipp");
    } catch {
      toast.error("Kunde inte kopiera prompt");
    }
  }

  async function markResolved(row: ErrorRow) {
    const { error } = await supabase
      .from("error_logs")
      .update({ fix_status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      toast.error("Kunde inte markera som löst: " + error.message);
    } else {
      toast.success("Markerad som löst");
    }
  }

  function exportReport() {
    const headers = [
      "error_id",
      "occurred_at",
      "message",
      "url",
      "fix_status",
      "fix_confidence",
      "fix_filename",
    ];
    const rows = filtered.map((e) =>
      headers
        .map((h) => {
          const v = (e as unknown as Record<string, unknown>)[h];
          if (v === null || v === undefined) return "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[#94A3B8]" />
      </div>
    );
  }
  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-[20px] space-y-[20px] max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-[8px]">
            <Bug className="w-[18px] h-[18px] text-[#475569]" strokeWidth={1.5} />
            <h1 className="text-[20px] font-medium text-[#0B1929]">Felhantering</h1>
          </div>
          <p className="text-[12px] text-[#94A3B8] mt-[2px]">
            Produktionsfel och AI-genererade fixar
          </p>
        </div>
        <button
          onClick={exportReport}
          className="inline-flex items-center gap-[6px] text-[12px] text-[#475569] hover:text-[#0B1929] px-[10px] h-[32px] rounded-[8px] hover:bg-[#F8FAFB]"
        >
          <Download className="w-[14px] h-[14px]" strokeWidth={1.5} />
          Exportera rapport
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
        <KpiCard label="Totala fel (denna vecka)" value={kpis.total} accent="#0040CC" />
        <KpiCard
          label="Auto-fixade"
          value={kpis.fixed}
          accent="#1D9E75"
          sub="av AI utan manuell åtgärd"
        />
        <KpiCard
          label="Kräver granskning"
          value={kpis.manual}
          accent={kpis.manual > 0 ? "#EF9F27" : "#94A3B8"}
          sub="väntar på din åtgärd"
        />
        <KpiCard
          label="Misslyckade"
          value={kpis.failed}
          accent={kpis.failed > 0 ? "#E24B4A" : "#94A3B8"}
        />
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[2px] bg-[#F1F5F9] rounded-[10px] p-[3px]">
          {(
            [
              { k: "all", l: "Alla" },
              { k: "manual", l: "Kräver granskning" },
              { k: "fixed", l: "Auto-fixade" },
              { k: "failed", l: "Misslyckade" },
            ] as { k: TabKey; l: string }[]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-[12px] h-[28px] rounded-[8px] text-[12px] font-medium transition-colors ${
                tab === t.k
                  ? "bg-white text-[#0B1929] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "text-[#475569] hover:text-[#0B1929]"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-[8px]">
          <div className="relative">
            <SearchIcon
              className="absolute left-[10px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#94A3B8]"
              strokeWidth={1.5}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök felmeddelande eller ID…"
              className="pl-[30px] pr-[12px] h-[32px] text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px] bg-white w-[260px] focus:outline-none focus:border-[#0040CC]"
            />
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="h-[32px] text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px] bg-white px-[10px] focus:outline-none focus:border-[#0040CC]"
          >
            <option value="24h">Senaste 24h</option>
            <option value="7d">7 dagar</option>
            <option value="30d">30 dagar</option>
            <option value="all">Alla</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-[#F8FAFB]">
            <tr className="text-[10px] uppercase tracking-wide text-[#94A3B8]">
              <th className="text-left font-medium px-[14px] py-[10px] w-[140px]">Tidpunkt</th>
              <th className="text-left font-medium px-[14px] py-[10px]">Felmeddelande</th>
              <th className="text-left font-medium px-[14px] py-[10px] w-[180px]">URL</th>
              <th className="text-left font-medium px-[14px] py-[10px] w-[140px]">Status</th>
              <th className="text-left font-medium px-[14px] py-[10px] w-[110px]">Konfidens</th>
              <th className="text-right font-medium px-[14px] py-[10px] w-[120px]">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-[40px] text-[#94A3B8]">
                  <Loader2 className="w-[18px] h-[18px] animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-[40px] text-[#94A3B8] text-[12px]">
                  Inga fel matchar filtret
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((row) => {
                const isOpen = expanded === row.id;
                return (
                  <ExpandableRow
                    key={row.id}
                    row={row}
                    isOpen={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : row.id)}
                    onAnalyze={() => triggerAnalysis(row)}
                    analyzing={analyzingId === row.id}
                    onCopyCode={() => copyCode(row)}
                    onCopyFixPrompt={() => copyFixPrompt(row)}
                    onMarkResolved={() => markResolved(row)}
                  />
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[12px]">
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[16px]">
          <div className="text-[13px] font-medium text-[#0B1929] mb-[12px]">Fel per dag</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "0.5px solid #E2E8F0",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="fel" fill="#E24B4A" name="Fel" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fixade" fill="#1D9E75" name="Auto-fixade" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[16px]">
          <div className="text-[13px] font-medium text-[#0B1929] mb-[12px]">
            Vanligaste fel (topp 5)
          </div>
          {topErrors.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8]">Inga fel registrerade.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[10px] uppercase text-[#94A3B8]">
                  <th className="text-left font-medium pb-[6px]">Felmeddelande</th>
                  <th className="text-right font-medium pb-[6px]">Antal</th>
                  <th className="text-left font-medium pb-[6px] pl-[10px]">Senast sedd</th>
                  <th className="text-left font-medium pb-[6px] pl-[10px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {topErrors.map((t, i) => (
                  <tr key={i} className="border-t-[0.5px] border-[#E2E8F0]">
                    <td className="py-[8px] pr-[8px] text-[#0B1929] truncate max-w-[200px]">
                      {t.message}
                    </td>
                    <td className="py-[8px] text-right text-[#475569] font-medium">{t.count}</td>
                    <td className="py-[8px] pl-[10px] text-[#94A3B8]">
                      {new Date(t.lastSeen).toLocaleString("sv-SE")}
                    </td>
                    <td className="py-[8px] pl-[10px]">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpandableRow({
  row,
  isOpen,
  onToggle,
  onAnalyze,
  analyzing,
  onCopyCode,
  onCopyFixPrompt,
  onMarkResolved,
}: {
  row: ErrorRow;
  isOpen: boolean;
  onToggle: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  onCopyCode: () => void;
  onCopyFixPrompt: () => void;
  onMarkResolved: () => void;
}) {
  return (
    <>
      <tr className="border-t-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB] cursor-pointer" onClick={onToggle}>
        <td className="px-[14px] py-[10px] text-[#475569] whitespace-nowrap">
          {new Date(row.occurred_at).toLocaleString("sv-SE", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>
        <td className="px-[14px] py-[10px] text-[#0B1929] truncate max-w-[420px]">
          <div className="flex items-center gap-[6px]">
            {isOpen ? (
              <ChevronDown className="w-[12px] h-[12px] text-[#94A3B8] shrink-0" />
            ) : (
              <ChevronRight className="w-[12px] h-[12px] text-[#94A3B8] shrink-0" />
            )}
            <span className="truncate">{row.message}</span>
          </div>
        </td>
        <td className="px-[14px] py-[10px] text-[#94A3B8] truncate max-w-[200px]">
          {row.url ? new URL(row.url).pathname : "—"}
        </td>
        <td className="px-[14px] py-[10px]">
          <StatusBadge status={row.fix_status} />
        </td>
        <td className="px-[14px] py-[10px]">
          <ConfidenceBadge value={row.fix_confidence} />
        </td>
        <td className="px-[14px] py-[10px] text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkResolved();
            }}
            className="text-[11px] text-[#94A3B8] hover:text-[#0040CC]"
            title="Markera som löst"
          >
            <CheckCircle2 className="w-[14px] h-[14px] inline" strokeWidth={1.5} />
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-[#F8FAFB] border-b-[0.5px] border-[#E2E8F0]">
          <td colSpan={6} className="p-[14px]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
              {/* LEFT — error details */}
              <div className="space-y-[10px]">
                <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">
                  Feldetaljer
                </div>
                <div className="text-[11px] font-mono text-[#475569]">{row.error_id}</div>
                <div className="text-[11px] text-[#94A3B8] break-all">{row.url ?? "—"}</div>
                {row.stack && (
                  <details>
                    <summary className="text-[11px] text-[#475569] cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="bg-[#0B1929] rounded-[8px] p-[10px] font-mono text-[10px] text-[#94A3B8] max-h-[200px] overflow-auto whitespace-pre-wrap mt-[6px]">
                      {row.stack}
                    </pre>
                  </details>
                )}
                <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] pt-[6px]">
                  Senaste actions (breadcrumbs)
                </div>
                {(row.breadcrumbs ?? []).length === 0 ? (
                  <p className="text-[11px] text-[#94A3B8]">Inga breadcrumbs.</p>
                ) : (
                  <ul className="space-y-[3px]">
                    {row.breadcrumbs.slice(-10).map((b, i) => (
                      <li key={i} className="flex items-start gap-[6px] text-[10px] text-[#475569]">
                        <span className="w-[5px] h-[5px] rounded-full bg-[#94A3B8] mt-[5px] shrink-0" />
                        <span className="flex-1">{b.description}</span>
                        <span className="text-[#94A3B8] shrink-0">
                          {b.timestamp ? new Date(b.timestamp).toLocaleTimeString("sv-SE") : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* RIGHT — AI fix */}
              <div className="space-y-[10px]">
                <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">AI-analys</div>
                {row.fix_analysis ? (
                  <>
                    <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[10px] p-[10px] flex gap-[8px]">
                      <Sparkles
                        className="w-[14px] h-[14px] text-[#185FA5] shrink-0 mt-[2px]"
                        strokeWidth={1.5}
                      />
                      <p className="text-[12px] text-[#185FA5]">{row.fix_analysis}</p>
                    </div>
                    <div className="flex items-center gap-[14px]">
                      {row.fix_confidence !== null && (
                        <div>
                          <div className="text-[24px] font-semibold text-[#0B1929] leading-none">
                            {row.fix_confidence}%
                          </div>
                          <div className="text-[10px] text-[#94A3B8]">konfidens</div>
                        </div>
                      )}
                      {row.fix_filename && (
                        <div className="text-[11px] font-mono text-[#475569]">
                          {row.fix_filename}
                          {row.fix_affected_lines && (
                            <span className="text-[#94A3B8]"> · rader {row.fix_affected_lines}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {row.fix_code && (
                      <>
                        <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] pt-[4px]">
                          Föreslagen kod
                        </div>
                        <pre className="bg-[#0B1929] rounded-[8px] p-[12px] font-mono text-[11px] text-[#94A3B8] leading-[1.6] max-h-[400px] overflow-auto whitespace-pre">
                          {row.fix_code}
                        </pre>
                      </>
                    )}
                    <div className="flex flex-wrap gap-[8px] pt-[4px]">
                      <button
                        onClick={onCopyCode}
                        disabled={!row.fix_code}
                        className="bg-[#0040CC] hover:bg-[#1074A0] disabled:opacity-50 disabled:cursor-not-allowed text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[36px] inline-flex items-center gap-[6px]"
                      >
                        <Copy className="w-[12px] h-[12px]" strokeWidth={1.5} />
                        Kopiera kod
                      </button>
                      <button
                        onClick={onCopyFixPrompt}
                        className="bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFB] rounded-[8px] text-[12px] px-[14px] h-[36px] inline-flex items-center gap-[6px]"
                      >
                        <ExternalLink className="w-[12px] h-[12px]" strokeWidth={1.5} />
                        Kopiera fix-prompt
                      </button>
                      <button
                        onClick={onMarkResolved}
                        className="text-[12px] text-[#94A3B8] hover:text-[#0040CC] px-[8px] h-[36px]"
                      >
                        Markera som löst
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-[8px]">
                    <p className="text-[12px] text-[#94A3B8]">
                      Ingen AI-analys ännu för detta fel.
                    </p>
                    <button
                      onClick={onAnalyze}
                      disabled={analyzing}
                      className="bg-[#0040CC] hover:bg-[#1074A0] disabled:opacity-60 text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[36px] inline-flex items-center gap-[6px]"
                    >
                      {analyzing ? (
                        <Loader2 className="w-[12px] h-[12px] animate-spin" />
                      ) : (
                        <Sparkles className="w-[12px] h-[12px]" strokeWidth={1.5} />
                      )}
                      {analyzing ? "Analyserar…" : "Analysera med AI"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
