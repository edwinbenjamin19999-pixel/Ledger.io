import { supabase } from "@/integrations/supabase/client";

export interface PaymentArrivalPrediction {
  expectedDate: string;       // ISO yyyy-mm-dd
  earliestDate: string;       // 85% CI lower
  latestDate: string;         // 85% CI upper
  confidence: number;         // 0..1
  basedOnPayments: number;    // sample size
  avgDelayDays: number;
}

const Z_85 = 1.44; // ~85% confidence interval

const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
};

/**
 * Predict when a customer will actually pay an invoice.
 * Looks at last 24 months of paid invoices for that counterparty.
 *
 * Fallback when no history: ±3 days, confidence 50%.
 */
export async function predictPaymentArrival(
  companyId: string,
  counterpartyKey: string | null,
  dueDate: string,
): Promise<PaymentArrivalPrediction> {
  const fallback: PaymentArrivalPrediction = {
    expectedDate: dueDate,
    earliestDate: addDays(dueDate, -3),
    latestDate: addDays(dueDate, 3),
    confidence: 0.5,
    basedOnPayments: 0,
    avgDelayDays: 0,
  };

  if (!counterpartyKey) return fallback;

  const since = new Date();
  since.setMonth(since.getMonth() - 24);

  const { data, error } = await (supabase as any)
    .from("invoices")
    .select("due_date, paid_at")
    .eq("company_id", companyId)
    .eq("counterparty_name", counterpartyKey)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("invoice_date", since.toISOString().slice(0, 10));

  if (error || !data || data.length === 0) return fallback;

  const delays: number[] = (data as Array<{ due_date: string; paid_at: string }>)
    .filter((i) => i.due_date && i.paid_at)
    .map((i) => {
      const due = new Date(i.due_date).getTime();
      const paid = new Date(i.paid_at).getTime();
      return Math.round((paid - due) / 86400_000);
    });

  if (delays.length === 0) return fallback;

  const mean = delays.reduce((s, d) => s + d, 0) / delays.length;
  const variance = delays.reduce((s, d) => s + (d - mean) ** 2, 0) / delays.length;
  const stdDev = Math.sqrt(variance);
  const margin = Z_85 * stdDev;

  // Confidence scales with sample size (capped at 0.95)
  const confidence = Math.min(0.5 + delays.length * 0.05, 0.95);

  return {
    expectedDate: addDays(dueDate, mean),
    earliestDate: addDays(dueDate, mean - margin),
    latestDate: addDays(dueDate, mean + margin),
    confidence,
    basedOnPayments: delays.length,
    avgDelayDays: Math.round(mean),
  };
}
