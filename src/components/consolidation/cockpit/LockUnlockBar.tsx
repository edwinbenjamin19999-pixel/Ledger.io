import { Lock, Unlock, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  isLocked: boolean;
  isEditMode: boolean;
  onToggle: () => void;
}

export function LockUnlockBar({ isLocked, isEditMode, onToggle }: Props) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-3 px-4 py-3 rounded-xl border mb-4 transition-colors',
      isLocked ? 'bg-slate-50 border-slate-200' : 'bg-[#EFF6FF] border-[#C8DDF5]',
    )}>
      <div className="flex items-center gap-3">
        {isLocked ? (
          <>
            <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center">
              <Lock className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Konsolidering låst</p>
              <p className="text-xs text-slate-500">Lås upp för att skapa manuella justeringar och elimineringar.</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-lg bg-[#3b82f6] flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#3b82f6] flex items-center gap-2">
                Redigeringsläge aktivt
                <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#3b82f6] text-[10px] font-semibold uppercase tracking-wider">
                  Manual Adjustment
                </span>
              </p>
              <p className="text-xs text-[#3b82f6]/80">Manuella ändringar går till adjustment-lagret — bolagens grundbokföring rörs aldrig.</p>
            </div>
          </>
        )}
      </div>
      <Button
        variant={isLocked ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className={isLocked ? 'bg-[#3b82f6] hover:bg-[#3b82f6] text-white' : ''}
      >
        {isLocked ? <><Unlock className="w-4 h-4 mr-1.5" />Lås upp konsolidering</> : <><Lock className="w-4 h-4 mr-1.5" />Lås konsolidering</>}
      </Button>
    </div>
  );
}
