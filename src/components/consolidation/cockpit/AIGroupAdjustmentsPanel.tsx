import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2, XCircle, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { useConsolidationAISuggestions } from '@/hooks/useConsolidationAISuggestions';
import { useConsolidationAdjustments } from '@/hooks/useConsolidationAdjustments';
import { formatSEK } from '@/lib/formatNumber';
import { cn } from '@/lib/utils';

interface Props {
  periodId: string;
  isLocked: boolean;
}

const tierColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'border-[#F4C8C8] bg-red-50/50';
    case 'high': return 'border-orange-200 bg-orange-50/50';
    case 'medium': return 'border-[#F0DDB7] bg-amber-50/50';
    default: return 'border-[#BFE6D6] bg-emerald-50/50';
  }
};

const tierBadge = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-[#FCE8E8] text-[#7A1A1A]';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'medium': return 'bg-[#FAEEDA] text-[#7A5417]';
    default: return 'bg-[#E1F5EE] text-[#085041]';
  }
};

const sectionLabel = (s: string | null) => {
  if (!s) return null;
  const map: Record<string, string> = { RR: 'Resultaträkning', BR: 'Balansräkning', EK: 'Eget kapital', CF: 'Kassaflöde' };
  return map[s] ?? s;
};

export function AIGroupAdjustmentsPanel({ periodId, isLocked }: Props) {
  const { data: suggestions, dismiss, detect, isLoading } = useConsolidationAISuggestions(periodId);
  const { create } = useConsolidationAdjustments(periodId);

  const pending = (suggestions ?? []).filter(s => s.status === 'pending');

  const handleApply = async (s: any) => {
    const journal = s.proposed_journal ?? {};
    const lines = (journal.lines ?? []).map((l: any, i: number) => ({
      line_no: i + 1,
      company_id: l.company_id ?? null,
      account_no: l.account_no,
      account_name: l.account_name ?? null,
      debit: Number(l.debit ?? 0),
      credit: Number(l.credit ?? 0),
      description: l.description ?? s.title,
    }));
    if (lines.length === 0) return;
    await create.mutateAsync({
      adjustment_type: (s.suggestion_type === 'fx_adjustment' ? 'fx_translation' : s.suggestion_type),
      description: s.title,
      source: 'ai_suggestion',
      ai_suggestion_id: s.id,
      confidence: s.confidence,
      lines,
    });
  };

  return (
    <Card className="bg-white border-slate-200">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F1F3D] flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">AI-koncernjusteringar</h3>
            <p className="text-xs text-slate-500">Automatiska förslag på goodwill, NCI, FX och periodiseringar</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => detect.mutate()} disabled={detect.isPending}>
          {detect.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
          Kör AI-analys
        </Button>
      </div>

      <div className="p-4 space-y-3 max-h-[600px] overflow-auto">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-8">Laddar förslag…</p>
        ) : pending.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Inga AI-förslag ännu</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Kör analysen för att hitta goodwill, NCI och FX-justeringar.</p>
            <Button size="sm" onClick={() => detect.mutate()} disabled={detect.isPending}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Skanna koncernen
            </Button>
          </div>
        ) : (
          pending.map(s => (
            <div key={s.id} className={cn('rounded-xl border p-4', tierColor(s.severity))}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={cn('text-[10px] uppercase tracking-wide', tierBadge(s.severity))}>
                      {s.severity}
                    </Badge>
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{s.suggestion_type}</span>
                    {sectionLabel(s.affected_section) && (
                      <span className="text-[11px] text-slate-400">· {sectionLabel(s.affected_section)}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{s.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.explanation}</p>
                </div>
                {s.financial_impact != null && (
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">Påverkan</div>
                    <div className="text-sm font-semibold tabular-nums text-slate-900">{formatSEK(s.financial_impact)}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Konfidens</span>
                  <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full', s.confidence >= 0.85 ? 'bg-emerald-500' : s.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${Math.round(s.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 tabular-nums">{Math.round(s.confidence * 100)}%</span>
                  {s.confidence < 0.6 && <AlertTriangle className="w-3 h-3 text-[#7A5417]" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => dismiss.mutate(s.id)} className="h-7 px-2 text-xs">
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Ignorera
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                    <Eye className="w-3.5 h-3.5 mr-1" /> Granska
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApply(s)}
                    disabled={isLocked || create.isPending}
                    className="h-7 px-3 text-xs bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tillämpa
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
