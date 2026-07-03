import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Confirm a CAMT.054 transaction match and create journal entry
 * Debet: 1930 (Bank) | Kredit: 1510 (Kundfordringar)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { transaction_id } = await req.json();
    if (!transaction_id) {
      return new Response(JSON.stringify({ error: 'transaction_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the CAMT054 transaction
    const { data: tx, error: txError } = await supabase
      .from('camt054_transactions')
      .select('*')
      .eq('id', transaction_id)
      .maybeSingle();

    if (txError || !tx) throw new Error('Transaction not found');
    if (!tx.matched_invoice_id) throw new Error('No invoice matched to this transaction');

    // Get bank account (1930) and AR account (1510)
    const { data: bankAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', tx.company_id)
      .like('account_number', '1930%')
      .limit(1)
      .maybeSingle();

    const { data: arAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', tx.company_id)
      .like('account_number', '1510%')
      .limit(1)
      .maybeSingle();

    if (!bankAccount || !arAccount) {
      throw new Error('Konto 1930 (Bank) eller 1510 (Kundfordringar) saknas i kontoplanen');
    }

    // Sequence: draft → lines → approved
    // 1. Draft header
    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: tx.company_id,
        entry_date: tx.booking_date,
        description: `Betalning CAMT.054: ${tx.debtor_name || 'Okänd'} – ${tx.ocr_reference || tx.reference || ''}`,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (jeError || !journalEntry) throw new Error(`Journal entry failed: ${jeError?.message}`);

    // 2. Lines
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert([
        { journal_entry_id: journalEntry.id, account_id: bankAccount.id, debit: tx.amount, credit: 0 },
        { journal_entry_id: journalEntry.id, account_id: arAccount.id,   debit: 0,         credit: tx.amount },
      ]);

    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new Error(`Transaction lines failed: ${linesError.message}`);
    }

    // 3. Approve (balance trigger validates here)
    const { error: approveErr } = await supabase
      .from('journal_entries')
      .update({ status: 'approved', approved_by: user.id })
      .eq('id', journalEntry.id);

    if (approveErr) {
      await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', journalEntry.id);
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new Error(`Approve failed: ${approveErr.message}`);
    }

    // Update CAMT054 transaction with journal entry reference
    await supabase
      .from('camt054_transactions')
      .update({ journal_entry_id: journalEntry.id, status: 'booked' })
      .eq('id', transaction_id);

    // Update invoice status to paid
    await supabase
      .from('invoices')
      .update({ status: 'paid', paid_date: tx.booking_date })
      .eq('id', tx.matched_invoice_id);

    return new Response(JSON.stringify({
      success: true,
      journal_entry_id: journalEntry.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in confirm-camt054-match:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
