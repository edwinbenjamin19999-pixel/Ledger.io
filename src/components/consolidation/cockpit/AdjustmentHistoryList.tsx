import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConsolidationAdjustments } from '@/hooks/useConsolidationAdjustments';
import { formatSEK } from '@/lib/formatNumber';
import { Layers, RotateCcw, Sparkles, User } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props { periodId: string; }

export function AdjustmentHistoryList({ periodId }: Props) {
  const { data, revert } = useConsolidationAdjustments(periodId);
  const adjustments = (data ?? []).filter(a => a.status !== 'reverted');

  if (adjustments.length === 0) {
    return (
      <Card className="bg-white border-slate-200 p-8 text-center">
        <Layers className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">Inga justeringar ännu</p>
        <p className="text-xs text-slate-500 mt-1">Skapa manuella justeringar eller acceptera AI-förslag.</p>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <div className="p-5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Justeringslager</h3>
        <p className="text-xs text-slate-500 mt-0.5">{adjustments.length} aktiva justeringar</p>
      </div>
      <div className="divide-y divide-slate-100">
        {adjustments.map(a => (
          <div key={a.id} className="p-4 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                    a.source === 'ai_suggestion' ? 'bg-[#EFF6FF] text-[#3b82f6]' : 'bg-slate-100 text-slate-700',
                  )}>
                    {a.source === 'ai_suggestion' ? <Sparkles className="w-2.5 h-2.5 inline mr-0.5" /> : <User className="w-2.5 h-2.5 inline mr-0.5" />}
                    {a.adjustment_type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {format(new Date(a.created_at), 'd MMM HH:mm', { locale: sv })}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900">{a.description ?? 'Justering'}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.lines?.length ?? 0} rader · {formatSEK(a.total_amount)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => revert.mutate(a.id)} className="h-7 text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Återför
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
