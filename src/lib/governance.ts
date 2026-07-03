/**
 * Ledger.io Governance & Control Layer
 * 
 * Defines AI autonomy boundaries, Category A/B action classification,
 * and shared governance rules enforced across the entire platform.
 */

// ── Category B Actions: ALWAYS require human review + BankID signing ──
export const CATEGORY_B_ACTIONS = [
  'annual_report_submission',      // Årsredovisning → Bolagsverket
  'income_declaration_ink2',       // Inkomstdeklaration → Skatteverket
  'vat_declaration',               // Momsdeklaration
  'agi_submission',                // Arbetsgivardeklaration → Skatteverket
  'f_tax_payment',                 // F-skatt betalning
  'salary_payment',                // Löneutbetalningar
  'supplier_payment',              // Leverantörsbetalningar (pain.001)
  'owner_withdrawal',              // Uttag ur bolag / enskild firma
] as const;

export type CategoryBAction = typeof CATEGORY_B_ACTIONS[number];

export const CATEGORY_B_LABELS: Record<CategoryBAction, {
  label: string;
  description: string;
  reviewChecklist: string[];
}> = {
  annual_report_submission: {
    label: 'Årsredovisning',
    description: 'Inlämning av årsredovisning till Bolagsverket',
    reviewChecklist: [
      'Jag har granskat alla belopp',
      'Räkenskapsåret stämmer',
      'Alla noter är korrekta',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
  income_declaration_ink2: {
    label: 'Inkomstdeklaration (INK2)',
    description: 'Inlämning av inkomstdeklaration till Skatteverket',
    reviewChecklist: [
      'Jag har granskat alla belopp',
      'Beskattningsåret stämmer',
      'Skattemässiga justeringar är korrekta',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
  vat_declaration: {
    label: 'Momsdeklaration',
    description: 'Inlämning och betalning av momsdeklaration',
    reviewChecklist: [
      'Jag har granskat alla belopp',
      'Perioden stämmer',
      'Momssatser och avdrag är korrekta',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
  agi_submission: {
    label: 'Arbetsgivardeklaration (AGI)',
    description: 'Inlämning av arbetsgivardeklaration till Skatteverket',
    reviewChecklist: [
      'Jag har granskat alla belopp',
      'Perioden stämmer',
      'Antal anställda och löner är korrekta',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
  f_tax_payment: {
    label: 'F-skatt betalning',
    description: 'Betalning av preliminär F-skatt',
    reviewChecklist: [
      'Jag har granskat beloppet',
      'Betalningsperioden stämmer',
      'Mottagarkonto är korrekt',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
  salary_payment: {
    label: 'Löneutbetalning',
    description: 'Utbetalning av löner till anställda',
    reviewChecklist: [
      'Jag har granskat alla belopp',
      'Perioden stämmer',
      'Mottagare/konto är korrekt',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
  supplier_payment: {
    label: 'Leverantörsbetalning',
    description: 'Betalning till leverantörer via bank',
    reviewChecklist: [
      'Jag har granskat alla belopp',
      'Fakturanummer stämmer',
      'Mottagare/konto är korrekt',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
  owner_withdrawal: {
    label: 'Uttag',
    description: 'Uttag ur bolag eller enskild firma',
    reviewChecklist: [
      'Jag har granskat beloppet',
      'Skattekonsekvenser är beaktade',
      'Mottagarkonto är korrekt',
      'Jag är behörig att utföra denna åtgärd',
    ],
  },
};

// ── Category A Actions: AI executes freely ──
export const CATEGORY_A_EXAMPLES = [
  'Hämta och visa siffror',
  'Beräkna förslag (moms, skatt, lön, kontering)',
  'Generera utkast av dokument',
  'Skicka påminnelser och notifieringar',
  'Kategorisera transaktioner',
  'Generera rapporter och analyser',
  'Föreslå bokföringsposter',
  'Flagga anomalier',
] as const;

export function isCategoryBAction(action: string): action is CategoryBAction {
  return CATEGORY_B_ACTIONS.includes(action as CategoryBAction);
}

// ── Notification channel defaults ──
export type NotificationChannel = 'email' | 'sms' | 'push';

export interface NotificationPreference {
  label: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  isCritical: boolean; // Critical alerts default SMS=on
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<string, NotificationPreference> = {
  invoice_reminder:      { label: 'Påminnelse (faktura)',       email: true, sms: false, push: true,  isCritical: false },
  collection_notice:     { label: 'Inkassokrav',                email: true, sms: false, push: true,  isCritical: false },
  payslip:               { label: 'Lönebesked',                 email: true, sms: false, push: true,  isCritical: false },
  tax_deadline:          { label: 'Skattedeadline',             email: true, sms: true,  push: true,  isCritical: true },
  liquidity_warning:     { label: 'Kritisk likviditetsvarning', email: true, sms: true,  push: true,  isCritical: true },
  anomaly_high_priority: { label: 'Anomali (hög prioritet)',    email: true, sms: false, push: true,  isCritical: false },
};

export const SMS_PLAN_LIMITS = {
  standard: 0,
  pro: 50,
  enterprise: 999999, // unlimited
} as const;

// ── Audit log action types för Category B ──
export interface GovernanceAuditEntry {
  company_id: string;
  user_id: string;
  action_type: CategoryBAction;
  amount: number | null;
  period: string | null;
  bankid_personal_number_masked: string | null;
  ip_address: string | null;
  status: 'completed' | 'failed' | 'cancelled';
  document_reference: string | null;
}
