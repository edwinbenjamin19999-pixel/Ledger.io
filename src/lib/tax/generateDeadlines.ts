/**
 * Dynamic Swedish tax deadline generator based on company settings.
 * Replaces all hardcoded deadline arrays in calendar widgets.
 */

export interface CompanySettings {
  fiscal_year_start: string; // e.g. '2025-01-01'
  fiscal_year_end: string;   // e.g. '2025-12-31'
  vat_period_type: 'monthly' | 'quarterly' | 'yearly';
  company_type: 'AB' | 'EF' | 'HB' | 'EK';
  registered_for_fskatt: boolean;
  num_employees: number;
  eu_vat_liable: boolean;
}

export interface TaxDeadline {
  id: string;
  type: 'AGI' | 'Moms' | 'F-skatt' | 'INK2' | 'K10' | 'KU10';
  title: string;
  description: string;
  dueDate: Date;
  period: string;
  amount?: number;
  isRequired: boolean;
  /** Tab to navigate to in the automation panel */
  tab: string;
}

const MONTH_NAMES = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

function monthName(m: number): string {
  return MONTH_NAMES[m] ?? '';
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('sv-SE');
}

export function generateDeadlines(
  company: CompanySettings,
  year: number,
): TaxDeadline[] {
  const deadlines: TaxDeadline[] = [];

  // ─── AGI — 12th of each month following the salary period ───
  if (company.num_employees > 0) {
    for (let month = 0; month < 12; month++) {
      const dueMonth = month + 1; // next month
      const dueYear = dueMonth > 11 ? year + 1 : year;
      const dueMonthIdx = dueMonth > 11 ? 0 : dueMonth;

      deadlines.push({
        id: `agi-${year}-${month}`,
        type: 'AGI',
        title: 'Arbetsgivardeklaration (AGI)',
        description: `AGI för ${monthName(month)} ${year}`,
        dueDate: new Date(dueYear, dueMonthIdx, 12),
        period: `${monthName(month)} ${year}`,
        isRequired: true,
        tab: 'agi',
      });
    }
  }

  // ─── Moms ───
  if (company.vat_period_type === 'monthly') {
    // Monthly VAT: due the 12th of the SECOND month after the period
    // (Skatteverket-regel för omsättning ≤ 40 mkr; standardvalet för SME).
    // Exempel: jan-perioden → förfaller 12 mars; april → 12 juni.
    for (let month = 0; month < 12; month++) {
      const dueMonth = month + 2;
      const dueYear = dueMonth > 11 ? year + 1 : year;
      const dueMonthIdx = dueMonth > 11 ? dueMonth - 12 : dueMonth;

      deadlines.push({
        id: `vat-${year}-m${month}`,
        type: 'Moms',
        title: 'Momsdeklaration',
        description: `Moms för ${monthName(month)} ${year}`,
        dueDate: new Date(dueYear, dueMonthIdx, 12),
        period: `${monthName(month)} ${year}`,
        isRequired: true,
        tab: 'vat',
      });
    }
  } else if (company.vat_period_type === 'quarterly') {
    const quarters: Array<{ q: number; label: string; dueMonth: number; dueDay: number; dueYear: number }> = [
      { q: 1, label: 'Q1', dueMonth: 4, dueDay: 12, dueYear: year },   // May 12
      { q: 2, label: 'Q2', dueMonth: 7, dueDay: 12, dueYear: year },   // Aug 12
      { q: 3, label: 'Q3', dueMonth: 10, dueDay: 12, dueYear: year },  // Nov 12
      { q: 4, label: 'Q4', dueMonth: 1, dueDay: 12, dueYear: year + 1 }, // Feb 12 next year
    ];
    quarters.forEach(({ q, label, dueMonth, dueDay, dueYear: dy }) => {
      deadlines.push({
        id: `vat-${year}-q${q}`,
        type: 'Moms',
        title: `Momsdeklaration ${label} ${year}`,
        description: 'Kvartalsvis moms',
        dueDate: new Date(dy, dueMonth, dueDay),
        period: `${label} ${year}`,
        isRequired: true,
        tab: 'vat',
      });
    });
  } else if (company.vat_period_type === 'yearly') {
    // Yearly VAT: due Feb 26 the following year
    deadlines.push({
      id: `vat-${year}-annual`,
      type: 'Moms',
      title: `Momsdeklaration ${year}`,
      description: 'Helårs momsdeklaration',
      dueDate: new Date(year + 1, 1, 26),
      period: `${year}`,
      isRequired: true,
      tab: 'vat',
    });
  }

  // ─── INK2 — 7 months after fiscal year end ───
  if (company.company_type === 'AB') {
    const fyEnd = new Date(company.fiscal_year_end);
    const ink2Due = new Date(fyEnd);
    ink2Due.setMonth(ink2Due.getMonth() + 7);
    ink2Due.setDate(1);

    deadlines.push({
      id: `ink2-${fyEnd.getFullYear()}`,
      type: 'INK2',
      title: 'Inkomstdeklaration 2 (INK2)',
      description: `Räkenskapsår ${fmtDate(new Date(company.fiscal_year_start))}–${fmtDate(fyEnd)}`,
      dueDate: ink2Due,
      period: `RÅ ${fyEnd.getFullYear()}`,
      isRequired: true,
      tab: 'annual',
    });

    // ─── K10 — same deadline as INK2 ───
    deadlines.push({
      id: `k10-${fyEnd.getFullYear()}`,
      type: 'K10',
      title: 'K10 (fåmansbolag)',
      description: 'Blankett K10 — lämnas med inkomstdeklarationen',
      dueDate: new Date(ink2Due),
      period: `RÅ ${fyEnd.getFullYear()}`,
      isRequired: true,
      tab: 'annual',
    });
  }

  // ─── KU10 — Jan 31 following year ───
  if (company.num_employees > 0) {
    deadlines.push({
      id: `ku10-${year}`,
      type: 'KU10',
      title: 'Kontrolluppgifter (KU10)',
      description: 'Kontrolluppgifter för anställda',
      dueDate: new Date(year + 1, 0, 31),
      period: `${year}`,
      isRequired: true,
      tab: 'agi',
    });
  }

  // ─── F-skatt — 12th of each month ───
  if (company.registered_for_fskatt) {
    for (let month = 0; month < 12; month++) {
      deadlines.push({
        id: `fskatt-${year}-${month}`,
        type: 'F-skatt',
        title: 'F-skatt (preliminärskatt)',
        description: `F-skatt ${monthName(month)} ${year}`,
        dueDate: new Date(year, month, 12),
        period: `${monthName(month)} ${year}`,
        isRequired: true,
        tab: 'agi', // closest tab
      });
    }
  }

  return deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Default settings when the DB fields are null/missing.
 */
export function parseCompanySettings(row: Record<string, unknown>): CompanySettings {
  const now = new Date();
  return {
    fiscal_year_start: (row.fiscal_year_start as string) || `${now.getFullYear()}-01-01`,
    fiscal_year_end: (row.fiscal_year_end as string) || `${now.getFullYear()}-12-31`,
    vat_period_type: (row.vat_period_type as CompanySettings['vat_period_type']) || 'quarterly',
    company_type: (row.company_type as CompanySettings['company_type']) || 'AB',
    registered_for_fskatt: row.registered_for_fskatt !== false,
    num_employees: typeof row.num_employees === 'number' ? row.num_employees : 0,
    eu_vat_liable: row.eu_vat_liable === true,
  };
}
