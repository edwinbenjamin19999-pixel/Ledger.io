import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getTransactions, getBalances } from "../_shared/enable-banking.ts";

const BATCH_SIZE = 50;
const SYNC_INTERVAL_MS = 3600000; // 1 hour
const MAX_CONCURRENT_REQUESTS = 5;
const RATE_LIMIT_DELAY_MS = 200;

interface BankAccount {
  id: string;
  company_id: string;
  account_name: string;
  bank_connection_id: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function syncAccount(
  account: BankAccount,
  supabase: any
): Promise<{ success: boolean; transactions: number }> {
  try {
    console.log(`Syncing account: ${account.account_name} (${account.id})`);

    const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    let txData;
    try {
      txData = await getTransactions(account.bank_connection_id, dateFrom);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      if (errMsg.includes('401') || errMsg.includes('403')) {
        console.warn(`Connection expired for account ${account.id}`);
        await supabase
          .from('bank_accounts')
          .update({ is_active: false })
          .eq('id', account.id);

        await supabase.from('bank_notifications').insert({
          company_id: account.company_id,
          bank_account_id: account.id,
          notification_type: 'connection_expired',
          title: 'Bankkoppling utgången',
          message: `Kopplingen till ${account.account_name} har upphört. Vänligen återanslut kontot.`,
          severity: 'error',
        });
        return { success: false, transactions: 0 };
      }

      if (errMsg.includes('429')) {
        console.warn(`Rate limited for account ${account.id}`);
        return { success: false, transactions: 0 };
      }

      throw error;
    }

    const transactions = txData.transactions || [];
    let insertedCount = 0;

    if (transactions.length > 0) {
      const transactionsToInsert = transactions.map((t: any) => ({
        bank_account_id: account.id,
        company_id: account.company_id,
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

      const TX_BATCH_SIZE = 100;
      for (let i = 0; i < transactionsToInsert.length; i += TX_BATCH_SIZE) {
        const batch = transactionsToInsert.slice(i, i + TX_BATCH_SIZE);
        const { error: txInsertError } = await supabase
          .from('bank_transactions')
          .upsert(batch, {
            onConflict: 'bank_account_id,transaction_id',
            ignoreDuplicates: true,
          });

        if (!txInsertError) {
          insertedCount += batch.length;
        }
      }

      // Auto-categorize newly inserted transactions (fire-and-forget, max 5 concurrent).
      // Only run on transactions that aren't already booked.
      try {
        const { data: pendingTxs } = await supabase
          .from('bank_transactions')
          .select('id')
          .eq('bank_account_id', account.id)
          .eq('status', 'pending')
          .is('journal_entry_id', null)
          .order('booking_date', { ascending: false })
          .limit(50);

        if (pendingTxs && pendingTxs.length > 0) {
          const CONCURRENCY = 5;
          for (let i = 0; i < pendingTxs.length; i += CONCURRENCY) {
            const chunk = pendingTxs.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(async (t: { id: string }) => {
              try {
                await supabase.functions.invoke('categorize-transaction', {
                  body: { transaction_id: t.id },
                });
              } catch (catErr) {
                console.warn(`Auto-categorize failed for ${t.id}:`, catErr);
              }
            }));
          }
          console.log(`Auto-categorized ${pendingTxs.length} pending transactions`);
        }
      } catch (catErr) {
        console.warn('Auto-categorize batch failed:', catErr);
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

    return { success: true, transactions: insertedCount };
  } catch (error) {
    console.error(`Error syncing account ${account.id}:`, error);
    return { success: false, transactions: 0 };
  }
}

async function processAccountBatch(
  accounts: BankAccount[],
  supabase: any
): Promise<{ synced: number; transactions: number }> {
  let totalSynced = 0;
  let totalTransactions = 0;

  for (let i = 0; i < accounts.length; i += MAX_CONCURRENT_REQUESTS) {
    const chunk = accounts.slice(i, i + MAX_CONCURRENT_REQUESTS);

    const results = await Promise.all(
      chunk.map(async (account, idx) => {
        await delay(RATE_LIMIT_DELAY_MS * idx);
        return syncAccount(account, supabase);
      })
    );

    for (const result of results) {
      if (result.success) totalSynced++;
      totalTransactions += result.transactions;
    }

    if (i + MAX_CONCURRENT_REQUESTS < accounts.length) {
      await delay(500);
    }
  }

  return { synced: totalSynced, transactions: totalTransactions };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let offset = 0;
    try {
      const body = await req.json();
      offset = body.offset || 0;
    } catch {
      // No body
    }

    console.log(`Starting auto bank sync (offset: ${offset}, batch: ${BATCH_SIZE})...`);

    const syncThreshold = new Date(Date.now() - SYNC_INTERVAL_MS).toISOString();

    const { data: accounts, error: accountsError, count } = await supabase
      .from('bank_accounts')
      .select('id, company_id, account_name, bank_connection_id', { count: 'exact' })
      .eq('is_active', true)
      .not('bank_connection_id', 'is', null)
      .or(`last_synced_at.is.null,last_synced_at.lt.${syncThreshold}`)
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (accountsError) throw accountsError;

    const totalPending = count || 0;
    const batchAccounts = accounts || [];

    console.log(`Found ${batchAccounts.length} accounts in batch (${totalPending} total pending)`);

    if (batchAccounts.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No accounts need syncing',
          synced: 0,
          total_pending: 0,
          has_more: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await processAccountBatch(batchAccounts, supabase);

    return new Response(
      JSON.stringify({
        success: true,
        synced: result.synced,
        transactions: result.transactions,
        total_pending: totalPending,
        has_more: offset + BATCH_SIZE < totalPending,
        next_offset: offset + BATCH_SIZE,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auto-sync-bank-transactions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
