/**
 * Klassificeringslayer för värdepappershändelser
 * Heuristik först — AI-fallback för osäkra fall via securities-classify edge function
 */

export type InstrumentType = 'stock' | 'fund' | 'etf' | 'bond' | 'option' | 'unlisted_share' | 'unknown';
export type TxType = 'buy' | 'sell' | 'dividend' | 'fee' | 'tax' | 'deposit' | 'withdrawal' | 'split' | 'rights_issue' | 'transfer' | 'unknown';

export interface ClassificationInput {
  description?: string | null;
  isin?: string | null;
  ticker?: string | null;
  name?: string | null;
  amount?: number | null;
  quantity?: number | null;
  price?: number | null;
}

export interface ClassificationResult {
  instrument_type: InstrumentType;
  tx_type: TxType;
  confidence: number; // 0..1
  ambiguity_flags: string[];
  reasoning: string;
}

const BUY_RE = /\b(köp|buy|purchase|kop|inköp)\b/i;
const SELL_RE = /\b(sälj|sell|salj|sale|avyttring)\b/i;
const DIV_RE = /\b(utdelning|dividend|udd)\b/i;
const FEE_RE = /\b(courtage|avgift|fee|brokerage|kostnad)\b/i;
const TAX_RE = /\b(skatt|tax|withholding|källskatt|kupong)\b/i;
const DEP_RE = /\b(insättning|deposit|överföring in|insattning)\b/i;
const WD_RE = /\b(uttag|withdrawal|överföring ut)\b/i;
const SPLIT_RE = /\b(split|aktiesplit|sammanläggning)\b/i;
const RIGHTS_RE = /\b(nyemission|fondemission|teckningsrätt|rights)\b/i;

const FUND_RE = /\b(fond|fund|index|ucits)\b/i;
const ETF_RE = /\b(etf|xact|ishares|spdr|vanguard)\b/i;
const BOND_RE = /\b(obligation|bond|treasury)\b/i;

export function classify(input: ClassificationInput): ClassificationResult {
  const flags: string[] = [];
  const text = `${input.description ?? ''} ${input.name ?? ''} ${input.ticker ?? ''}`.trim();
  const reasons: string[] = [];

  // ---- Transaction type ----
  let tx_type: TxType = 'unknown';
  let txConf = 0;

  if (DIV_RE.test(text)) { tx_type = 'dividend'; txConf = 0.95; reasons.push('matchade utdelnings-mönster'); }
  else if (SPLIT_RE.test(text)) { tx_type = 'split'; txConf = 0.95; reasons.push('matchade split-mönster'); }
  else if (RIGHTS_RE.test(text)) { tx_type = 'rights_issue'; txConf = 0.9; reasons.push('matchade emissionsmönster'); }
  else if (TAX_RE.test(text)) { tx_type = 'tax'; txConf = 0.9; reasons.push('matchade skatte-mönster'); }
  else if (FEE_RE.test(text)) { tx_type = 'fee'; txConf = 0.9; reasons.push('matchade avgifts-mönster'); }
  else if (BUY_RE.test(text)) { tx_type = 'buy'; txConf = 0.92; reasons.push('matchade köp-mönster'); }
  else if (SELL_RE.test(text)) { tx_type = 'sell'; txConf = 0.92; reasons.push('matchade sälj-mönster'); }
  else if (DEP_RE.test(text)) { tx_type = 'deposit'; txConf = 0.85; }
  else if (WD_RE.test(text)) { tx_type = 'withdrawal'; txConf = 0.85; }
  else if (input.quantity && input.price && input.amount != null) {
    // Heuristic: amount sign + qty
    const expected = (input.quantity ?? 0) * (input.price ?? 0);
    if (Math.abs(expected - Math.abs(input.amount)) / Math.max(1, Math.abs(input.amount)) < 0.05) {
      tx_type = (input.amount ?? 0) < 0 ? 'buy' : 'sell';
      txConf = 0.7;
      reasons.push('härledd från belopp/antal/pris');
    } else {
      flags.push('amount_qty_price_mismatch');
    }
  } else {
    flags.push('unknown_transaction_type');
  }

  // ---- Instrument type ----
  let instrument_type: InstrumentType = 'unknown';
  let instConf = 0;
  if (ETF_RE.test(text)) { instrument_type = 'etf'; instConf = 0.9; }
  else if (FUND_RE.test(text)) { instrument_type = 'fund'; instConf = 0.85; }
  else if (BOND_RE.test(text)) { instrument_type = 'bond'; instConf = 0.85; }
  else if (input.isin) {
    // ISIN starting with country code is usually a listed instrument
    if (/^[A-Z]{2}/.test(input.isin)) { instrument_type = 'stock'; instConf = 0.75; }
  } else if (input.ticker) {
    instrument_type = 'stock'; instConf = 0.6;
  }

  if (!input.isin && !input.ticker && tx_type !== 'fee' && tx_type !== 'tax' && tx_type !== 'deposit' && tx_type !== 'withdrawal') {
    flags.push('missing_isin');
  }
  if (!input.name && !input.ticker && tx_type !== 'fee' && tx_type !== 'deposit') {
    flags.push('missing_instrument_name');
  }

  const confidence = Math.min(0.99, Math.max(0.1, (txConf * 0.7 + instConf * 0.3)));

  return {
    instrument_type,
    tx_type,
    confidence,
    ambiguity_flags: flags,
    reasoning: reasons.join('; ') || 'inga starka mönster — låg konfidens',
  };
}

export function confidenceLabel(c: number): { label: string; tone: 'success' | 'warning' | 'destructive' } {
  if (c >= 0.95) return { label: 'Mycket hög', tone: 'success' };
  if (c >= 0.85) return { label: 'Hög', tone: 'success' };
  if (c >= 0.7) return { label: 'Medel', tone: 'warning' };
  return { label: 'Låg — granska', tone: 'destructive' };
}
