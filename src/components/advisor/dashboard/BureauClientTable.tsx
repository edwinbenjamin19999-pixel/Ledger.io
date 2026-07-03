import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, MoreVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { useBureauSync } from "@/hooks/useBureauSync";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import type { BureauClientSummary } from "@/services/bureauClientSync";
import { BulkActionDialog } from "@/components/advisor/clients/BulkActionDialog";
import { AddClientDialog } from "@/components/firm/AddClientDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type StatusFilter = "all" | "critical" | "watch" | "ok" | "onboarding";
type SortKey =
  | "name"
  | "status"
  | "risk"
  | "vat"
  | "overdue"
  | "missing"
  | "bank"
  | "revenue";

const fmtSEK = (n: number) =>
  n === 0
    ? "—"
    : new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "—";

const daysFrom = (d: string | null) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 3600 * 24));
};

const daysSince = (d: string | null) => {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 3600 * 24));
};

const riskLevel = (s: BureauClientSummary): "critical" | "warning" | "watch" | "safe" => {
  const score =
    (s.overdue_customer_invoices_count > 5 ? 3 : s.overdue_customer_invoices_count > 0 ? 1 : 0) +
    (s.missing_receipts_count > 10 ? 2 : s.missing_receipts_count > 0 ? 1 : 0) +
    (s.unreconciled_transactions > 20 ? 2 : 0);
  if (score >= 5) return "critical";
  if (score >= 3) return "warning";
  if (score >= 1) return "watch";
  return "safe";
};

const RiskDots = ({ level }: { level: "critical" | "warning" | "watch" | "safe" }) => {
  const colors = {
    critical: ["#E24B4A", "#E24B4A", "#E24B4A"],
    warning: ["#EF9F27", "#EF9F27", "#E2E8F0"],
    watch: ["#EF9F27", "#E2E8F0", "#E2E8F0"],
    safe: ["#1D9E75", "#1D9E75", "#1D9E75"],
  } as const;
  return (
    <div className="flex gap-1">
      {colors[level].map((c, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      ))}
    </div>
  );
};

const StatusBadge = ({ status }: { status: BureauClientSummary["client_status"] }) => {
  const styles = {
    active: { bg: "#E1F5EE", text: "#085041" },
    watch: { bg: "#FAEEDA", text: "#7A5417" },
    paused: { bg: "#F1F5F9", text: "#475569" },
    onboarding: { bg: "#EFF6FF", text: "#0C447C" },
  } as const;
  const labels = { active: "Aktiv", watch: "Bevakas", paused: "Pausad", onboarding: "Onboarding" } as const;
  const s = styles[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {labels[status]}
    </span>
  );
};

const FILTER_PILLS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Alla" },
  { id: "critical", label: "Kritiska" },
  { id: "watch", label: "Bevakas" },
  { id: "ok", label: "Okej" },
  { id: "onboarding", label: "Onboarding" },
];

interface Props {
  onAddClient?: () => void;
}

export const BureauClientTable = ({ onAddClient }: Props) => {
  const { summaries, isLoading } = useBureauSync();
  const { setActiveClient } = useAdvisorActiveClient();
  const { firmId } = useAdvisorContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "risk", dir: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignName, setAssignName] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);

  const handleAddClick = () => {
    if (onAddClient) {
      onAddClient();
      return;
    }
    if (!firmId) {
      toast.error("Byrå-kontext saknas — kan inte lägga till klient just nu.");
      return;
    }
    setAddClientOpen(true);
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = summaries.map((s) => ({ ...s, _risk: riskLevel(s) }));
    if (term) {
      list = list.filter(
        (s) => s.company_name.toLowerCase().includes(term) || s.org_number.includes(term),
      );
    }
    if (filter !== "all") {
      list = list.filter((s) => {
        if (filter === "critical") return s._risk === "critical";
        if (filter === "watch") return s.client_status === "watch" || s._risk === "warning";
        if (filter === "ok") return s._risk === "safe" && s.client_status === "active";
        if (filter === "onboarding") return s.client_status === "onboarding";
        return true;
      });
    }
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "name":
          return a.company_name.localeCompare(b.company_name) * dir;
        case "status":
          return a.client_status.localeCompare(b.client_status) * dir;
        case "risk": {
          const o = { critical: 4, warning: 3, watch: 2, safe: 1 } as const;
          return (o[a._risk] - o[b._risk]) * dir;
        }
        case "vat":
          return ((daysFrom(a.vat_next_deadline) ?? 9999) - (daysFrom(b.vat_next_deadline) ?? 9999)) * dir;
        case "overdue":
          return (a.overdue_customer_invoices_amount - b.overdue_customer_invoices_amount) * dir;
        case "missing":
          return (a.missing_receipts_count - b.missing_receipts_count) * dir;
        case "bank":
          return ((daysSince(a.last_bookkeeping_date) ?? 0) - (daysSince(b.last_bookkeeping_date) ?? 0)) * dir;
        case "revenue":
          return (a.annual_revenue_12m - b.annual_revenue_12m) * dir;
      }
    });
    return list;
  }, [summaries, search, filter, sort]);

  const toggle = (k: SortKey) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "desc" }));

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.company_id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.company_id)));
  const toggleOne = (id: string) =>
    setSelected((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const open = (s: BureauClientSummary) => {
    setActiveClient({ id: s.company_id, name: s.company_name, orgNumber: s.org_number });
    // Enter the standard Ledger.io dashboard scoped to this client.
    // The cyan "Byråöversikt" banner shown on every standard page lets the
    // advisor jump back to the bureau overview at any time.
    navigate("/dashboard");
  };

  const Th = ({ k, label, w, align = "left" }: { k: SortKey; label: string; w: number; align?: "left" | "right" }) => (
    <th className="bg-[#F8FAFB] py-2 px-2.5" style={{ width: w, borderBottom: "0.5px solid #E2E8F0", textAlign: align }}>
      <button
        onClick={() => toggle(k)}
        className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] hover:text-[#0F172A]"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[14px] font-medium text-[#0F172A]">Klientportfölj</h3>
          <span className="text-[12px] text-[#94A3B8]">{rows.length} klienter</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök klient eller org.nr…"
            className="bg-[#F8FAFB] rounded-[8px] px-[10px] h-[34px] text-[12px] focus:outline-none focus:bg-white"
            style={{ border: "0.5px solid #E2E8F0", minWidth: 200 }}
          />
          <div className="flex gap-1">
            {FILTER_PILLS.map((p) => {
              const active = filter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setFilter(p.id)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={
                    active
                      ? { background: "#EFF6FF", color: "#0C447C", border: "0.5px solid #85B7EB" }
                      : { background: "#FFFFFF", color: "#64748B", border: "0.5px solid #E2E8F0" }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleAddClick}
            className="inline-flex items-center gap-1 rounded-[8px] bg-[#0B1929] text-white text-[12px] font-semibold h-[34px] px-3 hover:bg-[#142a44]"
          >
            <Plus className="h-3.5 w-3.5" /> Lägg till klient
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "0.5px solid #E2E8F0" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th className="bg-[#F8FAFB] py-2 px-2.5" style={{ width: 34, borderBottom: "0.5px solid #E2E8F0" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" />
                </th>
                <Th k="name" label="Klient" w={200} />
                <Th k="status" label="Status" w={90} />
                <Th k="risk" label="Risk" w={60} />
                <th className="bg-[#F8FAFB] py-2 px-2.5 text-left text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]" style={{ width: 60, borderBottom: "0.5px solid #E2E8F0" }}>
                  Ansvarig
                </th>
                <Th k="vat" label="Moms nästa" w={110} />
                <Th k="overdue" label="Förfallna fakt." w={110} />
                <Th k="missing" label="Saknar underlag" w={110} />
                <Th k="bank" label="Bankavstämning" w={110} />
                <Th k="revenue" label="Omsättning 12M" w={120} align="right" />
                <th className="bg-[#F8FAFB] py-2 px-2.5" style={{ width: 40, borderBottom: "0.5px solid #E2E8F0" }} />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#94A3B8] text-[12px]">
                    Laddar klientdata…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#94A3B8] text-[12px]">
                    Inga klienter matchar filtret.
                  </td>
                </tr>
              )}
              {rows.map((s) => {
                const days = daysFrom(s.vat_next_deadline);
                const dayClass =
                  days === null
                    ? "text-[#94A3B8]"
                    : days < 3
                      ? "text-[#791F1F]"
                      : days < 7
                        ? "text-[#7A5417]"
                        : "text-[#94A3B8]";
                const rowBg =
                  s._risk === "critical" ? "#FFF8F8" : s._risk === "warning" ? "#FFFBF0" : "#FFFFFF";
                const isExpanded = expanded === s.company_id;

                return (
                  <>
                    <tr
                      key={s.company_id}
                      onClick={() => setExpanded(isExpanded ? null : s.company_id)}
                      className="cursor-pointer hover:bg-[#F8FAFB] transition-colors"
                      style={{ background: rowBg, borderBottom: "0.5px solid #F1F5F9" }}
                    >
                      <td className="py-2.5 px-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(s.company_id)}
                          onChange={() => toggleOne(s.company_id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="text-[12px] font-medium text-[#0F172A] truncate">{s.company_name}</div>
                        <div className="font-mono text-[10px] text-[#94A3B8]">{s.org_number}</div>
                      </td>
                      <td className="py-2.5 px-2.5"><StatusBadge status={s.client_status} /></td>
                      <td className="py-2.5 px-2.5"><RiskDots level={s._risk} /></td>
                      <td className="py-2.5 px-2.5">
                        <div className="h-6 w-6 rounded-full bg-[#EFF6FF] text-[#0C447C] text-[10px] font-bold flex items-center justify-center">
                          {s.assigned_accountant_id ? s.assigned_accountant_id.slice(0, 2).toUpperCase() : "—"}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="text-[12px] text-[#0F172A]">{fmtDate(s.vat_next_deadline)}</div>
                        <div className={`text-[10px] ${dayClass}`}>
                          {days === null ? "" : days < 0 ? `${Math.abs(days)} d försenat` : `om ${days} d`}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className={`text-[12px] font-medium ${s.overdue_customer_invoices_amount > 0 ? "text-[#791F1F]" : "text-[#94A3B8]"}`}>
                          {fmtSEK(s.overdue_customer_invoices_amount)}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {s.overdue_customer_invoices_count > 0 ? `${s.overdue_customer_invoices_count} st` : ""}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-[12px] text-[#0F172A]">
                        {s.missing_receipts_count > 0 ? s.missing_receipts_count : "—"}
                      </td>
                      <td className="py-2.5 px-2.5 text-[12px] text-[#0F172A]">
                        {(() => {
                          const d = daysSince(s.last_bookkeeping_date);
                          return d === null ? "—" : `${d} d sedan`;
                        })()}
                      </td>
                      <td className="py-2.5 px-2.5 text-[12px] text-right tabular-nums text-[#0F172A]">
                        {fmtSEK(s.annual_revenue_12m)}
                      </td>
                      <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button className="text-[#94A3B8] hover:text-[#0F172A]">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: "#F8FAFB", borderBottom: "0.5px solid #E2E8F0" }}>
                        <td />
                        <td colSpan={10} className="py-3 px-2.5">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.08em] text-[#94A3B8] mb-1.5">KPI:er</div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between rounded-md bg-white px-2 py-1.5" style={{ border: "0.5px solid #E2E8F0" }}>
                                  <span className="text-[11px] text-[#64748B]">Kassa & bank</span>
                                  <span className="text-[11px] font-semibold text-[#0F172A]">{fmtSEK(s.cash_balance)}</span>
                                </div>
                                <div className="flex justify-between rounded-md bg-white px-2 py-1.5" style={{ border: "0.5px solid #E2E8F0" }}>
                                  <span className="text-[11px] text-[#64748B]">Resultat MTD</span>
                                  <span className="text-[11px] font-semibold text-[#0F172A]">{fmtSEK(s.current_month_result)}</span>
                                </div>
                                <div className="flex justify-between rounded-md bg-white px-2 py-1.5" style={{ border: "0.5px solid #E2E8F0" }}>
                                  <span className="text-[11px] text-[#64748B]">Moms att betala</span>
                                  <span className="text-[11px] font-semibold text-[#0F172A]">{fmtSEK(s.vat_amount_due)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.08em] text-[#94A3B8] mb-1.5">AI-signaler</div>
                              <ul className="space-y-1">
                                {s.overdue_customer_invoices_count > 0 && (
                                  <li className="flex items-center gap-2 text-[11px] text-[#475569]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#E24B4A]" />
                                    {s.overdue_customer_invoices_count} förfallna kundfakturor
                                  </li>
                                )}
                                {s.missing_receipts_count > 5 && (
                                  <li className="flex items-center gap-2 text-[11px] text-[#475569]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#EF9F27]" />
                                    {s.missing_receipts_count} saknar underlag
                                  </li>
                                )}
                                {s.unreconciled_transactions > 10 && (
                                  <li className="flex items-center gap-2 text-[11px] text-[#475569]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#EF9F27]" />
                                    {s.unreconciled_transactions} oavstämda banktransaktioner
                                  </li>
                                )}
                                {s.overdue_customer_invoices_count === 0 && s.missing_receipts_count <= 5 && s.unreconciled_transactions <= 10 && (
                                  <li className="flex items-center gap-2 text-[11px] text-[#085041]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
                                    Inga aktiva signaler
                                  </li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.08em] text-[#94A3B8] mb-1.5">Snabbåtgärder</div>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => open(s)}
                                  className="rounded-md bg-[#0B1929] text-white text-[11px] font-semibold px-2.5 py-1.5 hover:bg-[#142a44]"
                                >
                                  Öppna klient
                                </button>
                                <div className="flex gap-1.5">
                                  <button className="flex-1 rounded-md bg-white text-[11px] text-[#475569] px-2.5 py-1.5 hover:bg-[#F1F5F9]" style={{ border: "0.5px solid #E2E8F0" }}>
                                    Logga tid
                                  </button>
                                  <button className="flex-1 rounded-md bg-white text-[11px] text-[#475569] px-2.5 py-1.5 hover:bg-[#F1F5F9]" style={{ border: "0.5px solid #E2E8F0" }}>
                                    Skicka rapport
                                  </button>
                                </div>
                                <button className="rounded-md bg-white text-[11px] text-[#475569] px-2.5 py-1.5 hover:bg-[#F1F5F9]" style={{ border: "0.5px solid #E2E8F0" }}>
                                  Anteckna
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-5 py-2.5 flex items-center justify-between"
          style={{ background: "#0B1929", borderTop: "0.5px solid rgba(255,255,255,0.08)" }}
        >
          <span className="text-[12px] text-white font-semibold">
            {selected.size} klient{selected.size === 1 ? "" : "er"} valda
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReminderOpen(true)}
              className="rounded-md text-white/80 text-[11px] px-3 py-1.5 hover:bg-white/[0.08]"
              style={{ border: "0.5px solid rgba(255,255,255,0.20)" }}
            >
              Skicka påminnelse
            </button>
            <button
              type="button"
              onClick={() => {
                const picked = rows.filter((r) => selected.has(r.company_id));
                if (picked.length === 0) {
                  toast.error("Inga klienter valda");
                  return;
                }
                const headers = [
                  "Klient",
                  "Org.nr",
                  "Status",
                  "Risk",
                  "Förfallna fakt. (antal)",
                  "Förfallna fakt. (SEK)",
                  "Saknar underlag",
                  "Oavstämda transaktioner",
                  "Senaste bokföring",
                  "Nästa moms",
                  "Omsättning 12m",
                ];
                const escape = (v: string | number | null | undefined) => {
                  const s = v === null || v === undefined ? "" : String(v);
                  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                };
                const lines = [
                  headers.join(";"),
                  ...picked.map((r) =>
                    [
                      r.company_name,
                      r.org_number,
                      r.client_status,
                      r._risk,
                      r.overdue_customer_invoices_count,
                      r.overdue_customer_invoices_amount,
                      r.missing_receipts_count,
                      r.unreconciled_transactions,
                      r.last_bookkeeping_date ?? "",
                      r.vat_next_deadline ?? "",
                      r.annual_revenue_12m,
                    ]
                      .map(escape)
                      .join(";"),
                  ),
                ];
                const blob = new Blob(["\uFEFF" + lines.join("\n")], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `klientportfolj-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success(`Exporterade ${picked.length} klienter`);
              }}
              className="rounded-md text-white/80 text-[11px] px-3 py-1.5 hover:bg-white/[0.08]"
              style={{ border: "0.5px solid rgba(255,255,255,0.20)" }}
            >
              Exportera rapporter
            </button>
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="rounded-md text-white/80 text-[11px] px-3 py-1.5 hover:bg-white/[0.08]"
              style={{ border: "0.5px solid rgba(255,255,255,0.20)" }}
            >
              Tilldela handläggare
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md text-white/60 text-[11px] px-3 py-1.5 hover:bg-white/[0.08]"
            >
              Avmarkera
            </button>
          </div>
        </div>
      )}

      <BulkActionDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        mode="reminder"
        selectedIds={rows.filter((r) => selected.has(r.company_id)).map((r) => r.company_id)}
        selectedNames={rows.filter((r) => selected.has(r.company_id)).map((r) => r.company_name)}
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tilldela handläggare</DialogTitle>
            <DialogDescription>
              Tilldela {selected.size} klient{selected.size === 1 ? "" : "er"} till en handläggare.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              autoFocus
              placeholder="Namn på handläggare…"
              value={assignName}
              onChange={(e) => setAssignName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Avbryt</Button>
            <Button
              onClick={() => {
                const name = assignName.trim();
                if (!name) {
                  toast.error("Ange ett namn");
                  return;
                }
                toast.success(`${selected.size} klient${selected.size === 1 ? "" : "er"} tilldelade ${name}`);
                setAssignOpen(false);
                setAssignName("");
                setSelected(new Set());
              }}
            >
              Tilldela
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {firmId && (
        <AddClientDialog
          firmId={firmId}
          open={addClientOpen}
          onOpenChange={setAddClientOpen}
          onClientAdded={() => {
            setAddClientOpen(false);
            toast.success("Klient tillagd – uppdaterar portfölj…");
          }}
        />
      )}
    </div>
  );
};
