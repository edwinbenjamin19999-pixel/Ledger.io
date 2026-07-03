import { supabase } from "@/integrations/supabase/client";
import { buildAccrualPlan } from "./detection";

export interface CreateScheduleInput {
  companyId: string;
  description: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  monthsTotal: number;
  costAccountNumber: string;
  prepaidAccountNumber?: string;
  sourceInvoiceId?: string | null;
  sourceJournalEntryId?: string | null;
  notes?: string | null;
  createdBy: string;
}

export const createAccrualSchedule = async (input: CreateScheduleInput) => {
  const { data: schedule, error } = await supabase
    .from("accrual_schedules" as any)
    .insert({
      company_id: input.companyId,
      description: input.description,
      total_amount: input.totalAmount,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      months_total: input.monthsTotal,
      cost_account_number: input.costAccountNumber,
      prepaid_account_number: input.prepaidAccountNumber || "1710",
      source_invoice_id: input.sourceInvoiceId || null,
      source_journal_entry_id: input.sourceJournalEntryId || null,
      notes: input.notes || null,
      created_by: input.createdBy,
    })
    .select()
    .maybeSingle();
  if (error) throw error;

  const plan = buildAccrualPlan(input.totalAmount, input.periodStart, input.monthsTotal);
  const postings = plan.map(p => ({
    schedule_id: (schedule as any).id,
    period_month: p.month,
    amount: p.amount,
    status: "pending" as const,
  }));
  const { error: postingErr } = await supabase
    .from("accrual_postings" as any)
    .insert(postings);
  if (postingErr) throw postingErr;

  return schedule as any;
};
