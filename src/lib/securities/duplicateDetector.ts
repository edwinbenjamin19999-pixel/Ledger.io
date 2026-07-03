/**
 * Duplikatdetektering för värdepapperstransaktioner.
 * Matchar på (account, isin/name, trade_date ±1 dag, quantity, amount).
 */
import type { SecuritiesTransaction } from '@/hooks/useSecurities';

export interface DuplicateCandidate {
  existing: SecuritiesTransaction;
  score: number; // 0..1
  reasons: string[];
}

export interface IncomingTx {
  securities_account_id: string;
  trade_date: string;
  isin?: string | null;
  name?: string | null;
  ticker?: string | null;
  quantity?: number | null;
  amount?: number | null;
  transaction_type?: string | null;
}

function daysApart(a: string, b: string): number {
  const d = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return d / (1000 * 60 * 60 * 24);
}

function nearly(a?: number | null, b?: number | null, tol = 0.01): boolean {
  if (a == null || b == null) return false;
  const denom = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) / denom <= tol;
}

export function findDuplicates(
  incoming: IncomingTx,
  existing: SecuritiesTransaction[],
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (const ex of existing) {
    if (ex.securities_account_id !== incoming.securities_account_id) continue;

    const reasons: string[] = [];
    let score = 0;

    const dDays = daysApart(ex.trade_date, incoming.trade_date);
    if (dDays > 3) continue;
    if (dDays === 0) { score += 0.3; reasons.push('samma datum'); }
    else if (dDays <= 1) { score += 0.2; reasons.push('±1 dag'); }
    else { score += 0.1; }

    if (incoming.isin && ex.isin && incoming.isin === ex.isin) {
      score += 0.3; reasons.push('samma ISIN');
    } else if (incoming.name && ex.name && incoming.name.toLowerCase() === ex.name.toLowerCase()) {
      score += 0.2; reasons.push('samma instrumentnamn');
    } else if (incoming.ticker && ex.ticker && incoming.ticker === ex.ticker) {
      score += 0.2; reasons.push('samma ticker');
    }

    if (nearly(incoming.quantity, Number(ex.quantity), 0.005)) {
      score += 0.2; reasons.push('samma antal');
    }
    if (nearly(incoming.amount, Number(ex.amount), 0.01)) {
      score += 0.2; reasons.push('samma belopp');
    }

    if (incoming.transaction_type && ex.transaction_type === incoming.transaction_type) {
      score += 0.05;
    }

    if (score >= 0.6) {
      candidates.push({ existing: ex, score: Math.min(1, score), reasons });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}
