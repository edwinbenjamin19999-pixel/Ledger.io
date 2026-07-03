import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Shield } from 'lucide-react';
import { useGroupValidation, type ValidationSeverity } from '@/hooks/useGroupValidation';
import { cn } from '@/lib/utils';

interface Props {
  periodId: string;
  groupId: string;
}

const sevConfig: Record<ValidationSeverity, { label: string; bg: string; text: string; icon: any; border: string }> = {
  critical: { label: 'Kritiskt', bg: 'bg-[#FCE8E8]', text: 'text-[#7A1A1A]', border: 'border-[#F4C8C8]', icon: AlertCircle },
  high:     { label: 'Hög',     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
  review:   { label: 'Granska', bg: 'bg-[#FAEEDA]', text: 'text-[#7A5417]', border: 'border-[#F0DDB7]', icon: Info },
  ok:       { label: 'OK',      bg: 'bg-[#E1F5EE]', text: 'text-[#085041]', border: 'border-[#BFE6D6]', icon: CheckCircle2 },
};

export function GroupValidationPanel({ periodId, groupId }: Props) {
  const { data, isLoading } = useGroupValidation(periodId, groupId);
  const status = data?.status ?? 'ok';
  const cfg = sevConfig[status];
  const Icon = cfg.icon;

  return (
    <Card className="bg-white border-slate-200">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', cfg.bg)}>
            <Shield className={cn('w-4 h-4', cfg.text)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Validering & kontroll</h3>
            <p className="text-xs text-slate-500">Kontrollcenter för koncernkonsolidering</p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium', cfg.bg, cfg.text, cfg.border)}>
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </div>
      </div>
      <div className="p-4 space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-4">Validerar…</p>
        ) : (data?.issues ?? []).length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-[#085041] mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Allt ser bra ut</p>
            <p className="text-xs text-slate-500 mt-1">Ingen åtgärd krävs just nu.</p>
          </div>
        ) : (
          (data?.issues ?? []).map(issue => {
            const isev = sevConfig[issue.severity];
            const IIcon = isev.icon;
            return (
              <div key={issue.id} className={cn('flex items-start gap-3 p-3 rounded-lg border', isev.bg, isev.border)}>
                <IIcon className={cn('w-4 h-4 shrink-0 mt-0.5', isev.text)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', isev.text)}>{issue.title}</p>
                  {issue.description && <p className="text-xs text-slate-600 mt-0.5">{issue.description}</p>}
                </div>
                {issue.fix_action && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0">
                    Åtgärda
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
