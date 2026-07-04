import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Play, Lock, Unlock, AlertTriangle, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Props {
  groupName: string;
  periodStart: string;
  periodEnd: string;
  entityCount: number;
  unresolvedCount: number;
  isLocked: boolean;
  onRunConsolidation: () => void;
  onToggleLock: () => void;
  onReviewEliminations: () => void;
  isRunning?: boolean;
}

export function ConsolidationCockpitHeader({
  groupName, periodStart, periodEnd, entityCount, unresolvedCount,
  isLocked, onRunConsolidation, onToggleLock, onReviewEliminations, isRunning,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1428] via-[#0F172A] to-[#1a1442]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.15),transparent_50%)]" />
      <div className="relative p-8 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0F1F3D] border border-[#C8DDF5] flex items-center justify-center backdrop-blur-sm">
                <Building2 className="w-6 h-6 text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#3b82f6]/70">Group Consolidation Cockpit</p>
                <h1 className="text-2xl font-semibold text-white tracking-tight">{groupName || 'Välj koncern'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300/80 ml-15">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(periodStart), 'd MMM', { locale: sv })} – {format(new Date(periodEnd), 'd MMM yyyy', { locale: sv })}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {entityCount} {entityCount === 1 ? 'bolag' : 'bolag'}
              </span>
              {unresolvedCount > 0 && (
                <Badge className="bg-[#FAEEDA] text-amber-200 border-[#F0DDB7] hover:bg-amber-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {unresolvedCount} att åtgärda
                </Badge>
              )}
              {isLocked && (
                <Badge className="bg-[#FCE8E8] text-red-200 border-[#F4C8C8]">
                  <Lock className="w-3 h-3 mr-1" />
                  Låst
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReviewEliminations}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              Granska elimineringar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleLock}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              {isLocked ? <><Unlock className="w-4 h-4 mr-1.5" />Lås upp</> : <><Lock className="w-4 h-4 mr-1.5" />Lås</>}
            </Button>
            <Button
              size="sm"
              onClick={onRunConsolidation}
              disabled={isRunning}
              className="bg-[#0F1F3D] hover:from-[#3b82f6] hover:to-[#3b82f6] text-white border-0 shadow-[0_0_20px_rgba(0,82,255,0.3)]"
            >
              <Play className="w-4 h-4 mr-1.5" />
              {isRunning ? 'Kör…' : 'Kör konsolidering'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
