/**
 * Broker-CSV-parsers
 * ==================
 * Parsar CSV-exporter från Nordnet, Avanza, SEB m.fl.
 * Användaren laddar ned filen själv från brokerns sajt (efter BankID hos brokern)
 * och importerar i Ledger.io — vi slipper egen BankID-integration och kostnaden.
 */

export interface ParsedTx {
  trade_date: string;            // yyyy-mm-dd
  transaction_type: 'buy' | 'sell' | 'dividend' | 'fee' | 'tax' | 'deposit' | 'withdrawal';
  isin: string | null;
  ticker: string | null;
  name: string | null;
  quantity: number;
  price: number;
  amount: number;                // brutto SEK (positiv för in, negativ för ut)
  fee: number;
  currency: string;
  fx_rate: number | null;
  source: 'nordnet_csv' | 'avanza_csv' | 'seb_csv' | 'sru' | 'generic_csv';
}

export interface ParseResult {
  rows: ParsedTx[];
  warnings: string[];
  detectedBroker: string;
}

const num = (s: string | undefined): number => {
  if (!s) return 0;
  // svenska format: 1 234,56 → 1234.56
  const cleaned = s.replace(/\s/g, '').replace(/,/g, '.').replace(/[^\d.\-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const isoDate = (s: string): string => {
  if (!s) return '';
  // Hanterar yyyy-mm-dd, yyyy/mm/dd, dd/mm/yyyy
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m1 = t.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return t.slice(0, 10);
};

function splitCSV(text: string): string[][] {
  // Hanterar både komma och semikolon + citattecken
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  return lines.map(line => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === sep && !inQ) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  });
}

const TX_MAP: Record<string, ParsedTx['transaction_type']> = {
  'köp': 'buy', 'kop': 'buy', 'buy': 'buy', 'köpt': 'buy',
  'sälj': 'sell', 'salj': 'sell', 'sell': 'sell', 'sålt': 'sell',
  'utdelning': 'dividend', 'dividend': 'dividend',
  'avgift': 'fee', 'courtage': 'fee', 'fee': 'fee',
  'skatt': 'tax', 'preliminärskatt': 'tax', 'kupongskatt': 'tax',
  'insättning': 'deposit', 'insattning': 'deposit', 'överföring in': 'deposit',
  'uttag': 'withdrawal', 'överföring ut': 'withdrawal',
};

function mapTxType(s: string): ParsedTx['transaction_type'] | null {
  const k = s.toLowerCase().trim();
  for (const [pattern, type] of Object.entries(TX_MAP)) {
    if (k.includes(pattern)) return type;
  }
  return null;
}

// ───────── Nordnet ─────────
// Kolumner: Id;Bokföringsdag;Affärsdag;Likviddag;Depå;Transaktionstyp;Värdepapper;ISIN;Antal;Kurs;Ränta;Total Avgift;Valuta;Belopp;Saldo;Växelkurs;Transaktionstext;...
function parseNordnet(rows: string[][]): ParseResult {
  const header = rows[0].map(h => h.toLowerCase());
  const col = (name: string) => header.findIndex(h => h.includes(name.toLowerCase()));

  const cAffars = col('affärsdag') >= 0 ? col('affärsdag') : col('affarsdag');
  const cType = col('transaktionstyp');
  const cName = col('värdepapper') >= 0 ? col('värdepapper') : col('vardepapper');
  const cIsin = col('isin');
  const cQty = col('antal');
  const cPrice = col('kurs');
  const cFee = col('total avgift') >= 0 ? col('total avgift') : col('avgift');
  const cAmount = col('belopp');
  const cCur = col('valuta');
  const cFx = col('växelkurs') >= 0 ? col('växelkurs') : col('vaxelkurs');

  const out: ParsedTx[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 3) continue;
    const txType = mapTxType(r[cType] ?? '');
    if (!txType) continue;

    out.push({
      trade_date: isoDate(r[cAffars] ?? ''),
      transaction_type: txType,
      isin: r[cIsin]?.trim() || null,
      ticker: null,
      name: r[cName]?.trim() || null,
      quantity: Math.abs(num(r[cQty])),
      price: num(r[cPrice]),
      amount: num(r[cAmount]),
      fee: Math.abs(num(r[cFee])),
      currency: r[cCur]?.trim() || 'SEK',
      fx_rate: cFx >= 0 ? num(r[cFx]) || null : null,
      source: 'nordnet_csv',
    });
  }
  if (out.length === 0) warnings.push('Inga transaktioner kunde tolkas från Nordnet-filen.');
  return { rows: out, warnings, detectedBroker: 'Nordnet' };
}

// ───────── Avanza ─────────
// Kolumner: Datum;Konto;Typ av transaktion;Värdepapper/beskrivning;Antal;Kurs;Belopp;Courtage;Valuta;ISIN;Resultat
function parseAvanza(rows: string[][]): ParseResult {
  const header = rows[0].map(h => h.toLowerCase());
  const col = (name: string) => header.findIndex(h => h.includes(name.toLowerCase()));

  const cDate = col('datum');
  const cType = col('typ av transaktion') >= 0 ? col('typ av transaktion') : col('typ');
  const cName = col('värdepapper') >= 0 ? col('värdepapper') : col('beskrivning');
  const cQty = col('antal');
  const cPrice = col('kurs');
  const cAmount = col('belopp');
  const cFee = col('courtage');
  const cCur = col('valuta');
  const cIsin = col('isin');

  const out: ParsedTx[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 3) continue;
    const txType = mapTxType(r[cType] ?? '');
    if (!txType) continue;

    out.push({
      trade_date: isoDate(r[cDate] ?? ''),
      transaction_type: txType,
      isin: cIsin >= 0 ? r[cIsin]?.trim() || null : null,
      ticker: null,
      name: r[cName]?.trim() || null,
      quantity: Math.abs(num(r[cQty])),
      price: num(r[cPrice]),
      amount: num(r[cAmount]),
      fee: Math.abs(num(r[cFee])),
      currency: cCur >= 0 ? (r[cCur]?.trim() || 'SEK') : 'SEK',
      fx_rate: null,
      source: 'avanza_csv',
    });
  }
  if (out.length === 0) warnings.push('Inga transaktioner kunde tolkas från Avanza-filen.');
  return { rows: out, warnings, detectedBroker: 'Avanza' };
}

// ───────── Generisk CSV ─────────
function parseGeneric(rows: string[][]): ParseResult {
  const header = rows[0].map(h => h.toLowerCase());
  const idx = (...names: string[]) => names.map(n => header.findIndex(h => h.includes(n.toLowerCase()))).find(i => i >= 0) ?? -1;

  const cDate = idx('datum', 'date', 'affärsdag');
  const cType = idx('typ', 'type', 'transaktion');
  const cName = idx('värdepapper', 'namn', 'name', 'security');
  const cIsin = idx('isin');
  const cQty = idx('antal', 'quantity', 'qty');
  const cPrice = idx('kurs', 'pris', 'price');
  const cAmount = idx('belopp', 'amount');
  const cFee = idx('avgift', 'courtage', 'fee');

  const out: ParsedTx[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 3) continue;
    const txType = mapTxType(r[cType] ?? '');
    if (!txType) continue;

    out.push({
      trade_date: isoDate(r[cDate] ?? ''),
      transaction_type: txType,
      isin: cIsin >= 0 ? r[cIsin]?.trim() || null : null,
      ticker: null,
      name: cName >= 0 ? r[cName]?.trim() || null : null,
      quantity: Math.abs(num(r[cQty])),
      price: num(r[cPrice]),
      amount: num(r[cAmount]),
      fee: cFee >= 0 ? Math.abs(num(r[cFee])) : 0,
      currency: 'SEK',
      fx_rate: null,
      source: 'generic_csv',
    });
  }
  if (out.length === 0) warnings.push('Inga transaktioner kunde tolkas. Kontrollera att kolumnerna heter Datum, Typ, Antal, Kurs, Belopp.');
  return { rows: out, warnings, detectedBroker: 'Okänd CSV' };
}

// ───────── SRU (Skatteverket) ─────────
// SRU-format: BLANKETT K4-2024 → #UPPGIFT 3100 NAMN, 3101 ANTAL, 3102 FÖRSÄLJNING, 3103 OMKOSTNAD
function parseSRU(text: string): ParseResult {
  const out: ParsedTx[] = [];
  const warnings: string[] = [];
  const blocks = text.split(/#BLANKETT/).slice(1);

  for (const block of blocks) {
    const isK4 = /K4/.test(block.split('\n')[0] ?? '');
    if (!isK4) continue;

    const fields: Record<string, string> = {};
    block.split(/\r?\n/).forEach(line => {
      const m = line.match(/^#UPPGIFT\s+(\d+)\s+(.*)$/);
      if (m) fields[m[1]] = m[2].trim();
    });

    const name = fields['3100'];
    const qty = num(fields['3101']);
    const proceeds = num(fields['3102']);
    const cost = num(fields['3103']);
    if (!name) continue;

    // Skapa en säljtransaktion
    out.push({
      trade_date: `${new Date().getFullYear() - 1}-12-31`,
      transaction_type: 'sell',
      isin: null,
      ticker: null,
      name,
      quantity: qty,
      price: qty > 0 ? proceeds / qty : 0,
      amount: proceeds,
      fee: 0,
      currency: 'SEK',
      fx_rate: null,
      source: 'sru',
    });
    // Och en köp-rad för anskaffning (för FIFO-historik)
    if (cost > 0) {
      out.push({
        trade_date: `${new Date().getFullYear() - 1}-01-01`,
        transaction_type: 'buy',
        isin: null,
        ticker: null,
        name,
        quantity: qty,
        price: qty > 0 ? cost / qty : 0,
        amount: -cost,
        fee: 0,
        currency: 'SEK',
        fx_rate: null,
        source: 'sru',
      });
    }
  }
  if (out.length === 0) warnings.push('Inga K4-poster hittades i SRU-filen.');
  return { rows: out, warnings, detectedBroker: 'Skatteverket SRU' };
}

// ───────── Auto-detect ─────────
export function parseBrokerFile(filename: string, content: string): ParseResult {
  const lower = filename.toLowerCase();

  // SRU
  if (lower.endsWith('.sru') || /^#DATABESKRIVNING|^#BLANKETT/m.test(content)) {
    return parseSRU(content);
  }

  const rows = splitCSV(content);
  if (rows.length === 0) return { rows: [], warnings: ['Tom fil'], detectedBroker: '—' };
  const header = rows[0].join('|').toLowerCase();

  if (header.includes('bokföringsdag') || header.includes('värdepapper') && header.includes('total avgift')) {
    return parseNordnet(rows);
  }
  if (header.includes('typ av transaktion') || (header.includes('courtage') && header.includes('belopp'))) {
    return parseAvanza(rows);
  }
  return parseGeneric(rows);
}
