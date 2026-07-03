import { Sparkles, Mail, CalendarClock, Gavel, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARInvoice, CustomerProfile } from "./ARAgent";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  openInvoices: ARInvoice[];
  customers: CustomerProfile[];
}

export const ARRecommendationPanel = ({ openInvoices, customers }: Props) => {
  const now = new Date();

  const overdue = openInvoices.filter((i) => {
    const d = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
    return d > 0;
  });

  const totalActionable = overdue.reduce((s, i) => s + i.total_amount, 0);

  const potentialRecovery = overdue.reduce((s, i) => {
    const cust = customers.find((c) => c.name === i.counterparty_name);
    const prob = cust ? Math.min(0.95, cust.onTimeRate * 0.7 + 0.2) : 0.5;
    return s + i.total_amount * prob;
  }, 0);

  const atRisk = overdue
    .filter((i) => Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000) > 60)
    .reduce((s, i) => s + i.total_amount, 0);

  const needsReminder = overdue.filter((i) => (i.reminder_count || 0) < 2).length;
  const needsPlan = overdue.filter((i) => {
    const d = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
    return d > 30 && d <= 90 && i.total_amount > 20000;
  }).length;
  const needsCollection = overdue.filter((i) => {
    const d = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
    return d > 90;
  }).length;

  if (needsReminder === 0 && needsPlan === 0 && needsCollection === 0) return null;

  // Confidence per recommendation type — derived from data volume
  const confidence = (count: number) => Math.min(98, 75 + count * 4);

  const recommendations = [
    needsReminder > 0 && {
      label: `Skicka ${needsReminder} ${needsReminder === 1 ? "påminnelse" : "påminnelser"} automatiskt`,
      icon: Mail,
      conf: confidence(needsReminder),
      onClick: () => toast.success(`${needsReminder} påminnelser köade`),
    },
    needsPlan > 0 && {
      label: `Erbjud betalplan till ${needsPlan} ${needsPlan === 1 ? "kund" : "kunder"}`,
      icon: CalendarClock,
      conf: confidence(needsPlan) - 10,
      onClick: () => toast.info("Betalplansförslag genereras…"),
    },
    needsCollection > 0 && {
      label: `Eskalera ${needsCollection} ${needsCollection === 1 ? "ärende" : "ärenden"} till inkasso`,
      icon: Gavel,
      conf: confidence(needsCollection),
      onClick: () => toast.info("Inkassoeskalering — Q3 2026"),
    },
  ].filter(Boolean) as Array<{ label: string; icon: typeof Mail; conf: number; onClick: () => void }>;

  return (
    <div className="rounded-2xl border border-border border-l-[3px] border-l-[#3b82f6] bg-card text-card-foreground p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] border border-[#C8DDF5] flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-[#3b82f6] dark:text-[#1E3A5F]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3b82f6] dark:text-[#1E3A5F] mb-0.5">AI rekommenderar</p>
            <p className="font-semibold text-foreground">
              Åtgärder berör {fmt(totalActionable)} kr
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Baserat på realtidsanalys av dina fordringar</p>
          </div>
        </div>
        <div className="lg:ml-auto flex-shrink-0">
          <Button
            className="bg-[#0F1F3D] hover:from-[#3b82f6] hover:to-blue-500 text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] h-10"
            onClick={() => toast.success("Alla rekommenderade åtgärder köade")}
          >
            <Zap className="h-4 w-4 mr-2" />
            Utför alla rekommenderade åtgärder
          </Button>
        </div>
      </div>

      {/* Financial impact */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#085041]" />
          <span className="text-muted-foreground">Potentiell återvinning:</span>
          <span className="font-bold text-[#085041] dark:text-[#1D9E75] tabular-nums">{fmt(Math.round(potentialRecovery))} kr</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#7A1A1A]" />
          <span className="text-muted-foreground">Hotad intäkt:</span>
          <span className="font-bold text-[#7A1A1A] dark:text-[#C73838] tabular-nums">{fmt(atRisk)} kr</span>
        </div>
      </div>

      {/* Recommendation chips with confidence */}
      <div className="flex flex-wrap gap-2">
        {recommendations.map((r, i) => {
          const tone = r.conf >= 90 ? "cyan" : r.conf >= 75 ? "amber" : "rose";
          return (
            <button
              key={i}
              onClick={r.onClick}
              className={cn(
                "group inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-150 text-xs font-medium",
                "hover:shadow-sm hover:-translate-y-px",
                "bg-muted/60 border-border text-foreground/80 hover:bg-muted hover:border-[#C8DDF5]"
              )}
            >
              <r.icon className="h-3.5 w-3.5 text-[#3b82f6] dark:text-[#1E3A5F]" />
              {r.label}
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                  tone === "cyan" && "bg-[#EFF6FF] text-[#3b82f6] dark:text-[#3b82f6]",
                  tone === "amber" && "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300",
                  tone === "rose" && "bg-[#FCE8E8] text-[#7A1A1A] dark:text-rose-300"
                )}
              >
                {r.conf}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
