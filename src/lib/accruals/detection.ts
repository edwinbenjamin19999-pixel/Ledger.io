// Detects periodisation signals from invoice metadata.
// Pure functions — no side effects.

const KEYWORDS = [
  "hyra", "hyror",
  "försäkring", "forsakring",
  "licens", "licenser",
  "abonnemang",
  "prenumeration",
  "kvartal",
  "halvår", "halvar",
  "år ", "årligt", "arligt", "årlig",
  "support", "underhåll", "underhall",
  "serviceavtal",
];

const VENDOR_CATEGORY_HINTS = ["subscription", "rent", "insurance", "abonnemang", "hyra", "försäkring"];

export interface AccrualSignal {
  detected: boolean;
  reason: string;
  suggestedMonths: number;
  suggestedPeriodStart: string; // YYYY-MM-DD
  suggestedPeriodEnd: string;
}

export interface DetectionInput {
  description?: string | null;
  invoiceDate: string; // YYYY-MM-DD
  periodStart?: string | null;
  periodEnd?: string | null;
  vendorCategory?: string | null;
  amountInclVat?: number;
}

const monthsBetween = (start: Date, end: Date) => {
  const m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(1, m);
};

const addMonths = (date: Date, n: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export const detectAccrualSignal = (input: DetectionInput): AccrualSignal => {
  const desc = (input.description || "").toLowerCase();
  const invoiceDate = new Date(input.invoiceDate);

  let reasons: string[] = [];
  let monthsHint = 0;

  // 1. Keyword match
  const matchedKeyword = KEYWORDS.find(k => desc.includes(k));
  if (matchedKeyword) {
    reasons.push(`Nyckelord: "${matchedKeyword.trim()}"`);
    if (/kvartal/.test(desc)) monthsHint = 3;
    else if (/halvår|halvar/.test(desc)) monthsHint = 6;
    else if (/årligt|arligt|årlig|år /.test(desc)) monthsHint = 12;
    else if (/hyra|abonnemang|prenumeration|licens|försäkring|forsakring/.test(desc)) monthsHint = 12;
  }

  // 2. Explicit period range
  let periodStart = input.periodStart ? new Date(input.periodStart) : null;
  let periodEnd = input.periodEnd ? new Date(input.periodEnd) : null;
  if (periodStart && periodEnd) {
    const months = monthsBetween(periodStart, periodEnd);
    if (months >= 2) {
      reasons.push(`Fakturaperiod ${months} mån`);
      monthsHint = Math.max(monthsHint, months);
    }
  }

  // 3. Vendor category
  const cat = (input.vendorCategory || "").toLowerCase();
  if (cat && VENDOR_CATEGORY_HINTS.some(h => cat.includes(h))) {
    reasons.push(`Leverantörskategori: ${input.vendorCategory}`);
    if (monthsHint < 3) monthsHint = 12;
  }

  const detected = reasons.length > 0 && monthsHint >= 2;

  // Default proposed period: starts the month of invoice, runs N months
  const startCandidate = periodStart || new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 1);
  const months = monthsHint || 3;
  const endCandidate = periodEnd || addMonths(startCandidate, months - 1);

  return {
    detected,
    reason: reasons.join(" · ") || "Inga signaler",
    suggestedMonths: months,
    suggestedPeriodStart: fmt(startCandidate),
    suggestedPeriodEnd: fmt(endCandidate),
  };
};

export const buildAccrualPlan = (
  totalAmount: number,
  periodStart: string,
  monthsTotal: number,
): { month: string; amount: number }[] => {
  const start = new Date(periodStart);
  const baseAmount = Math.round((totalAmount / monthsTotal) * 100) / 100;
  const plan: { month: string; amount: number }[] = [];
  let allocated = 0;
  for (let i = 0; i < monthsTotal; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const isLast = i === monthsTotal - 1;
    const amount = isLast ? Math.round((totalAmount - allocated) * 100) / 100 : baseAmount;
    allocated += amount;
    plan.push({ month: d.toISOString().slice(0, 10), amount });
  }
  return plan;
};
