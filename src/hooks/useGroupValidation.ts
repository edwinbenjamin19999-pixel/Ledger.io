import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ValidationSeverity = 'critical' | 'high' | 'review' | 'ok';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: string;
  title: string;
  description?: string;
  fix_action?: string;
  diff_amount?: number;
}

export interface GroupValidationResult {
  status: ValidationSeverity;
  issues: ValidationIssue[];
  computed_at: string;
}

export function useGroupValidation(periodId: string | undefined, groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-validation', periodId, groupId],
    enabled: !!periodId && !!groupId,
    queryFn: async (): Promise<GroupValidationResult> => {
      const issues: ValidationIssue[] = [];

      // 1. Check companies in group
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, currency')
        .eq('group_id', groupId!);

      if (!companies || companies.length === 0) {
        issues.push({
          id: 'no-entities',
          severity: 'critical',
          category: 'structure',
          title: 'Inga bolag i koncernen',
          description: 'Lägg till minst ett bolag för att kunna konsolidera.',
          fix_action: 'add_entity',
        });
      }

      // 2. Currency mismatch
      const currencies = new Set((companies ?? []).map(c => c.currency).filter(Boolean));
      if (currencies.size > 1) {
        issues.push({
          id: 'currency-mismatch',
          severity: 'high',
          category: 'fx',
          title: 'Olika valutor i koncernen',
          description: `${currencies.size} olika valutor: ${Array.from(currencies).join(', ')}. FX-omräkning krävs.`,
          fix_action: 'apply_fx',
        });
      }

      // 3. Trial balances missing
      const { data: trials } = await supabase
        .from('entity_trial_balances')
        .select('entity_id')
        .eq('consolidation_period_id', periodId!);
      const tbSet = new Set(((trials ?? []) as Array<{ entity_id: string }>).map(t => t.entity_id));
      const missing = (companies ?? []).filter(c => !tbSet.has(c.id));
      if (missing.length > 0) {
        issues.push({
          id: 'missing-tb',
          severity: 'high',
          category: 'data',
          title: 'Saknad balansrapport',
          description: `${missing.length} bolag saknar balansrapport: ${missing.map(c => c.name).join(', ')}`,
          fix_action: 'generate_tb',
        });
      }

      // 4. Pending eliminations count
      const { count: elimCount } = await supabase
        .from('eliminations')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId!);
      if (elimCount && elimCount > 0) {
        issues.push({
          id: 'pending-eliminations',
          severity: 'review',
          category: 'eliminations',
          title: `${elimCount} elimineringsrader att granska`,
          description: 'Granska och godkänn intercompany-elimineringar.',
          fix_action: 'review_eliminations',
        });
      }

      // Compute overall status
      let status: ValidationSeverity = 'ok';
      if (issues.some(i => i.severity === 'critical')) status = 'critical';
      else if (issues.some(i => i.severity === 'high')) status = 'high';
      else if (issues.some(i => i.severity === 'review')) status = 'review';

      return { status, issues, computed_at: new Date().toISOString() };
    },
  });
}
