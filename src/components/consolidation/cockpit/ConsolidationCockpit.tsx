import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConsolidationLock } from '@/hooks/useConsolidationLock';
import { useGroupValidation } from '@/hooks/useGroupValidation';
import { ConsolidationCockpitHeader } from './ConsolidationCockpitHeader';
import { GroupKPIPanel } from './GroupKPIPanel';
import { LockUnlockBar } from './LockUnlockBar';
import { AIGroupAdjustmentsPanel } from './AIGroupAdjustmentsPanel';
import { AdjustmentLayerEditor } from './AdjustmentLayerEditor';
import { AdjustmentHistoryList } from './AdjustmentHistoryList';
import { GroupValidationPanel } from './GroupValidationPanel';
import { toast } from 'sonner';

interface Props {
  periodId: string;
  groupId: string;
  groupName: string;
  periodStart: string;
  periodEnd: string;
}

export function ConsolidationCockpit({ periodId, groupId, groupName, periodStart, periodEnd }: Props) {
  const { data: lockState, toggle } = useConsolidationLock(periodId);
  const { data: validation } = useGroupValidation(periodId, groupId);
  const [running, setRunning] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['group-companies', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('group_id', groupId)
        .order('name');
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  // Aggregate KPIs from entity_trial_balances
  const { data: kpis } = useQuery({
    queryKey: ['cockpit-kpis', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data } = await supabase
        .from('entity_trial_balances')
        .select('account_no, debit, credit, closing_balance')
        .eq('consolidation_period_id', periodId);

      const lines = (data ?? []) as Array<{ account_no: string; debit: number; credit: number; closing_balance: number }>;
      let revenue = 0, costs = 0, assets = 0, equity = 0, cash = 0;

      for (const l of lines) {
        const acc = parseInt(l.account_no);
        if (Number.isNaN(acc)) continue;
        const d = Number(l.debit ?? 0);
        const c = Number(l.credit ?? 0);
        if (acc >= 3000 && acc <= 3999) revenue += c - d;
        else if (acc >= 4000 && acc <= 8999) costs += d - c;
        else if (acc >= 1000 && acc <= 1999) assets += Number(l.closing_balance ?? 0);
        else if (acc >= 2000 && acc <= 2099) equity += c - d;
        if (acc >= 1900 && acc <= 1999) cash += Number(l.closing_balance ?? 0);
      }
      return {
        revenue, ebit: revenue - costs, totalAssets: assets, groupEquity: equity, cash, unresolvedICDiff: 0,
      };
    },
  });

  const handleRun = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke('consolidate-group', {
        body: { period_id: periodId },
      });
      if (error) throw error;
      toast.success('Konsolidering körd');
    } catch (e: any) {
      toast.error(e.message ?? 'Konsolidering misslyckades');
    } finally {
      setRunning(false);
    }
  };

  const isLocked = !!lockState?.isLocked;
  const unresolved = (validation?.issues ?? []).filter(i => i.severity !== 'ok').length;

  return (
    <div>
      <ConsolidationCockpitHeader
        groupName={groupName}
        periodStart={periodStart}
        periodEnd={periodEnd}
        entityCount={companies.length}
        unresolvedCount={unresolved}
        isLocked={isLocked}
        onRunConsolidation={handleRun}
        onToggleLock={() => toggle.mutate(!isLocked)}
        onReviewEliminations={() => toast.info('Elimineringar finns under fliken Konsolidering')}
        isRunning={running}
      />

      <GroupKPIPanel
        revenue={kpis?.revenue ?? 0}
        ebit={kpis?.ebit ?? 0}
        totalAssets={kpis?.totalAssets ?? 0}
        groupEquity={kpis?.groupEquity ?? 0}
        cash={kpis?.cash ?? 0}
        unresolvedICDiff={kpis?.unresolvedICDiff ?? 0}
      />

      <LockUnlockBar
        isLocked={isLocked}
        isEditMode={!isLocked}
        onToggle={() => toggle.mutate(!isLocked)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <AIGroupAdjustmentsPanel periodId={periodId} isLocked={isLocked} />
        <GroupValidationPanel periodId={periodId} groupId={groupId} />
      </div>

      {!isLocked && (
        <div className="mb-4">
          <AdjustmentLayerEditor periodId={periodId} companies={companies} />
        </div>
      )}

      <AdjustmentHistoryList periodId={periodId} />
    </div>
  );
}
