import { AlertTriangle, ShieldCheck, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSEK } from "@/lib/formatNumber";

interface Invoice {
  id: string;
  due_date: string;
  total_amount: number;
  status: string;
  invoice_type: string;
}

interface InvoicePriorityBarProps {
  overdueInvoices: Invoice[];
  avgDaysOverdue: number;
  reminderCount: number;
  onSendReminders: () => void;
  onScrollToList: () => void;
  isSending?: boolean;
}

export const InvoicePriorityBar = ({
  overdueInvoices,
  avgDaysOverdue,
  reminderCount,
  onSendReminders,
  onScrollToList,
  isSending,
}: InvoicePriorityBarProps) => {
  const totalRisk = overdueInvoices.reduce((s, i) => s + i.total_amount, 0);
  const n = overdueInvoices.length;

  if (n === 0) {
    return (
      <div className="rounded-2xl bg-white border border-emerald-200/70 border-l-[3px] border-l-emerald-500 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5 text-[#085041]" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900">Alla kundfordringar under kontroll</h3>
          <p className="text-sm text-slate-500 mt-0.5">Inga förfallna fakturor — fortsätt bevaka kommande förfallodatum.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 border-l-[3px] border-l-rose-500 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow p-5">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#FCE8E8] flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-[#7A1A1A]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900">
            {n} {n === 1 ? "faktura kräver" : "fakturor kräver"} åtgärd — <span className="text-[#7A1A1A]">{formatSEK(totalRisk)}</span> i risk
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            I snitt {avgDaysOverdue} dagar förfallna · {reminderCount} {reminderCount === 1 ? "påminnelse" : "påminnelser"} skickade
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onScrollToList} className="text-slate-600 hover:text-slate-900">
            Visa detaljer <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={onSendReminders} disabled={isSending}>
            <Bell className="h-3.5 w-3.5" />
            Skicka påminnelser
          </Button>
        </div>
      </div>
    </div>
  );
};
