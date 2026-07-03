import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radar, AlertTriangle, MessageCircle, Tag, Shield } from "lucide-react";
import { ServiceContract } from "@/hooks/useContracts";
import { toast } from "sonner";

interface Props {
  contracts: ServiceContract[];
  onSelect: (c: ServiceContract) => void;
  onMarkSafe: (id: string) => void;
}

const monthlyOf = (c: ServiceContract) => {
  const a = c.total_amount || 0;
  return c.billing_interval === 'monthly' ? a
    : c.billing_interval === 'quarterly' ? a / 3
    : c.billing_interval === 'semi_annually' ? a / 6
    : a / 12;
};

export const ChurnRadarCard = ({ contracts, onSelect, onMarkSafe }: Props) => {
  const atRisk = contracts
    .filter(c => (c.churn_risk_score || 0) > 70 && c.status === 'active')
    .sort((a, b) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0));

  if (atRisk.length === 0) return null;

  const totalMrr = atRisk.reduce((s, c) => s + monthlyOf(c), 0);

  const factorsOf = (c: ServiceContract): string[] => {
    const f = c.churn_risk_factors;
    if (!f) return [];
    if (Array.isArray(f)) return f.slice(0, 3).map(String);
    if (typeof f === 'object') return Object.keys(f).slice(0, 3);
    return [];
  };

  return (
    <Card className="rounded-2xl border-slate-200/60 border-l-[3px] border-l-rose-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#FCE8E8] dark:bg-rose-950/30 flex items-center justify-center">
            <Radar className="h-4 w-4 text-[#7A1A1A] dark:text-[#C73838]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Churn-radar</h3>
            <p className="text-[11px] text-muted-foreground">{atRisk.length} avtal i risk · {Math.round(totalMrr).toLocaleString("sv-SE")} kr/mån potentiell förlust</p>
          </div>
        </div>
        <Badge variant="destructive" className="text-[10px]">VARNING</Badge>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {atRisk.slice(0, 5).map(c => {
          const factors = factorsOf(c);
          return (
            <div key={c.id} className="p-4 hover:bg-rose-500/[0.03] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => onSelect(c)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{c.customer?.name || c.title}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FCE8E8] dark:bg-rose-950/30 border border-[#F4C8C8] dark:border-rose-900/40 text-[#7A1A1A] dark:text-rose-300 text-[10px] font-semibold">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {Math.round(c.churn_risk_score || 0)}% risk
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{c.title} · {Math.round(monthlyOf(c)).toLocaleString("sv-SE")} kr/mån</p>
                  {factors.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {factors.map((f, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => toast.success(`Kontaktflöde startat för ${c.customer?.name || c.title}`)}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />Kontakta
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => toast.success("Rabattförslag skickat")}>
                    <Tag className="h-3.5 w-3.5 mr-1" />Rabatt
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-[#085041]" onClick={() => onMarkSafe(c.id)}>
                    <Shield className="h-3.5 w-3.5 mr-1" />Säker
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
