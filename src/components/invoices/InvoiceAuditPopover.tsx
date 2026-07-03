import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { History, Mail, Bot, CheckCircle2, Clock, Ban, XCircle, CreditCard } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

interface AuditInvoice {
  id: string;
  created_at?: string | null;
  source?: string | null;
  status: string;
  approval_step?: number | null;
  attested_by?: string | null;
  attested_at?: string | null;
  attest_comment?: string | null;
  next_approver_email?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  paid_at?: string | null;
  journal_entry_id?: string | null;
}

interface Props {
  invoice: AuditInvoice;
  /** Optional: pre-resolved attestor name */
  attestorName?: string | null;
}

const fmtDt = (s?: string | null) => {
  if (!s) return "—";
  try {
    return format(parseISO(s), "d MMM HH:mm", { locale: sv });
  } catch {
    return s;
  }
};

interface Event {
  icon: typeof History;
  label: string;
  time: string;
  detail?: string;
  tone: "slate" | "cyan" | "emerald" | "rose" | "amber";
}

/**
 * Hover/click popover showing the full lifecycle of a supplier invoice.
 * Sources: invoices.created_at, attested_*, next_approver_email, rejected_*, paid_at.
 */
export const InvoiceAuditPopover = ({ invoice, attestorName }: Props) => {
  const events: Event[] = [];

  if (invoice.created_at) {
    events.push({
      icon: Mail,
      label: "Mottagen",
      time: fmtDt(invoice.created_at),
      detail: invoice.source ? `Källa: ${invoice.source}` : undefined,
      tone: "slate",
    });
  }

  if (invoice.journal_entry_id) {
    events.push({
      icon: Bot,
      label: "AI-bokförd",
      time: fmtDt(invoice.created_at),
      detail: "Utkast skapat av AI-bokföraren",
      tone: "cyan",
    });
  }

  const step = invoice.approval_step ?? 0;
  if (step >= 1 && invoice.attested_at) {
    events.push({
      icon: CheckCircle2,
      label: `Steg ${step} attest`,
      time: fmtDt(invoice.attested_at),
      detail: `${attestorName ?? "Attestant"}${invoice.attest_comment ? ` · "${invoice.attest_comment}"` : ""}`,
      tone: "emerald",
    });
  }

  if (invoice.status === "draft" && invoice.next_approver_email) {
    events.push({
      icon: Clock,
      label: "Väntar nästa attest",
      time: "—",
      detail: invoice.next_approver_email,
      tone: "amber",
    });
  }

  if (invoice.status === "rejected") {
    events.push({
      icon: Ban,
      label: "Avvisad",
      time: fmtDt(invoice.rejected_at),
      detail: invoice.rejection_reason ?? undefined,
      tone: "rose",
    });
  }

  if (invoice.status === "cancelled") {
    events.push({
      icon: XCircle,
      label: "Makulerad",
      time: fmtDt(invoice.rejected_at),
      detail: invoice.rejection_reason ?? undefined,
      tone: "slate",
    });
  }

  if (invoice.status === "paid" && invoice.paid_at) {
    events.push({
      icon: CreditCard,
      label: "Betald",
      time: fmtDt(invoice.paid_at),
      tone: "emerald",
    });
  }

  const toneClasses: Record<Event["tone"], string> = {
    slate: "bg-slate-100 text-slate-600",
    cyan: "bg-[#EFF6FF] text-[#3b82f6]",
    emerald: "bg-[#E1F5EE] text-[#085041]",
    rose: "bg-[#FCE8E8] text-[#7A1A1A]",
    amber: "bg-[#FAEEDA] text-[#7A5417]",
  };

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Visa historik"
        >
          <History className="h-3.5 w-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3" align="end">
        <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <History className="h-3 w-3" />
          Fakturahistorik
        </div>
        <ol className="space-y-2.5">
          {events.length === 0 && (
            <li className="text-xs text-muted-foreground">Inga händelser registrerade.</li>
          )}
          {events.map((ev, i) => (
            <li key={i} className="flex items-start gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${toneClasses[ev.tone]}`}>
                <ev.icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">{ev.label}</span>
                  <span className="text-[10px] tabular-nums text-slate-500">{ev.time}</span>
                </div>
                {ev.detail && (
                  <p className="text-[11px] text-slate-600 mt-0.5 break-words">{ev.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </HoverCardContent>
    </HoverCard>
  );
};
