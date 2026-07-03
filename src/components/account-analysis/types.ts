export interface Company {
  id: string;
  name: string;
}

export type AccountType = 'receivable' | 'bank' | 'supplier' | 'vat' | 'revenue' | 'cost' | 'other';

export interface PeriodComparison {
  prevAmount: number;
  diff: number;
  pctDiff: number;
}

export interface AccountSummary {
  accountNumber: string;
  accountName: string;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  periodIncrease: number;
  periodDecrease: number;
  netChange: number;
  closingBalance: number;
  monthlyTrend: number[];
  pctChange: number;
  hasAnomaly: boolean;
  transactionCount: number;
  largestTransaction: number;
  accountType: AccountType;
  prevPeriodBalance?: number;
  prevPeriodComparison?: PeriodComparison;
  status?: 'stable' | 'unusual' | 'high_activity' | 'low_movement';
}

export type AnomalyType = 'size' | 'newCombo' | 'duplicate' | 'missingDoc' | null;

export interface JournalDetail {
  id: string;
  entry_date: string;
  description: string;
  journal_number: string;
  journal_entry_id: string;
  debit: number;
  credit: number;
  runningBalance: number;
  counterAccounts: string[];
  anomalyType: AnomalyType;
  anomalyReason: string;
  reviewed: boolean;
  documentAttached?: boolean;
  createdBy?: 'ai' | 'manual' | 'import' | 'bank_sync';
  isVirtualRow?: boolean;
  virtualRowType?: 'opening' | 'closing';
  bookedAt?: string | null;
  isAccrualOutsidePeriod?: boolean;
}

export type ViewMode = 'transactions' | 'grouped' | 'flow' | 'analysis';

export type SortBy = 'balance' | 'activity' | 'change';

export type AccountFilter = 'all' | 'active' | 'anomalies' | 'large' | 'vat' | 'receivable_payable';

export type TypeFilter = 'Alla' | 'Fakturor' | 'Betalningar' | 'Manuella';

export type GroupByOption = 'counterAccount' | 'month' | 'type' | 'creator';

export interface GroupedData {
  motkonto: string;
  motkontoName: string;
  count: number;
  total: number;
  totalIncrease: number;
  totalDecrease: number;
  netEffect: number;
  pct: number;
  lastDate: string;
  transactions: { date: string; description: string; amount: number; debit: number; credit: number }[];
}

export interface FlowItem {
  motkonto: string;
  name: string;
  amount: number;
  pct: number;
}

export interface AIInsight {
  type: 'info' | 'warning' | 'alert';
  text: string;
}

export interface VoucherDetail {
  id: string;
  verNr: string;
  date: string;
  description: string;
  rows: { konto: string; kontoName: string; debit: number; credit: number }[];
}
