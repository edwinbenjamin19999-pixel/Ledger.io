import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { createSession, getTransactions, getBalances } from "../_shared/enable-banking.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // "<companyId>" or "<companyId>|<return_to>"

    if (!code || !state) {
      throw new Error('Missing code or state parameter from Enable Banking callback');
    }

    // Parse state — supports legacy plain companyId and new "id|return_to" format.
    const [companyId, returnToRaw] = state.split('|');
    const returnTo = returnToRaw === 'onboarding' ? 'onboarding' : 'bank';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing Enable Banking callback:', { companyId });

    // Exchange code for session with account access
    const session = await createSession(code);

    console.log(`Session created: ${session.session_id}, ${session.accounts.length} accounts`);

    // Get user_id from company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('created_by')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Telemetry: log full raw account list so we can see exactly what Enable
    // Banking returned (IBAN, name, institution) regardless of filtering.
    try {
      await supabase.from('bank_connection_events').insert({
        company_id: companyId,
        event_type: 'session_raw_accounts',
        account_count: session.accounts.length,
        transaction_count: 0,
        metadata: {
          session_id: session.session_id,
          aspsp: (session as { aspsp?: unknown })?.aspsp ?? null,
          accounts: session.accounts.map((a) => ({
            uid: a.uid,
            name: a.name,
            institution_name: a.institution_name,
            iban: (a.account_id as any)?.iban ?? null,
            bban: (a.account_id as any)?.bban ?? null,
            currency: a.currency,
          })),
        },
      });
    } catch (_) { /* non-fatal */ }

    // Process each account
    let persistedAccounts = 0;
    for (const account of session.accounts) {
      const iban = (account.account_id as any)?.iban || null;
      const accountNumber =
        (account.account_id as any)?.bban ||
        (account.account_id as any)?.other?.identification ||
        null;
      const accountName = account.name || 'Huvudkonto';
      const currency = account.currency || 'SEK';
      // Prefer institution_name; fall back to ASPSP name from the session if Enable Banking
      // returns the generic placeholder "Bank".
      const aspspName = (session as { aspsp?: { name?: string } })?.aspsp?.name;
      const rawBankName = account.institution_name;
      const bankName =
        rawBankName && rawBankName.toLowerCase() !== 'bank'
          ? rawBankName
          : (aspspName && aspspName.toLowerCase() !== 'bank' ? aspspName : (rawBankName || 'Bank'));

      // Sandbox detection: ONLY by Enable Banking's documented sandbox IBANs or
      // explicit "sandbox" markers in account/bank name. Do NOT filter on
      // bankName === 'bank' — Enable Banking returns that string for several
      // legitimate Swedish institutions, which would drop all real accounts.
      const isSandboxAccount =
        String(accountName).toLowerCase().includes('sandbox') ||
        String(bankName).toLowerCase().includes('sandbox') ||
        (typeof iban === 'string' && (
          iban === 'SE1160000000000923451110' ||
          iban === 'SE6860000000000923462112' ||
          /^SE\d{2}600000000009234/.test(iban)
        ));

      console.warn('[handle-bank-callback] account payload', {
        uid: account.uid,
        accountName,
        bankName,
        rawBankName,
        aspspName,
        iban,
        accountNumber,
        currency,
        isSandboxAccount,
      });

      if (isSandboxAccount) {
        console.warn('Skipping sandbox/mock bank account from callback', {
          uid: account.uid,
          accountName,
          bankName,
          iban,
        });
        try {
          await supabase.from('bank_connection_events').insert({
            company_id: companyId,
            event_type: 'sandbox_account_rejected',
            account_count: 0,
            transaction_count: 0,
            metadata: {
              session_id: session.session_id,
              account_uid: account.uid,
              account_name: accountName,
              bank_name: bankName,
              iban,
            },
          });
        } catch (_) { /* non-fatal */ }
        continue;
      }

      // Insert/update bank account — IBAN may be null for non-IBAN account types
      // (savings, cards). bank_connection_id (Enable Banking account uid) is the
      // stable upsert key.
      const { data: bankAccount, error: insertError } = await supabase
        .from('bank_accounts')
        .upsert({
          company_id: companyId,
          bank_connection_id: account.uid,
          bank_name: bankName,
          account_name: accountName,
          iban: iban,
          account_number: accountNumber,
          currency: currency,
          balance: null,
          is_active: true,
          last_synced_at: new Date().toISOString(),
          connection_status: 'live',
          created_by: company.created_by,
        }, {
          onConflict: 'bank_connection_id',
        })
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('Account upsert failed for', account.uid, insertError);
        try {
          await supabase.from('bank_connection_events').insert({
            company_id: companyId,
            event_type: 'account_persist_failed',
            account_count: 0,
            transaction_count: 0,
            metadata: {
              session_id: session.session_id,
              account_uid: account.uid,
              bank_name: bankName,
              error: insertError.message,
            },
          });
        } catch (_) { /* non-fatal */ }
        continue;
      }
      persistedAccounts++;

      console.log('Account stored:', { uid: account.uid, iban, name: accountName });

      if (!bankAccount) continue;

      // Fetch balance
      try {
        const balanceData = await getBalances(account.uid);
        const closingBalance = balanceData.balances?.find(
          (b) => b.balance_type === 'closingBooked' || b.balance_type === 'interimAvailable'
        );
        if (closingBalance) {
          await supabase
            .from('bank_accounts')
            .update({ balance: parseFloat(closingBalance.balance_amount.amount) })
            .eq('id', bankAccount.id);
          console.log(`Balance set for ${account.uid}: ${closingBalance.balance_amount.amount}`);
        } else {
          console.warn(`No closingBooked/interimAvailable balance returned for ${account.uid}`);
          try {
            await supabase.from('bank_connection_events').insert({
              company_id: companyId,
              event_type: 'balance_unavailable',
              account_count: 1,
              transaction_count: 0,
              metadata: { account_uid: account.uid, reason: 'no_balance_returned' },
            });
          } catch { /* non-fatal */ }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`Balance fetch failed for ${account.uid}:`, errMsg);
        try {
          await supabase.from('bank_connection_events').insert({
            company_id: companyId,
            event_type: 'balance_fetch_failed',
            account_count: 1,
            transaction_count: 0,
            metadata: { account_uid: account.uid, error: errMsg },
          });
        } catch { /* non-fatal */ }
      }

      // Fetch historical transactions (last 90 days)
      let insertedTxCount = 0;
      try {
        const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        console.log(`Fetching transactions for ${account.uid} from ${dateFrom}`);

        const txData = await getTransactions(account.uid, dateFrom);
        const transactions = txData.transactions || [];

        console.log(`Fetched ${transactions.length} historical transactions`);

        if (transactions.length > 0) {
          const transactionsToInsert = transactions.map((t) => ({
            bank_account_id: bankAccount.id,
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

          const { error: txInsertError } = await supabase
            .from('bank_transactions')
            .upsert(transactionsToInsert, {
              onConflict: 'transaction_id',
            });

          if (txInsertError) {
            console.error('Transaction insert error:', txInsertError);
          } else {
            insertedTxCount = transactionsToInsert.length;
            console.log(`Inserted ${insertedTxCount} transactions`);
          }
        }
      } catch (e) {
        console.error('Transaction fetch failed:', e);
      }

      // Telemetry: log this session for cost/usage tracking
      try {
        await supabase.from('bank_connection_events').insert({
          company_id: companyId,
          event_type: 'transactions_fetched',
          account_count: 1,
          transaction_count: insertedTxCount,
          metadata: {
            session_id: session.session_id,
            account_uid: account.uid,
            bank_name: bankName,
          },
        });
      } catch (e) {
        console.error('Telemetry insert failed (non-fatal):', e);
      }
    }

    // Session-level event
    try {
      await supabase.from('bank_connection_events').insert({
        company_id: companyId,
        event_type: 'session_created',
        account_count: session.accounts.length,
        transaction_count: 0,
        metadata: {
          session_id: session.session_id,
          accounts_persisted: persistedAccounts,
          accounts_returned: session.accounts.length,
        },
      });
    } catch (e) {
      console.error('Session telemetry insert failed (non-fatal):', e);
    }

    // Redirect based on outcome: a session may complete successfully while still
    // yielding zero usable accounts (for example sandbox/test accounts only).
    const appUrl = Deno.env.get('APP_URL') || 'https://northledger.se';
    const outcome = persistedAccounts > 0 ? 'success' : 'warning';
    const reason = persistedAccounts > 0
      ? null
      : (session.accounts.length > 0 ? 'no_usable_accounts' : 'no_accounts_returned');
    const query = new URLSearchParams({ bank: outcome, company: companyId });
    if (reason) query.set('reason', reason);

    const redirectUrl = returnTo === 'onboarding'
      ? `${appUrl}/quick-onboarding?step=4&${query.toString()}`
      : `${appUrl}/bank?${query.toString()}`;

    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  } catch (error) {
    console.error('Error in handle-bank-callback:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const appUrl = Deno.env.get('APP_URL') || 'https://northledger.se';
    // On error, fall back to onboarding step 3 (safe default; existing-account users will see toast on /bank too via separate handling)
    const redirectUrl = `${appUrl}/quick-onboarding?step=3&bank=error&error=${encodeURIComponent(errorMessage)}`;

    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }
});
