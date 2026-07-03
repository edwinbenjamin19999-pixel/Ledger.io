/**
 * Section 9 — Non-dismissible red banner when balance sheet is out of balance.
 */

import { AlertTriangle } from 'lucide-react';
import { useBalanceAlert } from '@/hooks/useBalanceAlert';

interface BalanceAlertBannerProps { companyId: string | undefined;
}

export function BalanceAlertBanner({ companyId }: BalanceAlertBannerProps) { const { isImbalanced, difference, details } = useBalanceAlert(companyId);

  if (!isImbalanced) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center gap-2 text-sm font-medium z-50">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        ⚠️ Balansräkningen är ur balans — differens: {difference.toFixed(2)} kr.{' '}
        {details && <span className="opacity-80">{details}</span>}
        {' '}Kontakta support eller granska revisionsloggen.
      </span>
    </div>
  );
}
