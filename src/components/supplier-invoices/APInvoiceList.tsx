import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  MoreHorizontal,
  MessageSquare,
  CheckCheck,
  UserPlus,
  Download,
  X,
  Copy,
  FileDown,
  CircleCheckBig,
  Bell,
  Trash2,
  ChevronRight,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { useAPInvoices, useApproveInvoice, type APInvoice } from "@/hooks/useAPInvoices";
import { WorkflowStateBadge } from "./WorkflowStateBadge";
import { FILTER_CHIPS } from "@/lib/ap/workflowState";
import { buildApprovalChain } from "@/hooks/useInvoiceApproval";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  companyId: string;
  onSelect: (invoice: APInvoice) => void;
  onPay: (selectedIds: Set<string>) => void;
  /** Currently active/selected invoice id — used to highlight row in split-view */
  activeId?: string | null;
  /** Compact mode (split view) — hides KPI cards & non-essential columns */
  compact?: boolean;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function APInvoiceList({ companyId, onSelect, onPay, activeId = null, compact = false }: Props) {
  const { data: invoices = [], isLoading } = useAPInvoices(companyId);
  const approve = useApproveInvoice(companyId);
  const [search, setSearch] = useState("");
  const [filterId, setFilterId] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null);
  const [fadingRows, setFadingRows] = useState<Map<string, "approve" | "reject">>(new Map());
  const [keyboardIdx, setKeyboardIdx] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const activeChip = FILTER_CHIPS.find((c) => c.id === filterId) ?? FILTER_CHIPS[0];

  const filtered = useMemo(() => {
    const list = invoices.filter((i) => {
      if (search && !i.counterparty_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeChip.states.length > 0 && !activeChip.states.includes(i.workflow_state)) return false;
      return true;
    });
    // Sort by due date asc
    return [...list].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
    );
  }, [invoices, search, activeChip]);

  const kpis = useMemo(() => {
    const open = invoices.filter((i) => i.workflow_state !== "PAID" && i.workflow_state !== "REJECTED");
    const needsAction = invoices.filter((i) =>
      ["SUPPLIER_REVIEW_REQUIRED", "UNDER_INVESTIGATION", "BLOCKED_HIGH_RISK"].includes(i.workflow_state),
    );
    const approved = invoices.filter((i) => i.workflow_state === "APPROVED_FOR_PAYMENT");
    const inProposal = invoices.filter((i) =>
      ["IN_PAYMENT_PROPOSAL", "PAYMENT_SIGNED"].includes(i.workflow_state),
    );
    const paidMtd = invoices.filter(
      (i) => i.workflow_state === "PAID" && new Date(i.invoice_date).getMonth() === new Date().getMonth(),
    );
    return {
      openSum: open.reduce((s, i) => s + i.total_amount, 0),
      openCount: open.length,
      needsActionCount: needsAction.length,
      needsActionSum: needsAction.reduce((s, i) => s + i.total_amount, 0),
      approvedCount: approved.length,
      approvedSum: approved.reduce((s, i) => s + i.total_amount, 0),
      inProposalCount: inProposal.length,
      inProposalSum: inProposal.reduce((s, i) => s + i.total_amount, 0),
      paidMtdSum: paidMtd.reduce((s, i) => s + i.total_amount, 0),
    };
  }, [invoices]);

  // Per-chip counts/amounts derived from full invoice list (independent of search)
  const chipStats = useMemo(() => {
    const stats: Record<string, { count: number; sum: number }> = {};
    for (const chip of FILTER_CHIPS) {
      const list = chip.states.length === 0
        ? invoices
        : invoices.filter((i) => chip.states.includes(i.workflow_state));
      stats[chip.id] = {
        count: list.length,
        sum: list.reduce((s, i) => s + i.total_amount, 0),
      };
    }
    return stats;
  }, [invoices]);

  // Risk strip: open invoices broken into under-control / due-soon / overdue
  const risk = useMemo(() => {
    const today = new Date();
    const open = invoices.filter(
      (i) => i.workflow_state !== "PAID" && i.workflow_state !== "REJECTED",
    );
    let underControl = 0,
      dueSoon = 0,
      overdueAmt = 0;
    open.forEach((inv) => {
      const days = differenceInDays(parseISO(inv.due_date), today);
      if (days < 0) overdueAmt += inv.total_amount;
      else if (days <= 7) dueSoon += inv.total_amount;
      else underControl += inv.total_amount;
    });
    const total = underControl + dueSoon + overdueAmt || 1;
    return {
      underControl,
      dueSoon,
      overdueAmt,
      pctControl: (underControl / total) * 100,
      pctSoon: (dueSoon / total) * 100,
      pctOverdue: (overdueAmt / total) * 100,
      hasData: underControl + dueSoon + overdueAmt > 0,
    };
  }, [invoices]);

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i.id)));
  };

  // Optimistic action with row fade
  const runRowAction = (inv: APInvoice, kind: "approve" | "reject") => {
    setFadingRows((m) => new Map(m).set(inv.id, kind));
    toast.success(kind === "approve" ? "Faktura godkänd" : "Faktura avvisad", {
      action: {
        label: "Ångra",
        onClick: () => {
          setFadingRows((m) => {
            const n = new Map(m);
            n.delete(inv.id);
            return n;
          });
        },
      },
    });
    setTimeout(() => {
      if (kind === "approve") approve.mutate(inv.id);
    }, 350);
  };

  const runBulkApprove = () => {
    const ids = Array.from(selected);
    const next = new Map(fadingRows);
    ids.forEach((id) => next.set(id, "approve"));
    setFadingRows(next);
    toast.success(`${ids.length} fakturor godkända`);
    setTimeout(() => {
      ids.forEach((id) => approve.mutate(id));
      setSelected(new Set());
    }, 350);
  };

  const runBulkReject = () => {
    const ids = Array.from(selected);
    const next = new Map(fadingRows);
    ids.forEach((id) => next.set(id, "reject"));
    setFadingRows(next);
    toast.success(`${ids.length} fakturor avvisade`);
    setTimeout(() => setSelected(new Set()), 350);
  };

  // Keyboard nav: j/k/enter/escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "j") {
        e.preventDefault();
        setKeyboardIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setKeyboardIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" && keyboardIdx >= 0 && filtered[keyboardIdx]) {
        e.preventDefault();
        onSelect(filtered[keyboardIdx]);
      } else if (e.key === "Escape") {
        setKeyboardIdx(-1);
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, keyboardIdx, onSelect]);

  return (
    <div className="space-y-4" ref={listRef}>
      {/* KPI cards — hidden in compact (split-view) mode */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[10px]">
          <KpiCard
            icon={Clock}
            label="Öppna skulder"
            value={`${fmt(kpis.openSum)} kr`}
            sub={`${kpis.openCount} st`}
            onClick={() => setFilterId("all")}
            active={filterId === "all"}
            variant="type1"
          />
          <KpiCard
            icon={Sparkles}
            label="Kräver åtgärd"
            value={`${kpis.needsActionCount} st`}
            sub={kpis.needsActionCount === 0 ? "Allt rent ✓" : "Granska direkt"}
            subTone={kpis.needsActionCount > 0 ? "rose" : "default"}
            onClick={() => setFilterId("needs_action")}
            active={filterId === "needs_action"}
            pulseIcon={kpis.needsActionCount > 0}
            variant={kpis.needsActionCount > 0 ? "amber" : "green"}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Godkänd för betalning"
            value={`${fmt(kpis.approvedSum)} kr`}
            sub={`${kpis.approvedCount} st redo`}
            subTone={kpis.approvedCount > 0 ? "emerald" : "default"}
            onClick={() => setFilterId("approved")}
            active={filterId === "approved"}
            variant="green"
          />
          <KpiCard
            icon={TrendingUp}
            label="Betalt MTD"
            value={`${fmt(kpis.paidMtdSum)} kr`}
            sub="Denna månad"
            onClick={() => setFilterId("paid")}
            active={filterId === "paid"}
            variant="type1"
          />
        </div>
      )}

      {/* AI payment analysis panel */}
      {!compact && kpis.approvedCount > 0 && (
        <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] px-[14px] py-[10px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-[10px] min-w-0">
            <span className="h-[26px] w-[26px] rounded-[8px] bg-white border-[0.5px] border-[#C8DDF5] flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-[#0C447C]" strokeWidth={1.8} />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C] shrink-0">
              AI-betalningsanalys
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.08em] bg-white text-[#0C447C] border-[0.5px] border-[#C8DDF5] rounded-full px-[6px] py-[1px] shrink-0">
              BETA
            </span>
            <span className="text-[12px] text-[#1E3A5F] truncate">
              <strong className="font-medium">{kpis.approvedCount}</strong> faktur
              {kpis.approvedCount === 1 ? "a" : "or"} klar
              {kpis.approvedCount === 1 ? "" : "a"} ·{" "}
              <strong className="font-medium tabular-nums">{fmt(kpis.approvedSum)} kr</strong> redo att skicka
            </span>
          </div>
          <button
            type="button"
            onClick={() => onPay(new Set())}
            className="bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px] transition-colors flex items-center gap-[6px] shrink-0"
          >
            <CreditCard className="h-3.5 w-3.5" strokeWidth={1.8} />
            Öppna betalförslag
          </button>
        </div>
      )}

      {/* Risk visualization bar */}
      {!compact && risk.hasData && (
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]">
          <div className="flex h-1 rounded-full overflow-hidden bg-[#F1F5F9]">
            {risk.pctControl > 0 && (
              <div className="bg-[#1D9E75]" style={{ width: `${risk.pctControl}%` }} />
            )}
            {risk.pctSoon > 0 && (
              <div className="bg-[#C68316]" style={{ width: `${risk.pctSoon}%` }} />
            )}
            {risk.pctOverdue > 0 && (
              <div className="bg-[#E24B4A]" style={{ width: `${risk.pctOverdue}%` }} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
            <LegendDot color="bg-[#1D9E75]" label={`Under kontroll · ${fmt(risk.underControl)} kr`} />
            <LegendDot color="bg-[#C68316]" label={`Förfaller snart · ${fmt(risk.dueSoon)} kr`} />
            <LegendDot color="bg-[#E24B4A]" label={`Förfallna · ${fmt(risk.overdueAmt)} kr`} />
          </div>
        </div>
      )}

      {/* Search + pill filters */}
      <div className="flex items-center gap-[8px] flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-[340px]">
          <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
          <input
            type="text"
            placeholder="Sök leverantör..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] pl-[28px] pr-[10px] h-[34px] focus:outline-none focus:border-[#85B7EB]"
          />
        </div>
        <div className="flex items-center gap-[6px] flex-wrap">
          {FILTER_CHIPS.map((chip) => {
            const isActive = filterId === chip.id;
            const stats = chipStats[chip.id];
            return (
              <button
                key={chip.id}
                onClick={() => setFilterId(chip.id)}
                className={`inline-flex items-center gap-[6px] rounded-full text-[12px] font-medium px-[12px] h-[28px] transition-colors ${
                  isActive
                    ? "bg-[#EFF6FF] text-[#0C447C] border-[0.5px] border-[#85B7EB]"
                    : "bg-white text-[#475569] border-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB]"
                }`}
              >
                <span>{chip.label}</span>
                <span className={`text-[11px] tabular-nums ${isActive ? "text-[#0C447C]" : "text-[#94A3B8]"}`}>
                  {stats?.count ?? 0}
                  {stats && stats.count > 0 && stats.sum > 0 && (
                    <> · {fmt(stats.sum)} kr</>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="bg-[#0F172A] text-white rounded-[12px] px-[14px] py-[10px] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-[12px] text-[12px]">
            <span className="font-medium">{selected.size} av {filtered.length} valda</span>
            <button onClick={toggleAll} className="text-[#94A3B8] hover:text-white transition-colors">
              {selected.size === filtered.length ? "Avmarkera alla" : "Markera alla"}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-[#94A3B8] hover:text-white transition-colors">
              Rensa val
            </button>
          </div>
          <div className="flex items-center gap-[6px]">
            <ActionBarBtn onClick={runBulkApprove}>
              <CheckCheck className="h-3 w-3" /> Godkänn alla
            </ActionBarBtn>
            <ActionBarBtn onClick={() => onPay(selected)}>
              <UserPlus className="h-3 w-3" /> Tilldela
            </ActionBarBtn>
            <ActionBarBtn>
              <Download className="h-3 w-3" /> Exportera
            </ActionBarBtn>
            <ActionBarBtn onClick={runBulkReject} tone="danger">
              <X className="h-3 w-3" /> Avvisa
            </ActionBarBtn>
          </div>
        </div>
      )}

      {/* List of invoice cards */}
      {isLoading ? (
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-8 text-center text-[12px] text-[#94A3B8]">
          Laddar...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState search={search} filterId={filterId} />
      ) : (
        <div className="space-y-2">
          {filtered.map((inv, idx) => {
            const days = differenceInDays(parseISO(inv.due_date), new Date());
            const isActive = activeId === inv.id;
            const isKb = idx === keyboardIdx;
            const fade = fadingRows.get(inv.id);
            const isPaid = inv.workflow_state === "PAID";
            const isOverdue = !isPaid && days < 0;

            return (
              <div
                key={inv.id}
                onClick={() => onSelect(inv)}
                className={`group cursor-pointer bg-white border-[0.5px] rounded-[12px] px-[16px] py-[12px] transition-all duration-200 flex items-center gap-[12px] ${
                  fade === "approve"
                    ? "!bg-[#E1F5EE] opacity-0 border-[#5DCAA5]"
                    : fade === "reject"
                      ? "!bg-[#FCE8E8] opacity-0 border-[#F1A1A0]"
                      : isActive
                        ? "border-[#0040CC] bg-[#F8FAFB]"
                        : isKb
                          ? "border-[#85B7EB] bg-[#EFF6FF]"
                          : isOverdue
                            ? "border-[#E2E8F0] hover:border-[#F1A1A0] hover:bg-[#FFFBFB]"
                            : "border-[#E2E8F0] hover:bg-[#F8FAFB]"
                }`}
              >
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <Checkbox
                    checked={selected.has(inv.id)}
                    disabled={inv.is_blocked || inv.status === "paid"}
                    onCheckedChange={() => toggle(inv.id)}
                  />
                </div>

                {/* Left: vendor + invoice number */}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[#0F172A] truncate">
                    {inv.counterparty_name}
                  </div>
                  <div className="font-mono text-[11px] text-[#94A3B8] truncate">
                    #{inv.invoice_number}
                  </div>
                </div>

                {/* Center: payment timing */}
                <div className="hidden md:flex flex-col min-w-[180px] shrink-0">
                  <div className="text-[11px] text-[#94A3B8]">
                    Belastar kassa {inv.due_date.substring(0, 10)}
                  </div>
                  <div className="text-[11px] mt-[2px]">
                    {isPaid ? (
                      <span className="text-[#085041]">Betald</span>
                    ) : isOverdue ? (
                      <span className="text-[#7A1F1E] font-medium inline-flex items-center gap-[4px]">
                        <AlertTriangle className="h-3 w-3" /> {Math.abs(days)} dagar sen
                      </span>
                    ) : days <= 14 ? (
                      <span className="text-[#7A5417] font-medium">{days} dagar kvar</span>
                    ) : (
                      <span className="text-[#475569]">{days} dagar kvar</span>
                    )}
                  </div>
                </div>

                {/* Right: amount + status */}
                <div className="flex flex-col items-end shrink-0 min-w-[140px]">
                  <div className="text-[16px] font-medium tabular-nums text-[#0F172A] tracking-[-0.02em]">
                    {fmt(inv.total_amount)} kr
                  </div>
                  <div className="mt-[4px]">
                    <WorkflowStateBadge
                      state={inv.workflow_state}
                      approvalStep={inv.approval_step ?? 0}
                      requiredSteps={
                        buildApprovalChain(inv.company_id, inv.total_amount).requiredSteps
                      }
                    />
                  </div>
                </div>

                {/* Far right: kebab */}
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <RowKebab
                    inv={inv}
                    onOpen={() => onSelect(inv)}
                    onApprove={() => runRowAction(inv, "approve")}
                    onReject={() => runRowAction(inv, "reject")}
                    onVoid={() => setConfirmVoidId(inv.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Void confirmation */}
      <AlertDialog open={!!confirmVoidId} onOpenChange={(o) => !o && setConfirmVoidId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#7A1A1A]" />
              Makulera faktura?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Denna åtgärd kan inte ångras. Fakturan markeras som makulerad och försvinner från
              attestflödet. En spårningspost skapas i revisionsloggen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#E24B4A] hover:bg-[#C73838] text-white"
              onClick={() => {
                toast.success("Faktura makulerad");
                setConfirmVoidId(null);
              }}
            >
              Makulera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─────────────────────── Sub-components ─────────────────────── */

function ActionBarBtn({
  children,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-[6px] rounded-[8px] text-[12px] font-medium px-[10px] h-[28px] transition-colors ${
        tone === "danger"
          ? "bg-[#7A1F1E] text-[#FCE8E8] hover:bg-[#9A2825]"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-[7px] w-[7px] rounded-full ${color}`} />
      {label}
    </span>
  );
}

function RowKebab({
  inv,
  onOpen,
  onApprove,
  onReject,
  onVoid,
}: {
  inv: APInvoice;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
  onVoid: () => void;
}) {
  const isTerminal = inv.workflow_state === "PAID" || inv.workflow_state === "REJECTED";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onOpen}>
          <ChevronRight className="h-3.5 w-3.5 mr-2 text-[#0040CC]" />
          Öppna granskning
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isTerminal}>
            <UserPlus className="h-3.5 w-3.5 mr-2" />
            Tilldela till
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Anna Karlsson</DropdownMenuItem>
            <DropdownMenuItem>Erik Lindberg</DropdownMenuItem>
            <DropdownMenuItem>Maria Nilsson</DropdownMenuItem>
            <DropdownMenuItem>Johan Berg</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>
          <MessageSquare className="h-3.5 w-3.5 mr-2" />
          Lägg till kommentar
        </DropdownMenuItem>
        {!isTerminal && (
          <DropdownMenuItem>
            <Bell className="h-3.5 w-3.5 mr-2" />
            Skicka betalningspåminnelse
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {!isTerminal && (
          <>
            <DropdownMenuItem onClick={onApprove}>
              <CheckCheck className="h-3.5 w-3.5 mr-2 text-[#085041]" />
              Godkänn snabbt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject} className="text-[#7A1A1A] focus:text-[#7A1A1A] focus:bg-[#FCE8E8]">
              <X className="h-3.5 w-3.5 mr-2" />
              Avvisa snabbt
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem>
          <Copy className="h-3.5 w-3.5 mr-2" />
          Duplicera faktura
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileDown className="h-3.5 w-3.5 mr-2" />
          Exportera PDF
        </DropdownMenuItem>
        {!isTerminal && (
          <DropdownMenuItem>
            <CircleCheckBig className="h-3.5 w-3.5 mr-2" />
            Markera som betald manuellt
          </DropdownMenuItem>
        )}
        {isTerminal && (
          <div className="px-2 py-1.5 text-[11px] text-[#94A3B8] italic">
            {inv.workflow_state === "PAID" ? "Fakturan är redan betald" : "Fakturan är avvisad"}
          </div>
        )}
        {!isTerminal && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onVoid} className="text-[#7A1A1A] focus:text-[#7A1A1A] focus:bg-[#FCE8E8]">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Makulera faktura
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ search, filterId }: { search: string; filterId: string }) {
  if (search) {
    return (
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-12 text-center">
        <Search className="h-10 w-10 mx-auto text-[#CBD5E1] mb-3" />
        <div className="text-[12px] text-[#475569]">
          Inga fakturor matchar <span className="font-medium text-[#0F172A]">"{search}"</span>
        </div>
      </div>
    );
  }
  if (filterId === "needs_action") {
    return (
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-12 text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-[#085041] mb-3" />
        <div className="text-[13px] font-medium text-[#0F172A]">Inga fakturor kräver åtgärd just nu</div>
        <div className="text-[12px] text-[#94A3B8] mt-1">Bra jobbat — allt är under kontroll 🎉</div>
      </div>
    );
  }
  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-12 text-center">
      <div className="text-[12px] text-[#94A3B8]">Inga fakturor att granska 🎉</div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  subTone = "default",
  onClick,
  active,
  pulseIcon = false,
  variant = "type1",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  subTone?: "default" | "rose" | "emerald";
  onClick?: () => void;
  active?: boolean;
  pulseIcon?: boolean;
  variant?: "type1" | "green" | "red" | "amber" | "blue";
}) {
  const subClass =
    subTone === "rose"
      ? "text-[#7A1F1E]"
      : subTone === "emerald"
        ? "text-[#085041]"
        : "text-[#94A3B8]";
  const styles =
    variant === "green"
      ? { bg: "bg-[#F2FBF7]", border: "border-[#A7E3C7]", line: "bg-[#1D9E75]", value: "text-[#0F6E56]" }
      : variant === "red"
        ? { bg: "bg-[#FFF5F5]", border: "border-[#FBBEBE]", line: "bg-[#E24B4A]", value: "text-[#791F1F]" }
        : variant === "amber"
          ? { bg: "bg-[#FFFBF0]", border: "border-[#F9DFA0]", line: "bg-[#EF9F27]", value: "text-[#633806]" }
          : variant === "blue"
            ? { bg: "bg-[#F5F9FF]", border: "border-[#C7DCFA]", line: "bg-[#0040CC]", value: "text-[#0C447C]" }
            : { bg: "bg-[#FAFBFC]", border: "border-[#DFE4EA]", line: "bg-[#0040CC]", value: "text-[#0F172A]" };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`relative overflow-hidden text-left ${styles.bg} border-[0.5px] rounded-[12px] p-[16px] transition-colors duration-[100ms] ${
        active ? "border-[#0040CC]" : styles.border
      }`}
    >
      <span aria-hidden className={`absolute top-0 left-0 right-0 h-[1.5px] ${styles.line} rounded-t-[12px]`} />
      <div className="flex items-center gap-[6px]">
        <Icon
          className={`h-3 w-3 text-[#94A3B8] ${pulseIcon ? "animate-pulse" : ""}`}
          strokeWidth={1.8}
        />
        <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
          {label}
        </div>
      </div>
      <div className={`mt-[8px] text-[22px] font-medium tracking-[-0.03em] tabular-nums ${styles.value} leading-tight`}>
        {value}
      </div>
      {sub && <div className={`text-[11px] mt-[4px] ${subClass}`}>{sub}</div>}
    </button>
  );
}
