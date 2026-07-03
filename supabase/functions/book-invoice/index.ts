import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Bookkeep an outgoing invoice idempotently.
 * Debet: 1510 (Kundfordringar)
 * Kredit: 3xxx (Försäljning, valt baserat på momssats) + 2611/2620/2630 (Utgående moms)
 *
 * Skapar verifikation även för utkast — eftersom fordran uppstår vid fakturadatum
 * enligt god redovisningssed (BFN, K2/K3).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { invoice_id } = await req.json();
    if (!invoice_id || typeof invoice_id !== "string") {
      throw new Error("invoice_id krävs");
    }

    // Hämta faktura med rader
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("id, company_id, invoice_number, invoice_date, total_amount, vat_amount, counterparty_name, journal_entry_id, status, invoice_type, invoice_lines(vat_rate, total_amount, vat_amount)")
      .eq("id", invoice_id)
      .maybeSingle();

    if (invError || !invoice) throw new Error("Faktura hittades inte");
    if (invoice.invoice_type !== "outgoing") {
      return new Response(JSON.stringify({ skipped: true, reason: "Endast utgående fakturor bokförs här" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: redan bokförd?
    if (invoice.journal_entry_id) {
      return new Response(JSON.stringify({
        success: true,
        already_booked: true,
        journal_entry_id: invoice.journal_entry_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bestäm intäktskonto baserat på dominerande momssats (på rad-nivå)
    const lines = invoice.invoice_lines || [];
    const vatBuckets: Record<string, { net: number; vat: number; account: string }> = {
      "25": { net: 0, vat: 0, account: "3001" },
      "12": { net: 0, vat: 0, account: "3002" },
      "6":  { net: 0, vat: 0, account: "3003" },
      "0":  { net: 0, vat: 0, account: "3004" },
    };
    const vatToAccount: Record<string, string> = {
      "25": "2611",
      "12": "2621",
      "6":  "2631",
      "0":  "",
    };

    if (lines.length > 0) {
      for (const ln of lines) {
        const rate = String(Math.round(Number(ln.vat_rate || 0)));
        const bucket = vatBuckets[rate] || vatBuckets["25"];
        const lineTotal = Number(ln.total_amount || 0);
        const lineVat = Number(ln.vat_amount || 0);
        bucket.net += lineTotal - lineVat;
        bucket.vat += lineVat;
      }
    } else {
      // Fallback: lägg allt på 25 %
      const total = Number(invoice.total_amount || 0);
      const vat = Number(invoice.vat_amount || 0);
      vatBuckets["25"].net = total - vat;
      vatBuckets["25"].vat = vat;
    }

    // Säkerställ att alla nödvändiga konton finns
    const ensureAccount = async (number: string, name: string, type: string): Promise<string> => {
      const { data: existing } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", invoice.company_id)
        .eq("account_number", number)
        .maybeSingle();
      if (existing) return existing.id;
      const { data: created, error } = await supabase
        .from("chart_of_accounts")
        .insert({ company_id: invoice.company_id, account_number: number, account_name: name, account_type: type })
        .select("id")
        .maybeSingle();
      if (error || !created) throw new Error(`Kunde inte skapa konto ${number}: ${error?.message}`);
      return created.id;
    };

    const accountNames: Record<string, string> = {
      "1510": "Kundfordringar",
      "3001": "Försäljning 25%",
      "3002": "Försäljning 12%",
      "3003": "Försäljning 6%",
      "3004": "Försäljning momsfri",
      "2611": "Utgående moms 25%",
      "2621": "Utgående moms 12%",
      "2631": "Utgående moms 6%",
    };

    const arAccountId = await ensureAccount("1510", "Kundfordringar", "asset");

    // Skapa verifikation (draft först — balanstrigger smäller på approved)
    const { data: je, error: jeErr } = await supabase
      .from("journal_entries")
      .insert({
        company_id: invoice.company_id,
        entry_date: invoice.invoice_date,
        description: `Faktura ${invoice.invoice_number} – ${invoice.counterparty_name}`,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (jeErr || !je) throw new Error(`Kunde inte skapa verifikation: ${jeErr?.message}`);

    const totalAmount = Number(invoice.total_amount || 0);
    const journalLines: Array<{ journal_entry_id: string; account_id: string; debit: number; credit: number }> = [
      { journal_entry_id: je.id, account_id: arAccountId, debit: totalAmount, credit: 0 },
    ];

    for (const rate of Object.keys(vatBuckets)) {
      const b = vatBuckets[rate];
      if (b.net > 0.005) {
        const accId = await ensureAccount(b.account, accountNames[b.account], "income");
        journalLines.push({ journal_entry_id: je.id, account_id: accId, debit: 0, credit: Math.round(b.net * 100) / 100 });
      }
      if (b.vat > 0.005 && vatToAccount[rate]) {
        const vatAccNum = vatToAccount[rate];
        const vatAccId = await ensureAccount(vatAccNum, accountNames[vatAccNum], "liability");
        journalLines.push({ journal_entry_id: je.id, account_id: vatAccId, debit: 0, credit: Math.round(b.vat * 100) / 100 });
      }
    }

    // Justera ev. avrundning så debet === kredit
    const totalCredit = journalLines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
    const diff = Math.round((totalAmount - totalCredit) * 100) / 100;
    if (Math.abs(diff) >= 0.01 && journalLines.length > 1) {
      // Lägg differensen på största kredit-raden
      const biggest = journalLines.filter(l => l.credit > 0).sort((a, b) => b.credit - a.credit)[0];
      if (biggest) biggest.credit = Math.round((biggest.credit + diff) * 100) / 100;
    }

    const { error: linesErr } = await supabase.from("journal_entry_lines").insert(journalLines);
    if (linesErr) {
      // Rollback verifikationen
      await supabase.from("journal_entries").delete().eq("id", je.id);
      throw new Error(`Kunde inte skapa konteringsrader: ${linesErr.message}`);
    }

    // Approve verifikationen
    const { error: approveErr } = await supabase
      .from("journal_entries")
      .update({ status: "approved", approved_by: user.id })
      .eq("id", je.id);
    if (approveErr) {
      console.error("Approve failed:", approveErr);
      // Lämna kvar som draft — bättre än att misslyckas helt
    }

    // Koppla verifikationen till fakturan
    await supabase.from("invoices").update({ journal_entry_id: je.id }).eq("id", invoice_id);

    return new Response(JSON.stringify({
      success: true,
      journal_entry_id: je.id,
      lines: journalLines.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("book-invoice error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
