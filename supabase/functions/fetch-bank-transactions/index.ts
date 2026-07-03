import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getTransactions, getBalances } from "../_shared/enable-banking.ts";

serve(async (req) => {
  const preflightResponse = handleCors(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { bank_account_id } = await req.json();

    if (!bank_account_id) {
      throw new Error('bank_account_id is required');
    }

    console.log('Fetching transactions for bank account:', bank_account_id);

    // Get bank account details
    const { data: bankAccount, error: accountError } = await supabaseClient
      .from('bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .maybeSingle();

    if (accountError) throw accountError;
    if (!bankAccount) throw new Error('Bank account not found');

    if (!bankAccount.bank_connection_id) {
      throw new Error('No bank connection ID found for this account');
    }

    // Fetch transactions from Enable Banking
    const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const txData = await getTransactions(bankAccount.bank_connection_id, dateFrom);
    const transactions = txData.transactions || [];

    console.log(`Fetched ${transactions.length} transactions`);

    // Insert transactions into database
    const transactionsToInsert = transactions.map((tx) => ({
      bank_account_id: bank_account_id,
      company_id: bankAccount.company_id,
      transaction_id: tx.entry_reference || tx.transaction_id || crypto.randomUUID(),
      booking_date: tx.booking_date,
      value_date: tx.value_date || tx.booking_date,
      amount: parseFloat(tx.transaction_amount.amount),
      currency: tx.transaction_amount.currency,
      counterparty_name: tx.creditor_name || tx.debtor_name,
      counterparty_account: tx.creditor_account?.iban || tx.debtor_account?.iban,
      reference: tx.remittance_information?.[0] || tx.additional_information,
      description: tx.remittance_information?.[0],
      status: 'pending',
    }));

    if (transactionsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('bank_transactions')
        .upsert(transactionsToInsert, {
          onConflict: 'transaction_id',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
    }

    // Refresh balance from Enable Banking (best-effort)
    let balanceUpdate: number | null = null;
    try {
      const balanceData = await getBalances(bankAccount.bank_connection_id);
      const closing = balanceData.balances?.find(
        (b: any) => b.balance_type === 'closingBooked' || b.balance_type === 'interimAvailable'
      );
      if (closing?.balance_amount?.amount) {
        balanceUpdate = parseFloat(closing.balance_amount.amount);
      }
    } catch (balErr) {
      console.warn('Balance refresh failed (non-fatal):', balErr);
    }

    // Update last synced timestamp (and balance if available)
    await supabaseClient
      .from('bank_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        ...(balanceUpdate !== null ? { balance: balanceUpdate } : {}),
      })
      .eq('id', bank_account_id);

    console.log(`Successfully imported ${transactionsToInsert.length} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        count: transactionsToInsert.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in fetch-bank-transactions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
