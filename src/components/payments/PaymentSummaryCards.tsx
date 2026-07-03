import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Send, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, isBefore, parseISO, startOfMonth } from "date-fns";

interface Invoice {
  due_date: string;
  total_amount: number;
  status: string;
}
interface Proposal {
  status: string;
  total_amount: number;
  paid_at?: string | null;
  created_at: string;
}

interface Props {
  invoices: Invoice[];
  proposals: Proposal[];
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr";

const Cell = ({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone: "info" | "warning" | "success" | "neutral";
}) => {
  const tones: Record<string, string> = {
    info: "bg-[#EFF6FF] text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
    warning: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-amber-100",
    success: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-100",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold tracking-tight">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export function PaymentSummaryCards({ invoices, proposals }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekHorizon = addDays(now, 7);
    const monthStart = startOfMonth(now);

    const ready = invoices.filter((i) => i.status === "attested");
    const dueWeek = ready.filter((i) => {
      try {
        const d = parseISO(i.due_date);
        return isBefore(d, weekHorizon);
      } catch {
        return false;
      }
    });
    const awaiting = proposals.filter(
      (p) =>
        p.status === "awaiting_bank_approval" ||
        p.status === "exported_to_bank" ||
        p.status === "sent_to_bank" ||
        p.status === "downloaded",
    );
    const paidThisMonth = proposals.filter((p) => {
      if (p.status !== "paid" && p.status !== "completed") return false;
      const d = p.paid_at ? parseISO(p.paid_at) : parseISO(p.created_at);
      return d >= monthStart;
    });

    const sum = (xs: { total_amount: number }[]) =>
      xs.reduce((a, b) => a + Number(b.total_amount || 0), 0);

    return {
      ready: { count: ready.length, sum: sum(ready) },
      dueWeek: { count: dueWeek.length, sum: sum(dueWeek) },
      awaiting: { count: awaiting.length, sum: sum(awaiting) },
      paid: { count: paidThisMonth.length, sum: sum(paidThisMonth) },
    };
  }, [invoices, proposals]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Cell
        icon={CheckCircle}
        label="Klar för betalning"
        value={fmt(stats.ready.sum)}
        hint={`${stats.ready.count} fakturor`}
        tone="info"
      />
      <Cell
        icon={Clock}
        label="Förfaller denna vecka"
        value={fmt(stats.dueWeek.sum)}
        hint={`${stats.dueWeek.count} fakturor`}
        tone="warning"
      />
      <Cell
        icon={Send}
        label="Inväntar bankgodkännande"
        value={fmt(stats.awaiting.sum)}
        hint={`${stats.awaiting.count} förslag`}
        tone="warning"
      />
      <Cell
        icon={Wallet}
        label="Betalt denna månad"
        value={fmt(stats.paid.sum)}
        hint={`${stats.paid.count} förslag`}
        tone="success"
      />
    </div>
  );
}
