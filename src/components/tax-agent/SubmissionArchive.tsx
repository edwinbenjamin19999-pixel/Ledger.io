import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Download, ChevronDown, ChevronRight, Eye, FileEdit,
  Search, FileText, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface SubmissionArchiveProps {
  companyId: string;
}

interface SubmissionRecord {
  id: string;
  type: "AGI" | "Moms" | "INK2" | "K10" | "F-skatt" | "KU";
  period: string;
  periodSortKey: string;
  submittedAt: string | null;
  referenceNumber: string | null;
  amount: number | null;
  status: "draft" | "submitted" | "approved" | "corrected" | "overdue";
  isSimulated: boolean;
  snapshotData?: Record<string, unknown>;
  isCorrection?: boolean;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const TYPE_COLORS: Record<string, string> = {
  AGI: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  Moms: "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5] dark:bg-cyan-900/30 dark:text-[#3b82f6] dark:border-[#3b82f6]",
  INK2: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  K10: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
  "F-skatt": "bg-[#F1F5F9] text-violet-700 border-[#E2E8F0] dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  KU: "bg-[#EFF6FF] text-blue-700 border-[#C8DDF5] dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-[#EFF6FF] text-blue-700 border-[#C8DDF5] dark:bg-blue-900/30 dark:text-blue-300",
  approved: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-emerald-900/30 dark:text-emerald-300",
  corrected: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-900/30 dark:text-amber-300",
  draft: "bg-muted text-muted-foreground border-border",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Inskickad",
  approved: "Godkänd",
  corrected: "Rättelse",
  draft: "Utkast",
  overdue: "Förfallen",
};

const YEARS = [2023, 2024, 2025, 2026];
const TYPES = ["Alla", "AGI", "Moms", "INK2", "K10", "KU", "F-skatt"] as const;
const STATUSES = ["Alla", "Inskickad", "Godkänd", "Rättelse", "Ej inskickad"] as const;

function parsePeriod(period: string): string {
  if (!period) return "—";
  const [y, m] = period.split("-");
  const mi = parseInt(m, 10) - 1;
  if (mi >= 0 && mi < 12) return `${MONTH_NAMES[mi]} ${y}`;
  return period;
}

export const SubmissionArchive = ({ companyId }: SubmissionArchiveProps) => {
  const [records, setRecords] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState("Alla");
  const [statusFilter, setStatusFilter] = useState("Alla");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadArchive = useCallback(async () => {
    setLoading(true);
    try {
      const allRecords: SubmissionRecord[] = [];

      // 1. AGI submissions
      const { data: agiSubs } = await supabase
        .from("payroll_agi_submissions")
        .select("id, period, status, submitted_at, skv_reference_number, total_to_pay, is_correction, data")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (agiSubs) {
        for (const s of agiSubs) {
          const periodStr = (s.period as string) || "";
          const yearPart = parseInt(periodStr.split("-")[0], 10);
          allRecords.push({
            id: `agi-${s.id}`,
            type: "AGI",
            period: parsePeriod(periodStr),
            periodSortKey: periodStr,
            submittedAt: s.submitted_at as string | null,
            referenceNumber: s.skv_reference_number as string | null,
            amount: (s.total_to_pay as number) ?? null,
            status: mapStatus(s.status as string),
            isSimulated: (s.skv_reference_number as string || "").startsWith("DEMO"),
            snapshotData: (s.data as Record<string, unknown>) ?? undefined,
            isCorrection: (s as Record<string, unknown>).is_correction === true,
          });
        }
      }

      // 2. VAT periods
      const { data: vatPeriods } = await supabase
        .from("vat_periods")
        .select("id, period_start, period_end, period_type, status, submitted_at, reference_number, ruta_values")
        .eq("company_id", companyId)
        .order("period_start", { ascending: false });

      if (vatPeriods) {
        for (const vp of vatPeriods) {
          const start = new Date(vp.period_start);
          const periodLabel = vp.period_type === "quarterly"
            ? `Q${Math.ceil((start.getMonth() + 1) / 3)} ${start.getFullYear()}`
            : `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
          const rutaValues = vp.ruta_values as Record<string, number> | null;
          allRecords.push({
            id: `vat-${vp.id}`,
            type: "Moms",
            period: periodLabel,
            periodSortKey: vp.period_start,
            submittedAt: vp.submitted_at,
            referenceNumber: vp.reference_number,
            amount: rutaValues?.["49"] ?? null,
            status: mapStatus(vp.status),
            isSimulated: (vp.reference_number || "").startsWith("DEMO"),
            snapshotData: rutaValues ?? undefined,
          });
        }
      }

      setRecords(allRecords);
    } catch (error) {
      console.error("Error loading archive:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadArchive(); }, [loadArchive]);

  function mapStatus(dbStatus: string): SubmissionRecord["status"] {
    if (dbStatus === "submitted") return "submitted";
    if (dbStatus === "approved" || dbStatus === "ready") return "approved";
    if (dbStatus === "corrected") return "corrected";
    if (dbStatus === "draft") return "draft";
    return "draft";
  }

  const filtered = useMemo(() => {
    return records.filter(r => {
      // Year filter
      const yearMatch = r.periodSortKey.includes(String(selectedYear)) || r.period.includes(String(selectedYear));
      if (!yearMatch) return false;

      // Type filter
      if (typeFilter !== "Alla" && r.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== "Alla") {
        const statusMap: Record<string, string[]> = {
          "Inskickad": ["submitted"],
          "Godkänd": ["approved"],
          "Rättelse": ["corrected"],
          "Ej inskickad": ["draft", "overdue"],
        };
        if (!statusMap[statusFilter]?.includes(r.status)) return false;
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !r.period.toLowerCase().includes(q) &&
          !(r.referenceNumber || "").toLowerCase().includes(q) &&
          !r.type.toLowerCase().includes(q)
        ) return false;
      }

      return true;
    });
  }, [records, selectedYear, typeFilter, statusFilter, searchQuery]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const submitted = filtered.filter(r => r.status === "submitted" || r.status === "approved").length;
    const corrections = filtered.filter(r => r.status === "corrected" || r.isCorrection).length;
    const overdue = filtered.filter(r => r.status === "draft" || r.status === "overdue").length;
    return { total, submitted, corrections, overdue };
  }, [filtered]);

  const handleExportCSV = () => {
    const header = "Typ,Period,Inlämnad,Referens,Belopp,Status\n";
    const rows = filtered.map(r =>
      [
        r.type,
        r.period,
        r.submittedAt ? format(new Date(r.submittedAt), "yyyy-MM-dd") : "—",
        r.referenceNumber || "—",
        r.amount != null ? r.amount.toString() : "—",
        STATUS_LABELS[r.status] || r.status,
      ].map(f => `"${f}"`).join(",")
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deklarationsarkiv-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtAmount = (n: number | null) => {
    if (n == null) return "—";
    const formatted = Math.abs(n).toLocaleString("sv-SE", { maximumFractionDigits: 0 });
    if (n < 0) return `−${formatted} kr`;
    return `${formatted} kr`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── FILTER TOOLBAR ─── */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Year pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium mr-1">År:</span>
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedYear === y
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Type chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium mr-1">Typ:</span>
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status chips + search */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Sök period eller referensnummer..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs w-64"
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5" />
                Exportera CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── SUMMARY STRIP ─── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Totalt</p>
        </div>
        <div className="rounded-lg border bg-[#E1F5EE] dark:bg-emerald-950/20 border-[#BFE6D6] dark:border-emerald-800 p-3 text-center">
          <p className="text-lg font-bold text-[#085041] dark:text-[#1D9E75]">{stats.submitted}</p>
          <p className="text-[10px] text-[#085041] dark:text-[#1D9E75]">Inskickade</p>
        </div>
        <div className="rounded-lg border bg-[#FAEEDA] dark:bg-amber-950/20 border-[#F0DDB7] dark:border-amber-800 p-3 text-center">
          <p className="text-lg font-bold text-[#7A5417] dark:text-[#C28A2B]">{stats.corrections}</p>
          <p className="text-[10px] text-[#7A5417] dark:text-[#C28A2B]">Rättelser</p>
        </div>
        <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 text-center">
          <p className="text-lg font-bold text-destructive">{stats.overdue}</p>
          <p className="text-[10px] text-destructive/80">Ej inskickade</p>
        </div>
      </div>

      {/* ─── ARCHIVE TABLE ─── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium text-muted-foreground">Inga deklarationer hittades</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Deklarationer du skickar in via Ledger.io visas här</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-xs">Typ</TableHead>
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs">Inlämnad</TableHead>
                  <TableHead className="text-xs">Referensnummer</TableHead>
                  <TableHead className="text-xs text-right">Belopp</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <ArchiveRow
                    key={r.id}
                    record={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    fmtAmount={fmtAmount}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Single archive row with expand ───
function ArchiveRow({
  record: r,
  expanded,
  onToggle,
  fmtAmount,
}: {
  record: SubmissionRecord;
  expanded: boolean;
  onToggle: () => void;
  fmtAmount: (n: number | null) => string;
}) {
  return (
    <>
      <TableRow className="group">
        <TableCell className="w-8 px-2">
          <button onClick={onToggle} className="p-1 rounded hover:bg-muted transition-colors">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[r.type] || "bg-muted text-muted-foreground"}`}>
            {r.type}
          </Badge>
        </TableCell>
        <TableCell className="text-xs font-medium">{r.period}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {r.submittedAt ? format(new Date(r.submittedAt), "d MMM yyyy", { locale: sv }) : "—"}
        </TableCell>
        <TableCell className="text-xs">
          {r.referenceNumber ? (
            <span className="font-mono">
              {r.referenceNumber}
              {r.isSimulated && (
                <Badge variant="outline" className="ml-1.5 text-[9px] bg-muted text-muted-foreground">Demo</Badge>
              )}
            </span>
          ) : "—"}
        </TableCell>
        <TableCell className={`text-xs text-right font-medium ${
          r.amount != null ? (r.amount < 0 ? "text-[#085041]" : "text-destructive") : "text-muted-foreground"
        }`}>
          {fmtAmount(r.amount)}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[r.status] || ""}`}>
            {r.isCorrection ? "Rättelse" : STATUS_LABELS[r.status] || r.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right space-x-1">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onToggle}>
            <Eye className="h-3 w-3 mr-1" />Visa
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
            <Download className="h-3 w-3 mr-1" />PDF
          </Button>
          {(r.status === "submitted" || r.status === "approved") && (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-[#F0DDB7] text-[#7A5417] hover:bg-[#FAEEDA] dark:text-amber-300 dark:hover:bg-amber-950/30">
              <FileEdit className="h-3 w-3 mr-1" />Rättelse
            </Button>
          )}
        </TableCell>
      </TableRow>

      {/* ─── INLINE DETAIL ─── */}
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={8} className="p-4">
            <InlineDetail record={r} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Inline detail expansion ───
function InlineDetail({ record }: { record: SubmissionRecord }) {
  const snap = record.snapshotData;

  return (
    <div className="space-y-3">
      {/* Timeline */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>Tidslinje:</span>
        {record.submittedAt && (
          <>
            <span>Inskickad {format(new Date(record.submittedAt), "d MMM yyyy HH:mm", { locale: sv })}</span>
          </>
        )}
        {record.isCorrection && (
          <>
            <span className="text-[#7A5417]">→ Korrigeringsdeklaration</span>
          </>
        )}
        {!record.submittedAt && <span>Ej inskickad ännu</span>}
      </div>

      {/* Snapshot data */}
      {snap && Object.keys(snap).length > 0 ? (
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium mb-2">
            {record.type === "Moms" ? "Ruta-värden" : "Inlämningsdata"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(snap)
              .filter(([, v]) => typeof v === "number" || typeof v === "string")
              .slice(0, 12)
              .map(([key, val]) => (
                <div key={key} className="border rounded px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground font-mono">{record.type === "Moms" ? `Ruta ${key}` : key}</p>
                  <p className="text-xs font-medium">
                    {typeof val === "number" ? val.toLocaleString("sv-SE") : String(val)}
                  </p>
                </div>
              ))}
          </div>
          {Object.keys(snap).length > 12 && (
            <p className="text-[10px] text-muted-foreground mt-2">...och {Object.keys(snap).length - 12} fler fält</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Ingen detaljdata sparad för denna deklaration</p>
      )}
    </div>
  );
}
