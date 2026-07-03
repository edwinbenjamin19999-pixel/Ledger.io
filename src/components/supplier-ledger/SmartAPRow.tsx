import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { classify, CLASS_META, type APClass } from "@/lib/supplier-ledger/classifyAP";
import { SupplierInvoiceApprovalActions } from "@/components/invoices/SupplierInvoiceApprovalActions";
import { ApprovalChainBadge } from "@/components/invoices/ApprovalChainBadge";
import { InvoiceAuditPopover } from "@/components/invoices/InvoiceAuditPopover";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const CRITICAL_KEYWORDS = ["el", "elnät", "vattenfall", "fortum", "ellevio", "hyra", "fastighets", "telia", "skatteverk", "kronofogd"];

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  counterparty_name: string;
  total_amount: number;
  status: string;
  attested_at?: string;
  approval_step?: number | null;
  attested_by?: string | null;
  next_approver_email?: string | null;
  rejection_reason?: string | null;
  journal_entry_id?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
}

interface Props {
  invoice: Invoice;
  group: APClass;
  isSelected: boolean;
  cashBalance: number | null;
  companyId: string;
  onToggleSelect: (id: string) => void;
  onAttest?: (id: string) => void;
  onPay?: (id: string) => void;
  onSchedule?: (id: string) => void;
  onDispute?: (id: string) => void;
  onUpdated?: () => void;
}

const SupplierAvatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <div className="w-[28px] h-[28px] rounded-full bg-[#1D4ED8] text-[#E6F4FA] text-[11px] font-medium flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
};

export function SmartAPRow({ invoice, group, isSelected, cashBalance, companyId, onToggleSelect, onSchedule, onDispute, onUpdated }: Props) {
  const meta = CLASS_META[group];
  const days = differenceInDays(parseISO(invoice.due_date), new Date());
  const isOverdue = days < 0;
  const status = invoice.status === "paid" ? "paid"
    : isOverdue && invoice.status !== "cancelled" ? "overdue"
    : invoice.status;

  const name = (invoice.counterparty_name || "").toLowerCase();
  const isCritical = CRITICAL_KEYWORDS.some(k => name.includes(k));
  const cashImpactPct = cashBalance && cashBalance > 0 ? (invoice.total_amount / cashBalance) * 100 : 0;
  const isHighImpact = cashImpactPct > 20;

  // AI microline
  let aiLine: { text: string; tone: "rose" | "amber" | "cyan" | "slate" | "emerald" } | null = null;
  if (group === "pay_now" && isCritical) {
    aiLine = { text: "Betala nu — kritisk leverantör", tone: "rose" };
  } else if (isHighImpact) {
    aiLine = { text: `Hög likviditetspåverkan · ${Math.round(cashImpactPct)}% av kassa`, tone: "amber" };
  } else if (group === "strategic_delay" && days > 30) {
    aiLine = { text: `Möjlig fördröjning · vinst ${days - 7} dagar`, tone: "slate" };
  } else if (group === "can_wait") {
    aiLine = { text: "Vanlig betalare · ingen risk", tone: "emerald" };
  } else if (group === "pay_soon") {
    aiLine = { text: `Förfaller om ${days} dagar`, tone: "amber" };
  }

  const toneClass = {
    rose: "text-[#7A1A1A]",
    amber: "text-[#7A5417]",
    cyan: "text-[#3b82f6]",
    slate: "text-slate-500",
    emerald: "text-[#085041]",
  }[aiLine?.tone || "slate"];

  const dayPill = days < 0
    ? <span className="text-[10px] font-semibold text-[#7A1A1A] bg-[#FCE8E8] px-1.5 py-0.5 rounded">{days}d försenad</span>
    : days === 0
    ? <span className="text-[10px] font-semibold text-[#7A5417] bg-[#FAEEDA] px-1.5 py-0.5 rounded">Idag</span>
    : days <= 7
    ? <span className="text-[10px] font-semibold text-[#7A5417] bg-[#FAEEDA] px-1.5 py-0.5 rounded">{days}d kvar</span>
    : <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{days}d kvar</span>;

  return (
    <div className="group bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] px-[14px] py-[11px] transition-colors hover:bg-[#FAFBFC]">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(invoice.id)}
          className="w-[14px] h-[14px] rounded-[3px] border-[1.5px] border-[#D1D5DB] accent-[#1D4ED8] shrink-0 cursor-pointer"
        />
        <SupplierAvatar name={invoice.counterparty_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[12px] font-medium text-[#0F172A] truncate">{invoice.counterparty_name}</span>
            <span className="font-mono text-[10px] text-[#94A3B8]">#{invoice.invoice_number}</span>
            {status === "attested" && (
              <Badge variant="outline" className="text-[10px] text-[#0C447C] border-[#C8DDF5]">Attesterad</Badge>
            )}
            <ApprovalChainBadge
              companyId={companyId}
              amount={invoice.total_amount}
              approvalStep={invoice.approval_step ?? null}
              attestedByEmail={null}
              nextApproverEmail={invoice.next_approver_email ?? null}
            />
            <InvoiceAuditPopover invoice={invoice} />
          </div>
          {aiLine && (
            <p className={`text-[11px] font-medium ${toneClass} flex items-center gap-1`}>
              {aiLine.tone === "rose" && <AlertTriangle className="h-3 w-3" />}
              {aiLine.text}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#94A3B8]">Förfaller {invoice.due_date}</span>
            {dayPill}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-[14px] font-medium tabular-nums ${status === "overdue" ? "text-[#791F1F]" : "text-[#0F172A]"}`}>{fmt(invoice.total_amount)} kr</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SupplierInvoiceApprovalActions
            invoice={{
              id: invoice.id,
              status: invoice.status,
              total_amount: invoice.total_amount,
              approval_step: invoice.approval_step ?? null,
              attested_by: invoice.attested_by ?? null,
              rejection_reason: invoice.rejection_reason ?? null,
              journal_entry_id: invoice.journal_entry_id ?? null,
              counterparty_name: invoice.counterparty_name,
              invoice_number: invoice.invoice_number,
            }}
            companyId={companyId}
            onUpdated={onUpdated}
            size="sm"
          />
          {(group === "can_wait" || group === "strategic_delay") && onSchedule && (
            <Button size="sm" variant="outline" onClick={() => onSchedule(invoice.id)} className="h-7 text-xs px-2 text-slate-600 border-slate-200">
              <Clock className="w-3 h-3 mr-1" />Schemalägg
            </Button>
          )}
          {onDispute && (
            <Button size="sm" variant="ghost" onClick={() => onDispute(invoice.id)} className="h-7 text-xs px-2 text-slate-500">
              Bestrid
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
