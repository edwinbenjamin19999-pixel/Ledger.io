import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  ArrowUpDown,
  Users,
  AlertOctagon,
  Sparkles,
  CheckCircle2,
  Mail,
  ListPlus,
  FileUp,
  X,
  ArrowRight,
} from "lucide-react";
import Fuse from "fuse.js";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useFirmClientsOps, type FirmClientOps } from "@/hooks/useFirmClientsOps";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AddClientDialog } from "@/components/firm/AddClientDialog";
import { BulkActionDialog } from "@/components/advisor/clients/BulkActionDialog";
import { WLClientRowMenu } from "@/components/advisor/actions/WLClientRowMenu";

type SortKey = "name" | "risk" | "assigned" | "profitability" | "lastActivity" | "bookkeeping" | "vat" | "annual";
type RiskFilter = "all" | "high" | "medium" | "low";
type DeadlineFilter = "all" | "vat_pending" | "ar_draft" | "overdue";

const STATUS_PILL = {
  ok: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  ready: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  filed: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  pending: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  draft: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  missing: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  late: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
  error: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
  none: "bg-slate-50 text-slate-500 border-slate-200",
} as const;

const STATUS_LABEL = {
  bookkeeping: { ok: "OK", missing: "Saknas", error: "Fel" },
  vat: { ready: "Klar", pending: "Pågår", late: "Sen", none: "—" },
  annual: { filed: "Inlämnad", ready: "Klar", draft: "Utkast", none: "—" },
} as const;

const fmtSEK = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
};

const fmtRelative = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Idag";
  if (days === 1) return "Igår";
  if (days < 7) return `${days} d sedan`;
  if (days < 30) return `${Math.floor(days / 7)} v sedan`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
};

const RiskMeter = ({ score }: { score: number }) => {
  const tone = score >= 70 ? "rose" : score >= 40 ? "amber" : "emerald";
  const bg = tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-500" : "bg-emerald-500";
  const text = tone === "rose" ? "text-[#7A1A1A]" : tone === "amber" ? "text-[#7A5417]" : "text-[#085041]";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${bg}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${text}`}>{score}</span>
    </div>
  );
};

const StatusPill = ({ kind, value }: { kind: "bookkeeping" | "vat" | "annual"; value: string }) => {
  const label =
    (STATUS_LABEL[kind] as Record<string, string>)[value] ?? "—";
  const cls = (STATUS_PILL as Record<string, string>)[value] ?? STATUS_PILL.none;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const AdvisorClients = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { firmId, clients, isLoading } = useAdvisorContext();
  const { setActiveClient } = useAdvisorActiveClient();
  const { data: ops, isLoading: opsLoading } = useFirmClientsOps(firmId ?? "", clients);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "risk", dir: "desc" });
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>(
    (params.get("filter") === "critical" ? "high" : "all") as RiskFilter,
  );
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<null | "reminder" | "task" | "documents">(null);

  const rows = ops ?? [];

  const fuse = useMemo(
    () => new Fuse(rows, { keys: ["name", "org_number", "assignedName"], threshold: 0.32, ignoreLocation: true }),
    [rows],
  );

  const consultants = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      if (r.assignedConsultantId) m.set(r.assignedConsultantId, r.assignedName);
    });
    return Array.from(m.entries());
  }, [rows]);

  // Derived filtered + sorted list
  const visible = useMemo(() => {
    let list: FirmClientOps[] = q.trim() ? fuse.search(q.trim()).map((r) => r.item) : [...rows];

    if (assignedFilter !== "all") {
      list = list.filter((r) =>
        assignedFilter === "unassigned" ? !r.assignedConsultantId : r.assignedConsultantId === assignedFilter,
      );
    }
    if (riskFilter !== "all") {
      list = list.filter((r) =>
        riskFilter === "high" ? r.riskScore >= 70 : riskFilter === "medium" ? r.riskScore >= 40 && r.riskScore < 70 : r.riskScore < 40,
      );
    }
    if (deadlineFilter !== "all") {
      list = list.filter((r) => {
        if (deadlineFilter === "vat_pending") return r.vatStatus === "pending" || r.vatStatus === "late";
        if (deadlineFilter === "ar_draft") return r.annualStatus === "draft" || r.annualStatus === "ready";
        if (deadlineFilter === "overdue") return r.overdueInvoices > 0;
        return true;
      });
    }

    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.key) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "risk": return (a.riskScore - b.riskScore) * dir;
        case "assigned": return a.assignedName.localeCompare(b.assignedName) * dir;
        case "profitability": return ((a.profitability ?? -Infinity) - (b.profitability ?? -Infinity)) * dir;
        case "lastActivity":
          return ((a.lastActivity ? new Date(a.lastActivity).getTime() : 0) -
            (b.lastActivity ? new Date(b.lastActivity).getTime() : 0)) * dir;
        case "bookkeeping": return a.bookkeepingStatus.localeCompare(b.bookkeepingStatus) * dir;
        case "vat": return a.vatStatus.localeCompare(b.vatStatus) * dir;
        case "annual": return a.annualStatus.localeCompare(b.annualStatus) * dir;
        default: return 0;
      }
    });
    return list;
  }, [rows, fuse, q, assignedFilter, riskFilter, deadlineFilter, sort]);

  // Cross-link: ?focus=<id>
  useEffect(() => {
    const focusId = params.get("focus");
    if (focusId && rows.length > 0) {
      const target = rows.find((r) => r.id === focusId);
      if (target) {
        setActiveClient({ id: target.id, name: target.name, orgNumber: target.org_number });
        params.delete("focus");
        setParams(params, { replace: true });
        navigate("/dashboard");
      }
    }
  }, [params, rows, setActiveClient, navigate, setParams]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const open = (c: FirmClientOps) => {
    setActiveClient({ id: c.id, name: c.name, orgNumber: c.org_number });
    navigate("/dashboard");
  };

  const allOnPageSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const togglePageSelect = () => {
    const next = new Set(selected);
    if (allOnPageSelected) visible.forEach((r) => next.delete(r.id));
    else visible.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleRowSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // AI alerts
  const riskyCount = rows.filter((r) => r.riskScore >= 70).length;
  const vatRisky = rows.filter((r) => r.vatStatus === "pending" || r.vatStatus === "late").slice(0, 3);
  const unprofitable = rows.filter((r) => r.profitability !== null && r.profitability < 0);
  const missingData = rows.filter((r) => r.bookkeepingStatus === "missing" || r.bookkeepingStatus === "error").length;

  const Th = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th className={`py-3 px-4 text-${align} bg-[#F8FAFC] sticky top-0 z-10`}>
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-bold text-[#94A3B8] hover:text-[#0F172A]"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  // Empty state — no clients at all
  if (clients.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div
          className="rounded-3xl bg-white p-12 text-center"
          style={{
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 30px 80px rgba(15,23,42,0.06)",
          }}
        >
          <div
            className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "hsl(var(--brand-primary) / 0.1)" }}
          >
            <Users className="h-7 w-7" style={{ color: "hsl(var(--brand-primary))" }} />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Inga klienter ännu</h2>
          <p className="mt-2 text-sm text-[#64748B] max-w-md mx-auto">
            Lägg till din första klient för att börja hantera bokföring, moms och årsredovisningar.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: "hsl(var(--brand-primary))" }}
          >
            <Plus className="h-4 w-4" />
            Lägg till första klienten
          </button>
        </div>
        {firmId && (
          <AddClientDialog
            firmId={firmId}
            open={addOpen}
            onOpenChange={setAddOpen}
            onClientAdded={() => setAddOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">Klienter</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {rows.length} totalt · {riskyCount} hög risk · klicka för att öppna klientdetalj
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: "hsl(var(--brand-primary))" }}
        >
          <Plus className="h-4 w-4" />
          Lägg till klient
        </button>
      </div>

      {/* Sticky filters */}
      <div
        className="sticky top-0 z-30 -mx-6 md:-mx-8 px-6 md:px-8 py-3 backdrop-blur bg-white/85 border-b border-[#F1F5F9]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sök klient, org.nr eller ansvarig..."
              className="w-full h-10 rounded-xl bg-white pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary)/0.25)]"
              style={{ border: "1px solid rgba(15,23,42,0.08)" }}
            />
          </div>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="h-[26px] rounded-full bg-white px-[10px] text-[11px] text-[#475569] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary)/0.25)]"
            style={{ border: "0.5px solid #E2E8F0" }}
          >
            <option value="all">Alla ansvariga</option>
            <option value="unassigned">Ej tilldelad</option>
            {consultants.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1.5">
            {(["all", "high", "medium", "low"] as RiskFilter[]).map((r) => {
              const active = riskFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`rounded-full px-[10px] py-[3px] text-[11px] transition-colors ${
                    active
                      ? "bg-[#0B4F6C] text-[#E6F4FA]"
                      : "bg-white text-[#475569] hover:text-[#0F172A]"
                  }`}
                  style={!active ? { border: "0.5px solid #E2E8F0" } : undefined}
                >
                  {r === "all" ? "Alla risk" : r === "high" ? "Hög" : r === "medium" ? "Medel" : "Låg"}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-1.5">
            {([
              ["all", "Alla deadlines"],
              ["vat_pending", "Moms pågår"],
              ["ar_draft", "ÅR utkast"],
              ["overdue", "Förfallna"],
            ] as Array<[DeadlineFilter, string]>).map(([k, label]) => {
              const active = deadlineFilter === k;
              return (
                <button
                  key={k}
                  onClick={() => setDeadlineFilter(k)}
                  className={`rounded-full px-[10px] py-[3px] text-[11px] transition-colors ${
                    active
                      ? "bg-[#0B4F6C] text-[#E6F4FA]"
                      : "bg-white text-[#475569] hover:text-[#0F172A]"
                  }`}
                  style={!active ? { border: "0.5px solid #E2E8F0" } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>


          {(q || assignedFilter !== "all" || riskFilter !== "all" || deadlineFilter !== "all") && (
            <button
              onClick={() => {
                setQ("");
                setAssignedFilter("all");
                setRiskFilter("all");
                setDeadlineFilter("all");
              }}
              className="inline-flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] px-2"
            >
              <X className="h-3 w-3" /> Rensa
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="sticky top-[68px] z-20 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3"
          style={{
            background: "hsl(var(--brand-primary))",
            color: "white",
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-semibold">{selected.size} valda</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => setBulkMode("reminder")} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold transition-colors">
              <Mail className="h-3.5 w-3.5" /> Påminnelse
            </button>
            <button onClick={() => setBulkMode("task")} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold transition-colors">
              <ListPlus className="h-3.5 w-3.5" /> Uppgift
            </button>
            <button onClick={() => setBulkMode("documents")} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold transition-colors">
              <FileUp className="h-3.5 w-3.5" /> Dokument
            </button>
            <button onClick={() => setSelected(new Set())} className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white px-2">
              <X className="h-3 w-3" /> Rensa
            </button>
          </div>
        </div>
      )}

      {/* TABLE + CARD HYBRID */}
      <div
        className="rounded-3xl bg-white overflow-hidden"
        style={{
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 30px 80px rgba(15,23,42,0.06)",
        }}
      >
        <div className="overflow-x-auto max-h-[calc(100vh-340px)]">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-3 pl-4 pr-2 bg-[#F8FAFC] sticky top-0 z-10 w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={togglePageSelect}
                    className="h-4 w-4 rounded border-[#CBD5E1] cursor-pointer"
                  />
                </th>
                <Th k="name" label="Klient" />
                <Th k="bookkeeping" label="Bokföring" />
                <Th k="vat" label="Moms" />
                <Th k="annual" label="ÅR" />
                <Th k="risk" label="Risk" />
                <Th k="assigned" label="Ansvarig" />
                <Th k="profitability" label="Lönsamhet 12m" align="right" />
                <Th k="lastActivity" label="Senast aktiv" align="right" />
                <th className="py-3 px-2 bg-[#F8FAFC] sticky top-0 z-10 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {opsLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              )}
              {!opsLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-[#64748B]">
                    Inga klienter matchar filtren.
                  </td>
                </tr>
              )}
              {visible.map((c) => {
                const isSel = selected.has(c.id);
                const profTone = c.profitability === null
                  ? "text-[#94A3B8]"
                  : c.profitability >= 0
                  ? "text-[#085041]"
                  : "text-[#7A1A1A]";
                return (
                  <tr
                    key={c.id}
                    onClick={() => open(c)}
                    className={`border-b border-[#F8FAFC] last:border-0 cursor-pointer transition-colors ${
                      isSel ? "bg-[hsl(var(--brand-primary)/0.04)]" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleRowSelect(c.id)}
                        className="h-4 w-4 rounded border-[#CBD5E1] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F172A]">{c.name}</div>
                      <div className="text-[11px] text-[#94A3B8]">{c.org_number}</div>
                    </td>
                    <td className="py-3 px-4"><StatusPill kind="bookkeeping" value={c.bookkeepingStatus} /></td>
                    <td className="py-3 px-4"><StatusPill kind="vat" value={c.vatStatus} /></td>
                    <td className="py-3 px-4"><StatusPill kind="annual" value={c.annualStatus} /></td>
                    <td className="py-3 px-4"><RiskMeter score={c.riskScore} /></td>
                    <td className="py-3 px-4 text-[#64748B] text-xs">{c.assignedName}</td>
                    <td className={`py-3 px-4 text-right tabular-nums font-semibold ${profTone}`}>
                      {fmtSEK(c.profitability)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-[#64748B]">{fmtRelative(c.lastActivity)}</td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <WLClientRowMenu companyId={c.id} companyName={c.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI ALERT BAR */}
      <div
        className="rounded-3xl p-5 flex flex-wrap items-start gap-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--brand-primary) / 0.06), hsl(var(--brand-primary) / 0.01))",
          border: "1px solid hsl(var(--brand-primary) / 0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(var(--brand-primary) / 0.12)", color: "hsl(var(--brand-primary))" }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#64748B]">AI-larm</p>
            <p className="text-xs text-[#0F172A] font-semibold">Prioriteringsförslag baserat på portföljen</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 flex-1 justify-end">
          {vatRisky.length > 0 && (
            <button
              onClick={() => setDeadlineFilter("vat_pending")}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs hover:-translate-y-0.5 transition-all"
              style={{ border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <AlertOctagon className="h-3.5 w-3.5 text-[#7A5417]" />
              <span className="font-semibold text-[#0F172A]">{vatRisky.length} klienter riskerar fel moms</span>
              <ArrowRight className="h-3 w-3 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {unprofitable.length > 0 && (
            <button
              onClick={() => {
                setSort({ key: "profitability", dir: "asc" });
              }}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs hover:-translate-y-0.5 transition-all"
              style={{ border: "1px solid rgba(244,63,94,0.3)" }}
            >
              <AlertOctagon className="h-3.5 w-3.5 text-[#7A1A1A]" />
              <span className="font-semibold text-[#0F172A]">
                {unprofitable.length} olönsam{unprofitable.length === 1 ? "" : "ma"} klient{unprofitable.length === 1 ? "" : "er"}
              </span>
              <ArrowRight className="h-3 w-3 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {missingData > 0 && (
            <button
              onClick={() => setRiskFilter("high")}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs hover:-translate-y-0.5 transition-all"
              style={{ border: "1px solid rgba(15,23,42,0.08)" }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(var(--brand-primary))" }} />
              <span className="font-semibold text-[#0F172A]">{missingData} med saknad bokföringsdata</span>
              <ArrowRight className="h-3 w-3 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {vatRisky.length === 0 && unprofitable.length === 0 && missingData === 0 && (
            <span className="text-xs text-[#64748B]">Inga AI-larm just nu — portföljen ser stabil ut.</span>
          )}
        </div>
      </div>

      {firmId && (
        <AddClientDialog
          firmId={firmId}
          open={addOpen}
          onOpenChange={setAddOpen}
          onClientAdded={() => setAddOpen(false)}
        />
      )}
      {bulkMode && (
        <BulkActionDialog
          open={!!bulkMode}
          onOpenChange={(v) => !v && setBulkMode(null)}
          mode={bulkMode}
          selectedIds={Array.from(selected)}
          selectedNames={rows.filter((r) => selected.has(r.id)).map((r) => r.name)}
        />
      )}
    </div>
  );
};

export default AdvisorClients;
