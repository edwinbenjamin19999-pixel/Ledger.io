import type { AccountType } from './types';

export function getAccountType(accountNumber: string): AccountType {
  const num = parseInt(accountNumber, 10);
  if (num >= 1500 && num <= 1599) return 'receivable';
  if (num >= 1900 && num <= 1999) return 'bank';
  if (num >= 2400 && num <= 2499) return 'supplier';
  if (num >= 2610 && num <= 2669) return 'vat';
  if (num >= 3000 && num <= 3999) return 'revenue';
  if (num >= 4000 && num <= 7999) return 'cost';
  return 'other';
}

interface AccountTypeLabels {
  increase: string;
  decrease: string;
  balance: string;
  typeName: string;
}

export function getAccountTypeLabels(type: AccountType): AccountTypeLabels {
  switch (type) {
    case 'receivable':
      return { increase: 'Nya fordringar', decrease: 'Inbetalningar', balance: 'Fordringar', typeName: 'Kundfordringar' };
    case 'bank':
      return { increase: 'Inflöden', decrease: 'Utflöden', balance: 'Banksaldo', typeName: 'Bankkonto' };
    case 'supplier':
      return { increase: 'Nya skulder', decrease: 'Betalningar', balance: 'Leverantörsskulder', typeName: 'Leverantör' };
    case 'vat':
      return { increase: 'Utgående moms', decrease: 'Ingående moms', balance: 'Momsposition', typeName: 'Moms' };
    case 'revenue':
      return { increase: 'Intäkter', decrease: 'Korrigeringar', balance: 'Omsättning', typeName: 'Intäkt' };
    case 'cost':
      return { increase: 'Kostnader', decrease: 'Återföringar', balance: 'Kostnader', typeName: 'Kostnad' };
    default:
      return { increase: 'Periodökning', decrease: 'Periodminskning', balance: 'Saldo', typeName: 'Konto' };
  }
}

export function getAccountStatus(summary: { pctChange: number; transactionCount: number; hasAnomaly: boolean }): 'stable' | 'unusual' | 'high_activity' | 'low_movement' {
  if (summary.hasAnomaly || Math.abs(summary.pctChange) > 50) return 'unusual';
  if (summary.transactionCount > 50) return 'high_activity';
  if (summary.transactionCount <= 2) return 'low_movement';
  return 'stable';
}

export function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'unusual': return { label: 'Ovanligt', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-[#C28A2B]' };
    case 'high_activity': return { label: 'Hög aktivitet', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-[#1E3A5F]' };
    case 'low_movement': return { label: 'Låg rörelse', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' };
    case 'stable': return { label: 'Stabil', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-[#1D9E75]' };
    default: return { label: '', color: '' };
  }
}
