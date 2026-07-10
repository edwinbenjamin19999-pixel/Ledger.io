import { ArrowRight, Calendar, Wallet, ShieldCheck, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreliminaryTaxState, FTaxStatus, TaxPosition } from "@/lib/skatteagent/preliminaryTaxEngine";

interface HeroStatusRowProps {
  state: PreliminaryTaxState;
  skvConnected: boolean;
  skvLastSync?: string | null;
  bankBalanceTotal: number;
  onPayNow: () => void;
  onAdjust: () => void;
  onConnectSKV: () => void;
}

function fmtKr(n: number, opts: { showSign?: boolean } = {}) {
  if (!Number.isFinite(n)) return "—";
  const sign = opts.showSign && n > 0 ? "+" : "";
  return `${sign}${Math.round(n).toLocaleString("sv-SE")} kr`;
}

const STATUS_LABEL: Record<FTaxStatus, string> = {
  due_soon: "Förfaller snart",
  paid: "Betald",
  overdue: "Förfallen",
  scheduled: "Schemalagd",
  unknown: "—",
};
const STATUS_COLOR: Record<FTaxStatus, string> = {
  due_soon: "bg-amber-400",
  paid: "bg-emerald-400",
  overdue: "bg-rose-500",
  scheduled: "bg-indigo-400",
  unknown: "bg-slate-400",
};

const POSITION_LABEL: Record<TaxPosition, string> = {
  too_high: "För hög",
  reasonable: "Rimlig",
  too_low: "För låg",
  unknown: "—",
};
const POSITION_TONE: Record<TaxPosition, string> = {
  too_high: "text-[#7A5417]",
  reasonable: "text-[#085041]",
  too_low: "text-[#7A1A1A]",
  unknown: "text-slate-500",
};
const POSITION_ICON: Record<TaxPosition, typeof TrendingUp> = {
  too_high: TrendingDown,
  reasonable: Minus,
  too_low: TrendingUp,
  unknown: Minus,
};

export function HeroStatusRow({
  state,
  skvConnected,
  skvLastSync,
  bankBalanceTotal,
  onPayNow,
  onAdjust,
  onConnectSKV,
}: HeroStatusRowProps) {
  const PosIcon = POSITION_ICON[state.position];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Card 1 — Next F-skatt (premium gradient) */}
      <Card className="relative overflow-hidden border-0 bg-[#0052FF] text-white p-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-200 uppercase tracking-wide">
            <Calendar className="w-3.5 h-3.5" />
            Nästa F-skatt
          </div>
          <div className="mt-3 text-4xl font-bold tabular-nums">
            {state.nextDueAmount > 0 ? fmtKr(state.nextDueAmount) : "—"}
          </div>
          <div className="mt-1 text-sm text-indigo-200">
            Förfaller {state.nextDueDate}
            {state.daysUntilDue >= 0 && state.daysUntilDue <= 30
              ? ` · om ${state.daysUntilDue} d`
              : ""}
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium">
            <span className={cn("h-2 w-2 rounded-full", STATUS_COLOR[state.status])} />
            {STATUS_LABEL[state.status]}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-white text-slate-900 hover:bg-white/90 hover:text-slate-900 shadow-none border-0"
              onClick={onPayNow}
              disabled={state.nextDueAmount <= 0}
            >
              Betala nu
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={onAdjust}
            >
              Justera <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Card 2 — Tax position (AI verdict) */}
      <Card className="p-6 hover:-translate-y-0.5 transition-transform duration-200">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Tax position (AI)
        </div>
        <div className={cn("mt-3 text-4xl font-bold tabular-nums flex items-center gap-2", POSITION_TONE[state.position])}>
          <PosIcon className="w-7 h-7" />
          {POSITION_LABEL[state.position]}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {state.position === "unknown"
            ? "Bokför mer data för bedömning"
            : state.diff === 0
              ? "Inom 15 % av förväntad årsskatt"
              : `Diff vs förväntad årsskatt: ${fmtKr(state.diff, { showSign: true })}`}
        </div>
        <div className="mt-5 text-xs text-slate-400">
          Förväntad årsskatt: <span className="text-slate-700 font-medium tabular-nums">{fmtKr(state.expectedAnnualTax)}</span>
        </div>
      </Card>

      {/* Card 3 — Cash impact */}
      <Card className="p-6 hover:-translate-y-0.5 transition-transform duration-200">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <Wallet className="w-3.5 h-3.5 text-[#085041]" />
          Cash impact
        </div>
        <div className="mt-3 text-4xl font-bold tabular-nums text-slate-900">
          {fmtKr(bankBalanceTotal)}
        </div>
        <div className="mt-1 text-sm text-slate-500">Aktuellt banksaldo</div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-400">Efter nästa betalning</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              state.cashAfterPayment < 0 ? "text-[#7A1A1A]" : "text-[#085041]",
            )}
          >
            {fmtKr(state.cashAfterPayment)}
          </span>
        </div>
      </Card>

      {/* Card 4 — SKV connection */}
      <Card className="p-6 hover:-translate-y-0.5 transition-transform duration-200">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <ShieldCheck className={cn("w-3.5 h-3.5", skvConnected ? "text-[#085041]" : "text-slate-400")} />
          Skatteverket
        </div>
        <div className="mt-3 text-2xl font-semibold text-slate-900">
          {skvConnected ? "Ansluten" : "Ej ansluten"}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {skvConnected && skvLastSync
            ? `Senast synkad ${new Date(skvLastSync).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}`
            : skvConnected
              ? "Skattekontodata synkad"
              : "Anslut för live-saldo"}
        </div>
        {!skvConnected && (
          <Button size="sm" variant="outline" className="mt-4" onClick={onConnectSKV}>
            Anslut Skatteverket
          </Button>
        )}
      </Card>
    </div>
  );
}
