import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Kreditbetyg A-F baserat på förfallohistorik
function calcCreditGrade(daysOverdueAvg: number, overdueCount: number): string {
  if (daysOverdueAvg === 0 && overdueCount === 0) return 'A';
  if (daysOverdueAvg <= 7 && overdueCount <= 1) return 'B';
  if (daysOverdueAvg <= 14 && overdueCount <= 3) return 'C';
  if (daysOverdueAvg <= 30 && overdueCount <= 5) return 'D';
  if (daysOverdueAvg <= 60) return 'E';
  return 'F';
}

// Recovery probability baserat på förfallotid
function calcRecoveryProb(daysOverdue: number): number {
  if (daysOverdue <= 30) return 92;
  if (daysOverdue <= 60) return 78;
  if (daysOverdue <= 90) return 55;
  if (daysOverdue <= 180) return 32;
  return 12;
}

export function useARDashboard(companyId: string | null) {
  return useQuery({
    queryKey: ['ar-dashboard', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, counterparty_name, total_amount, due_date, status, reminder_count, created_at')
        .eq('company_id', companyId!)
        .in('status', ['sent', 'overdue', 'paid'])
        .order('due_date', { ascending: true });
      if (error) throw error;

      const today = new Date();
      const enriched = (invoices ?? []).map(inv => {
        const due = new Date(inv.due_date);
        const daysOverdue = inv.status !== 'paid' && due < today
          ? Math.floor((today.getTime() - due.getTime()) / 86400000)
          : 0;
        return {
          ...inv,
          daysOverdue,
          recoveryProb: calcRecoveryProb(daysOverdue),
          isOverdue: daysOverdue > 0,
        };
      });

      // Åldersanalys
      const aging = {
        current: enriched.filter(i => !i.isOverdue && i.status !== 'paid').reduce((s, i) => s + Number(i.total_amount), 0),
        days1_30: enriched.filter(i => i.daysOverdue > 0 && i.daysOverdue <= 30).reduce((s, i) => s + Number(i.total_amount), 0),
        days31_60: enriched.filter(i => i.daysOverdue > 30 && i.daysOverdue <= 60).reduce((s, i) => s + Number(i.total_amount), 0),
        days61_90: enriched.filter(i => i.daysOverdue > 60 && i.daysOverdue <= 90).reduce((s, i) => s + Number(i.total_amount), 0),
        over90: enriched.filter(i => i.daysOverdue > 90).reduce((s, i) => s + Number(i.total_amount), 0),
      };

      // Kreditbetyg per kund
      const customerMap: Record<string, { name: string; invoices: typeof enriched; total: number }> = {};
      for (const inv of enriched) {
        const key = inv.counterparty_name ?? 'Okänd';
        if (!customerMap[key]) customerMap[key] = { name: key, invoices: [], total: 0 };
        customerMap[key].invoices.push(inv);
        if (inv.status !== 'paid') customerMap[key].total += Number(inv.total_amount);
      }

      const customers = Object.values(customerMap).map(c => {
        const overdueInvs = c.invoices.filter(i => i.isOverdue);
        const avgDaysOverdue = overdueInvs.length > 0
          ? overdueInvs.reduce((s, i) => s + i.daysOverdue, 0) / overdueInvs.length
          : 0;
        return {
          name: c.name,
          totalOutstanding: c.total,
          overdueCount: overdueInvs.length,
          grade: calcCreditGrade(avgDaysOverdue, overdueInvs.length),
          avgDaysOverdue: Math.round(avgDaysOverdue),
          invoices: c.invoices,
        };
      }).sort((a, b) => b.totalOutstanding - a.totalOutstanding);

      const totalOutstanding = enriched.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.total_amount), 0);
      const overdueTotal = enriched.filter(i => i.isOverdue).reduce((s, i) => s + Number(i.total_amount), 0);
      const overdueInvoices = enriched.filter(i => i.isOverdue);
      const avgRecovery = overdueInvoices.length > 0
        ? Math.round(overdueInvoices.reduce((s, i) => s + i.recoveryProb, 0) / overdueInvoices.length)
        : 0;
      const highRiskCustomers = customers.filter(c => c.grade >= 'D').length;

      return {
        enriched,
        aging,
        customers,
        totalOutstanding,
        overdueTotal,
        avgRecovery,
        highRiskCustomers,
        hasData: enriched.length > 0,
      };
    },
  });
}

async function getOrCreateAccount(companyId: string, accountNumber: string, accountName: string, accountType: string): Promise<string> {
  const { data: existing } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('company_id', companyId)
    .eq('account_number', accountNumber)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('chart_of_accounts')
    .insert({ company_id: companyId, account_number: accountNumber, account_name: accountName, account_type: accountType })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return created.id;
}

export function useWriteOffInvoice(companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, amount, reason }: { invoiceId: string; amount: number; reason: string }) => {
      if (!companyId) throw new Error('Inget bolag valt');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ej inloggad');

      // Hämta/skapa konton
      const [lossAccountId, arAccountId] = await Promise.all([
        getOrCreateAccount(companyId, '6350', 'Förluster på kundfordringar', 'expense'),
        getOrCreateAccount(companyId, '1510', 'Kundfordringar', 'asset'),
      ]);

      // Skapa journal entry
      const { data: je, error: jeError } = await supabase
        .from('journal_entries')
        .insert([{
          company_id: companyId,
          entry_date: new Date().toISOString().slice(0, 10),
          description: `Kundförlust — ${reason}`,
          status: 'draft' as const,
          created_by: user.id,
          series_code: 'HB',
        }])
        .select('id')
        .maybeSingle();
      if (jeError) throw jeError;

      // Skapa konteringsrader: debit 6350, kredit 1510
      const { error: lineError } = await supabase.from('journal_entry_lines').insert([
        { journal_entry_id: je.id, account_id: lossAccountId, debit: amount, credit: 0 },
        { journal_entry_id: je.id, account_id: arAccountId, debit: 0, credit: amount },
      ]);
      if (lineError) throw lineError;

      // Markera fakturan som cancelled
      const { error: invError } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' as const, updated_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .eq('company_id', companyId);
      if (invError) throw invError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ar-dashboard', companyId] });
      qc.invalidateQueries({ queryKey: ['overdue-invoices'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kundavskrivningen misslyckades");
    },
  });
}

export function useCreatePaymentPlan(companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      customerName,
      totalAmount,
      installments,
      startDate,
    }: {
      invoiceId: string;
      customerName: string;
      totalAmount: number;
      installments: number;
      startDate: string;
    }) => {
      if (!companyId) throw new Error('Inget bolag valt');

      const installmentAmount = totalAmount / installments;

      // Uppdatera fakturastatus
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'overdue' as const,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', companyId);
      if (error) throw error;

      // Skapa admin-notifikation om avbetalningsplanen
      await supabase.from('admin_notifications').insert({
        company_id: companyId,
        notification_type: 'payment_plan',
        severity: 'info',
        title: `Avbetalningsplan skapad — ${customerName}`,
        message: `${installments} delbetalningar om ${new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(installmentAmount)} startandes ${startDate}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ar-dashboard', companyId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Avbetalningsplanen kunde inte skapas");
    },
  });
}
