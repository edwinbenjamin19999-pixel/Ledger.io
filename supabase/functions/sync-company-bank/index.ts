import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getTransactions, getBalances } from "../_shared/enable-banking.ts";

const RATE_LIMIT_DELAY_MS = 250;
const MAX_ACCOUNTS_PER_COMPANY = 50;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface BankAccount {
  id: string;
  account_name: string;
  bank_connection_id: string;
}

async function syncSingleAccount(
  account: BankAccount,
  companyId: string,
  supabase: any
): Promise<{ success: boolean; transactions: number; error?: string; errorType?: string }> {
  const accountStart = Date.now();

  try {
    const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    let txData;
    try {
      txData = await getTransactions(account.bank_connection_id, dateFrom);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      if (errMsg.includes('429')) {
        return { success: false, transactions: 0, error: 'Rate limited', errorType: 'rate_limit' };
      }

      if (errMsg.includes('401') || errMsg.includes('403')) {
        await supabase
          .from('bank_accounts')
          .update({ is_active: false })
          .eq('id', account.id);

        await supabase.from('bank_notifications').insert({
          company_id: companyId,
          bank_account_id: account.id,
          notification_type: 'connection_expired',
          title: 'Bankkoppling utgången',
          message: `Kopplingen till ${account.account_name} har upphört. Vänligen återanslut kontot.`,
          severity: 'error',
        });

        return { success: false, transactions: 0, error: 'Connection expired', errorType: 'auth' };
      }

      return { success: false, transactions: 0, error: errMsg, errorType: 'api' };
    }

    const transactions = txData.transactions || [];
    let insertedCount = 0;

    if (transactions.length > 0) {
      const toInsert = transactions.slice(0, 500).map((t: any) => ({
        bank_account_id: account.id,
        company_id: companyId,
        transaction_id: t.entry_reference || t.transaction_id || crypto.randomUUID(),
        booking_date: t.booking_date,
        value_date: t.value_date || t.booking_date,
        amount: parseFloat(t.transaction_amount.amount),
        currency: t.transaction_amount.currency,
        counterparty_name: t.creditor_name || t.debtor_name || null,
        counterparty_account: t.creditor_account?.iban || t.debtor_account?.iban || null,
        reference: t.remittance_information?.[0] || t.additional_information || null,
        description: t.remittance_information?.[0] || null,
        status: 'pending',
      }));

      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from('bank_transactions')
          .upsert(batch, { onConflict: 'bank_account_id,transaction_id', ignoreDuplicates: true });

        if (!insertError) {
          insertedCount += batch.length;
        }
      }
    }

    // Fetch balance
    await delay(RATE_LIMIT_DELAY_MS);

    try {
      const balanceData = await getBalances(account.bank_connection_id);
      const closingBalance = balanceData.balances?.find(
        (b) => b.balance_type === 'closingBooked' || b.balance_type === 'interimAvailable'
      );

      await supabase
        .from('bank_accounts')
        .update({
          balance: closingBalance ? parseFloat(closingBalance.balance_amount.amount) : null,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', account.id);
    } catch {
      await supabase
        .from('bank_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id);
    }

    const duration = Date.now() - accountStart;
    console.log(`Account ${account.id} synced: ${insertedCount} tx in ${duration}ms`);

    return { success: true, transactions: insertedCount };
  } catch (error) {
    console.error(`Account ${account.id} error:`, error);
    return { success: false, transactions: 0, error: String(error), errorType: 'exception' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const startTime = Date.now();

  try {
    const { company_id } = await req.json();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    console.log(`[${company_id}] Starting isolated bank sync...`);

    await supabase
      .from('company_bank_sync_status')
      .upsert({
        company_id,
        sync_status: 'syncing',
        last_sync_started_at: new Date().toISOString(),
        error_message: null,
      }, { onConflict: 'company_id' });

    const { data: accounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('id, account_name, bank_connection_id')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .not('bank_connection_id', 'is', null)
      .limit(MAX_ACCOUNTS_PER_COMPANY);

    if (accountsError) throw accountsError;

    if (!accounts || accounts.length === 0) {
      await supabase
        .from('company_bank_sync_status')
        .update({
          sync_status: 'idle',
          last_sync_completed_at: new Date().toISOString(),
          accounts_synced: 0,
          transactions_synced: 0,
          next_scheduled_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('company_id', company_id);

      return new Response(
        JSON.stringify({ success: true, company_id, accounts: 0, transactions: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalAccounts = 0;
    let totalTransactions = 0;
    let hasErrors = false;
    let rateLimited = false;

    for (const account of accounts) {
      if (rateLimited) {
        console.log(`[${company_id}] Skipping remaining accounts due to rate limit`);
        break;
      }

      const result = await syncSingleAccount(account, company_id, supabase);

      if (result.success) {
        totalAccounts++;
        totalTransactions += result.transactions;
      } else {
        hasErrors = true;
        if (result.errorType === 'rate_limit') {
          rateLimited = true;
        }
      }

      await delay(RATE_LIMIT_DELAY_MS);
    }

    // Adaptive sync interval
    let syncIntervalMinutes = 60;
    if (totalTransactions > 50) syncIntervalMinutes = 30;
    else if (totalTransactions > 10) syncIntervalMinutes = 45;
    else if (totalTransactions === 0 && totalAccounts > 0) syncIntervalMinutes = 90;
    if (rateLimited) syncIntervalMinutes = 15;

    const duration = Date.now() - startTime;

    await supabase
      .from('company_bank_sync_status')
      .update({
        sync_status: rateLimited ? 'rate_limited' : (hasErrors ? 'completed_with_errors' : 'completed'),
        last_sync_completed_at: new Date().toISOString(),
        accounts_synced: totalAccounts,
        transactions_synced: totalTransactions,
        next_scheduled_sync: new Date(Date.now() + syncIntervalMinutes * 60000).toISOString(),
        sync_interval_minutes: syncIntervalMinutes,
        error_message: rateLimited ? 'Rate limited by Enable Banking' : (hasErrors ? 'Some accounts failed' : null),
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', company_id);

    console.log(`[${company_id}] Complete: ${totalAccounts}/${accounts.length} accounts, ${totalTransactions} tx, ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        company_id,
        accounts_synced: totalAccounts,
        accounts_total: accounts.length,
        transactions: totalTransactions,
        duration_ms: duration,
        next_sync_minutes: syncIntervalMinutes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    console.error('Sync error:', errorMessage);

    try {
      const body = await req.clone().json();
      if (body.company_id) {
        await supabase
          .from('company_bank_sync_status')
          .update({
            sync_status: 'error',
            error_message: errorMessage,
            next_scheduled_sync: new Date(Date.now() + 5 * 60000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', body.company_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: errorMessage, duration_ms: duration }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
