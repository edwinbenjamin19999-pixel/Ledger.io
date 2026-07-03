import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, entry_date, description, lines } = await req.json();

    if (!company_id || !lines || lines.length === 0) {
      throw new Error("Missing required parameters");
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const accountNumber = line.account_number;

      if (!accountNumber) {
        errors.push(`Rad ${i + 1}: Saknar kontonummer`);
        continue;
      }

      // Unusual pattern detection (skip common exceptions)
      const debit = line.debit || 0;
      const credit = line.credit || 0;
      const isExceptionAccount =
        accountNumber.startsWith("19") || accountNumber.startsWith("26") ||
        accountNumber.startsWith("15") || accountNumber.startsWith("24") ||
        accountNumber.startsWith("28") || accountNumber.startsWith("16");

      if (!isExceptionAccount) {
        if (
          (accountNumber.startsWith("1") || accountNumber.startsWith("5") ||
            accountNumber.startsWith("6") || accountNumber.startsWith("7")) &&
          credit > debit && credit > 0
        ) {
          warnings.push(`Rad ${i + 1}: Konto ${accountNumber} krediteras — kontrollera att det stämmer`);
        }
        if (
          (accountNumber.startsWith("2") || accountNumber.startsWith("3")) &&
          debit > credit && debit > 0
        ) {
          warnings.push(`Rad ${i + 1}: Konto ${accountNumber} debiteras — kontrollera att det stämmer`);
        }
      }

      // VAT validation — support both gross and net based lines
      if (line.vat_code && parseFloat(line.vat_code) > 0) {
        const amount = debit || credit || 0;
        const vatRate = parseFloat(line.vat_code);
        const vatBasis = line.vat_basis === "net" ? "net" : "gross";

        // CRITICAL: gross = amount * rate / (100 + rate), net = amount * rate / 100
        const expectedVat = roundCurrency(
          vatBasis === "net"
            ? amount * vatRate / 100
            : amount * vatRate / (100 + vatRate)
        );
        const actualVat = roundCurrency(line.vat_amount || 0);

        if (Math.abs(expectedVat - actualVat) > 0.01) {
          const basisLabel = vatBasis === "net" ? "Netto" : "Brutto";
          const formula = vatBasis === "net"
            ? `${amount} × ${vatRate}/100`
            : `${amount} × ${vatRate}/${100 + vatRate}`;
          errors.push(
            `Rad ${i + 1}: Momsbelopp fel. ${basisLabel} ${amount} kr, ${vatRate}%: ${formula} = ${expectedVat.toFixed(2)} kr (angivet: ${actualVat.toFixed(2)} kr)`
          );
        }

        // Check for VAT account
        const hasVatAccount = lines.some(
          (l: any) => l.account_number && l.account_number.startsWith("26")
        );
        if (!hasVatAccount) {
          suggestions.push("Tips: Använd 'Auto moms-rad' för att lägga till momskonto (26xx) automatiskt");
        }
      }
    }

    // Pattern-based suggestions (only if no errors)
    if (errors.length === 0) {
      const accountNumbers = lines.map((l: any) => l.account_number).filter(Boolean);

      if (description &&
        (description.toLowerCase().includes("betalning") || description.toLowerCase().includes("överföring")) &&
        !accountNumbers.some((a: string) => a.startsWith("19"))) {
        suggestions.push("Banktransaktion utan bankkonto (19xx)?");
      }

      if (description &&
        (description.toLowerCase().includes("faktura") || description.toLowerCase().includes("invoice")) &&
        !accountNumbers.some((a: string) => a.startsWith("15") || a.startsWith("24"))) {
        suggestions.push("Faktura utan kundfordringar (15xx) / leverantörsskulder (24xx)?");
      }
    }

    return new Response(
      JSON.stringify({
        valid: errors.length === 0,
        errors,
        warnings: warnings.slice(0, 3),
        suggestions: suggestions.slice(0, 2),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
