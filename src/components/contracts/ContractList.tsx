import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronRight, Calendar, RefreshCw, AlertTriangle, Clock, Brain, TrendingUp } from "lucide-react";
import { ServiceContract } from "@/hooks/useContracts";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

const statusLabels: Record<string, { label: string; variant: any }> = {
  draft: { label: "Utkast", variant: "secondary" },
  active: { label: "Aktiv", variant: "default" },
  paused: { label: "Pausad", variant: "outline" },
  cancelled: { label: "Avslutad", variant: "destructive" },
  expired: { label: "Utgången", variant: "destructive" },
  pending_renewal: { label: "Väntar förnyelse", variant: "secondary" },
};

const intervalLabels: Record<string, string> = {
  monthly: "Månadsvis",
  quarterly: "Kvartalsvis",
  semi_annually: "Halvårsvis",
  annually: "Årsvis",
};

const monthlyOf = (c: ServiceContract) => {
  const a = c.total_amount || 0;
  return c.billing_interval === 'monthly' ? a
    : c.billing_interval === 'quarterly' ? a / 3
    : c.billing_interval === 'semi_annually' ? a / 6
    : a / 12;
};

function getExpiryBadge(endDate: string | null) {
  if (!endDate) return null;
  const expiry = parseISO(endDate);
  if (isPast(expiry)) {
    return <Badge variant="destructive" className="text-[10px] gap-0.5"><AlertTriangle className="h-3 w-3" />Utgånget</Badge>;
  }
  const days = differenceInDays(expiry, new Date());
  if (days <= 30) {
    return <Badge variant="destructive" className="text-[10px] gap-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200"><Clock className="h-3 w-3" />{days}d kvar</Badge>;
  }
  if (days <= 90) {
    return <Badge variant="outline" className="text-[10px] gap-0.5 bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-[#C28A2B]"><Clock className="h-3 w-3" />{days}d kvar</Badge>;
  }
  return null;
}

function getAccentClass(c: ServiceContract): string {
  if ((c.churn_risk_score || 0) > 70 && c.status === 'active') return 'border-l-rose-500';
  if (c.status === 'active') return 'border-l-emerald-500';
  if (c.status === 'pending_renewal') return 'border-l-amber-500';
  if (c.status === 'paused') return 'border-l-slate-400';
  return 'border-l-transparent';
}

function getAiInsight(c: ServiceContract): { text: string; tone: 'risk' | 'warn' | 'info' } | null {
  const score = c.churn_risk_score || 0;
  if (score > 70 && c.status === 'active') {
    return { text: `Hög churn-sannolikhet · ${Math.round(score)}%`, tone: 'risk' };
  }
  if (c.end_date) {
    const days = differenceInDays(parseISO(c.end_date), new Date());
    if (days >= 0 && days <= 30) return { text: `Förnyelse om ${days} dagar`, tone: 'warn' };
  }
  if (c.last_invoice_date && c.next_invoice_date) {
    const lastGap = differenceInDays(new Date(), parseISO(c.last_invoice_date));
    if (lastGap > 60) return { text: 'Möjlig betalningsfördröjning', tone: 'warn' };
  }
  if (c.status === 'active') {
    return { text: `MRR-bidrag: ${Math.round(monthlyOf(c)).toLocaleString("sv-SE")} kr/mån`, tone: 'info' };
  }
  return null;
}

interface Props {
  contracts: ServiceContract[];
  loading: boolean;
  onSelect: (c: ServiceContract) => void;
  onDelete: (id: string) => void;
}

export const ContractList = ({ contracts, loading, onSelect, onDelete }: Props) => {
  if (loading) return <div className="text-center py-8 text-muted-foreground">Laddar avtal...</div>;
  if (contracts.length === 0) return <div className="text-center py-12 text-muted-foreground">Inga avtal hittade. Skapa din första återkommande intäktsström.</div>;

  return (
    <div className="space-y-2">
      {contracts.map(c => {
        const st = statusLabels[c.status] || { label: c.status, variant: "secondary" };
        const expiryBadge = getExpiryBadge(c.end_date);
        const accent = getAccentClass(c);
        const insight = getAiInsight(c);
        const insightCls = insight?.tone === 'risk' ? 'text-[#7A1A1A] dark:text-[#C73838]'
          : insight?.tone === 'warn' ? 'text-[#7A5417] dark:text-[#C28A2B]'
          : 'text-[#3b82f6] dark:text-[#1E3A5F]';

        return (
          <Card
            key={c.id}
            className={`group border-slate-200/60 border-l-[3px] ${accent} shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-[#3b82f6]/[0.04] hover:border-[#C8DDF5] transition-colors cursor-pointer`}
            onClick={() => onSelect(c)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{c.title}</span>
                    <Badge variant={(st.variant as "default" | "secondary" | "destructive" | "outline")} className="text-[10px]">{st.label}</Badge>
                    {expiryBadge}
                    {c.renewal_type === 'auto' && <RefreshCw className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  {insight && (
                    <div className={`flex items-center gap-1 text-[11px] font-medium mb-1 ${insightCls}`}>
                      <Brain className="h-3 w-3" />
                      <span>{insight.text}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.contract_number}</span>
                    {c.customer?.name && <span>· {c.customer.name}</span>}
                    <span>· {intervalLabels[c.billing_interval] || c.billing_interval}</span>
                    {c.next_invoice_date && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-cyan-950/30 text-[#3b82f6] dark:text-[#1E3A5F] border border-cyan-200/60 dark:border-[#3b82f6]/40">
                        <TrendingUp className="h-3 w-3" />
                        Nästa intäkt {format(new Date(c.next_invoice_date), "d MMM", { locale: sv })} · {Math.round(c.total_amount).toLocaleString("sv-SE")} kr
                      </span>
                    )}
                    {c.end_date && (
                      <span className="flex items-center gap-1">
                        · Slutar: {format(new Date(c.end_date), "d MMM yyyy", { locale: sv })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-sm tabular-nums">{c.total_amount.toLocaleString("sv-SE")} {c.currency}</p>
                    <p className="text-[10px] text-muted-foreground">/{c.billing_interval === 'monthly' ? 'mån' : c.billing_interval === 'quarterly' ? 'kvartal' : c.billing_interval === 'annually' ? 'år' : 'halvår'}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); onDelete(c.id); }}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
