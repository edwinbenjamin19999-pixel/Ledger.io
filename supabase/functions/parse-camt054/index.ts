import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Camt054Transaction {
  amount: number;
  currency: string;
  booking_date: string;
  value_date: string | null;
  debtor_name: string | null;
  debtor_account: string | null;
  creditor_name: string | null;
  creditor_account: string | null;
  reference: string | null;
  ocr_reference: string | null;
  description: string | null;
  transaction_type: 'credit' | 'debit';
  end_to_end_id: string | null;
  message_id: string | null;
}

function parseXml(xml: string): Camt054Transaction[] {
  const transactions: Camt054Transaction[] = [];

  // Extract all Ntfctn (notification) blocks
  const ntfctnRegex = /<Ntfctn>([\s\S]*?)<\/Ntfctn>/g;
  let ntfctnMatch;

  while ((ntfctnMatch = ntfctnRegex.exec(xml)) !== null) {
    const ntfctn = ntfctnMatch[1];

    // Extract entries (Ntry)
    const ntryRegex = /<Ntry>([\s\S]*?)<\/Ntry>/g;
    let ntryMatch;

    while ((ntryMatch = ntryRegex.exec(ntfctn)) !== null) {
      const ntry = ntryMatch[1];

      // Credit/Debit indicator
      const cdtDbtInd = extractTag(ntry, 'CdtDbtInd');
      const isCredit = cdtDbtInd === 'CRDT';

      // Entry amount
      const amtMatch = ntry.match(/<Amt\s+Ccy="([^"]+)">([^<]+)<\/Amt>/);
      const currency = amtMatch?.[1] || 'SEK';
      const entryAmount = amtMatch ? parseFloat(amtMatch[2]) : 0;

      // Booking date
      const bookingDate = extractTag(ntry, 'BookgDt>Dt') || extractNestedDate(ntry, 'BookgDt');
      // Value date
      const valueDate = extractTag(ntry, 'ValDt>Dt') || extractNestedDate(ntry, 'ValDt');

      // Transaction details (TxDtls)
      const txDtlsRegex = /<TxDtls>([\s\S]*?)<\/TxDtls>/g;
      let txDtlsMatch;
      let hasTxDtls = false;

      while ((txDtlsMatch = txDtlsRegex.exec(ntry)) !== null) {
        hasTxDtls = true;
        const txDtls = txDtlsMatch[1];

        // Amount at transaction level (if present)
        const txAmtMatch = txDtls.match(/<Amt\s+Ccy="([^"]+)">([^<]+)<\/Amt>/);
        const txAmount = txAmtMatch ? parseFloat(txAmtMatch[2]) : entryAmount;

        // Debtor (payer)
        const debtorName = extractNestedTag(txDtls, 'RltdPties>Dbtr>Nm') 
          || extractNestedTag(txDtls, 'RltdPties>Dbtr>Pty>Nm');
        const debtorAccount = extractNestedTag(txDtls, 'RltdPties>DbtrAcct>Id>IBAN')
          || extractNestedTag(txDtls, 'RltdPties>DbtrAcct>Id>Othr>Id');

        // Creditor (payee)
        const creditorName = extractNestedTag(txDtls, 'RltdPties>Cdtr>Nm')
          || extractNestedTag(txDtls, 'RltdPties>Cdtr>Pty>Nm');
        const creditorAccount = extractNestedTag(txDtls, 'RltdPties>CdtrAcct>Id>IBAN')
          || extractNestedTag(txDtls, 'RltdPties>CdtrAcct>Id>Othr>Id');

        // References
        const endToEndId = extractNestedTag(txDtls, 'Refs>EndToEndId');
        const msgId = extractNestedTag(txDtls, 'Refs>MsgId');
        
        // OCR / Structured reference
        const ocrRef = extractNestedTag(txDtls, 'RmtInf>Strd>CdtrRefInf>Ref')
          || extractNestedTag(txDtls, 'Refs>PmtInfId');

        // Unstructured remittance info
        const ustrd = extractNestedTag(txDtls, 'RmtInf>Ustrd');

        // Additional info
        const addtlNtryInf = extractTag(ntry, 'AddtlNtryInf');

        transactions.push({
          amount: txAmount,
          currency,
          booking_date: bookingDate || new Date().toISOString().split('T')[0],
          value_date: valueDate || null,
          debtor_name: debtorName || null,
          debtor_account: debtorAccount || null,
          creditor_name: creditorName || null,
          creditor_account: creditorAccount || null,
          reference: ustrd || addtlNtryInf || null,
          ocr_reference: ocrRef || null,
          description: ustrd || addtlNtryInf || null,
          transaction_type: isCredit ? 'credit' : 'debit',
          end_to_end_id: endToEndId || null,
          message_id: msgId || null,
        });
      }

      // If no TxDtls, create entry-level transaction
      if (!hasTxDtls) {
        const addtlNtryInf = extractTag(ntry, 'AddtlNtryInf');
        transactions.push({
          amount: entryAmount,
          currency,
          booking_date: bookingDate || new Date().toISOString().split('T')[0],
          value_date: valueDate || null,
          debtor_name: null,
          debtor_account: null,
          creditor_name: null,
          creditor_account: null,
          reference: addtlNtryInf || null,
          ocr_reference: null,
          description: addtlNtryInf || null,
          transaction_type: isCredit ? 'credit' : 'debit',
          end_to_end_id: null,
          message_id: null,
        });
      }
    }
  }

  return transactions;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle simple tags
  const regex = new RegExp(`<${tag}>([^<]*)</${tag.split('>').pop()}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractNestedDate(xml: string, parentTag: string): string | null {
  const parentRegex = new RegExp(`<${parentTag}>([\\s\\S]*?)</${parentTag}>`, 's');
  const parentMatch = xml.match(parentRegex);
  if (!parentMatch) return null;
  const dtMatch = parentMatch[1].match(/<Dt>([^<]+)<\/Dt>/);
  return dtMatch ? dtMatch[1].trim() : null;
}

function extractNestedTag(xml: string, path: string): string | null {
  const parts = path.split('>');
  let current = xml;
  for (let i = 0; i < parts.length - 1; i++) {
    const regex = new RegExp(`<${parts[i]}>([\\s\\S]*?)</${parts[i]}>`, 's');
    const match = current.match(regex);
    if (!match) return null;
    current = match[1];
  }
  const lastTag = parts[parts.length - 1];
  const regex = new RegExp(`<${lastTag}>([^<]*)</${lastTag}>`, 's');
  const match = current.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Match transactions against open invoices
 */
async function matchAgainstInvoices(
  supabase: any,
  companyId: string,
  transactions: Camt054Transaction[]
): Promise<Array<Camt054Transaction & { 
  match_type: 'exact_ocr' | 'amount_counterparty' | 'amount_date' | 'none';
  match_confidence: number;
  matched_invoice_id: string | null;
  matched_invoice_number: string | null;
  matched_invoice_amount: number | null;
}>> {
  // Get open invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, due_date, customer_id, status, customers(name, org_number)')
    .eq('company_id', companyId)
    .in('status', ['sent', 'overdue']);

  const openInvoices = invoices || [];

  return transactions.map(tx => {
    // Only match credit transactions (incoming payments)
    if (tx.transaction_type !== 'credit') {
      return { ...tx, match_type: 'none' as const, match_confidence: 0, matched_invoice_id: null, matched_invoice_number: null, matched_invoice_amount: null };
    }

    // 1. Exact OCR match
    if (tx.ocr_reference) {
      const ocrMatch = openInvoices.find((inv: any) => {
        const invNum = inv.invoice_number?.replace(/\D/g, '');
        const ocrClean = tx.ocr_reference!.replace(/\D/g, '');
        return invNum && ocrClean && (invNum === ocrClean || ocrClean.includes(invNum) || invNum.includes(ocrClean));
      });
      if (ocrMatch) {
        return {
          ...tx,
          match_type: 'exact_ocr' as const,
          match_confidence: 0.95,
          matched_invoice_id: ocrMatch.id,
          matched_invoice_number: ocrMatch.invoice_number,
          matched_invoice_amount: ocrMatch.total_amount,
        };
      }
    }

    // 2. Amount + counterparty match
    const counterparty = tx.debtor_name || tx.reference || '';
    const amountMatches = openInvoices.filter((inv: any) => 
      Math.abs(inv.total_amount - tx.amount) < 0.01
    );

    if (amountMatches.length === 1) {
      return {
        ...tx,
        match_type: 'amount_counterparty' as const,
        match_confidence: 0.75,
        matched_invoice_id: amountMatches[0].id,
        matched_invoice_number: amountMatches[0].invoice_number,
        matched_invoice_amount: amountMatches[0].total_amount,
      };
    }

    // Check counterparty name against customer
    if (counterparty && amountMatches.length > 1) {
      const nameMatch = amountMatches.find((inv: any) => {
        const custName = inv.customers?.name?.toLowerCase() || '';
        return custName && counterparty.toLowerCase().includes(custName);
      });
      if (nameMatch) {
        return {
          ...tx,
          match_type: 'amount_counterparty' as const,
          match_confidence: 0.85,
          matched_invoice_id: nameMatch.id,
          matched_invoice_number: nameMatch.invoice_number,
          matched_invoice_amount: nameMatch.total_amount,
        };
      }
    }

    // 3. Amount + date fallback
    if (amountMatches.length > 0) {
      // Pick the one closest to due date
      const sorted = [...amountMatches].sort((a: any, b: any) => {
        const diffA = Math.abs(new Date(a.due_date).getTime() - new Date(tx.booking_date).getTime());
        const diffB = Math.abs(new Date(b.due_date).getTime() - new Date(tx.booking_date).getTime());
        return diffA - diffB;
      });
      return {
        ...tx,
        match_type: 'amount_date' as const,
        match_confidence: 0.55,
        matched_invoice_id: sorted[0].id,
        matched_invoice_number: sorted[0].invoice_number,
        matched_invoice_amount: sorted[0].total_amount,
      };
    }

    return { ...tx, match_type: 'none' as const, match_confidence: 0, matched_invoice_id: null, matched_invoice_number: null, matched_invoice_amount: null };
  });
}

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

    const { xml_content, company_id, bank_account_id } = await req.json();

    if (!xml_content || !company_id) {
      return new Response(JSON.stringify({ error: 'xml_content and company_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse CAMT.054 XML
    const parsed = parseXml(xml_content);

    if (parsed.length === 0) {
      return new Response(JSON.stringify({ error: 'Inga transaktioner hittades i CAMT.054-filen' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Match against invoices
    const matched = await matchAgainstInvoices(supabase, company_id, parsed);

    // Store in camt054_imports
    const { data: importRecord, error: importError } = await supabase
      .from('camt054_imports')
      .insert({
        company_id,
        bank_account_id: bank_account_id || null,
        imported_by: user.id,
        transaction_count: parsed.length,
        matched_count: matched.filter(t => t.match_type !== 'none').length,
        status: 'processed',
      })
      .select()
      .maybeSingle();

    if (importError) throw new Error(`Import save failed: ${importError.message}`);

    // Store individual transactions
    const txRows = matched.map(tx => ({
      import_id: importRecord.id,
      company_id,
      bank_account_id: bank_account_id || null,
      amount: tx.amount,
      currency: tx.currency,
      booking_date: tx.booking_date,
      value_date: tx.value_date,
      debtor_name: tx.debtor_name,
      debtor_account: tx.debtor_account,
      creditor_name: tx.creditor_name,
      creditor_account: tx.creditor_account,
      reference: tx.reference,
      ocr_reference: tx.ocr_reference,
      description: tx.description,
      transaction_type: tx.transaction_type,
      end_to_end_id: tx.end_to_end_id,
      match_type: tx.match_type,
      match_confidence: tx.match_confidence,
      matched_invoice_id: tx.matched_invoice_id,
      status: tx.match_type === 'exact_ocr' ? 'auto_matched' : tx.match_type !== 'none' ? 'suggested' : 'unmatched',
    }));

    const { data: savedTx, error: txError } = await supabase
      .from('camt054_transactions')
      .insert(txRows)
      .select('id, status, matched_invoice_id, amount, booking_date, debtor_name, ocr_reference, reference');

    if (txError) throw new Error(`Transaction save failed: ${txError.message}`);

    // Auto-book exact OCR matches: create journal entries (1930/1510) and mark invoices paid
    const autoMatched = (savedTx || []).filter((t: any) => t.status === 'auto_matched' && t.matched_invoice_id);
    let autoBookedCount = 0;

    if (autoMatched.length > 0) {
      // Get accounts 1930 and 1510
      const { data: bankAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', company_id)
        .like('account_number', '1930%')
        .limit(1)
        .maybeSingle();

      const { data: arAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', company_id)
        .like('account_number', '1510%')
        .limit(1)
        .maybeSingle();

      if (bankAccount && arAccount) {
        for (const tx of autoMatched) {
          try {
            // Sequence: draft → lines → approved
            // 1. Draft header
            const { data: je, error: jeErr } = await supabase
              .from('journal_entries')
              .insert({
                company_id,
                entry_date: tx.booking_date,
                description: `Betalning CAMT.054 (auto): ${tx.debtor_name || 'Okänd'} – ${tx.ocr_reference || tx.reference || ''}`,
                status: 'draft',
                created_by: user.id,
              })
              .select()
              .maybeSingle();

            if (jeErr || !je) { console.error('Auto-book JE error:', jeErr); continue; }

            // 2. Lines
            const { error: linesErr } = await supabase
              .from('journal_entry_lines')
              .insert([
                { journal_entry_id: je.id, account_id: bankAccount.id, debit: tx.amount, credit: 0 },
                { journal_entry_id: je.id, account_id: arAccount.id, debit: 0, credit: tx.amount },
              ]);
            if (linesErr) {
              console.error('Auto-book lines error:', linesErr);
              await supabase.from('journal_entries').delete().eq('id', je.id);
              continue;
            }

            // 3. Approve (balance trigger validates here)
            const { error: approveErr } = await supabase
              .from('journal_entries')
              .update({ status: 'approved', approved_by: user.id })
              .eq('id', je.id);
            if (approveErr) {
              console.error('Auto-book approve error:', approveErr);
              await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', je.id);
              await supabase.from('journal_entries').delete().eq('id', je.id);
              continue;
            }

            // Update CAMT054 transaction
            await supabase
              .from('camt054_transactions')
              .update({ journal_entry_id: je.id, status: 'booked', confirmed_at: new Date().toISOString() })
              .eq('id', tx.id);

            // Mark invoice as paid
            await supabase
              .from('invoices')
              .update({ status: 'paid', paid_date: tx.booking_date })
              .eq('id', tx.matched_invoice_id);

            autoBookedCount++;
          } catch (e) {
            console.error('Auto-book error for tx:', tx.id, e);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      import_id: importRecord.id,
      total_transactions: parsed.length,
      matched: matched.filter(t => t.match_type !== 'none').length,
      auto_matched: matched.filter(t => t.match_type === 'exact_ocr').length,
      auto_booked: autoBookedCount,
      suggested: matched.filter(t => t.match_type !== 'none' && t.match_type !== 'exact_ocr').length,
      unmatched: matched.filter(t => t.match_type === 'none').length,
      transactions: matched,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-camt054:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
