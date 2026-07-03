import { differenceInDays } from "date-fns";

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  counterparty_name: string;
  total_amount: number;
  due_date: string;
  invoice_date: string;
  invoice_type: string;
  status: string;
  paid_at?: string;
}

export interface AgeingBucket {
  label: string;
  invoices: InvoiceRow[];
  total: number;
}

export interface CounterpartySummary {
  name: string;
  total: number;
  overdue: number;
  buckets: number[];
  invoices: InvoiceRow[];
}

export const BUCKET_LABELS = [
  "Ej förfallen",
  "1–30 dagar",
  "31–60 dagar",
  "61–90 dagar",
  "90+ dagar",
] as const;

/** Mjuk semantisk färgprogression — fresh → neutral → risk → high risk */
export const BUCKET_COLORS = [
  "hsl(215 25% 75%)", // slate-300 — ej förfallen
  "hsl(187 75% 55% / 0.75)", // blue-400/75 — 1-30
  "hsl(215 16% 55%)", // slate-400 — 31-60
  "hsl(38 92% 50% / 0.85)", // amber-500/85 — 61-90
  "hsl(0 84% 60% / 0.85)", // rose-500/85 — 90+
] as const;

export const BUCKET_BG_CLASSES = [
  "bg-slate-300",
  "bg-[#3b82f6]/70",
  "bg-slate-400",
  "bg-amber-500/80",
  "bg-rose-500/80",
] as const;

export const getBucketIdx = (dueDate: string): number => {
  const days = differenceInDays(new Date(), new Date(dueDate));
  return days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
};

export const bucketize = (invoices: InvoiceRow[]): AgeingBucket[] => {
  const buckets: AgeingBucket[] = BUCKET_LABELS.map((label) => ({
    label,
    invoices: [],
    total: 0,
  }));
  invoices.forEach((inv) => {
    const idx = getBucketIdx(inv.due_date);
    buckets[idx].invoices.push(inv);
    buckets[idx].total += inv.total_amount;
  });
  return buckets;
};

export const groupByCounterparty = (
  invoices: InvoiceRow[],
): CounterpartySummary[] => {
  const map = new Map<string, CounterpartySummary>();
  const today = new Date();
  invoices.forEach((inv) => {
    const name = inv.counterparty_name || "Okänd";
    if (!map.has(name))
      map.set(name, {
        name,
        total: 0,
        overdue: 0,
        buckets: [0, 0, 0, 0, 0],
        invoices: [],
      });
    const s = map.get(name)!;
    s.total += inv.total_amount;
    s.invoices.push(inv);
    s.buckets[getBucketIdx(inv.due_date)] += inv.total_amount;
    if (differenceInDays(today, new Date(inv.due_date)) > 0)
      s.overdue += inv.total_amount;
  });
  return Array.from(map.values()).sort((a, b) => b.overdue - a.overdue);
};

export const calcDSO = (
  _openInvoices: InvoiceRow[],
  allInvoices: InvoiceRow[],
): number => {
  const paid = allInvoices.filter((i) => i.paid_at);
  if (paid.length === 0) return 0;
  const days = paid.map((i) =>
    Math.max(
      0,
      differenceInDays(new Date(i.paid_at!), new Date(i.invoice_date)),
    ),
  );
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
};

export const fmtSEK = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
