import { Wallet, AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BankSyncStatus } from "./BankSyncStatus";

interface BankAccount { name: string; bank: string; balance: number; last_synced: string | null }

interface Props {
  bankBalance: { total: number; accounts: BankAccount[] };
  ledgerBalance: number;
  selectedCount: number;
  totalSelected: number;
  invoices: { due_date: string; total_amount: number }[];
  onOpenSync?: () => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function TreasuryLiquidityBar({
  bankBalance,
  ledgerBalance,
  selectedCount,
  totalSelected,
  invoices,
  onOpenSync,
}: Props) {
  const cashAfter = bankBalance.total - totalSelected;
  const diff = bankBalance.total - ledgerBalance;
  const showDiff = bankBalance.total > 0 && Math.abs(diff) > 100;

  // composition strip
  const today = startOfDay(new Date());
  let overdue = 0, in7 = 0, in30 = 0, later = 0;
  for (const inv of invoices) {
    if (!inv.due_date) { later += inv.total_amount; continue; }
    const d = differenceInDays(parseISO(inv.due_date), today);
    if (d < 0) overdue += inv.total_amount;
    else if (d <= 7) in7 += inv.total_amount;
    else if (d <= 30) in30 += inv.total_amount;
    else later += inv.total_amount;
  }
  const total = overdue + in7 + in30 + later || 1;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm border-l-[3px] border-l-[#3b82f6] overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
        <Metric
          label="Banksaldo"
          value={`${fmt(bankBalance.total)} kr`}
          icon={<Wallet className="h-3.5 w-3.5 text-[#3b82f6]" />}
          extra={
            <BankSyncStatus
              accounts={bankBalance.accounts}
              onOpenSync={onOpenSync}
            />
          }
        />
        <Metric
          label="Bokfört (1930)"
          value={`${fmt(ledgerBalance)} kr`}
          extra={
            showDiff ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#7A5417]">
                <AlertTriangle className="h-3 w-3" />Diff {fmt(diff)} kr
              </span>
            ) : (
              <span className="text-[11px] text-[#085041] inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />Avstämt
              </span>
            )
          }
        />
        <Metric
          label="Att betala (valt)"
          value={`${fmt(totalSelected)} kr`}
          extra={<span className="text-[11px] text-slate-500">{selectedCount} fakturor</span>}
        />
        <Metric
          label="Kassa efter"
          value={`${fmt(cashAfter)} kr`}
          tone={cashAfter < 0 ? "rose" : "emerald"}
          extra={
            cashAfter < 0 ? (
              <span className="text-[11px] text-[#7A1A1A] inline-flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />Otillräckliga medel
              </span>
            ) : (
              <span className="text-[11px] text-[#085041]">Säker buffert</span>
            )
          }
        />
      </div>

      {/* Composition strip */}
      <div className="px-5 py-3 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Utestående leverantörsskuld
          </span>
          <span className="text-[11px] tabular-nums text-slate-600">{fmt(total)} kr</span>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          {overdue > 0 && <div className="bg-rose-500" style={{ width: `${(overdue / total) * 100}%` }} />}
          {in7 > 0 && <div className="bg-amber-500" style={{ width: `${(in7 / total) * 100}%` }} />}
          {in30 > 0 && <div className="bg-[#3b82f6]" style={{ width: `${(in30 / total) * 100}%` }} />}
          {later > 0 && <div className="bg-slate-400" style={{ width: `${(later / total) * 100}%` }} />}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
          <Legend dot="bg-rose-500" label="Förfallna" value={overdue} />
          <Legend dot="bg-amber-500" label="≤ 7d" value={in7} />
          <Legend dot="bg-[#3b82f6]" label="≤ 30d" value={in30} />
          <Legend dot="bg-slate-400" label="Senare" value={later} />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label, value, icon, extra, tone,
}: { label: string; value: string; icon?: React.ReactNode; extra?: React.ReactNode; tone?: "emerald" | "rose" }) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className={cn(
        "text-2xl font-semibold tabular-nums tracking-tight",
        tone === "rose" && "text-[#7A1A1A]",
        tone === "emerald" && "text-[#085041]",
        !tone && "text-slate-900",
      )}>{value}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label} <span className="tabular-nums text-slate-700">{fmt(value)} kr</span>
    </span>
  );
}
