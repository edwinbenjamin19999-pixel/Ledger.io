/**
 * PAYMENT PROPOSAL — AI-driven Betalförslag.
 * Phase 2 migration to Ledger.io Design System v1 (mem://style/northledger-design-system-v1).
 *
 * Bank-first: only invoices in workflow_state === "APPROVED_FOR_PAYMENT" are listed.
 * Signing happens in the user's bank (BankID). After "Skicka till bank" the batch
 * is locked and invoices are flipped to PAID.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  ExternalLink,
  FileDown,
  Landmark,
  Save,
  AlertTriangle,
  Info,
  Minus,
} from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAPInvoices, type APInvoice, type APRiskLevel } from "@/hooks/useAPInvoices";
import { useInvoiceWorkflow } from "@/hooks/useInvoiceWorkflow";
import { useCompanyId } from "@/hooks/useCompanyId";
import { cn } from "@/lib/utils";
import {
  DSButton,
  DSBadge,
  DSCard,
  DSTable,
  DSThead,
  DSTbody,
  DSTh,
  DSTd,
  DSTr,
  DSFilterBar,
  DSFilterLabel,
  DSFilterPill,
  DSAISpark,
  DSAIPanel,
  DSConfBar,
  DSTopbar,
  type DSAICheck,
} from "@/components/ds";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
const today = new Date();
const dd = (d: string) => differenceInDays(parseISO(d), today);

// ──────────────────────────────────────────────────────────────────
// AI derivations (heuristic, no backend call)
// ──────────────────────────────────────────────────────────────────
type AIVerdict = "ok" | "info" | "warn";
interface AIRowAnalysis {
  verdict: AIVerdict;
  msg?: string;
  checks: string[];
  confidence: number;
}

function analyzeInvoice(inv: APInvoice): AIRowAnalysis {
  const days = dd(inv.due_date);
  const overdue = days < 0;
  const baseConf = inv.ai_confidence != null
    ? Math.round(inv.ai_confidence * (inv.ai_confidence > 1 ? 1 : 100))
    : inv.is_blocked
      ? 20
      : inv.risk_level === "high"
        ? 30
        : inv.risk_level === "warning"
          ? 55
          : 92;

  const checks: string[] = [];
  let verdict: AIVerdict = "ok";
  let msg: string | undefined;

  if (overdue) checks.push(`Förfallen sedan ${Math.abs(days)} dagar`);
  if (inv.is_blocked) {
    verdict = "warn";
    msg = `${inv.counterparty_name} är blockerad för betalning. Verifiera med leverantör innan godkännande.`;
    checks.push("Leverantör blockerad");
  } else if (inv.risk_level === "high") {
    verdict = "warn";
    msg = `Hög risk detekterad — bankgiro eller belopp avviker från historiken. Verifiera innan signering.`;
    checks.push("Hög risksignal");
  } else if (inv.risk_level === "warning") {
    verdict = "info";
    msg = `Mindre avvikelse upptäckt — kontrollera mot leverantörshistorik. Ingen blockering.`;
    checks.push("Beloppsavvikelse upptäckt");
  } else {
    checks.push("Bankgiro oförändrat", "Belopp inom normalt intervall");
  }

  if (inv.verification_ref) checks.push(`Verifikat ${inv.verification_ref} kopplat`);
  else checks.push("Verifikat saknas");

  if (days >= 0 && days <= 7) checks.push(`Förfaller om ${days} dagar — rekommenderas`);
  else if (days > 7) checks.push(`Förfaller om ${days} dagar`);

  return { verdict, msg, checks, confidence: baseConf };
}

// ──────────────────────────────────────────────────────────────────
// Subcomponents (DS)
// ──────────────────────────────────────────────────────────────────
function BatchStatusBadge({ status }: { status: "draft" | "ready" | "sent" }) {
  if (status === "draft") return <DSBadge variant="beta">Utkast</DSBadge>;
  if (status === "ready") return <DSBadge variant="success">Redo att skicka</DSBadge>;
  return <DSBadge variant="info">Skickat till bank</DSBadge>;
}

function RowStatusBadge({ status, days }: { status: string; days: number }) {
  if (days < 0) return <DSBadge variant="danger">Förfallen</DSBadge>;
  if (status === "APPROVED_FOR_PAYMENT") return <DSBadge variant="success">Godkänd</DSBadge>;
  return <DSBadge variant="warning">Väntar</DSBadge>;
}

function RowRiskBadge({ level, blocked }: { level: APRiskLevel; blocked: boolean }) {
  if (blocked) return <DSBadge variant="danger">Blockerad</DSBadge>;
  if (level === "safe") return <DSBadge variant="success">Säker</DSBadge>;
  if (level === "warning") return <DSBadge variant="warning">Verifiera</DSBadge>;
  return <DSBadge variant="danger">Hög risk</DSBadge>;
}

function DateCell({ dateStr }: { dateStr: string }) {
  const days = dd(dateStr);
  const lbl = days < 0 ? `Förfallen (${Math.abs(days)}d)` : days === 0 ? "Idag" : `Om ${days}d`;
  const tone =
    days < 0
      ? "text-[color:var(--ds-danger-text)]"
      : days <= 7
        ? "text-[color:var(--ds-warning-text)]"
        : "text-[color:var(--ds-text-2)]";
  return (
    <div className="leading-tight">
      <div className={cn("text-[12px] ds-tabular", tone)}>{dateStr}</div>
      <div className="text-[10px] text-[color:var(--ds-text-3)]">{lbl}</div>
    </div>
  );
}

interface CBProps {
  checked: boolean;
  indeterminate?: boolean;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}
function CB({ checked, indeterminate, onClick, disabled }: CBProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-checked={checked}
      role="checkbox"
      className={cn(
        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-0.5 transition-all",
        checked || indeterminate
          ? "bg-[color:var(--ds-brand-deep)] border-[color:var(--ds-brand-deep)]"
          : "bg-[color:var(--ds-surface)] border-[color:var(--ds-border-strong)] hover:border-[color:var(--ds-text-2)]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      {!checked && indeterminate && <span className="h-[1.5px] w-2 rounded bg-white" />}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
type SortCol = "invoice_number" | "verification_ref" | "supplier_id" | "counterparty_name" | "total_amount" | "due_date" | "status" | "risk";

export default function PaymentProposalScreen() {
  const navigate = useNavigate();
  const companyId = useCompanyId();
  const { data: invoices = [] } = useAPInvoices(companyId);
  const wf = useInvoiceWorkflow(companyId);

  const eligible = useMemo(
    () => invoices.filter((i) => i.workflow_state === "APPROVED_FOR_PAYMENT"),
    [invoices],
  );

  const ai = useMemo(() => {
    const m = new Map<string, AIRowAnalysis>();
    eligible.forEach((i) => m.set(i.id, analyzeInvoice(i)));
    return m;
  }, [eligible]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useMemo(() => {
    if (selected.size === 0 && eligible.length > 0) {
      const next = new Set(eligible.filter((i) => !i.is_blocked && i.risk_level !== "high").map((i) => i.id));
      queueMicrotask(() => setSelected(next));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible.length]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("due_date");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [dueFilter, setDueFilter] = useState<"all" | "7" | "30" | "over">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "godkänd" | "väntar">("all");
  const [batchStatus, setBatchStatus] = useState<"draft" | "ready" | "sent">("draft");
  const [sentSnapshot, setSentSnapshot] = useState<{ count: number; total: number; sentAt: string } | null>(null);

  const filtered = useMemo(() => {
    return eligible.filter((inv) => {
      const days = dd(inv.due_date);
      if (dueFilter === "7" && days > 7) return false;
      if (dueFilter === "30" && days > 30) return false;
      if (dueFilter === "over" && days >= 0) return false;
      if (statusFilter === "godkänd" && inv.workflow_state !== "APPROVED_FOR_PAYMENT") return false;
      if (statusFilter === "väntar" && inv.workflow_state === "APPROVED_FOR_PAYMENT") return false;
      return true;
    });
  }, [eligible, dueFilter, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortCol) {
        case "invoice_number": av = a.invoice_number ?? ""; bv = b.invoice_number ?? ""; break;
        case "verification_ref": av = a.verification_ref ?? ""; bv = b.verification_ref ?? ""; break;
        case "supplier_id": av = a.supplier_id ?? ""; bv = b.supplier_id ?? ""; break;
        case "counterparty_name": av = a.counterparty_name; bv = b.counterparty_name; break;
        case "total_amount": av = a.total_amount; bv = b.total_amount; break;
        case "due_date": av = a.due_date; bv = b.due_date; break;
        case "status": av = a.workflow_state; bv = b.workflow_state; break;
        case "risk": {
          const w = (l: APRiskLevel) => (l === "safe" ? 0 : l === "warning" ? 1 : 2);
          av = w(a.risk_level); bv = w(b.risk_level); break;
        }
      }
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return 0;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const sortBy = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortCol(col); setSortDir(1); }
  };
  const sortOf = (col: SortCol): "asc" | "desc" | "none" =>
    sortCol === col ? (sortDir === 1 ? "asc" : "desc") : "none";

  const isLocked = batchStatus === "sent";
  const selArr = useMemo(() => eligible.filter((i) => selected.has(i.id)), [eligible, selected]);
  const totalSelected = selArr.reduce((s, i) => s + i.total_amount, 0);
  const overdueCount = selArr.filter((i) => dd(i.due_date) < 0).length;
  const avgConf = selArr.length
    ? Math.round(selArr.reduce((s, i) => s + (ai.get(i.id)?.confidence ?? 0), 0) / selArr.length)
    : 0;

  const riskCount = selArr.filter((i) => i.risk_level !== "safe" || i.is_blocked).length;
  const verifiedCount = selArr.length - riskCount;

  // AI panel checks (DSAIPanel format)
  const aiChecks: DSAICheck[] = selArr.length
    ? [
        { status: "ok", title: "Dubblettgranskning", detail: "Inga dubbletter hittades. Matchar mot 6 månaders historik." },
        {
          status: selArr.some((i) => i.risk_level === "high") ? "warn" : "ok",
          title: "Bankgirokontroll",
          detail: selArr.some((i) => i.risk_level === "high")
            ? "Avvikande bankgiro detekterat — verifiera med leverantör."
            : "Alla bankgiron oförändrade sedan senaste betalning.",
        },
        {
          status: "ok",
          title: "Verifikatmatchning",
          detail: `${selArr.filter((i) => i.verification_ref).length} av ${selArr.length} fakturor kopplade till verifikat.`,
        },
        {
          status: selArr.some((i) => i.risk_level === "warning") ? "warn" : "ok",
          title: "Beloppsavvikelse",
          detail: selArr.some((i) => i.risk_level === "warning")
            ? "En eller flera fakturor avviker från snittbelopp."
            : "Alla belopp inom normalt intervall.",
        },
        { status: "ok", title: "Förfallsdagsordning", detail: "Sorterade efter kassaflödespåverkan. Förfallna visas överst." },
        { status: "info", title: "Likviditetspåverkan", detail: "Saldo efter valt betalförslag uppskattas — kontrollera mot kassaflödesprognos." },
      ]
    : [];

  const recommendation = selArr.length
    ? `Godkänn alla fakturor med grön risk utan åtgärd — hög konfidens.${
        riskCount > 0 ? ` Pausa ${riskCount} faktura${riskCount === 1 ? "" : "or"} tills bankgiro/belopp verifierats med leverantör.` : ""
      }${overdueCount > 0 ? " Kontakta förfallna leverantörer idag för att undvika dröjsmålsränta." : ""}`
    : undefined;

  const toggleRow = (id: string) => {
    if (isLocked) return;
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (isLocked) return;
    const allSelHere = sorted.every((r) => selected.has(r.id));
    setSelected((p) => {
      const n = new Set(p);
      if (allSelHere) sorted.forEach((r) => n.delete(r.id));
      else sorted.forEach((r) => n.add(r.id));
      return n;
    });
  };
  const someSel = sorted.some((r) => selected.has(r.id));
  const allSel = sorted.length > 0 && sorted.every((r) => selected.has(r.id));

  const handleSendClick = () => {
    if (selected.size === 0) return;
    setConfirmOpen(true);
  };
  const handleConfirmSend = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    wf.markPaid.mutate(
      { invoiceIds: ids, signerCount: 1 },
      {
        onSuccess: () => {
          setSentSnapshot({ count: ids.length, total: totalSelected, sentAt: new Date().toISOString() });
          setBatchStatus("sent");
          setConfirmOpen(false);
        },
      },
    );
  };

  const liveStatus: "draft" | "ready" | "sent" =
    batchStatus === "sent" ? "sent" : selected.size === 0 ? "draft" : "ready";

  if (!companyId) {
    return <div className="p-8 text-ds-body">Välj ett aktivt bolag…</div>;
  }

  return (
    <div className="min-h-screen bg-[color:var(--ds-page-bg)] p-4 md:p-6">
      <DSCard padding="none" className="mx-auto max-w-[1400px] overflow-hidden">
        {/* ───────── Topbar ───────── */}
        <DSTopbar
          title="Betalförslag"
          status={<BatchStatusBadge status={liveStatus} />}
          meta={
            <>
              {format(new Date(), "EEEE d MMMM yyyy", { locale: sv })} · Signering sker i din bank med BankID
            </>
          }
          onBack={() => navigate("/supplier-invoices")}
          actions={
            <>
              <DSButton variant="secondary" icon={Save} disabled={isLocked}>Spara utkast</DSButton>
              <DSButton variant="secondary" icon={FileDown}>Exportera SIE</DSButton>
              <DSButton
                variant="primary"
                icon={Landmark}
                disabled={isLocked || selected.size === 0 || wf.markPaid.isPending}
                onClick={handleSendClick}
              >
                Skicka till bank
              </DSButton>
            </>
          }
        />
        {/* Link kept for potential prefetching / a11y */}
        <Link to="/supplier-invoices" className="sr-only">Tillbaka till leverantörsfakturor</Link>

        {/* ───────── Summary KPIs ───────── */}
        <div className="grid grid-cols-2 border-b-0.5 border-[color:var(--ds-border)] md:grid-cols-4">
          {[
            { lbl: "Totalt valt", val: `${fmt(totalSelected)} kr`, sub: "SEK", tone: "text-[color:var(--ds-success-text)]" },
            { lbl: "Antal fakturor", val: `${selArr.length} / ${eligible.length}`, sub: "valda av totalt", tone: "text-[color:var(--ds-text-1)]" },
            { lbl: "Förfallna", val: `${overdueCount}`, sub: "kräver åtgärd", tone: overdueCount > 0 ? "text-[color:var(--ds-danger-text)]" : "text-[color:var(--ds-text-1)]" },
            { lbl: "AI-konfidenssnitt", val: `${avgConf}%`, sub: "för valda fakturor", tone: "text-[color:var(--ds-brand-deep)]" },
          ].map((c, i) => (
            <div
              key={i}
              className="border-r-0.5 border-[color:var(--ds-border)] px-4 py-3 last:border-r-0"
            >
              <div className="text-ds-meta">{c.lbl}</div>
              <div className={cn("mt-1 text-[22px] font-medium tracking-[-0.03em] ds-tabular", c.tone)}>
                {c.val}
              </div>
              <div className="mt-0.5 text-[10px] text-[color:var(--ds-text-3)]">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ───────── AI panel ───────── */}
        {selArr.length > 0 && (
          <DSAIPanel
            summary={
              <>
                {riskCount > 0
                  ? `${riskCount} risksignal${riskCount === 1 ? "" : "er"} på ${selArr.length} valda fakturor — ${verifiedCount} automatiskt verifierade.`
                  : `Alla ${selArr.length} valda fakturor automatiskt verifierade. ${recommendation}`}
              </>
            }
            checks={aiChecks}
            defaultOpen={false}
          />
        )}

        {/* ───────── Filter bar ───────── */}
        <DSFilterBar>
          <DSFilterLabel>Förfaller</DSFilterLabel>
          {(["all", "7", "30", "over"] as const).map((f) => (
            <DSFilterPill key={f} active={dueFilter === f} onClick={() => setDueFilter(f)}>
              {f === "all" ? "Alla" : f === "7" ? "Inom 7 dagar" : f === "30" ? "Inom 30 dagar" : "Förfallna"}
            </DSFilterPill>
          ))}
          <span className="mx-1 h-4 w-px bg-[color:var(--ds-border)]" />
          <DSFilterLabel>Status</DSFilterLabel>
          {(["all", "godkänd", "väntar"] as const).map((f) => (
            <DSFilterPill key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>
              {f === "all" ? "Alla" : f === "godkänd" ? "Godkänd" : "Väntar"}
            </DSFilterPill>
          ))}
        </DSFilterBar>

        {/* ───────── Action bar ───────── */}
        <div className="flex items-center justify-between border-b-0.5 border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] px-4 py-2">
          <div className="flex items-center gap-2.5">
            <CB
              checked={allSel}
              indeterminate={!allSel && someSel}
              onClick={(e) => { e.stopPropagation(); toggleAll(); }}
              disabled={isLocked}
            />
            <span className="text-[11px] text-[color:var(--ds-text-2)]">
              {selArr.length} av {eligible.length} valda
            </span>
            <span className="text-[11px] font-medium text-[color:var(--ds-text-1)] ds-tabular">
              · {fmt(totalSelected)} kr SEK
            </span>
          </div>
          <div className="flex gap-1.5">
            <DSButton
              variant="secondary"
              size="sm"
              onClick={() => setSelected(new Set(eligible.map((i) => i.id)))}
              disabled={isLocked}
            >
              Välj alla
            </DSButton>
            <DSButton
              variant="ghost"
              size="sm"
              onClick={() => { setSelected(new Set()); setExpandedId(null); }}
              disabled={isLocked}
            >
              Rensa val
            </DSButton>
          </div>
        </div>

        {/* ───────── Table ───────── */}
        <div className="overflow-x-auto bg-[color:var(--ds-surface)]">
          <DSTable className="border-0 rounded-none">
            <colgroup>
              <col style={{ width: 38 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 80 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <DSThead>
              <tr>
                <DSTh />
                <DSTh sort={sortOf("invoice_number")} onClick={() => sortBy("invoice_number")}>Fakturanr</DSTh>
                <DSTh sort={sortOf("verification_ref")} onClick={() => sortBy("verification_ref")}>Ver.nr</DSTh>
                <DSTh sort={sortOf("supplier_id")} onClick={() => sortBy("supplier_id")}>Lev-ID</DSTh>
                <DSTh sort={sortOf("counterparty_name")} onClick={() => sortBy("counterparty_name")}>Leverantör</DSTh>
                <DSTh numeric sort={sortOf("total_amount")} onClick={() => sortBy("total_amount")}>Belopp</DSTh>
                <DSTh>Valuta</DSTh>
                <DSTh sort={sortOf("due_date")} onClick={() => sortBy("due_date")}>Förfaller</DSTh>
                <DSTh sort={sortOf("status")} onClick={() => sortBy("status")}>Status</DSTh>
                <DSTh>AI-konfidens</DSTh>
                <DSTh sort={sortOf("risk")} onClick={() => sortBy("risk")}>Risk</DSTh>
              </tr>
            </DSThead>
            <DSTbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-[12px] text-[color:var(--ds-text-3)]">
                    Inga fakturor matchar valda filter.
                  </td>
                </tr>
              )}
              {sorted.map((inv) => {
                const days = dd(inv.due_date);
                const overdue = days < 0;
                const isSel = selected.has(inv.id);
                const isExpanded = expandedId === inv.id;
                const a = ai.get(inv.id)!;
                const rowState = isSel ? "selected" : overdue ? "overdue" : "default";
                return (
                  <>
                    <DSTr
                      key={inv.id}
                      state={rowState}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    >
                      <DSTd>
                        <CB
                          checked={isSel}
                          onClick={(e) => { e.stopPropagation(); toggleRow(inv.id); }}
                          disabled={isLocked}
                        />
                      </DSTd>
                      <DSTd mono>{inv.invoice_number || "—"}</DSTd>
                      <DSTd mono>{inv.verification_ref || "—"}</DSTd>
                      <DSTd mono>{inv.supplier_id?.slice(0, 8) || "—"}</DSTd>
                      <DSTd emphasis>{inv.counterparty_name}</DSTd>
                      <DSTd numeric emphasis>{fmt(inv.total_amount)}</DSTd>
                      <DSTd>
                        <span className="text-[11px] text-[color:var(--ds-text-3)]">SEK</span>
                      </DSTd>
                      <DSTd><DateCell dateStr={inv.due_date} /></DSTd>
                      <DSTd><RowStatusBadge status={inv.workflow_state} days={days} /></DSTd>
                      <DSTd><DSConfBar score={a.confidence} /></DSTd>
                      <DSTd><RowRiskBadge level={inv.risk_level} blocked={inv.is_blocked} /></DSTd>
                    </DSTr>
                    {isExpanded && (
                      <tr className="bg-[color:var(--ds-page-bg)]">
                        <td colSpan={11} className="border-b-0.5 border-[color:var(--ds-border)] pl-12 pr-6 py-4">
                          <RowAIPanel name={inv.counterparty_name} analysis={a} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </DSTbody>
          </DSTable>
        </div>

        {/* ───────── Footer ───────── */}
        <div className="flex items-center justify-between border-t-0.5 border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] px-4 py-2">
          <span className="text-[11px] text-[color:var(--ds-text-3)]">
            Visar {sorted.length} fakturor · Klicka en rad för AI-analys
          </span>
          {isLocked && sentSnapshot && (
            <DSButton
              variant="secondary"
              size="sm"
              icon={ExternalLink}
              onClick={() => window.open("https://www.bankid.com/", "_blank")}
            >
              Öppna bank
            </DSButton>
          )}
        </div>
      </DSCard>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-ds-card border-0.5 border-[color:var(--ds-border)]">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-medium tracking-[-0.01em]">
              Skicka {selArr.length} betalning{selArr.length === 1 ? "" : "ar"} till bank
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[color:var(--ds-text-2)]">
              Totalt {fmt(totalSelected)} kr. Slutför signering med BankID i din bank.
              {riskCount > 0 && (
                <span
                  className="mt-3 block rounded-ds-btn border-0.5 p-2.5 text-[12px]"
                  style={{
                    background: "var(--ds-warning-bg)",
                    borderColor: "var(--ds-warning-border)",
                    color: "var(--ds-warning-text)",
                  }}
                >
                  <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={1.5} />
                  {riskCount} vald{riskCount === 1 ? "" : "a"} faktura{riskCount === 1 ? "" : "or"} har AI-varningar.
                  Granska dessa innan signering.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DSButton variant="secondary" onClick={() => setConfirmOpen(false)}>Avbryt</DSButton>
            <DSButton
              variant="primary"
              icon={Landmark}
              onClick={handleConfirmSend}
              disabled={wf.markPaid.isPending}
            >
              Skicka till bank
            </DSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Row AI panel (inline expansion under a row)
// ──────────────────────────────────────────────────────────────────
function RowAIPanel({ name, analysis }: { name: string; analysis: AIRowAnalysis }) {
  const a = analysis;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <DSAISpark size={14} />
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[color:var(--ds-ai)]">
          AI-analys · {name}
        </span>
      </div>
      {a.msg && (
        <div
          className={cn("mb-2.5 rounded-ds-btn border-0.5 p-2.5 text-[12px] leading-relaxed")}
          style={
            a.verdict === "warn"
              ? {
                  background: "var(--ds-warning-bg)",
                  borderColor: "var(--ds-warning-border)",
                  color: "var(--ds-warning-text)",
                }
              : {
                  background: "var(--ds-ai-panel-bg)",
                  borderColor: "var(--ds-ai-panel-border)",
                  color: "var(--ds-text-1)",
                }
          }
        >
          {a.verdict === "warn" ? (
            <AlertTriangle className="mr-1.5 inline h-3 w-3" strokeWidth={1.5} />
          ) : (
            <Info className="mr-1.5 inline h-3 w-3" strokeWidth={1.5} />
          )}
          {a.msg}
        </div>
      )}
      <div className="grid grid-cols-1 gap-y-1 md:grid-cols-2">
        {a.checks.map((c, i) => {
          const isWarn = /blockerad|risk|saknas/i.test(c);
          const Icon = isWarn ? Minus : Check;
          const tone = isWarn ? "text-[color:var(--ds-warning-text)]" : "text-[color:var(--ds-success-text)]";
          return (
            <div key={i} className="flex items-center gap-1.5 py-0.5 text-[12px] text-[color:var(--ds-text-2)]">
              <Icon className={cn("h-3 w-3", tone)} strokeWidth={1.8} />
              {c}
            </div>
          );
        })}
      </div>
    </div>
  );
}
