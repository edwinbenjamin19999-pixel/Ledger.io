import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Gavel, FileText, Sparkles, AlertCircle, Eye, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARInvoice, CustomerProfile } from "./ARAgent";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  openInvoices: ARInvoice[];
  customers: CustomerProfile[];
}

type Group = "action" | "monitor" | "control";

interface Row {
  invoice: ARInvoice;
  customer?: CustomerProfile;
  daysOverdue: number;
  daysToDue: number;
  group: Group;
  insight?: string;
}

function classify(inv: ARInvoice, customer: CustomerProfile | undefined, now: Date): { group: Group; daysOverdue: number; daysToDue: number } {
  const due = new Date(inv.due_date).getTime();
  const diff = Math.floor((now.getTime() - due) / 86400000);
  if (diff > 0) {
    return { group: "action", daysOverdue: diff, daysToDue: 0 };
  }
  const daysToDue = Math.abs(diff);
  // Monitor: due within 7 days OR high-risk customer near due (≤14d)
  if (daysToDue <= 7 || (customer && customer.score >= "D" && daysToDue <= 14)) {
    return { group: "monitor", daysOverdue: 0, daysToDue };
  }
  return { group: "control", daysOverdue: 0, daysToDue };
}

function buildInsight(c: CustomerProfile | undefined): string | undefined {
  if (!c || c.paidCount < 3) return undefined;
  if (c.avgDaysLate > 5) {
    return `Betalar i snitt ${c.avgDaysLate} dagar sent — historik ${c.paidCount} fakturor`;
  }
  if (c.onTimeRate >= 0.9) {
    return `Betalar ${Math.round(c.onTimeRate * 100)}% i tid — historik ${c.paidCount} fakturor`;
  }
  return `${Math.round(c.onTimeRate * 100)}% i tid, snitt ${c.avgDaysLate}d sent — ${c.paidCount} fakturor`;
}

const GROUP_META: Record<Group, { title: string; accent: string; chipBg: string; chipText: string; dot: string; defaultOpen: boolean; icon: typeof AlertCircle }> = {
  action: { title: "Kräver åtgärd", accent: "border-l-rose-500", chipBg: "bg-[#FCE8E8]", chipText: "text-[#7A1A1A]", dot: "bg-rose-500", defaultOpen: true, icon: AlertCircle },
  monitor: { title: "Bevaka", accent: "border-l-amber-500", chipBg: "bg-[#FAEEDA]", chipText: "text-[#7A5417]", dot: "bg-amber-500", defaultOpen: true, icon: Clock },
  control: { title: "Under kontroll", accent: "border-l-emerald-500", chipBg: "bg-[#E1F5EE]", chipText: "text-[#085041]", dot: "bg-emerald-500", defaultOpen: false, icon: CheckCircle2 },
};

const PremiumARRow = ({ row }: { row: Row }) => {
  const meta = GROUP_META[row.group];
  return (
    <div
      className={cn(
        "group relative bg-ds-surface rounded-ds-btn border-0.5 border-ds-border border-l-2 transition-colors",
        meta.accent,
        "hover:bg-ds-surface-raised"
      )}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Customer (flexible) */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full flex-shrink-0", meta.dot)} />
            <span className="font-medium text-[14px] text-ds-text truncate">{row.invoice.counterparty_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ds-text-secondary pl-4 flex-wrap">
            <span className="font-mono">{row.invoice.invoice_number}</span>
            {row.daysOverdue > 0 ? (
              <>
                <span>·</span>
                <span className="font-medium text-ds-danger">{row.daysOverdue} dagar försenad</span>
              </>
            ) : (
              <>
                <span>·</span>
                <span className="font-medium text-ds-text-secondary">förfaller om {row.daysToDue}d</span>
              </>
            )}
            {(row.invoice.reminder_count || 0) > 0 && (
              <>
                <span>·</span>
                <span>{row.invoice.reminder_count} påm.</span>
              </>
            )}
          </div>
          {row.insight && (
            <div className="flex items-center gap-1.5 pl-4 pt-0.5">
              <Sparkles className="h-3 w-3 text-ds-ai flex-shrink-0" />
              <span className="text-[11px] text-ds-ai font-medium truncate">{row.insight}</span>
            </div>
          )}
        </div>

        {/* Amount — fixed width, right-aligned, single line */}
        <div className="w-[140px] text-right tabular-nums flex-shrink-0">
          <span className="text-[18px] font-medium text-ds-text leading-none tracking-tight">
            {fmt(row.invoice.total_amount)}
          </span>
          <span className="text-[11px] text-ds-text-secondary ml-1.5 uppercase tracking-wide">SEK</span>
        </div>

        {/* Actions — fixed slot, always visible */}
        <div className="flex items-center gap-1 flex-shrink-0 w-[230px] justify-end">
          {row.group === "action" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-0.5 border-ds-border text-ds-deep hover:bg-ds-surface-raised"
              onClick={() => toast.success("Påminnelse skickad")}
            >
              <Mail className="h-3.5 w-3.5 mr-1" />
              Påminn
            </Button>
          )}
          {row.daysOverdue > 60 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-0.5 border-ds-danger/30 text-ds-danger hover:bg-ds-danger/[0.06]"
              onClick={() => toast.info("Inkasso — Q3 2026")}
            >
              <Gavel className="h-3.5 w-3.5 mr-1" />
              Inkasso
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-ds-text-secondary"
            onClick={() => toast.info(`Fakturadetaljer: ${row.invoice.invoice_number}`)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Detaljer
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ARGroupedInvoiceList = ({ openInvoices, customers }: Props) => {
  const now = new Date();
  const rows: Row[] = openInvoices.map((inv) => {
    const customer = customers.find((c) => c.name === inv.counterparty_name);
    const { group, daysOverdue, daysToDue } = classify(inv, customer, now);
    return { invoice: inv, customer, daysOverdue, daysToDue, group, insight: buildInsight(customer) };
  });

  const groups: Record<Group, Row[]> = {
    action: rows.filter((r) => r.group === "action").sort((a, b) => b.daysOverdue - a.daysOverdue),
    monitor: rows.filter((r) => r.group === "monitor").sort((a, b) => a.daysToDue - b.daysToDue),
    control: rows.filter((r) => r.group === "control").sort((a, b) => a.daysToDue - b.daysToDue),
  };

  const [open, setOpen] = useState<Record<Group, boolean>>({
    action: true,
    monitor: true,
    control: false,
  });

  const renderSection = (g: Group) => {
    const meta = GROUP_META[g];
    const list = groups[g];
    if (list.length === 0) return null;
    const total = list.reduce((s, r) => s + r.invoice.total_amount, 0);
    const Icon = meta.icon;
    return (
      <div key={g} className="space-y-3">
        <button
          onClick={() => setOpen((p) => ({ ...p, [g]: !p[g] }))}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            {open[g] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            <Icon className={cn("h-4 w-4", g === "action" ? "text-[#7A1A1A]" : g === "monitor" ? "text-[#7A5417]" : "text-[#085041]")} />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{meta.title}</h3>
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", meta.chipBg, meta.chipText)}>
              {list.length}
            </span>
          </div>
          <div className="text-sm tabular-nums text-slate-500">
            <span className="font-semibold text-slate-700">{fmt(total)}</span> kr
          </div>
        </button>
        {open[g] && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {list.slice(0, g === "control" ? 5 : 20).map((row) => (
              <PremiumARRow key={row.invoice.id} row={row} />
            ))}
            {list.length > (g === "control" ? 5 : 20) && (
              <p className="text-center text-xs text-slate-400 py-2">
                + {list.length - (g === "control" ? 5 : 20)} fler
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (openInvoices.length === 0) {
    return (
      <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface p-12 text-center">
        <FileText className="h-10 w-10 text-ds-text-secondary/50 mx-auto mb-3" />
        <p className="text-sm text-ds-text-secondary">Inga öppna kundfakturor just nu</p>
      </div>
    );
  }

  return (
    <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface p-5 space-y-6">
      {renderSection("action")}
      {renderSection("monitor")}
      {renderSection("control")}
    </div>
  );
};
