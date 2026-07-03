/**
 * Account Mapping Layer — Single source of truth for BAS 2026 concept-to-account mappings.
 * 
 * Users work with human-readable concepts ("Intäkt 25% moms", "Programvarulicens").
 * The system silently resolves to correct BAS accounts. Account numbers are implementation details.
 */

// ─── Types ────────────────────────────────────────────────────

export type TransactionCategory =
  | 'revenue_domestic'
  | 'revenue_eu_service'
  | 'revenue_eu_goods'
  | 'revenue_export'
  | 'cost_domestic'
  | 'cost_eu_reverse_charge'
  | 'cost_import'
  | 'payroll'
  | 'asset_purchase'
  | 'equity_movement'
  | 'intercompany'
  | 'correction'
  | 'opening_balance';

export interface JournalLine {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  vatCode?: string;
  vatAmount?: number;
}

export interface AccountScenario {
  id: string;
  label: string;              // User-facing label in Swedish
  category: TransactionCategory;
  vatRate: number | null;      // null = no VAT
  lines: (amount: number, vatAmount?: number) => JournalLine[];
  momsRutor?: Record<string, (amount: number) => number>; // ruta → value
}

// ─── Deprecated accounts ──────────────────────────────────────

export const DEPRECATED_ACCOUNTS = [
  '2990', '1790', '3000', '4000',
] as const;

export function isDeprecatedAccount(accountNumber: string): boolean {
  return (DEPRECATED_ACCOUNTS as readonly string[]).includes(accountNumber);
}

/**
 * Maps a deprecated account to its modern replacement for analysis purposes.
 * Returns null if the account is not deprecated.
 */
export function getModernEquivalent(accountNumber: string): { modern: string; label: string } | null {
  const map: Record<string, { modern: string; label: string }> = {
    '2610': { modern: '2611', label: 'Debiterad utgående moms 25%' },
    '2640': { modern: '2641', label: 'Debiterad ingående moms' },
    '3000': { modern: '3010', label: 'Försäljning varor 25%' },
    '4000': { modern: '4010', label: 'Inköp varor och material' },
    '2990': { modern: '2890', label: 'Övriga kortfristiga skulder' },
    '1790': { modern: '1780', label: 'Övriga förutbetalda kostnader' },
  };
  return map[accountNumber] ?? null;
}

// ─── Helpers ──────────────────────────────────────────────────

function calcVat(grossAmount: number, rate: number): number {
  return Math.round(grossAmount * rate / (100 + rate));
}

function calcVatFromNet(netAmount: number, rate: number): number {
  return Math.round(netAmount * rate / 100);
}

// ─── Direct expense threshold (2026 half-prisbasbelopp) ──────

export const DIRECT_EXPENSE_LIMIT = 23650;

// ─── Scenario Definitions ─────────────────────────────────────

export const ACCOUNT_SCENARIOS: AccountScenario[] = [
  // ═══════════ REVENUE — DOMESTIC ═══════════
  {
    id: 'SE_REVENUE_25',
    label: 'Intäkt Sverige 25% moms',
    category: 'revenue_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '1510', accountName: 'Kundfordringar', debit: amount, credit: 0 },
        { accountNumber: '3010', accountName: 'Försäljning varor 25%', debit: 0, credit: net, vatCode: '25' },
        { accountNumber: '2611', accountName: 'Utgående moms 25%', debit: 0, credit: vat },
      ];
    },
    momsRutor: { '05': (a) => a - calcVat(a, 25), '10': (a) => calcVat(a, 25) },
  },
  {
    id: 'SE_REVENUE_12',
    label: 'Intäkt Sverige 12% moms',
    category: 'revenue_domestic',
    vatRate: 12,
    lines: (amount) => {
      const vat = calcVat(amount, 12);
      const net = amount - vat;
      return [
        { accountNumber: '1510', accountName: 'Kundfordringar', debit: amount, credit: 0 },
        { accountNumber: '3011', accountName: 'Försäljning varor 12%', debit: 0, credit: net, vatCode: '12' },
        { accountNumber: '2621', accountName: 'Utgående moms 12%', debit: 0, credit: vat },
      ];
    },
    momsRutor: { '06': (a) => a - calcVat(a, 12), '11': (a) => calcVat(a, 12) },
  },
  {
    id: 'SE_REVENUE_6',
    label: 'Intäkt Sverige 6% moms',
    category: 'revenue_domestic',
    vatRate: 6,
    lines: (amount) => {
      const vat = calcVat(amount, 6);
      const net = amount - vat;
      return [
        { accountNumber: '1510', accountName: 'Kundfordringar', debit: amount, credit: 0 },
        { accountNumber: '3012', accountName: 'Försäljning varor 6%', debit: 0, credit: net, vatCode: '6' },
        { accountNumber: '2631', accountName: 'Utgående moms 6%', debit: 0, credit: vat },
      ];
    },
    momsRutor: { '07': (a) => a - calcVat(a, 6), '12': (a) => calcVat(a, 6) },
  },
  {
    id: 'SE_REVENUE_EXEMPT',
    label: 'Momsfri intäkt Sverige',
    category: 'revenue_domestic',
    vatRate: 0,
    lines: (amount) => [
      { accountNumber: '1510', accountName: 'Kundfordringar', debit: amount, credit: 0 },
      { accountNumber: '3043', accountName: 'Tjänster momsfri', debit: 0, credit: amount, vatCode: '0' },
    ],
    momsRutor: { '42': (a) => a },
  },

  // ═══════════ REVENUE — EU ═══════════
  {
    id: 'EU_SERVICE_SALE',
    label: 'Tjänsteförsäljning EU (omvänd moms)',
    category: 'revenue_eu_service',
    vatRate: 0,
    lines: (amount) => [
      { accountNumber: '1510', accountName: 'Kundfordringar', debit: amount, credit: 0 },
      { accountNumber: '3231', accountName: 'Försäljning tjänster EU', debit: 0, credit: amount, vatCode: '0' },
    ],
    momsRutor: { '39': (a) => a },
  },
  {
    id: 'EU_GOODS_SALE',
    label: 'Varuförsäljning EU',
    category: 'revenue_eu_goods',
    vatRate: 0,
    lines: (amount) => [
      { accountNumber: '1510', accountName: 'Kundfordringar', debit: amount, credit: 0 },
      { accountNumber: '3106', accountName: 'Varuförsäljning EU', debit: 0, credit: amount, vatCode: '0' },
    ],
    momsRutor: { '35': (a) => a },
  },

  // ═══════════ REVENUE — EXPORT ═══════════
  {
    id: 'EXPORT_OUTSIDE_EU',
    label: 'Export utanför EU (momsfri)',
    category: 'revenue_export',
    vatRate: 0,
    lines: (amount) => [
      { accountNumber: '1510', accountName: 'Kundfordringar', debit: amount, credit: 0 },
      { accountNumber: '3051', accountName: 'Export utanför EU', debit: 0, credit: amount, vatCode: '0' },
    ],
    momsRutor: { '36': (a) => a },
  },

  // ═══════════ COSTS — DOMESTIC ═══════════
  {
    id: 'COST_GOODS_SE_25',
    label: 'Inköp varor Sverige 25%',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '4010', accountName: 'Inköp varor och material', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_SOFTWARE_LICENSE',
    label: 'Programvarulicens / SaaS',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '6911', accountName: 'Programvarulicenser/SaaS', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_RENT',
    label: 'Hyra lokal',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '5010', accountName: 'Lokalhyra', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_TELECOM',
    label: 'Telefon och internet',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '6210', accountName: 'Telekommunikation', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_MARKETING',
    label: 'Marknadsföring',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '6940', accountName: 'Marknadsföring', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_OFFICE_SUPPLIES',
    label: 'Kontorsmaterial',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '6110', accountName: 'Kontorsmaterial', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_ACCOUNTING',
    label: 'Bokföring och revision',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '6420', accountName: 'Revisionsarvoden', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_REPRESENTATION',
    label: 'Representation (max 180 kr/person avdragsgill)',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      // Note: If net exceeds 180 kr/person, the excess should go to 6072.
      // Since we don't know number of persons here, we book to 6071 with a warning.
      // The compliance engine will flag amounts that seem too high for representation.
      return [
        { accountNumber: '6071', accountName: 'Representation avdragsgill', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '1930', accountName: 'Företagskonto', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'COST_REPRESENTATION_NON_DEDUCTIBLE',
    label: 'Representation (ej avdragsgill del)',
    category: 'cost_domestic',
    vatRate: null,
    lines: (amount) => [
      { accountNumber: '6072', accountName: 'Representation ej avdragsgill', debit: amount, credit: 0 },
      { accountNumber: '1930', accountName: 'Företagskonto', debit: 0, credit: amount },
    ],
  },

  // ═══════════ COSTS — EU REVERSE CHARGE ═══════════
  {
    id: 'EU_PURCHASE_REVERSE_CHARGE_SERVICE',
    label: 'Inköp tjänst EU (omvänd skattskyldighet)',
    category: 'cost_eu_reverse_charge',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVatFromNet(amount, 25);
      return [
        { accountNumber: '6550', accountName: 'Konsulttjänster', debit: amount, credit: 0 },
        { accountNumber: '2614', accountName: 'Utgående moms omvänd skattskyldighet', debit: 0, credit: vat },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: {
      '21': (a) => a,
      '31': (a) => calcVatFromNet(a, 25),
      '48': (a) => calcVatFromNet(a, 25),
    },
  },
  {
    id: 'EU_PURCHASE_GOODS',
    label: 'Inköp varor EU (gemenskapsintern förvärv)',
    category: 'cost_eu_reverse_charge',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVatFromNet(amount, 25);
      return [
        { accountNumber: '4040', accountName: 'Inköp varor inom EU', debit: amount, credit: 0 },
        { accountNumber: '2614', accountName: 'Utgående moms omvänd skattskyldighet', debit: 0, credit: vat },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: {
      '20': (a) => a,
      '30': (a) => calcVatFromNet(a, 25),
      '48': (a) => calcVatFromNet(a, 25),
    },
  },

  // ═══════════ COSTS — IMPORT ═══════════
  {
    id: 'IMPORT_OUTSIDE_EU',
    label: 'Import utanför EU (importmoms)',
    category: 'cost_import',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVatFromNet(amount, 25);
      return [
        { accountNumber: '4050', accountName: 'Inköp varor utanför EU', debit: amount, credit: 0 },
        { accountNumber: '2615', accountName: 'Utgående moms import', debit: 0, credit: vat },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: {
      '50': (a) => a,
      '60': (a) => calcVatFromNet(a, 25),
      '48': (a) => calcVatFromNet(a, 25),
    },
  },

  // ═══════════ PAYROLL ═══════════
  {
    id: 'PAYROLL_STANDARD',
    label: 'Löneutbetalning',
    category: 'payroll',
    vatRate: null,
    lines: (grossSalary, taxAmount) => {
      const tax = taxAmount ?? Math.round(grossSalary * 0.30);
      const net = grossSalary - tax;
      const socialFees = Math.round(grossSalary * 0.3142);
      return [
        { accountNumber: '7010', accountName: 'Löner tjänstemän', debit: grossSalary, credit: 0 },
        { accountNumber: '7510', accountName: 'Arbetsgivaravgifter', debit: socialFees, credit: 0 },
        { accountNumber: '1930', accountName: 'Företagskonto', debit: 0, credit: net },
        { accountNumber: '2710', accountName: 'Personalskatt', debit: 0, credit: tax },
        { accountNumber: '2740', accountName: 'Upplupen arbetsgivaravgift', debit: 0, credit: socialFees },
      ];
    },
  },

  // ═══════════ ASSETS ═══════════
  {
    id: 'ASSET_PURCHASE_CAPITALIZE',
    label: 'Inventarieinköp > 23 650 kr (aktiveras)',
    category: 'asset_purchase',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '1220', accountName: 'Inventarier och verktyg', debit: net, credit: 0 },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'ASSET_PURCHASE_DIRECT_EXPENSE',
    label: 'Inventarieinköp ≤ 23 650 kr (direktavdrag)',
    category: 'asset_purchase',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVat(amount, 25);
      const net = amount - vat;
      return [
        { accountNumber: '6040', accountName: 'Förbrukningsinventarier', debit: net, credit: 0, vatCode: '25' },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: { '48': (a) => calcVat(a, 25) },
  },
  {
    id: 'DEPRECIATION_EQUIPMENT',
    label: 'Avskrivning maskiner och inventarier',
    category: 'asset_purchase',
    vatRate: null,
    lines: (amount) => [
      { accountNumber: '7832', accountName: 'Avskrivning maskiner', debit: amount, credit: 0 },
      { accountNumber: '1229', accountName: 'Ack avskrivning inventarier', debit: 0, credit: amount },
    ],
  },

  // ═══════════ EQUITY ═══════════
  {
    id: 'EQUITY_SHAREHOLDER_INJECTION',
    label: 'Aktieägarinsättning',
    category: 'equity_movement',
    vatRate: null,
    lines: (amount) => [
      { accountNumber: '1930', accountName: 'Företagskonto', debit: amount, credit: 0 },
      { accountNumber: '2081', accountName: 'Aktiekapital', debit: 0, credit: amount },
    ],
  },
  {
    id: 'EQUITY_DIVIDEND_DECIDED',
    label: 'Utdelning beslutad',
    category: 'equity_movement',
    vatRate: null,
    lines: (amount) => [
      { accountNumber: '2091', accountName: 'Balanserat resultat', debit: amount, credit: 0 },
      { accountNumber: '2898', accountName: 'Utdelningsskuld', debit: 0, credit: amount },
    ],
  },
  {
    id: 'EQUITY_DIVIDEND_PAID',
    label: 'Utdelning utbetald',
    category: 'equity_movement',
    vatRate: null,
    lines: (amount) => [
      { accountNumber: '2898', accountName: 'Utdelningsskuld', debit: amount, credit: 0 },
      { accountNumber: '1930', accountName: 'Företagskonto', debit: 0, credit: amount },
    ],
  },

  // ═══════════ DOMESTIC REVERSE CHARGE (CONSTRUCTION) ═══════════
  {
    id: 'DOMESTIC_REVERSE_CHARGE_CONSTRUCTION',
    label: 'Omvänd skattskyldighet bygg (inhemsk)',
    category: 'cost_domestic',
    vatRate: 25,
    lines: (amount) => {
      const vat = calcVatFromNet(amount, 25);
      return [
        { accountNumber: '4400', accountName: 'Inköp underleverantörer', debit: amount, credit: 0 },
        { accountNumber: '2614', accountName: 'Utgående moms omvänd skattskyldighet', debit: 0, credit: vat },
        { accountNumber: '2641', accountName: 'Ingående moms', debit: vat, credit: 0 },
        { accountNumber: '2440', accountName: 'Leverantörsskulder', debit: 0, credit: amount },
      ];
    },
    momsRutor: {
      '23': (a) => a,
      '33': (a) => calcVatFromNet(a, 25),
      '48': (a) => calcVatFromNet(a, 25),
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────

export function getScenarioById(id: string): AccountScenario | undefined {
  return ACCOUNT_SCENARIOS.find((s) => s.id === id);
}

export function getScenariosByCategory(category: TransactionCategory): AccountScenario[] {
  return ACCOUNT_SCENARIOS.filter((s) => s.category === category);
}

export function getUserFacingLabels(): { id: string; label: string; category: TransactionCategory }[] {
  return ACCOUNT_SCENARIOS.map(({ id, label, category }) => ({ id, label, category }));
}

/**
 * Keyword-based scenario resolver for AI engine.
 * Returns the best-matching scenario based on description text.
 */
export function resolveScenarioFromDescription(
  description: string,
  amount: number,
  options?: { vatRate?: number; isEU?: boolean; isExport?: boolean }
): AccountScenario | null {
  const desc = description.toLowerCase();

  // Payroll
  if (/lön|löne|salary|payroll/.test(desc)) {
    return getScenarioById('PAYROLL_STANDARD') ?? null;
  }

  // Asset purchase
  if (/inventarie|maskin|utrustning|dator|möbl/.test(desc)) {
    const net = options?.vatRate ? amount - calcVat(amount, options.vatRate) : amount;
    return getScenarioById(net > DIRECT_EXPENSE_LIMIT ? 'ASSET_PURCHASE_CAPITALIZE' : 'ASSET_PURCHASE_DIRECT_EXPENSE') ?? null;
  }

  // Equity
  if (/aktieägartillskott|aktieinsättning|insättning.*ägare/.test(desc)) return getScenarioById('EQUITY_SHAREHOLDER_INJECTION') ?? null;
  if (/utdelning.*beslut/.test(desc)) return getScenarioById('EQUITY_DIVIDEND_DECIDED') ?? null;
  if (/utdelning.*utbetal/.test(desc)) return getScenarioById('EQUITY_DIVIDEND_PAID') ?? null;

  // EU / Export
  if (options?.isExport) return getScenarioById('EXPORT_OUTSIDE_EU') ?? null;

  if (options?.isEU) {
    if (/tjänst|service|konsult/.test(desc)) {
      // Revenue or cost?
      if (amount > 0 || /försäljning|intäkt|faktura/.test(desc)) return getScenarioById('EU_SERVICE_SALE') ?? null;
      return getScenarioById('EU_PURCHASE_REVERSE_CHARGE_SERVICE') ?? null;
    }
    if (amount > 0 || /försäljning|varuexport/.test(desc)) return getScenarioById('EU_GOODS_SALE') ?? null;
    return getScenarioById('EU_PURCHASE_GOODS') ?? null;
  }

  // Specific costs
  if (/programvara|licens|saas|software|abonnemang/.test(desc)) return getScenarioById('COST_SOFTWARE_LICENSE') ?? null;
  if (/hyra|lokal|kontor.*hyra/.test(desc)) return getScenarioById('COST_RENT') ?? null;
  if (/telefon|internet|mobil|bredband/.test(desc)) return getScenarioById('COST_TELECOM') ?? null;
  if (/marknadsföring|reklam|ads|annons/.test(desc)) return getScenarioById('COST_MARKETING') ?? null;
  if (/kontorsmaterial|kontors/.test(desc)) return getScenarioById('COST_OFFICE_SUPPLIES') ?? null;
  if (/revision|redovisning|bokföring/.test(desc)) return getScenarioById('COST_ACCOUNTING') ?? null;
  if (/representation/.test(desc)) return getScenarioById('COST_REPRESENTATION') ?? null;

  // Revenue fallback
  if (/faktura|intäkt|försäljning/.test(desc)) {
    const rate = options?.vatRate ?? 25;
    if (rate === 12) return getScenarioById('SE_REVENUE_12') ?? null;
    if (rate === 6) return getScenarioById('SE_REVENUE_6') ?? null;
    if (rate === 0) return getScenarioById('SE_REVENUE_EXEMPT') ?? null;
    return getScenarioById('SE_REVENUE_25') ?? null;
  }

  // Generic cost fallback
  return getScenarioById('COST_GOODS_SE_25') ?? null;
}
