/**
 * Bokföringsmotor för värdepapperstransaktioner
 * ===============================================
 * Genererar BAS-korrekta verifikat (journal_entries + journal_entry_lines)
 * för alla kontotyper och både marknadsnoterade och onoterade innehav.
 *
 * KONTOTYPER & BOKFÖRINGSREGLER:
 *
 * 1) ISK (Investeringssparkonto) — privatperson
 *    - Endast schablonskatt bokförs i bolag (ej i privat ISK).
 *    - Köp/sälj/utdelning på privat ISK bokförs INTE i bolagets bokföring.
 *
 * 2) KF (Kapitalförsäkring) — kan ägas av AB
 *    - 1385 Kapitalförsäkring (tillgång) ↔ 1930 Bank
 *    - Värdeförändring bokförs ej löpande, bara vid uttag eller årsslut
 *    - Avkastningsskatt: försäkringsbolaget hanterar
 *
 * 3) AF (Aktie- & fondkonto) — privat eller AB
 *    - Privat: ingen löpande bokföring, K4-bilaga vid årsslut
 *    - AB: bokförs som depå (se Depå AB nedan)
 *
 * 4) Depå i AB — näringsbetingade eller kapitalplacering
 *    - Långsiktiga (>1 år, strategiska): 1350 Andelar i andra företag
 *    - Kortsiktiga (handel): 1810 Andelar i börsnoterade företag
 *    - Försäljningsresultat: 8220 (lång) / 8221 (kort)
 *    - Utdelning: 8254 Erhållna utdelningar
 *    - Onoterade andelar: alltid 1350 + näringsbetingade (skattefria reavinster)
 *
 * REFERENS BAS 2024:
 *   1350 Andelar i koncernföretag och intresseföretag (långsiktigt)
 *   1385 Kapitalförsäkring
 *   1810 Andelar i börsnoterade företag (kortsiktiga placeringar)
 *   1930 Bankkonto
 *   2510 Skatteskulder
 *   7350 Förvaltningsavgifter
 *   8220 Resultat vid försäljning av värdepapper i och långfristiga fordringar
 *   8221 Resultat vid försäljning av kortfristiga placeringar
 *   8230 Valutakursdifferenser på värdepapper
 *   8254 Erhållna utdelningar från övriga företag
 *   8910 Skatt på årets resultat (schablon ISK = privat, ej här)
 */

import { supabase } from '@/integrations/supabase/client';

export type SecAccountType = 'isk' | 'kf' | 'af' | 'depot_ab';
export type SecTxType = 'buy' | 'sell' | 'dividend' | 'fee' | 'tax' | 'deposit' | 'withdrawal';

export interface SecurityTxInput {
  companyId: string;
  userId: string;
  accountType: SecAccountType;
  accountName: string;
  txType: SecTxType;
  tradeDate: string;       // ISO yyyy-mm-dd
  isin?: string | null;
  name?: string | null;
  quantity?: number;
  price?: number;
  amount: number;          // brutto SEK (positiv)
  fee?: number;
  fxRate?: number;
  currency?: string;
  /**
   * Klassificering för Depå AB:
   * - 'naringsbetingad' → 1350, skattefri reavinst
   * - 'kapitalplacering_long' → 1350 + 8220
   * - 'kapitalplacering_short' → 1810 + 8221
   */
  classification?: 'naringsbetingad' | 'kapitalplacering_long' | 'kapitalplacering_short';
  /** Om innehavet är onoterat (alltid 1350, alltid näringsbetingad om ≥10%) */
  isUnlisted?: boolean;
  /** Bokfört anskaffningsvärde vid sälj (FIFO från kalkylator) */
  costBasis?: number;
  /** Bankkonto som motkonteras, default 1930 */
  bankAccount?: string;
  /** Securities-tabell-ID:n för spårbarhet (sätts som metadata) */
  securitiesAccountId?: string;
  securitiesTransactionId?: string;
}

export interface BookingLine {
  accountNumber: string;
  debit: number;
  credit: number;
  description: string;
}

export interface BookingPlan {
  description: string;
  lines: BookingLine[];
  warning?: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Beräknar verifikatet utan att bokföra.
 * Returnerar `null` om transaktionen inte ska bokföras (t.ex. privat ISK/AF köp).
 */
export function planSecuritiesBooking(input: SecurityTxInput): BookingPlan | null {
  const bank = input.bankAccount ?? '1930';
  const fee = input.fee ?? 0;
  const amount = round(input.amount);
  const label = input.name ?? input.isin ?? 'värdepapper';

  // Privat ISK & AF — bokförs ej löpande i bolaget
  if (input.accountType === 'isk' || input.accountType === 'af') {
    return null;
  }

  // ───── KF (Kapitalförsäkring) ─────
  if (input.accountType === 'kf') {
    const kfAccount = '1385';
    if (input.txType === 'deposit' || input.txType === 'buy') {
      return {
        description: `Insättning till KF (${input.accountName})`,
        lines: [
          { accountNumber: kfAccount, debit: amount, credit: 0, description: `KF: ${label}` },
          { accountNumber: bank, debit: 0, credit: amount, description: 'Bank' },
        ],
      };
    }
    if (input.txType === 'withdrawal' || input.txType === 'sell') {
      return {
        description: `Uttag från KF (${input.accountName})`,
        lines: [
          { accountNumber: bank, debit: amount, credit: 0, description: 'Bank' },
          { accountNumber: kfAccount, debit: 0, credit: amount, description: `KF: ${label}` },
        ],
        warning: 'Värdeförändring och avkastningsskatt hanteras separat vid årsslut.',
      };
    }
    if (input.txType === 'fee') {
      return {
        description: `Avgift KF (${input.accountName})`,
        lines: [
          { accountNumber: '7350', debit: amount, credit: 0, description: 'Förvaltningsavgift' },
          { accountNumber: bank, debit: 0, credit: amount, description: 'Bank' },
        ],
      };
    }
    return null;
  }

  // ───── Depå i AB ─────
  if (input.accountType === 'depot_ab') {
    // Default-klassificering: onoterat → 1350 näringsbetingad, annars kapitalplacering long
    const cls = input.classification
      ?? (input.isUnlisted ? 'naringsbetingad' : 'kapitalplacering_long');

    const holdingAccount = cls === 'kapitalplacering_short' ? '1810' : '1350';
    const saleResultAccount = cls === 'kapitalplacering_short' ? '8221' : '8220';

    if (input.txType === 'buy') {
      // Anskaffningsvärde = belopp + courtage (aktiveras i tillgång)
      const total = round(amount + fee);
      return {
        description: `Köp ${label} (${input.accountName})`,
        lines: [
          { accountNumber: holdingAccount, debit: total, credit: 0, description: `Köp: ${label}` },
          { accountNumber: bank, debit: 0, credit: total, description: 'Bank' },
        ],
        warning: input.isUnlisted
          ? 'Onoterat innehav — säkerställ att näringsbetingad-status dokumenteras.'
          : undefined,
      };
    }

    if (input.txType === 'sell') {
      // Sälj: bank ↑, tillgång ↓ (cost basis), resultat = diff
      const proceeds = round(amount - fee);
      const cost = round(input.costBasis ?? amount); // fallback om FIFO ej beräknat
      const result = round(proceeds - cost);

      const lines: BookingLine[] = [
        { accountNumber: bank, debit: proceeds, credit: 0, description: 'Bank (försäljningslikvid)' },
        { accountNumber: holdingAccount, debit: 0, credit: cost, description: `Avyttring: ${label} (anskaffning)` },
      ];
      if (result > 0) {
        lines.push({ accountNumber: saleResultAccount, debit: 0, credit: result, description: 'Reavinst' });
      } else if (result < 0) {
        lines.push({ accountNumber: saleResultAccount, debit: -result, credit: 0, description: 'Reaförlust' });
      }

      return {
        description: `Sälj ${label} (${input.accountName})`,
        lines,
        warning: cls === 'naringsbetingad'
          ? 'Näringsbetingad andel — reavinst skattefri, reaförlust ej avdragsgill (deklareras i INK2S).'
          : undefined,
      };
    }

    if (input.txType === 'dividend') {
      const net = round(amount - fee);
      return {
        description: `Utdelning ${label} (${input.accountName})`,
        lines: [
          { accountNumber: bank, debit: net, credit: 0, description: 'Bank' },
          { accountNumber: '8254', debit: 0, credit: net, description: `Utdelning: ${label}` },
        ],
        warning: cls === 'naringsbetingad'
          ? 'Näringsbetingad — utdelning skattefri (deklareras i INK2S).'
          : undefined,
      };
    }

    if (input.txType === 'fee') {
      return {
        description: `Courtage/avgift (${input.accountName})`,
        lines: [
          { accountNumber: '7350', debit: amount, credit: 0, description: 'Förvaltningsavgift' },
          { accountNumber: bank, debit: 0, credit: amount, description: 'Bank' },
        ],
      };
    }

    if (input.txType === 'deposit') {
      // Insättning till depå-likvidkonto — ingen separat bokföring (samma bank)
      return null;
    }
  }

  return null;
}

/**
 * Skapar verifikat i journal_entries + journal_entry_lines.
 * Returnerar journal_entry_id eller null om inget skapades.
 */
export async function bookSecuritiesTransaction(
  input: SecurityTxInput,
): Promise<string | null> {
  const plan = planSecuritiesBooking(input);
  if (!plan || plan.lines.length === 0) return null;

  // Kontrollera balans
  const totDebit = plan.lines.reduce((s, l) => s + l.debit, 0);
  const totCredit = plan.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totDebit - totCredit) > 0.01) {
    throw new Error(`Verifikatet är inte balanserat: debet ${totDebit} ≠ kredit ${totCredit}`);
  }

  // Hämta konto-ID:n från chart_of_accounts
  const accountNumbers = Array.from(new Set(plan.lines.map(l => l.accountNumber)));
  const { data: coa, error: coaErr } = await supabase
    .from('chart_of_accounts')
    .select('id, account_number')
    .eq('company_id', input.companyId)
    .in('account_number', accountNumbers);
  if (coaErr) throw coaErr;

  const acctMap = new Map((coa ?? []).map(a => [a.account_number, a.id]));
  const missing = accountNumbers.filter(n => !acctMap.has(n));
  if (missing.length > 0) {
    throw new Error(`BAS-konton saknas i kontoplanen: ${missing.join(', ')}. Lägg till dem först.`);
  }

  // Skapa journal_entry
  const { data: entry, error: entryErr } = await supabase
    .from('journal_entries')
    .insert({
      company_id: input.companyId,
      entry_date: input.tradeDate,
      description: `[Värdepapper] ${plan.description}`,
      status: 'approved',
      created_by: input.userId,
    })
    .select()
    .maybeSingle();
  if (entryErr) throw entryErr;
  if (!entry) throw new Error('Verifikatet kunde inte skapas');

  // Skapa rader
  const lineInserts = plan.lines.map(l => ({
    journal_entry_id: entry.id,
    account_id: acctMap.get(l.accountNumber)!,
    debit: l.debit,
    credit: l.credit,
    description: l.description,
  }));
  const { error: lineErr } = await supabase
    .from('journal_entry_lines')
    .insert(lineInserts);
  if (lineErr) throw lineErr;

  // Koppla tillbaka till securities_transactions
  if (input.securitiesTransactionId) {
    await supabase
      .from('securities_transactions')
      .update({ journal_entry_id: entry.id })
      .eq('id', input.securitiesTransactionId);
  }

  return entry.id;
}
