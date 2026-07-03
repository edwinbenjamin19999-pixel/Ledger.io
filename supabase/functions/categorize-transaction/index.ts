import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

// Input validation schema
const inputSchema = z.object({
  transaction_id: z.string().uuid("Ogiltigt transaktions-ID format"),
});

// Helper to create safe error response
function safeErrorResponse(error: unknown) {
  console.error('Error in categorize-transaction:', error);
  
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: error.errors.map(e => e.message).join(", ") }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const errorMessage = error instanceof Error ? error.message : "";
  if (errorMessage.includes("not found") || errorMessage.includes("hittades inte")) {
    return new Response(
      JSON.stringify({ error: "Transaktionen hittades inte." }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  return new Response(
    JSON.stringify({ error: 'Ett fel uppstod vid kategorisering. Försök igen senare.' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Validate input with Zod
    const rawInput = await req.json();
    const { transaction_id } = inputSchema.parse(rawInput);

    console.log('Categorizing transaction:', transaction_id);

    // Get transaction details
    const { data: transaction, error: txError } = await supabaseClient
      .from('bank_transactions')
      .select('*, bank_accounts!inner(company_id)')
      .eq('id', transaction_id)
      .maybeSingle();

    if (txError) throw txError;
    if (!transaction) throw new Error('Transaction not found');

    const companyId = transaction.bank_accounts.company_id;

    // Get chart of accounts
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (accountsError) throw accountsError;

    // Get invoices for potential matching
    const { data: invoices, error: invoicesError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['pending', 'sent']);

    if (invoicesError) throw invoicesError;

    // Use Lovable AI for intelligent categorization
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('AI categorization not available - LOVABLE_API_KEY not configured');
    }

    const prompt = `Analyze this Swedish bank transaction and provide COMPLETE accounting categorization.

Transaction Details:
- Amount: ${transaction.amount} ${transaction.currency} (negative = outgoing, positive = incoming)
- Description: ${transaction.description || transaction.reference || 'N/A'}
- Counterparty: ${transaction.counterparty_name || 'N/A'}
- Counterparty Account: ${transaction.counterparty_account || 'N/A'}
- Date: ${transaction.booking_date}

Available Chart of Accounts:
${accounts.map((a: any) => `- ${a.account_number}: ${a.account_name} (${a.account_type})`).join('\n')}

${invoices && invoices.length > 0 ? `
Pending/Sent Invoices:
${invoices.map((i: any) => `- Invoice #${i.invoice_number}: ${i.total_amount} ${i.currency}, Type: ${i.invoice_type}, Party: ${i.counterparty_name}, Due: ${i.due_date}`).join('\n')}
` : ''}

CRITICAL: You must determine the COMPLETE double-entry booking:
1. Transaction type (customer_payment, supplier_payment, salary, vat_payment, bank_transfer, expense, income, other)
2. Debit account(s) with amounts
3. Credit account(s) with amounts
4. VAT handling if applicable (identify VAT portion, use account 2641 for sales VAT, 2611 for purchase VAT)
5. If it matches an invoice, provide invoice_number
6. Confidence level (0.0-1.0)
7. Explanation in Swedish

Common Swedish accounting patterns:
- Salary payments: Debit 2730 (Skuld anställda), Credit 1930 (Bank)
- Supplier invoices: Debit expense account (4xxx-8xxx), Debit 2611 (Ingående moms), Credit 2440 (Leverantörsskulder)
- Supplier payments: Debit 2440 (Leverantörsskulder), Credit 1930 (Bank)
- Customer payments: Debit 1930 (Bank), Credit 1510 (Kundfordringar)
- VAT payments to Skatteverket: Debit 2650 (Redovisningskonto moms), Credit 1930 (Bank)
- Bank transfers: Debit one bank account, Credit another bank account
- Expenses: Debit appropriate expense account + potential VAT, Credit 1930 (Bank) or 2440 (if unpaid)
- Income: Debit 1930 (Bank) or 1510 (if unpaid), Credit appropriate income account (3xxx) + VAT

For transactions with VAT:
- Calculate VAT portion (usually 25%, 12%, or 6% in Sweden)
- Split amount into net amount + VAT
- Include separate line for VAT account (2641 for sales, 2611 for purchases)

Respond with complete booking entries.`;

    const { data: aiResult, modelUsed } = await callAIWithFallback({
      ...MODEL_CHAINS.classification,
      messages: [
        {
          role: 'system',
          content: 'You are an expert accounting AI. Analyze transactions and provide structured categorization.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "categorize_transaction",
            description: "Categorize and create complete double-entry booking for transaction",
            parameters: {
              type: "object",
              properties: {
                transaction_type: {
                  type: "string",
                  enum: ["customer_payment", "supplier_payment", "salary", "vat_payment", "bank_transfer", "expense", "income", "other"],
                  description: "Type of transaction"
                },
                debit_entries: {
                  type: "array",
                  description: "All debit entries for this transaction",
                  items: {
                    type: "object",
                    properties: {
                      account_number: { type: "string", description: "Account number" },
                      amount: { type: "number", description: "Debit amount" },
                      vat_code: { type: "string", description: "VAT code if applicable (e.g., 'SE_25', 'SE_12', 'SE_6', 'SE_0')" }
                    },
                    required: ["account_number", "amount"]
                  }
                },
                credit_entries: {
                  type: "array",
                  description: "All credit entries for this transaction",
                  items: {
                    type: "object",
                    properties: {
                      account_number: { type: "string", description: "Account number" },
                      amount: { type: "number", description: "Credit amount" },
                      vat_code: { type: "string", description: "VAT code if applicable" }
                    },
                    required: ["account_number", "amount"]
                  }
                },
                matched_invoice_number: {
                  type: "string",
                  description: "Invoice number if transaction matches a pending invoice"
                },
                confidence: {
                  type: "number",
                  description: "Confidence level between 0.0 and 1.0"
                },
                explanation: {
                  type: "string",
                  description: "Explanation in Swedish of the categorization and booking"
                }
              },
              required: ["transaction_type", "debit_entries", "credit_entries", "confidence", "explanation"],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "categorize_transaction" } },
    });

    console.log(`[categorize-transaction] modelUsed=${modelUsed}`);

    const toolCall = aiResult.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('AI did not return structured categorization');
    }

    const categorization = JSON.parse(toolCall.function.arguments);

    console.log('AI categorization:', categorization);

    // Find matched invoice if specified
    let matchedInvoiceId = null;
    let matchedInvoice = null;
    if (categorization.matched_invoice_number) {
      matchedInvoice = invoices?.find(
        (i: any) => i.invoice_number === categorization.matched_invoice_number
      );
      if (matchedInvoice) {
        matchedInvoiceId = matchedInvoice.id;
      }
    }

    // Find or create accounts for debit entries
    const debitAccountIds: Array<{ account_id: string; amount: number; vat_code?: string }> = [];
    for (const entry of categorization.debit_entries) {
      let account = accounts.find((a: any) => a.account_number === entry.account_number);
      
      if (!account) {
        // Create missing account with appropriate type based on account number
        const accountType = 
          entry.account_number.startsWith('1') ? 'asset' :
          entry.account_number.startsWith('2') ? 'liability' :
          entry.account_number.startsWith('3') ? 'equity' :
          entry.account_number.startsWith('4') || entry.account_number.startsWith('5') ||
          entry.account_number.startsWith('6') || entry.account_number.startsWith('7') ? 'expense' :
          entry.account_number.startsWith('8') ? 'income' : 'expense';

        const { data: newAccount, error: accountError } = await supabaseClient
          .from('chart_of_accounts')
          .insert({
            company_id: companyId,
            account_number: entry.account_number,
            account_name: `Auto: ${entry.account_number}`,
            account_type: accountType,
          })
          .select()
          .maybeSingle();
        
        if (accountError) throw accountError;
        account = newAccount;
      }
      
      debitAccountIds.push({ 
        account_id: account.id, 
        amount: entry.amount,
        vat_code: entry.vat_code 
      });
    }

    // Find or create accounts for credit entries
    const creditAccountIds: Array<{ account_id: string; amount: number; vat_code?: string }> = [];
    for (const entry of categorization.credit_entries) {
      let account = accounts.find((a: any) => a.account_number === entry.account_number);
      
      if (!account) {
        const accountType = 
          entry.account_number.startsWith('1') ? 'asset' :
          entry.account_number.startsWith('2') ? 'liability' :
          entry.account_number.startsWith('3') ? 'equity' :
          entry.account_number.startsWith('4') || entry.account_number.startsWith('5') ||
          entry.account_number.startsWith('6') || entry.account_number.startsWith('7') ? 'expense' :
          entry.account_number.startsWith('8') ? 'income' : 'expense';

        const { data: newAccount, error: accountError } = await supabaseClient
          .from('chart_of_accounts')
          .insert({
            company_id: companyId,
            account_number: entry.account_number,
            account_name: `Auto: ${entry.account_number}`,
            account_type: accountType,
          })
          .select()
          .maybeSingle();
        
        if (accountError) throw accountError;
        account = newAccount;
      }
      
      creditAccountIds.push({ 
        account_id: account.id, 
        amount: entry.amount,
        vat_code: entry.vat_code 
      });
    }

    // Store first debit account as "suggested account" for UI compatibility
    const primaryDebitAccountId = debitAccountIds[0]?.account_id || null;

    // Idempotency: if this transaction is already booked, do not double-book.
    if (transaction.journal_entry_id) {
      console.log('Transaction already booked to journal entry', transaction.journal_entry_id);
      return new Response(
        JSON.stringify({
          success: true,
          already_booked: true,
          journal_entry_id: transaction.journal_entry_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update transaction with AI categorization
    const { error: updateError } = await supabaseClient
      .from('bank_transactions')
      .update({
        suggested_account_id: primaryDebitAccountId,
        matched_invoice_id: matchedInvoiceId,
        ai_confidence: categorization.confidence,
        ai_explanation: categorization.explanation,
        status: categorization.confidence >= 0.85 ? 'matched' : 'pending',
      })
      .eq('id', transaction_id);

    if (updateError) throw updateError;

    // Auto-create journal entry if confidence is high enough (≥85%)
    let createdJournalEntryId: string | null = null;
    if (categorization.confidence >= 0.85) {
      console.log('Creating automatic journal entry with confidence:', categorization.confidence);

      // Get user who created the bank account for audit trail
      const { data: bankAccount } = await supabaseClient
        .from('bank_accounts')
        .select('created_by')
        .eq('id', transaction.bank_account_id)
        .maybeSingle();

      const createdBy = bankAccount?.created_by || null;

      // Description by transaction type
      let description = '';
      switch (categorization.transaction_type) {
        case 'customer_payment':
          description = matchedInvoice
            ? `Kundbetalning - Faktura ${matchedInvoice.invoice_number}`
            : `Kundbetalning - ${transaction.counterparty_name || 'Okänd kund'}`;
          break;
        case 'supplier_payment':
          description = `Leverantörsbetalning - ${transaction.counterparty_name || 'Okänd leverantör'}`;
          break;
        case 'salary':
          description = `Löneutbetalning - ${transaction.counterparty_name || transaction.description}`;
          break;
        case 'vat_payment':
          description = 'Momsbetalning till Skatteverket';
          break;
        case 'bank_transfer':
          description = `Överföring - ${transaction.description || 'Mellan konton'}`;
          break;
        case 'expense':
          description = `Kostnad - ${transaction.counterparty_name || transaction.description || 'Diverse'}`;
          break;
        case 'income':
          description = `Intäkt - ${transaction.counterparty_name || transaction.description || 'Diverse'}`;
          break;
        default:
          description = transaction.description || `Transaktion ${transaction.booking_date}`;
      }

      // === Sequence: draft → lines → approved (per ai-booking-transaction-sequence-sv) ===

      // 1. INSERT header as draft
      const { data: journalEntry, error: jeError } = await supabaseClient
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_date: transaction.booking_date,
          description: description,
          status: 'draft',
          created_by: createdBy,
          transaction_id: transaction_id,
          ai_confidence: categorization.confidence,
          ai_explanation: categorization.explanation,
        })
        .select()
        .maybeSingle();

      if (jeError) throw jeError;

      // 2. INSERT lines
      const debitLines = debitAccountIds.map(entry => ({
        journal_entry_id: journalEntry.id,
        account_id: entry.account_id,
        debit: entry.amount,
        credit: 0,
        vat_code: entry.vat_code || null,
      }));
      const creditLines = creditAccountIds.map(entry => ({
        journal_entry_id: journalEntry.id,
        account_id: entry.account_id,
        debit: 0,
        credit: entry.amount,
        vat_code: entry.vat_code || null,
      }));

      const { error: linesError } = await supabaseClient
        .from('journal_entry_lines')
        .insert([...debitLines, ...creditLines]);

      if (linesError) {
        // Rollback header
        await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
        throw linesError;
      }

      // 3. UPDATE header to approved (triggers balance validation now that lines exist)
      const { error: approveErr } = await supabaseClient
        .from('journal_entries')
        .update({ status: 'approved', approved_by: createdBy })
        .eq('id', journalEntry.id);

      if (approveErr) {
        await supabaseClient.from('journal_entry_lines').delete().eq('journal_entry_id', journalEntry.id);
        await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
        throw approveErr;
      }

      createdJournalEntryId = journalEntry.id;

      // Link bank transaction → journal entry (idempotency anchor)
      await supabaseClient
        .from('bank_transactions')
        .update({ journal_entry_id: journalEntry.id, status: 'booked' })
        .eq('id', transaction_id);

      // If invoice was matched, mark it paid
      if (matchedInvoiceId) {
        const { error: invoiceUpdateError } = await supabaseClient
          .from('invoices')
          .update({ status: 'paid', journal_entry_id: journalEntry.id })
          .eq('id', matchedInvoiceId);

        if (invoiceUpdateError) console.warn('Invoice update failed:', invoiceUpdateError);
        else console.log('✅ Invoice marked as paid');
      }

      console.log('✅ Automatic journal entry created:', journalEntry.id);
    } else {
      console.log('⚠️  Confidence too low for automatic booking:', categorization.confidence);
    }

    console.log('Transaction categorized successfully');

    return new Response(
      JSON.stringify({
        success: true,
        categorization: {
          transaction_type: categorization.transaction_type,
          debit_entries: categorization.debit_entries,
          credit_entries: categorization.credit_entries,
          matched_invoice: categorization.matched_invoice_number || null,
          confidence: categorization.confidence,
          explanation: categorization.explanation,
          auto_booked: categorization.confidence >= 0.85,
          journal_entry_id: null,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return safeErrorResponse(error);
  }
});
