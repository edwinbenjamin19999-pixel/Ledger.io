import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// BAS-kontoplan – fallback-namn och typ för auto-skapade konton
const BAS_ACCOUNT_NAMES: Record<string, string> = {
  "1510": "Kundfordringar", "1610": "Kortfristiga fordringar hos anställda",
  "1910": "Kassa", "1920": "PlusGiro", "1930": "Företagskonto", "1940": "Övriga bankkonton",
  "2440": "Leverantörsskulder", "2510": "Skatteskulder",
  "2610": "Utgående moms 25%", "2611": "Utgående moms 25% försäljning",
  "2620": "Utgående moms 12%", "2630": "Utgående moms 6%",
  "2640": "Ingående moms", "2641": "Debiterad ingående moms", "2645": "Beräknad ingående moms",
  "2650": "Redovisningskonto för moms", "2710": "Personalskatt", "2731": "Avräkning lagstadgade sociala avgifter",
  "3001": "Försäljning av tjänster 25% moms", "3010": "Försäljning av tjänster 25% moms",
  "3011": "Försäljning av varor 25% moms", "3041": "Försäljning av tjänster 12% moms",
  "3051": "Försäljning av tjänster 6% moms", "3740": "Öres- och kronutjämning",
  "4010": "Inköp av varor", "5010": "Lokalhyra", "5410": "Förbrukningsinventarier",
  "5610": "Personbilskostnader", "5810": "Resekostnader", "5910": "Annonsering",
  "6110": "Kontorsmateriel", "6212": "Mobiltelefon", "6230": "Datakommunikation",
  "6310": "Företagsförsäkringar", "6500": "Övriga externa tjänster", "6540": "IT-tjänster",
  "6550": "Konsultarvoden", "6570": "Bankkostnader", "6991": "Övriga externa kostnader",
  "7010": "Löner till kollektivanställda", "7210": "Löner till tjänstemän",
  "7510": "Lagstadgade sociala avgifter", "8310": "Ränteintäkter", "8410": "Räntekostnader",
};
function getBASAccountName(accountNumber: string): string {
  if (BAS_ACCOUNT_NAMES[accountNumber]) return BAS_ACCOUNT_NAMES[accountNumber];
  const first = accountNumber.charAt(0);
  const fallback: Record<string, string> = {
    "1": "Tillgångskonto", "2": "Skuld-/eget kapital-konto", "3": "Intäktskonto",
    "4": "Inköpskonto", "5": "Övrig kostnad", "6": "Övrig kostnad",
    "7": "Personalkostnad", "8": "Finansiell post",
  };
  return `${fallback[first] || "Konto"} ${accountNumber}`;
}
function getBASAccountType(accountNumber: string): string {
  const first = accountNumber.charAt(0);
  if (first === "1") return "asset";
  if (first === "2") return "liability";
  if (first === "3") return "revenue";
  return "expense";
}

// Tools the AI can call to execute actions in the system
const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "rebook_journal_lines",
      description: "Omkontera/boka om verifikationsrader från ett konto till ett annat. Används när användaren vill flytta poster mellan konton. Kräver company_id, from_account_number, to_account_number, och eventuellt en period (from_date, to_date). Returnerar antal ändrade rader.",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" },
          from_account_number: { type: "string", description: "Kontonummer att flytta FRÅN (t.ex. '2610')" },
          to_account_number: { type: "string", description: "Kontonummer att flytta TILL (t.ex. '2611')" },
          from_date: { type: "string", description: "Startdatum YYYY-MM-DD (valfritt, om ej angivet: alla)" },
          to_date: { type: "string", description: "Slutdatum YYYY-MM-DD (valfritt)" },
          description: { type: "string", description: "Kort beskrivning av varför ändringen görs" }
        },
        required: ["company_id", "from_account_number", "to_account_number"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_journal_entry",
      description: "Skapa en ny verifikation/bokföringspost med en eller flera rader. Används för att bokföra transaktioner direkt.",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" },
          entry_date: { type: "string", description: "Verifikationsdatum YYYY-MM-DD" },
          description: { type: "string", description: "Verifikationstext/beskrivning" },
          series: { type: "string", description: "Verifikationsserie (t.ex. 'A', 'B', 'M')" },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                account_number: { type: "string", description: "Kontonummer" },
                debit: { type: "number", description: "Debetbelopp" },
                credit: { type: "number", description: "Kreditbelopp" }
              },
              required: ["account_number", "debit", "credit"]
            },
            description: "Konteringsrader"
          }
        },
        required: ["company_id", "entry_date", "description", "lines"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_journal_entry_description",
      description: "Uppdatera beskrivningen/texten på en befintlig verifikation.",
      parameters: {
        type: "object",
        properties: {
          entry_id: { type: "string", description: "Verifikationens ID (UUID)" },
          description: { type: "string", description: "Ny beskrivning" }
        },
        required: ["entry_id", "description"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_journal_entries",
      description: "Sök efter verifikationer baserat på konto, belopp, datum eller text. Används för att hitta specifika poster.",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" },
          account_number: { type: "string", description: "Filtrera på kontonummer (prefix-match)" },
          from_date: { type: "string", description: "Från datum YYYY-MM-DD" },
          to_date: { type: "string", description: "Till datum YYYY-MM-DD" },
          search_text: { type: "string", description: "Sök i beskrivning" },
          min_amount: { type: "number", description: "Minsta belopp" },
          max_amount: { type: "number", description: "Högsta belopp" },
          limit: { type: "number", description: "Max antal resultat (standard 20)" }
        },
        required: ["company_id"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_journal_entry",
      description: "Radera en verifikation (om den är i status draft). Godkända verifikationer kan inte raderas utan bör istället reverseras.",
      parameters: {
        type: "object",
        properties: {
          entry_id: { type: "string", description: "Verifikationens ID (UUID)" },
          company_id: { type: "string", description: "Företagets ID" }
        },
        required: ["entry_id", "company_id"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reverse_journal_entry",
      description: "Skapa en reverseringsverifikation som nollställer en befintlig verifikation. Debet och kredit byts. Används för att korrigera godkända verifikationer.",
      parameters: {
        type: "object",
        properties: {
          entry_id: { type: "string", description: "Verifikationens ID att reversera" },
          company_id: { type: "string", description: "Företagets ID" },
          reversal_date: { type: "string", description: "Datum för reverseringen YYYY-MM-DD" },
          reason: { type: "string", description: "Anledning till reversering" }
        },
        required: ["entry_id", "company_id"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Skapa en kundfaktura. Används när användaren vill fakturera en kund. Hanterar automatiskt moms och bokföring.",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" },
          customer_name: { type: "string", description: "Kundens namn" },
          customer_org_number: { type: "string", description: "Kundens org-nummer (valfritt)" },
          customer_email: { type: "string", description: "Kundens e-post (valfritt)" },
          description: { type: "string", description: "Fakturabeskrivning/text" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Rad-beskrivning" },
                quantity: { type: "number", description: "Antal" },
                unit_price: { type: "number", description: "À-pris exkl moms" },
                vat_rate: { type: "number", description: "Momssats (25, 12, 6, 0)" }
              },
              required: ["description", "quantity", "unit_price"]
            },
            description: "Fakturarader"
          },
          due_days: { type: "number", description: "Betalningsvillkor i dagar (standard 30)" },
          invoice_date: { type: "string", description: "Fakturadatum YYYY-MM-DD" },
          revenue_account: { type: "string", description: "Intäktskonto (standard 3050 för konsulttjänster)" }
        },
        required: ["company_id", "customer_name", "description", "items"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_account_balance",
      description: "Fråga saldon för ett eller flera konton. Används för att besvara frågor om skatteskulder, kassa, fordringar etc.",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" },
          account_prefixes: {
            type: "array",
            items: { type: "string" },
            description: "Kontonummer-prefix att söka (t.ex. ['261', '264'] för moms, ['191'] för kassa)"
          },
          from_date: { type: "string", description: "Startdatum YYYY-MM-DD (valfritt)" },
          to_date: { type: "string", description: "Slutdatum YYYY-MM-DD (valfritt)" }
        },
        required: ["company_id", "account_prefixes"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_customer",
      description: "Skapa en ny kund i kundregistret.",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" },
          name: { type: "string", description: "Kundnamn" },
          org_number: { type: "string", description: "Org-nummer (valfritt)" },
          email: { type: "string", description: "E-post (valfritt)" },
          phone: { type: "string", description: "Telefon (valfritt)" },
          address: { type: "string", description: "Adress (valfritt)" },
          payment_terms_days: { type: "number", description: "Betalningsvillkor i dagar (standard 30)" }
        },
        required: ["company_id", "name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_deadlines",
      description: "Hämta kommande deadlines för skatter, moms, AGI och F-skatt baserat på företagets data.",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" }
        },
        required: ["company_id"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_invoices",
      description: "Sök kund- eller leverantörsfakturor (AR/AP). Använd denna för frågor om oattesterade, obetalda, förfallna eller utkastade fakturor — INTE search_journal_entries (som bara returnerar bokförda verifikat).",
      parameters: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "Företagets ID" },
          direction: { type: "string", enum: ["incoming", "outgoing"], description: "incoming = leverantörsfakturor (AP), outgoing = kundfakturor (AR). Utelämna för båda." },
          status: { type: "string", description: "Filtrera på status (t.ex. 'draft', 'sent', 'overdue', 'paid', 'pending_attest')." },
          unattested_only: { type: "boolean", description: "Om true: bara fakturor som ej attesterats (attested_at IS NULL)." },
          unpaid_only: { type: "boolean", description: "Om true: bara obetalda (paid_at IS NULL)." },
          search_text: { type: "string", description: "Sök i counterparty_name eller invoice_number." },
          limit: { type: "number", description: "Max antal resultat (standard 20, max 100)." }
        },
        required: ["company_id"],
        additionalProperties: false
      }
    }
  }
];

// Execute a tool call
async function executeTool(
  supabase: any,
  name: string,
  args: any,
  userId: string | null,
  companyId?: string
): Promise<{ success: boolean; result: string; data?: any }> {
  // SECURITY: never trust company_id from the AI — always override with the
  // authoritative companyId from the request payload. Otherwise the model
  // may invent ids ("default_company_id", random UUIDs) and writes silently
  // fail under RLS, leaving the user with no booked verification.
  if (companyId) {
    args = { ...args, company_id: companyId };
  }
  // Write-tools require an authenticated user (created_by/user_id NOT NULL)
  const writeTools = new Set([
    "rebook_journal_lines", "create_journal_entry", "update_journal_entry_description",
    "delete_journal_entry", "reverse_journal_entry", "create_invoice", "create_customer",
  ]);
  if (writeTools.has(name) && !userId) {
    return { success: false, result: "Du måste vara inloggad för att utföra åtgärder. Logga in och försök igen." };
  }
  try {
    switch (name) {
      case "rebook_journal_lines": {
        // Find the source account - try company-specific first, then any matching account
        let fromAccount: any = null;
        const { data: fromAccountDirect } = await supabase
          .from("chart_of_accounts")
          .select("id, account_name")
          .eq("company_id", args.company_id)
          .eq("account_number", args.from_account_number)
          .maybeSingle();
        fromAccount = fromAccountDirect;

        // If not found in company chart, search for any account with this number that has journal lines for this company
        if (!fromAccount) {
          const { data: allAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id, account_name, company_id")
            .eq("account_number", args.from_account_number);

          if (allAccounts && allAccounts.length > 0) {
            // Check which account actually has journal lines for this company
            for (const acc of allAccounts) {
              const { data: testLines } = await supabase
                .from("journal_entry_lines")
                .select("id, journal_entry:journal_entries!inner(company_id)")
                .eq("account_id", acc.id)
                .limit(1);
              const hasCompanyLines = (testLines || []).some((l: any) => l.journal_entry?.company_id === args.company_id);
              if (hasCompanyLines) {
                fromAccount = acc;
                break;
              }
            }
            // If still not found, use the first match as fallback
            if (!fromAccount) fromAccount = allAccounts[0];
          }
        }

        const { data: toAccount } = await supabase
          .from("chart_of_accounts")
          .select("id, account_name")
          .eq("company_id", args.company_id)
          .eq("account_number", args.to_account_number)
          .maybeSingle();

        if (!fromAccount) return { success: false, result: `Konto ${args.from_account_number} hittades inte i någon kontoplan. Kontrollera kontonumret.` };
        if (!toAccount) return { success: false, result: `Målkonto ${args.to_account_number} hittades inte i företagets kontoplan. Kontrollera att kontot finns.` };

        // Find all lines on the source account
        let query = supabase
          .from("journal_entry_lines")
          .select("id, journal_entry_id, debit, credit, journal_entry:journal_entries!inner(entry_date, company_id, status)")
          .eq("account_id", fromAccount.id);

        // Filter by date range if provided
        if (args.from_date) query = query.gte("journal_entry.entry_date", args.from_date);
        if (args.to_date) query = query.lte("journal_entry.entry_date", args.to_date);

        const { data: lines, error: linesError } = await query;
        if (linesError) return { success: false, result: `Fel vid sökning: ${linesError.message}` };

        const companyLines = (lines || []).filter((l: any) => l.journal_entry?.company_id === args.company_id);
        if (companyLines.length === 0) return { success: false, result: `Inga poster hittades på konto ${args.from_account_number}.` };

        // Update each line to the new account
        let updatedCount = 0;
        for (const line of companyLines) {
          const { error } = await supabase
            .from("journal_entry_lines")
            .update({ account_id: toAccount.id })
            .eq("id", line.id);

          if (!error) updatedCount++;
        }

        // Log the action
        await supabase.from("audit_events").insert({
          user_id: userId,
          company_id: args.company_id,
          entity_type: "journal_entry_lines",
          entity_id: "batch_rebook",
          event_type: "ai_rebook",
          new_data: {
            from_account: args.from_account_number,
            to_account: args.to_account_number,
            lines_updated: updatedCount,
            description: args.description || "AI-omkontering",
            date_range: { from: args.from_date, to: args.to_date }
          }
        });

        return {
          success: true,
          result: `Omkontering klar. ${updatedCount} av ${companyLines.length} rader flyttade från konto ${args.from_account_number} (${fromAccount.account_name}) till ${args.to_account_number} (${toAccount.account_name}).${args.description ? ` Anledning: ${args.description}` : ""}`,
          data: { updatedCount, fromAccount: fromAccount.account_name, toAccount: toAccount.account_name }
        };
      }

      case "create_journal_entry": {
        // Validate balance
        const totalDebit = args.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
        const totalCredit = args.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          return { success: false, result: `Verifikationen balanserar inte. Debet: ${totalDebit.toFixed(2)}, Kredit: ${totalCredit.toFixed(2)}. Differens: ${(totalDebit - totalCredit).toFixed(2)} kr.` };
        }

        // journal_number and series_number are auto-assigned by DB triggers
        // (assign_journal_number_trigger + auto_classify_journal_series).
        // Just provide series_code if the caller specified one; otherwise let the trigger classify.
        const insertPayload: Record<string, unknown> = {
          company_id: args.company_id,
          entry_date: args.entry_date,
          description: args.description,
          status: "draft",
          created_by: userId,
        };
        if (args.series) insertPayload.series_code = args.series;

        const { data: entry, error: entryError } = await supabase
          .from("journal_entries")
          .insert(insertPayload)
          .select("id, journal_number, series_code")
          .maybeSingle();

        if (entryError) return { success: false, result: `Kunde inte skapa verifikation: ${entryError.message}` };

        // Resolve account IDs and insert lines (auto-create missing BAS accounts)
        for (const line of args.lines) {
          let { data: account } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", args.company_id)
            .eq("account_number", line.account_number)
            .maybeSingle();

          if (!account) {
            // Auto-create the account using BAS standard naming
            const accountName = getBASAccountName(line.account_number);
            const accountType = getBASAccountType(line.account_number);
            const { data: newAccount, error: createErr } = await supabase
              .from("chart_of_accounts")
              .insert({
                company_id: args.company_id,
                account_number: line.account_number,
                account_name: accountName,
                account_type: accountType,
                is_active: true,
              })
              .select("id")
              .maybeSingle();

            if (createErr || !newAccount) {
              await supabase.from("journal_entries").delete().eq("id", entry.id);
              return { success: false, result: `Konto ${line.account_number} saknas i kontoplanen och kunde inte skapas automatiskt: ${createErr?.message || "okänt fel"}` };
            }
            account = newAccount;
          }

          const { error: lineError } = await supabase
            .from("journal_entry_lines")
            .insert({
              journal_entry_id: entry.id,
              account_id: account.id,
              debit: line.debit || 0,
              credit: line.credit || 0,
            });

          if (lineError) {
            await supabase.from("journal_entries").delete().eq("id", entry.id);
            return { success: false, result: `Kunde inte skapa rad för konto ${line.account_number}: ${lineError.message}` };
          }
        }

        // Approve the entry
        const { error: approveError } = await supabase
          .from("journal_entries")
          .update({ status: "approved" })
          .eq("id", entry.id);

        if (approveError) {
          return { success: false, result: `Verifikation skapad men kunde inte godkännas: ${approveError.message}` };
        }

        const verLabel = entry.journal_number || `${entry.series_code || args.series || "A"}?`;
        return {
          success: true,
          result: `Verifikation ${verLabel} skapad och godkänd.\nDatum: ${args.entry_date}\nBeskrivning: ${args.description}\nAntal rader: ${args.lines.length}\nSumma: ${totalDebit.toFixed(2)} kr`,
          data: { entryId: entry.id, verificationNumber: verLabel }
        };
      }

      case "update_journal_entry_description": {
        const { error } = await supabase
          .from("journal_entries")
          .update({ description: args.description })
          .eq("id", args.entry_id);

        if (error) return { success: false, result: `Kunde inte uppdatera: ${error.message}` };
        return { success: true, result: `Verifikationens beskrivning uppdaterad till: "${args.description}"` };
      }

      case "search_journal_entries": {
        let query = supabase
          .from("journal_entries")
          .select(`
            id, entry_date, description, journal_number, series_code, status,
            journal_entry_lines(
              debit, credit,
              account:chart_of_accounts(account_number, account_name)
            )
          `)
          .eq("company_id", args.company_id)
          .eq("status", "approved")
          .order("entry_date", { ascending: false })
          .limit(args.limit || 20);

        if (args.from_date) query = query.gte("entry_date", args.from_date);
        if (args.to_date) query = query.lte("entry_date", args.to_date);
        if (args.search_text) query = query.ilike("description", `%${args.search_text}%`);

        const { data: entries, error } = await query;
        if (error) return { success: false, result: `Sökfel: ${error.message}` };

        let filtered = entries || [];
        if (args.account_number) {
          filtered = filtered.filter((e: any) =>
            e.journal_entry_lines?.some((l: any) =>
              l.account?.account_number?.startsWith(args.account_number)
            )
          );
        }

        if (args.min_amount || args.max_amount) {
          filtered = filtered.filter((e: any) => {
            const maxDebit = Math.max(...(e.journal_entry_lines || []).map((l: any) => l.debit || 0));
            const maxCredit = Math.max(...(e.journal_entry_lines || []).map((l: any) => l.credit || 0));
            const maxAmt = Math.max(maxDebit, maxCredit);
            if (args.min_amount && maxAmt < args.min_amount) return false;
            if (args.max_amount && maxAmt > args.max_amount) return false;
            return true;
          });
        }

        const summary = filtered.slice(0, 20).map((e: any) => {
          const lines = (e.journal_entry_lines || []).map((l: any) =>
            `  ${l.debit > 0 ? 'D' : 'K'} ${l.account?.account_number} ${l.account?.account_name}: ${l.debit > 0 ? l.debit : l.credit} kr`
          ).join("\n");
          const label = e.journal_number || `${e.series_code || ""}?`;
          return `${label} (${e.entry_date}) – ${e.description}\n${lines}`;
        }).join("\n\n");

        return {
          success: true,
          result: `Hittade ${filtered.length} verifikationer:\n\n${summary || "Inga träffar."}`,
          data: { count: filtered.length }
        };
      }

      case "delete_journal_entry": {
        const { data: entry } = await supabase
          .from("journal_entries")
          .select("id, status, journal_number, series_code")
          .eq("id", args.entry_id)
          .eq("company_id", args.company_id)
          .maybeSingle();

        if (!entry) return { success: false, result: "Verifikationen hittades inte." };
        if (entry.status !== "draft") return { success: false, result: `Kan inte radera en ${entry.status}-verifikation. Använd reversering istället.` };

        await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", entry.id);
        const { error } = await supabase.from("journal_entries").delete().eq("id", entry.id);
        if (error) return { success: false, result: `Kunde inte radera: ${error.message}` };

        return { success: true, result: `Verifikation ${entry.journal_number || entry.series_code || ""} raderad.` };
      }

      case "reverse_journal_entry": {
        const { data: original } = await supabase
          .from("journal_entries")
          .select(`
            id, entry_date, description, journal_number, series_code, company_id,
            journal_entry_lines(account_id, debit, credit)
          `)
          .eq("id", args.entry_id)
          .eq("company_id", args.company_id)
          .maybeSingle();

        if (!original) return { success: false, result: "Verifikationen hittades inte." };

        const reversalDate = args.reversal_date || new Date().toISOString().split("T")[0];
        const origLabel = original.journal_number || original.series_code || "verifikation";

        const { data: reversal, error: revError } = await supabase
          .from("journal_entries")
          .insert({
            company_id: args.company_id,
            entry_date: reversalDate,
            description: `Reversering av ${origLabel}: ${args.reason || original.description}`,
            series_code: original.series_code,
            status: "draft",
            created_by: userId,
          })
          .select("id, journal_number, series_code")
          .maybeSingle();

        if (revError) return { success: false, result: `Kunde inte skapa reversering: ${revError.message}` };

        for (const line of (original.journal_entry_lines || [])) {
          await supabase.from("journal_entry_lines").insert({
            journal_entry_id: reversal.id,
            account_id: line.account_id,
            debit: line.credit || 0,
            credit: line.debit || 0,
          });
        }

        await supabase.from("journal_entries").update({ status: "approved" }).eq("id", reversal.id);

        const revLabel = reversal.journal_number || reversal.series_code || "?";
        return {
          success: true,
          result: `Reverseringsverifikation ${revLabel} skapad (${reversalDate}).\nOriginalet ${origLabel} är nu reverserat.${args.reason ? ` Anledning: ${args.reason}` : ""}`,
          data: { reversalId: reversal.id, verificationNumber: revLabel }
        };
      }

      case "create_invoice": {
        const today = args.invoice_date || new Date().toISOString().split("T")[0];
        const dueDays = args.due_days || 30;
        const dueDate = new Date(new Date(today).getTime() + dueDays * 86400000).toISOString().split("T")[0];
        const revenueAccount = args.revenue_account || "3050";

        // Smart customer resolution: try org_number → email → name (fuzzy)
        let customerId: string | null = null;
        let customerWasCreated = false;
        let resolvedCustomer: any = null;

        if (args.customer_org_number) {
          const { data } = await supabase
            .from("customers")
            .select("id, name, org_number, email")
            .eq("company_id", args.company_id)
            .eq("org_number", args.customer_org_number.trim())
            .maybeSingle();
          if (data) resolvedCustomer = data;
        }
        if (!resolvedCustomer && args.customer_email) {
          const { data } = await supabase
            .from("customers")
            .select("id, name, org_number, email")
            .eq("company_id", args.company_id)
            .ilike("email", args.customer_email.trim())
            .maybeSingle();
          if (data) resolvedCustomer = data;
        }
        if (!resolvedCustomer && args.customer_name) {
          const { data } = await supabase
            .from("customers")
            .select("id, name, org_number, email")
            .eq("company_id", args.company_id)
            .ilike("name", args.customer_name.trim())
            .maybeSingle();
          if (data) resolvedCustomer = data;
        }

        if (resolvedCustomer) {
          customerId = resolvedCustomer.id;
        } else {
          // Auto-create with whatever info we have. Name is required by schema.
          const { data: newCustomer, error: custErr } = await supabase
            .from("customers")
            .insert({
              company_id: args.company_id,
              name: args.customer_name || args.customer_email || args.customer_org_number || "Ny kund",
              org_number: args.customer_org_number || null,
              email: args.customer_email || null,
              payment_terms_days: dueDays,
              created_by: userId,
            })
            .select("id, name, org_number, email")
            .maybeSingle();
          if (custErr || !newCustomer) {
            return { success: false, result: `Kunde inte skapa kund: ${custErr?.message || "okänt fel"}` };
          }
          customerId = newCustomer.id;
          resolvedCustomer = newCustomer;
          customerWasCreated = true;
        }

        // Calculate totals
        let subtotal = 0;
        let totalVat = 0;
        const lineItems = (args.items || []).map((item: any) => {
          const lineTotal = item.quantity * item.unit_price;
          const vatRate = item.vat_rate ?? 25;
          const vatAmount = lineTotal * (vatRate / 100);
          subtotal += lineTotal;
          totalVat += vatAmount;
          return { ...item, lineTotal, vatRate, vatAmount };
        });
        const totalAmount = subtotal + totalVat;

        // Get next invoice number
        const { data: lastInv } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("company_id", args.company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastNum = lastInv?.invoice_number ? parseInt(lastInv.invoice_number.replace(/\D/g, "")) : 1000;
        const invoiceNumber = String(lastNum + 1);

        // Create invoice as DRAFT — user reviews and clicks "Skicka faktura" to send & book
        const { data: invoice, error: invError } = await supabase
          .from("invoices")
          .insert({
            company_id: args.company_id,
            customer_id: customerId,
            counterparty_name: resolvedCustomer?.name || args.customer_name,
            counterparty_org_number: resolvedCustomer?.org_number || args.customer_org_number || null,
            customer_email: resolvedCustomer?.email || args.customer_email || null,
            invoice_number: invoiceNumber,
            invoice_date: today,
            due_date: dueDate,
            total_amount: totalAmount,
            vat_amount: totalVat,
            status: "draft",
            invoice_type: "outgoing",
            invoice_direction: "outgoing",
            notes: args.description,
            created_by: userId,
          })
          .select("id")
          .maybeSingle();

        if (invError || !invoice) return { success: false, result: `Kunde inte skapa faktura: ${invError?.message || "okänt fel"}` };

        // Insert invoice lines
        const linesToInsert = lineItems.map((i: any) => ({
          invoice_id: invoice.id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          vat_rate: i.vatRate,
          vat_amount: i.vatAmount,
          total_amount: i.lineTotal + i.vatAmount,
        }));
        if (linesToInsert.length > 0) {
          await supabase.from("invoice_lines").insert(linesToInsert);
        }

        const itemsSummary = lineItems.map((i: any) => `  ${i.description}: ${i.quantity} × ${i.unit_price} kr = ${i.lineTotal.toFixed(0)} kr (moms ${i.vatRate}%: ${i.vatAmount.toFixed(0)} kr)`).join("\n");

        return {
          success: true,
          result: `Fakturautkast #${invoiceNumber} skapat för ${resolvedCustomer?.name || args.customer_name}${customerWasCreated ? " (ny kund tillagd)" : ""}.\n\nGranska detaljerna nedan och klicka på **Skicka faktura** för att skicka och bokföra.\n\nRader:\n${itemsSummary}\n\nSubtotal: ${subtotal.toFixed(0)} kr\nMoms: ${totalVat.toFixed(0)} kr\nTotalt: ${totalAmount.toFixed(0)} kr`,
          data: {
            invoiceId: invoice.id,
            invoiceNumber,
            invoicePreview: {
              invoice_id: invoice.id,
              invoice_number: invoiceNumber,
              customer: {
                id: customerId,
                name: resolvedCustomer?.name || args.customer_name,
                org_number: resolvedCustomer?.org_number || args.customer_org_number || null,
                email: resolvedCustomer?.email || args.customer_email || null,
              },
              customer_was_created: customerWasCreated,
              invoice_date: today,
              due_date: dueDate,
              due_days: dueDays,
              lines: lineItems.map((i: any) => ({
                description: i.description,
                quantity: i.quantity,
                unit_price: i.unit_price,
                vat_rate: i.vatRate,
                line_total: i.lineTotal,
                vat_amount: i.vatAmount,
              })),
              subtotal,
              vat_amount: totalVat,
              total_amount: totalAmount,
              revenue_account: revenueAccount,
            },
          },
        };
      }

      case "query_account_balance": {
        const prefixes = args.account_prefixes || [];
        let query = supabase
          .from("journal_entry_lines")
          .select(`
            debit, credit,
            account:chart_of_accounts!inner(account_number, account_name),
            journal_entry:journal_entries!inner(entry_date, status, company_id)
          `)
          .eq("journal_entry.company_id", args.company_id)
          // Kanonisk källa: inkludera posted/approved/pending_approval så att
          // saldon stämmer överens med Resultat & balans, Kassaflödesanalys
          // och dashboardens KPI-kort (samma filter som getLiquidCash/getNetResult).
          .in("journal_entry.status", ["posted", "approved", "pending_approval"]);

        if (args.from_date) query = query.gte("journal_entry.entry_date", args.from_date);
        if (args.to_date) query = query.lte("journal_entry.entry_date", args.to_date);

        const { data: lines, error } = await query.limit(5000);
        if (error) return { success: false, result: `Fel: ${error.message}` };

        const balances: Record<string, { name: string; debit: number; credit: number; net: number }> = {};
        for (const line of (lines || [])) {
          const accNum = (line as any).account?.account_number || "";
          const matches = prefixes.length === 0 || prefixes.some((p: string) => accNum.startsWith(p));
          if (!matches) continue;

          if (!balances[accNum]) {
            balances[accNum] = { name: (line as any).account?.account_name || "", debit: 0, credit: 0, net: 0 };
          }
          balances[accNum].debit += line.debit || 0;
          balances[accNum].credit += line.credit || 0;
          balances[accNum].net += (line.debit || 0) - (line.credit || 0);
        }

        const sorted = Object.entries(balances)
          .sort((a, b) => a[0].localeCompare(b[0]));

        const summary = sorted.map(([num, acc]) => {
          const isLiability = num.startsWith("2");
          const displayBalance = isLiability ? -acc.net : acc.net;
          return `  ${num} ${acc.name}: ${displayBalance.toFixed(0)} kr`;
        }).join("\n");

        const totalNet = sorted.reduce((sum, [num, acc]) => {
          const isLiability = num.startsWith("2");
          return sum + (isLiability ? -acc.net : acc.net);
        }, 0);

        return {
          success: true,
          result: `Kontosaldon${args.from_date ? ` (${args.from_date} – ${args.to_date || 'idag'})` : ''}:\n\n${summary || "Inga poster hittades."}\n\nTotal: ${totalNet.toFixed(0)} kr`,
          data: { balances, totalNet }
        };
      }

      case "create_customer": {
        const { data: existing } = await supabase
          .from("customers")
          .select("id, name")
          .eq("company_id", args.company_id)
          .ilike("name", args.name)
          .maybeSingle();

        if (existing) return { success: true, result: `Kunden "${existing.name}" finns redan i registret.`, data: { customerId: existing.id } };

        const { data: customer, error } = await supabase
          .from("customers")
          .insert({
            company_id: args.company_id,
            name: args.name,
            org_number: args.org_number || null,
            email: args.email || null,
            phone: args.phone || null,
            address: args.address || null,
            payment_terms_days: args.payment_terms_days || 30,
            created_by: userId,
          })
          .select("id")
          .maybeSingle();

        if (error) return { success: false, result: `Kunde inte skapa kund: ${error.message}` };
        return { success: true, result: `Kund "${args.name}" skapad ✓${args.org_number ? ` (org.nr ${args.org_number})` : ""}`, data: { customerId: customer.id } };
      }

      case "get_upcoming_deadlines": {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Build deadlines based on Swedish tax calendar
        const deadlines = [];

        // Moms (monthly on 12th)
        const nextMomsDate = new Date(currentYear, currentMonth, 12);
        if (nextMomsDate <= now) nextMomsDate.setMonth(nextMomsDate.getMonth() + 1);

        // Get VAT balance
        const { data: vatLines } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, account:chart_of_accounts!inner(account_number), journal_entry:journal_entries!inner(company_id, status)")
          .eq("journal_entry.company_id", args.company_id)
          .eq("journal_entry.status", "approved");

        let vatBalance = 0;
        for (const line of (vatLines || [])) {
          const accNum = (line as any).account?.account_number || "";
          if (accNum.startsWith("261") || accNum.startsWith("262") || accNum.startsWith("263")) {
            vatBalance += (line.credit || 0) - (line.debit || 0);
          }
          if (accNum.startsWith("264")) {
            vatBalance -= (line.debit || 0) - (line.credit || 0);
          }
        }

        deadlines.push({
          date: nextMomsDate.toISOString().split("T")[0],
          type: "Momsdeklaration",
          amount: Math.max(0, vatBalance),
          status: "upcoming"
        });

        // AGI (monthly on 12th)
        deadlines.push({
          date: nextMomsDate.toISOString().split("T")[0],
          type: "AGI (arbetsgivardeklaration)",
          amount: null,
          status: "upcoming"
        });

        // F-skatt (monthly on 12th)
        deadlines.push({
          date: nextMomsDate.toISOString().split("T")[0],
          type: "F-skatt",
          amount: null,
          status: "upcoming"
        });

        const summary = deadlines
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(d => `  ${d.date}  ${d.type}${d.amount !== null ? `  ${d.amount.toFixed(0)} kr` : ''}  [${d.status}]`)
          .join("\n");

        return {
          success: true,
          result: `Kommande deadlines:\n\n${summary}`,
          data: { deadlines }
        };
      }

      case "search_invoices": {
        const limit = Math.min(args.limit || 20, 100);
        let q = supabase
          .from("invoices")
          .select("invoice_number, counterparty_name, total_amount, currency, status, invoice_direction, invoice_date, due_date, paid_at, attested_at, workflow_state")
          .eq("company_id", args.company_id)
          .order("invoice_date", { ascending: false })
          .limit(limit);

        if (args.direction === "incoming") q = q.eq("invoice_direction", "incoming");
        else if (args.direction === "outgoing") q = q.eq("invoice_direction", "outgoing");
        if (args.status) q = q.eq("status", args.status);
        if (args.unattested_only) q = q.is("attested_at", null);
        if (args.unpaid_only) q = q.is("paid_at", null);
        if (args.search_text) {
          const t = args.search_text.replace(/[%_]/g, "");
          q = q.or(`counterparty_name.ilike.%${t}%,invoice_number.ilike.%${t}%`);
        }

        const { data, error } = await q;
        if (error) return { success: false, result: `Fel vid sökning av fakturor: ${error.message}` };
        const rows = data || [];
        if (rows.length === 0) {
          return { success: true, result: "Inga fakturor matchade sökningen.", data: { count: 0, invoices: [] } };
        }
        const totalSum = rows.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
        const lines = rows.map((r: any) => {
          const dir = r.invoice_direction === "incoming" ? "AP" : "AR";
          const flags = [
            !r.attested_at ? "ej attesterad" : null,
            !r.paid_at && r.invoice_direction === "incoming" ? "obetald" : null,
            r.status === "overdue" ? "FÖRFALLEN" : null,
          ].filter(Boolean).join(", ");
          return `  [${dir}] ${r.invoice_number || "(utan nr)"} · ${r.counterparty_name || "okänd motpart"} · ${(Number(r.total_amount)||0).toFixed(0)} ${r.currency || "SEK"} · status: ${r.status}${r.due_date ? ` · förfaller ${r.due_date}` : ""}${flags ? ` · (${flags})` : ""}`;
        }).join("\n");
        return {
          success: true,
          result: `Hittade ${rows.length} faktura/fakturor (summa ${totalSum.toFixed(0)} SEK):\n${lines}`,
          data: { count: rows.length, totalSum, invoices: rows },
        };
      }

      default:
        return { success: false, result: `Okänt verktyg: ${name}` };
    }
  } catch (err: any) {
    console.error(`Tool ${name} error:`, err);
    return { success: false, result: `Systemfel vid ${name}: ${err.message}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({} as any));
    const { companyId, attachments, moduleContext } = payload;
    console.log(`[ai-assistant-stream] incoming companyId=${companyId ?? "(none)"}`);

    // Backwards compatible payload normalization.
    // Accepts EITHER:
    //  - { messages: [{role, content}, ...] }            (preferred)
    //  - { message: "text", conversationHistory: [...] } (legacy DashboardAIInput)
    //  - { message: "text", conversation: [...] }        (legacy useAIEkonom)
    let messages: Array<{ role: string; content: any }> = Array.isArray(payload.messages) ? payload.messages : [];
    if (messages.length === 0) {
      const history = Array.isArray(payload.conversationHistory)
        ? payload.conversationHistory
        : Array.isArray(payload.conversation)
          ? payload.conversation
          : [];
      messages = history
        .filter((m: any) => m && typeof m === "object" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m: any) => ({ role: m.role, content: m.content }));
      if (typeof payload.message === "string" && payload.message.trim()) {
        messages.push({ role: "user", content: payload.message });
      }
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Inget meddelande mottogs. Skicka 'message' (text) eller 'messages' (array)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI-tjänsten är inte konfigurerad. Försök igen senare." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get user ID from auth header. Default to null (NOT the string "system",
    // because created_by/user_id columns are uuid and would crash inserts).
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let financialContext = "";
    if (companyId) {
      try {
        const { data: company } = await supabase
          .from("companies")
          .select("name, org_number, industry, subscription_tier")
          .eq("id", companyId)
          .maybeSingle();

        const currentYear = new Date().getFullYear();
        const prevYear = currentYear - 1;

        const getYearSummary = async (year: number) => {
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;

          const { data: entries } = await supabase
            .from("journal_entries")
            .select(`
              entry_date,
              journal_entry_lines(
                debit, credit, vat_code, vat_amount,
                account:chart_of_accounts(account_number, account_name, account_type, vat_code)
              )
            `)
            .eq("company_id", companyId)
            .eq("status", "approved")
            .gte("entry_date", startDate)
            .lte("entry_date", endDate)
            .limit(2000);

          const lines = (entries || []).flatMap(entry =>
            (entry.journal_entry_lines || []).map((line: any) => ({
              debit: line.debit,
              credit: line.credit,
              vat_code: line.vat_code,
              vat_amount: line.vat_amount,
              account: line.account,
            }))
          );

          let totalRevenue = 0;
          let totalExpenses = 0;
          let totalOutputVat = 0;
          let totalInputVat = 0;
          const accountBalances: Record<string, { name: string; type: string; debit: number; credit: number; balance: number }> = {};

          for (const line of lines) {
            const accNum = line.account?.account_number || "";
            const accName = line.account?.account_name || "";
            const accType = line.account?.account_type || "";
            const debit = line.debit || 0;
            const credit = line.credit || 0;

            if (!accountBalances[accNum]) {
              accountBalances[accNum] = { name: accName, type: accType, debit: 0, credit: 0, balance: 0 };
            }
            accountBalances[accNum].debit += debit;
            accountBalances[accNum].credit += credit;
            accountBalances[accNum].balance += (debit - credit);

            if (accNum.startsWith("3")) totalRevenue += (credit - debit);
            if (accNum.match(/^[4-7]/) || (accNum.startsWith("8") && !accNum.startsWith("89"))) {
              totalExpenses += (debit - credit);
            }
            if (accNum.startsWith("261") || accNum.startsWith("262") || accNum.startsWith("263")) {
              totalOutputVat += (credit - debit);
            }
            if (accNum.startsWith("264")) totalInputVat += (debit - credit);
          }

          return { totalRevenue, totalExpenses, totalOutputVat, totalInputVat, accountBalances, lineCount: lines.length };
        };

        const currentYearData = await getYearSummary(currentYear);
        const prevYearData = await getYearSummary(prevYear);

        const { data: allEntries } = await supabase
          .from("journal_entries")
          .select(`
            journal_entry_lines(
              debit, credit,
              account:chart_of_accounts(account_number, account_name, account_type)
            )
          `)
          .eq("company_id", companyId)
          .eq("status", "approved")
          .limit(5000);

        const balanceSheetAccounts: Record<string, { name: string; balance: number }> = {};
        for (const entry of (allEntries || [])) {
          for (const line of (entry.journal_entry_lines || [])) {
            const accNum = (line as any).account?.account_number || "";
            const accName = (line as any).account?.account_name || "";
            if (accNum.match(/^[12]/)) {
              if (!balanceSheetAccounts[accNum]) {
                balanceSheetAccounts[accNum] = { name: accName, balance: 0 };
              }
              balanceSheetAccounts[accNum].balance += ((line as any).debit || 0) - ((line as any).credit || 0);
            }
          }
        }

        const getBalanceRange = (prefix: string) => {
          return Object.entries(balanceSheetAccounts)
            .filter(([num]) => num.startsWith(prefix))
            .reduce((sum, [, acc]) => sum + acc.balance, 0);
        };

        const totalAssets = Object.entries(balanceSheetAccounts)
          .filter(([num]) => num.startsWith("1"))
          .reduce((sum, [, acc]) => sum + acc.balance, 0);

        const totalEquity = -(Object.entries(balanceSheetAccounts)
          .filter(([num]) => num.startsWith("20") || num.startsWith("208") || num.startsWith("209"))
          .reduce((sum, [, acc]) => sum + acc.balance, 0));

        const totalLiabilities = -(Object.entries(balanceSheetAccounts)
          .filter(([num]) => num.match(/^2[1-9]/))
          .reduce((sum, [, acc]) => sum + acc.balance, 0));

        const aktiekapital = -(balanceSheetAccounts["2081"]?.balance || 0);
        const balanceratResultat = -(balanceSheetAccounts["2098"]?.balance || 0);
        const periodiseringsfonder = -(getBalanceRange("212"));
        const overavskrivningar = -(getBalanceRange("215"));
        const kassaOchBank = getBalanceRange("19");
        const kundfordringar = getBalanceRange("151");
        const leverantorsskulder = -(getBalanceRange("241"));

        const { data: payrollRuns } = await supabase
          .from("payroll_runs")
          .select("id, period_start, period_end, total_gross, total_net, total_tax, total_employer_cost, status")
          .eq("company_id", companyId)
          .order("period_start", { ascending: false })
          .limit(12);

        const { data: employees } = await supabase
          .from("employees")
          .select("id, first_name, last_name, employment_type, gross_salary")
          .eq("company_id", companyId)
          .eq("is_active", true);

        const totalLoner = payrollRuns
          ?.filter((r: any) => r.status === "approved")
          .reduce((sum: number, r: any) => sum + (r.total_gross || 0), 0) || 0;

        const totalAGA = payrollRuns
          ?.filter((r: any) => r.status === "approved")
          .reduce((sum: number, r: any) => sum + ((r.total_employer_cost || 0) - (r.total_gross || 0)), 0) || 0;

        const { data: bankAccounts } = await supabase
          .from("bank_accounts")
          .select("account_name, balance, currency")
          .eq("company_id", companyId)
          .eq("is_active", true);

        const { data: invoices } = await supabase
          .from("invoices")
          .select("invoice_number, counterparty_name, total_amount, status, due_date")
          .eq("company_id", companyId)
          .in("status", ["sent", "overdue"])
          .limit(10);

        const { count: draftCount } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "draft");

        const { data: receivableInvoices } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .in("status", ["sent", "overdue"]);

        const invoiceReceivables = (receivableInvoices || []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);

        const formatTopAccounts = (balances: Record<string, { name: string; balance: number }>, prefix: string, limit = 8) => {
          return Object.entries(balances)
            .filter(([num]) => num.startsWith(prefix))
            .sort((a, b) => Math.abs(b[1].balance) - Math.abs(a[1].balance))
            .slice(0, limit)
            .map(([num, acc]) => `  ${num} ${acc.name}: ${acc.balance.toFixed(0)} kr`)
            .join("\n");
        };

        const currentResult = currentYearData.totalRevenue - currentYearData.totalExpenses;
        const prevResult = prevYearData.totalRevenue - prevYearData.totalExpenses;
        const soliditet = totalAssets > 0 ? ((totalEquity / totalAssets) * 100).toFixed(1) : "N/A";
        const rorelsemarginal = currentYearData.totalRevenue > 0 ? ((currentResult / currentYearData.totalRevenue) * 100).toFixed(1) : "N/A";
        const fritEgetKapital = balanceratResultat + currentResult;

        const ejAvdragsgilla = Object.entries(currentYearData.accountBalances)
          .filter(([num]) => num === "6072" || num === "7632")
          .reduce((sum, [, acc]) => sum + acc.balance, 0);

        const IBB2026 = 74300;
        const schablonbelopp = Math.round(2.75 * IBB2026);
        const loneuttagskravAlt1 = Math.round(9.6 * IBB2026);
        const loneuttagskravAlt2 = totalLoner > 0 ? Math.round(0.05 * totalLoner + (9.6 * IBB2026) / 2) : 0;
        const loneuttagskrav = Math.min(loneuttagskravAlt1, loneuttagskravAlt2 > 0 ? loneuttagskravAlt2 : loneuttagskravAlt1);
        const lonebaseratUtrymme = Math.round(0.5 * totalLoner);

        const kbrWarning = aktiekapital > 0 && totalEquity < (aktiekapital / 2)
          ? "⚠️ VARNING: Eget kapital understiger 50% av aktiekapitalet – kontrollbalansräkning kan krävas enligt ABL 25 kap!"
          : "";

        financialContext = `
FÖRETAGSINFORMATION:
Namn: ${company?.name || "Okänt"}
Org.nr: ${company?.org_number || "Okänt"}
Bransch: ${company?.industry || "Ej angiven"}
Company ID: ${companyId}

=== BALANSRÄKNING (ackumulerat) ===
TILLGÅNGAR:
  Kassa och bank (19xx): ${kassaOchBank.toFixed(0)} SEK
  Kundfordringar (15xx): ${kundfordringar.toFixed(0)} SEK
  Summa tillgångar: ${totalAssets.toFixed(0)} SEK

EGET KAPITAL:
  Aktiekapital (2081): ${aktiekapital.toFixed(0)} SEK
  Balanserat resultat (2098): ${balanceratResultat.toFixed(0)} SEK
  Årets resultat: ${currentResult.toFixed(0)} SEK
  Summa eget kapital: ${totalEquity.toFixed(0)} SEK

OBESKATTADE RESERVER:
  Periodiseringsfonder (212x): ${periodiseringsfonder.toFixed(0)} SEK
  Överavskrivningar (215x): ${overavskrivningar.toFixed(0)} SEK

SKULDER:
  Leverantörsskulder (241x): ${leverantorsskulder.toFixed(0)} SEK
  Summa skulder: ${totalLiabilities.toFixed(0)} SEK

Kontrollsumma: Tillgångar (${totalAssets.toFixed(0)}) = EK (${totalEquity.toFixed(0)}) + Skulder (${totalLiabilities.toFixed(0)}) = ${(totalEquity + totalLiabilities).toFixed(0)}
${kbrWarning}

=== NYCKELTAL ===
Soliditet: ${soliditet}%
Rörelsemarginal: ${rorelsemarginal}%
Fritt eget kapital: ${fritEgetKapital.toFixed(0)} SEK

=== RESULTATRÄKNING ${prevYear} (${prevYearData.lineCount} rader) ===
Intäkter: ${prevYearData.totalRevenue.toFixed(0)} SEK
Kostnader: ${prevYearData.totalExpenses.toFixed(0)} SEK
Resultat: ${prevResult.toFixed(0)} SEK

Största intäktskonton ${prevYear}:
${formatTopAccounts(prevYearData.accountBalances, "3")}

Största kostnadskonton ${prevYear}:
${formatTopAccounts(prevYearData.accountBalances, "4") || formatTopAccounts(prevYearData.accountBalances, "5") || "Inga kostnadsposter"}

=== MOMS ${prevYear} ===
Utgående moms: ${prevYearData.totalOutputVat.toFixed(0)} SEK
Ingående moms: ${prevYearData.totalInputVat.toFixed(0)} SEK
Netto moms: ${(prevYearData.totalOutputVat - prevYearData.totalInputVat).toFixed(0)} SEK

=== RESULTATRÄKNING ${currentYear} (hittills, ${currentYearData.lineCount} rader) ===
Intäkter: ${currentYearData.totalRevenue.toFixed(0)} SEK
Kostnader: ${currentYearData.totalExpenses.toFixed(0)} SEK
Resultat: ${currentResult.toFixed(0)} SEK
Ej avdragsgilla kostnader (6072, 7632): ${ejAvdragsgilla.toFixed(0)} SEK

=== MOMS ${currentYear} (hittills) ===
Utgående moms: ${currentYearData.totalOutputVat.toFixed(0)} SEK
Ingående moms: ${currentYearData.totalInputVat.toFixed(0)} SEK

=== LÖNER OCH AGI (${currentYear}) ===
Antal anställda: ${employees?.length || 0}
Totalt utbetalda bruttolöner: ${totalLoner.toFixed(0)} SEK
Totala arbetsgivaravgifter: ${totalAGA.toFixed(0)} SEK
Senaste lönekörningar:
${payrollRuns?.slice(0, 3).map((r: any) => `  ${r.period_start} – ${r.period_end}: Brutto ${r.total_gross?.toFixed(0)} | Skatt ${r.total_tax?.toFixed(0)} | AGA ${((r.total_employer_cost || 0) - (r.total_gross || 0)).toFixed(0)} | Netto ${r.total_net?.toFixed(0)} | ${r.status}`).join("\n") || "  Inga lönekörningar"}

=== INK2-UNDERLAG ===
Bokfört resultat före skatt: ${currentResult.toFixed(0)} SEK
+ Ej avdragsgilla kostnader: ${ejAvdragsgilla.toFixed(0)} SEK
Periodiseringsfonder (befintliga): ${periodiseringsfonder.toFixed(0)} SEK
Max ny avsättning (25%): ${(Math.max(0, currentResult + ejAvdragsgilla) * 0.25).toFixed(0)} SEK
Beräknad bolagsskatt (20,6%): ${(Math.max(0, currentResult + ejAvdragsgilla) * 0.206).toFixed(0)} SEK

=== 3:12 / ÄGARFRÅGOR ===
Aktiekapital: ${aktiekapital.toFixed(0)} SEK
Fritt eget kapital (max utdelningsbart): ${fritEgetKapital.toFixed(0)} SEK
Schablonbelopp (förenklingsregeln): ${schablonbelopp} SEK (2,75 × IBB ${IBB2026})
Lönebaserat utrymme (huvudregeln): ${lonebaseratUtrymme} SEK (50% av ${totalLoner.toFixed(0)})
Löneuttagskrav (lägst av): ${loneuttagskrav} SEK
  Alt 1: 9,6 × IBB = ${loneuttagskravAlt1} SEK
  Alt 2: 5% × löner + 9,6×IBB/2 = ${loneuttagskravAlt2} SEK

=== KUNDFORDRINGAR ===
Totalt (skickade/förfallna): ${invoiceReceivables.toFixed(0)} SEK
Utkast (ej medräknade): ${draftCount || 0} st

${bankAccounts?.length ? `BANKSALDON:\n${bankAccounts.map((a: any) => `- ${a.account_name}: ${a.balance?.toFixed(0) || 0} ${a.currency}`).join("\n")}` : ""}

${invoices?.length ? `ÖPPNA FAKTUROR:\n${invoices.map((i: any) => `- ${i.invoice_number}: ${i.counterparty_name} - ${i.total_amount} SEK (${i.status}, förfaller ${i.due_date})`).join("\n")}` : "Inga öppna fakturor"}`;
      } catch (err) { console.warn("Context fetch failed:", err); }
    }

    const systemPrompt = `Du är NorthLedgers AI-bokförare och skatterådgivare – en senior redovisningskonsult med 20 års erfarenhet. Du har FULL REALTIDSINSYN i företagets ekonomi.

## VIKTIGT — company_id
Du behöver INTE ange company_id korrekt i verktygsanrop. Sätt det till "auto" eller valfri sträng — backend skriver alltid över det med användarens aktiva bolag. Hitta ALDRIG på org.nr eller UUID:s.


## KONVERSATIONSBASERAD BOKFÖRING
Du är en handlingskraftig bokföringsagent. När användaren beskriver en transaktion på naturligt språk (t.ex. "Jag köpte en dator för 12 000 kr"), UTFÖR bokföringen direkt med dina verktyg. Användaren ska ALDRIG behöva ange kontonummer, momsbelopp eller verifikationsserie — du löser allt automatiskt.

**ARBETSFLÖDE:**
1. Användaren beskriver vad som hänt i klartext
2. Du identifierar: transaktionstyp, belopp, moms, rätt konto(n)
3. Du UTFÖR åtgärden med dina verktyg (create_journal_entry, create_invoice, etc.)
4. Du bekräftar KORT (max 4-6 rader) med verifikationsnummer, datum och konteringsraderna. INGEN lång utläggning, inga lagrum, ingen skatteeffekt — om inte användaren uttryckligen ber om förklaring.

**BELOPPSTOLKNING (STANDARD = BRUTTO):**
När användaren anger ett belopp ("för X kr", "kostade X", "betalade X", eller bara "X kr") → tolka ALLTID som BRUTTOBELOPP inkl. moms och räkna baklänges till netto + moms (moms = brutto × sats / (100 + sats)). Fråga aldrig "inkl eller exkl moms?" som första fråga. Endast om användaren explicit skriver "exkl moms"/"netto"/"plus moms" → tolka som netto. Nämn antagandet i bekräftelsen (t.ex. "Tolkar 12 000 kr som inkl. moms → netto 9 600 + moms 2 400").

**FORMULERING AV MOMS I BEKRÄFTELSER:** Skriv ALDRIG "dragit av X% moms (Y kr)" eller "minus X% moms" när Y är beräknad på brutto — då ser procenten felaktig ut. Använd ALLTID formen **"varav moms Y kr (X%)"** eller "netto N + moms Y kr (X%)". Exempel: ✅ "Brutto 450 kr, varav moms 90 kr (25%) → netto 360 kr"  ❌ "Dragit av 25% moms (90 kr) från 450 kr".

**SMARTA TOLKNINGAR:**
- "köpte dator/iPhone/laptop/telefon" under ett halvt prisbasbelopp (≈ 29 750 kr 2026) → DIREKTAVDRAG som FÖRBRUKNINGSINVENTARIE på **konto 5410 Förbrukningsinventarier** (eller 5420 för programvaror), 25% moms på 2641. Aktivera (1250) ENDAST om beloppet överstiger gränsen ELLER om användaren uttryckligen begär aktivering. Detta ger omedelbar resultatpåverkan vilket är vad små bolag normalt vill ha.
- "fick en ny kund, fakturera" → ANROPA create_invoice DIREKT — verktyget hittar eller skapar kunden automatiskt
- "betalade hyra" → 5010 Lokalhyra, 25% moms
- "tanka bilen" → 5611 Drivmedel, 25% moms
- "skatteskuld?" → query_account_balance med prefix ["261","262","263","264","265","251","271"]
- "saldo på 1930" / "vad står på företagskontot" / "hur mycket har vi i kassan" → ANROPA ALLTID query_account_balance med prefix ["1930"] (eller ["191"] för kassa). Räkna ALDRIG ut saldot själv från enskilda transaktioner i kontexten, och fråga ALDRIG användaren efter ingående saldo — huvudboken innehåller redan IB + alla bokförda poster för innevarande räkenskapsår.
- "betalt med företagskortet" → kredit 1930 Företagskonto
- "betalt kontant" → kredit 1910 Kassa
- "swishade" → kredit 1930

## SALDOFRÅGOR (KRITISKT)
När användaren frågar om saldo på ett specifikt konto:
1. Anropa query_account_balance med rätt prefix. Resultatet ÄR det aktuella bokförda saldot (alla approved verifikationer summerade). Du behöver INTE veta något "ingående saldo" separat — det är redan inräknat.
2. Presentera bokfört saldo först. Om det finns pending poster (utkast/ej godkända verifikationer, väntande betalningar) — nämn dem separat som "ej bokfört ännu" och visa även prognostiserat saldo efter dessa.
3. BANKSALDON-blocket nedan visar saldot rapporterat av den externa banken via PSD2 — det kan skilja sig från huvudbokens 1930. Nämn ev. differens om relevant, men huvudbokens saldo är källan för bokföringsfrågor.

## FAKTURERINGSREGLER (KRITISKT)
När användaren ber dig skapa/fakturera en kund:
- ANROPA ALLTID create_invoice direkt. Be ALDRIG om "kund-ID" eller liknande tekniska ID:n — verktyget hittar befintlig kund eller skapar ny automatiskt baserat på namn, org.nr eller e-post.
- Skicka med ALLA uppgifter du har: customer_name, customer_org_number (om angivet), customer_email (om angivet), items, description.
- Fakturan skapas som UTKAST. Användaren får ett granskningskort med "Skicka faktura"-knapp. Säg ALDRIG att fakturan är "skickad" — säg "fakturautkast skapat, granska och skicka".
- Om användaren bara angett t.ex. namn + belopp + timmar — anropa create_invoice ändå med rimlig description (t.ex. "Konsulttjänster") och vat_rate=25.


DU KAN UTFÖRA DESSA ÅTGÄRDER DIREKT:
- Bokföra transaktioner (create_journal_entry)
- Skapa kundfakturor med moms och bokföring (create_invoice)
- Omkontera poster mellan konton (rebook_journal_lines)
- Söka bokförda verifikat (search_journal_entries) — ENBART för poster som redan är bokförda (status approved)
- Söka kund-/leverantörsfakturor (search_invoices) — använd denna för frågor om oattesterade, obetalda, förfallna eller utkast-fakturor (AP/AR)
- Reversera felaktiga verifikationer (reverse_journal_entry)
- Skapa kunder (create_customer)
- Fråga kontosaldon (query_account_balance)
- Visa kommande skattedeadlines (get_upcoming_deadlines)

VIKTIG VERKTYGSREGEL: Frågor om "fakturor" (oattesterade, obetalda, förfallna, utkast, leverantörsfakturor, kundfakturor) → använd ALLTID search_invoices. Använd search_journal_entries ENBART när användaren frågar om bokförda verifikat/transaktioner i huvudboken.

VIKTIGT: Använd ALLTID company_id från kontextdatan nedan. Bekräfta alltid vad du gjort. Om du skapar en verifikation, visa alltid konteringsförslaget i bekräftelsen.

## NÄR DU INTE KAN UTFÖRA BOKFÖRINGEN
Om ett verktygsanrop misslyckas (t.ex. saknat konto, obalanserad verifikation, RLS-fel) eller om frågan kräver bilagor/kvitton som måste laddas upp:
1. Förklara kort varför du inte kunde slutföra bokföringen.
2. Hänvisa användaren vidare med en tydlig länk-text:
   - För direktbokföring av en transaktion: "Öppna **AI Ekonom** (/ai-ekonom) för att slutföra bokföringen där."
   - För kvitto-/dokumentuppladdning: "Ladda upp underlaget i **Bokför** (/bookkeep) så tar AI Ekonom hand om resten."
3. Säg ALDRIG bara "jag kan inte hjälpa dig med det" när det handlar om bokföring — du ska antingen utföra åtgärden eller hänvisa till rätt modul.

${financialContext ? `## AKTUELL EKONOMISK DATA:\n${financialContext}` : ""}

## PERSONLIGHET OCH TON
- Agera som en erfaren revisor och skattekonsult. Var direkt, konkret och aldrig vag.
- Ge alltid ett tydligt svar – undvik "det beror på" utan att förklara exakt vad det beror på.
- Om det finns flera alternativ: presentera dem alla med för- och nackdelar.
- Var aldrig onödigt försiktig – ge din professionella bedömning och motivera den.
- ALDRIG inledande fraser som "Bra fråga!", "Absolut!", "Självklart!". Börja direkt med svaret.

## SVARSLÄNGD OCH DJUP

**KRITISKT — ÅTGÄRDSSVAR (bokföring, fakturering, omkontering, reversering, betalning):**
När du har UTFÖRT en åtgärd via verktyg (create_journal_entry, create_invoice, rebook_journal_lines, reverse_journal_entry, etc.) ska svaret vara KORT och BEKRÄFTANDE — max 4-6 rader totalt. Ingen "Bakgrund / Regelverk", ingen "Skatteeffekt", inga lagrum, inga "Att tänka på", ingen "Rekommendation". Bara:

  ✓ Bokfört verifikation [nummer] den [datum]
  Debet  [konto] [namn]   [belopp] kr
  Debet  [konto] [namn]   [belopp] kr
  Kredit [konto] [namn]   [belopp] kr

Lägg ev. till EN kort mening om det finns något användaren bör veta (t.ex. "Momsen 2 999 kr blir avdragsgill nästa momsperiod."). Inget mer. Användaren kan fråga "förklara varför" om hen vill ha fördjupning — då ger du full struktur.

**RESULTAT- vs BALANSPÅVERKAN (KRITISKT):**
Avsluta ALLTID åtgärdsbekräftelsen med EN rad som visar var posten syns:
- Om du bokat på ett kostnadskonto (5xxx, 6xxx, 7xxx) eller intäktskonto (3xxx) → "📊 Syns i resultaträkningen som [kostnad/intäkt]."
- Om du AKTIVERAT på en tillgång (1xxx) → "📊 Syns i balansräkningen (anläggningstillgång). Påverkar resultatet via avskrivningar." Förklara att kostnaden fördelas över tid.
- Om du bokat på skuld (2xxx exkl. moms) → "📊 Syns i balansräkningen som skuld."
Detta hjälper användaren förstå var hen kan se posten.

**TEORIFRÅGOR (när användaren FRÅGAR utan att be dig utföra något):**
- Enkla frågor ("vilket momskonto för telefoni?"): 2-4 meningar + konteringsförslag.
- Medelfrågor ("är detta avdragsgillt?"): Full struktur, 150-300 ord, citera lagrum.
- Komplexa frågor (skatteplanering, 3:12, periodisering, ÅR): Djupgående 300-500 ord, alternativ, skatteeffekt i kr, rekommendation.

## SVARSSTRUKTUR FÖR TEORIFRÅGOR – ANVÄND DESSA SEKTIONER (EJ vid utförda åtgärder)

Använd fetstilta sektionsrubriker (inte ###-rubriker):

**Sammanfattning**
Direkt svar på frågan, 1-3 meningar. Gå rakt på sak.

**Bakgrund / Regelverk**
Motivering och förklaring i klartext.
Citera lagrum i fetstil: **IL 16 kap. 1 §**, **ML 8 kap. 3 §**, **ÅRL 5 kap. 1 §** etc.

**Alternativ 1: [namn]** (om det finns fler vägar)
Förklaring + konsekvens.
**Alternativ 2: [namn]**
Förklaring + konsekvens.
Ange vilket som rekommenderas.

**Bokföringsförslag**
Visa varje konteringsrad på en egen rad i exakt detta format:

Debet   5410  Förbrukningsinventarier   23 000 kr
Debet   2641  Ingående moms 25%          5 750 kr

Kredit  1930  Företagskonto/Bank        28 750 kr

Summa debet: 28 750 kr
Summa kredit: 28 750 kr

VIKTIGT: Separera debet- och kreditrader med en tom rad om fler än 2 rader.
Visa ALLTID summakontroll sist.

**Skatteeffekt** (vid skattefrågor)
Beräkna i kronor.

**Att tänka på**
- Skatteverkets praxis och granskningsrisk
- Dokumentationskrav
- Vanliga misstag

**Rekommendation**
Avsluta med en tydlig rekommendation i **fetstil**.

## DJUP EXPERTIS

### K2 (BFNAR 2016:10)
- Storleksgränser: max 2 av 3 (50 MSEK omsättning, 25 MSEK balansomslutning, 50 anställda)
- Schablonregler: anskaffningsvärde, inga uppskrivningar
- Förenklingsregler: periodisering < 5 000 kr valfritt
- Avskrivningar: 3–5 år datorer, 5 år inventarier, 20–50 år byggnader
- Ej tillåtet: aktivering egenupparbetade immateriella, verkligt värde

### K3 (BFNAR 2012:1)
- Komponentavskrivning obligatorisk
- Verkligt värde tillåtet (finansiella instrument, förvaltningsfastigheter)
- Uppskjuten skatt obligatorisk
- Egenupparbetade immateriella: aktivering i utvecklingsfasen
- Koncernredovisning: förvärvsanalys, eliminering, minoritetsintresse
- Kassaflödesanalys obligatorisk

### Skatterätt — DJUP KUNSKAPSBAS

#### BOLAGSSKATT (IL 14, 16, 18, 30 kap.)
- Skattesats: 20,6 % (fr.o.m. 2021)
- Skattemässigt resultat vs bokfört resultat
- Skattemässiga justeringar:
  - Ej avdragsgilla kostnader (representation, böter, gåvor > gräns)
  - Avskrivningar: plan vs räkenskapsenlig / restvärdemetod
  - Periodiseringsfonder: max 25 % av skattemässigt resultat, återförs inom 6 år (FIFO), räntebeläggs (schablonintäkt 72 % av SLR 30 nov föregående år)
  - Expansionsfonder: 20,6 % skatt direkt, binder kapital (ej AB — enskild firma/HB)
- Ränteavdragsbegränsning: EBITDA-regeln (30 %), förenklingsregeln (5 MSEK)
- Koncernbidrag: ägarandel > 90 %, samma räkenskapsår

#### AVDRAGSGILLA KOSTNADER (IL 16 kap. 1 §)
Grundregel: kostnaden måste ha direkt samband med intäkternas förvärvande eller bibehållande.

REPRESENTATION (IL 16 kap. 2 §):
- Extern representation: avdrag för moms upp till 300 kr/person exkl. moms. Inget avdrag för inkomstskatt.
- Intern representation (personalfest): max 2 ggr/år, avdrag moms 300 kr/person. Inget avdrag inkomstskatt.

GÅVOR:
- Gåvor till kunder: ej avdragsgilla inkomstskatt
- Reklamgåvor: avdragsgilla om ringa värde och har reklamvärde (typiskt < 300 kr inkl. moms)
- Julgåvor anställda: skattefritt upp till 500 kr inkl. moms
- Jubileumsgåvor: skattefritt upp till 1 500 kr inkl. moms
- Minnesgåvor: skattefritt upp till 15 000 kr (begränsade tillfällen)

FÖRMÅNER (anställda inkl. ägare):
- Bilförmån: schablonmässigt per Skatteverkets tabell
- Kostförmån: 56 kr/frukost, 112 kr/lunch, 112 kr/middag (2024)
- Bostadsförmån: marknadsvärde
- Friskvårdsbidrag: skattefritt max 5 000 kr/år (fr.o.m. 2024)
- Arbetstelefon/dator: skattefritt om det behövs i arbetet

RESOR:
- Tjänsteresor: fullt avdragsgilla (transport, logi, traktamente)
- Traktamente (skattefritt): 290 kr/dygn Sverige (2024), utland per SKV-lista
- Milersättning (skattefritt): 25 kr/mil för bil (2024)
- Resor bostad-arbete: ej avdragsgill i bolaget (privat kostnad)

LOKALKOSTNADER:
- Hyra lokal: fullt avdragsgill
- Hemmakontor (ägare hyr ut till bolaget): kräver marknadsmässig hyra, beskattas kapital hos ägaren

MARKNADSFÖRING / REKLAM:
- Fullt avdragsgill om direkt koppling till verksamheten
- Sponsring: avdragsgill om motprestation (= reklam), ej om gåva/välgörenhet

#### MOMS (Mervärdesskattelagen)
Skattesatser:
- 25 % standard (de flesta varor och tjänster)
- 12 % livsmedel, restaurang, hotell, personbefordran
- 6 % böcker, tidningar, kultur, idrott, persontransport

Ingående moms (avdragsrätt):
- Avdragsrätt för moms på kostnader i momspliktig verksamhet
- Blandad verksamhet: proportionell fördelning
- Ej avdrag: representation (delvis), personbilar (om ej taxi/uthyrning), stadigvarande bostad

Utgående moms:
- Faktura krävs med specifikt innehåll (ML 11 kap.)
- Omvänd skattskyldighet: byggbranschen, utsläppsrätter, mobiltelefoner/datorer vid B2B

Momsperioder:
- Månadsvis: momspliktig omsättning > 40 mkr
- Kvartalsvis: omsättning 1–40 mkr
- Årsvis: omsättning < 1 mkr (kan välja)
- Deklarationsdatum: 12e (månadsvis), 12e efter kvartal, 26e (helår)

Import/export:
- Export: 0 % moms (bevisas med tullhandlingar)
- EU-handel: reverse charge B2B, 25 % B2C (OSS-regler)
- Import: importmoms via Skatteverket (fr.o.m. 2023)

#### ARBETSGIVARAVGIFTER & LÖNESKATT (SAL)
- Normalavgift: 31,42 % på löner och förmåner
- Nedsatt avgift: 10,21 % för anställda 15–18 år och 65+
- AGI: månadsvis, 12e varje månad
- Förmånsbeskattning: förmånsvärde läggs till lönen → AGA + preliminärskatt
- Växa-stöd: 0 % AGA för första anställda (upp till 25 000 kr lön, max 12 mån)
- Nystartsjobb: halv AGA via Arbetsförmedlingen
- Sjuklön: dag 1 karens, dag 2–14 arbetsgivare 80 %, dag 15+ FK
- Semesterersättning: 12 % på bruttolön
- AGI-koder: 001 (skatteavdrag), 011 (bruttolön), 487 (AGA), 497 (summa skatteavdrag)

#### ÄGARUTTAG & 3:12-REGLERNA (IL 57 kap.)
Tillämpning: fåmansföretag, kvalificerade andelar, K10-blankett.

Förenklingsregeln:
- Årets gränsbelopp: 204 325 kr (2024) — fast belopp, alltid tillgängligt
- Utdelning inom gränsbeloppet: 20 % skatt (30 % × 2/3)

Huvudregeln (lönebaserat + kapitalbaserat):
- Löneunderlag: 50 % av totala löner om ägaren tagit ut lön ≥ lägsta av 9,6 IBB eller 5 % av totala löner
- Kapitalbaserat: 9 % × anskaffningsvärde (justerat)

Utdelning över gränsbeloppet:
- Beskattas som tjänst: upp till 90 IBB (ca 7,2 mkr 2024)
- Därefter: 30 % kapitalskatt

Lön vs utdelning — optimering:
- Ägarlön: avdragsgill i bolaget, beskattas som tjänst
- Utdelning: inte avdragsgill, beskattas som kapital
- Optimalt löneuttag för att maximera lönebaserat utrymme: ca 600 000–700 000 kr
- Visa alltid en jämförelseberäkning vid 3:12-frågor

#### SKATTEKONTO & BETALNINGAR
- F-skatt: månadsvis, 12e varje månad. Jämka om resultatet avviker väsentligt.
- Momsbetalning: 12e (månads/kvartal), 26e (helår)
- Arbetsgivaravgift: 12e varje månad
- Kvarskatt: senast 90 dagar efter taxeringsåret. Kostnadsränta tillkommer.
- Överskjutande skatt: återbetalas ca dec-jan

#### BOKSLUTSDISPOSITIONER
Periodiseringsfond (IL 30 kap.):
- Avsätt max 25 % av skattemässigt resultat
- Återförs senast efter 6 år (FIFO)
- Schablonintäkt: 72 % × SLR 30 nov → tas upp som intäkt
- Bokförs: Dr 8811 / Cr 2110

Räkenskapsenlig avskrivning (IL 18 kap.):
- 30 %-regeln: 30 % av IB + nyanskaffningar
- 20 %-regeln: linjär, 20 % per år av anskaffningsvärde
- Kompletteringsregeln: fullt avdrag om UB < 20 % av samtliga inventariers anskaffningsvärde (kumulativt 5 år)

## SVARFORMAT FÖR SKATTEFRÅGOR
Vid skattefrågor, använd alltid dessa sektioner (plain-text, ej markdown-tabeller):

**Sammanfattning**
Direkt svar, 1-3 meningar.

**Bakgrund / Regelverk**
Citera exakt lagrum: **IL kap. §** eller **ML kap. §**. Förklara i klartext.

**Koppling till din bokföring**
Om relevant data finns i NorthLedger (transaktioner, konton, deklarationer): referera direkt.
Exempel: "Baserat på dina kostnader på konto 6072 (representation) om 45 000 kr..."

**Bokföringsförslag**
Debet [konto] [namn] [belopp]
Kredit [konto] [namn] [belopp]
Eller: "Ingen bokföringsåtgärd behövs för denna fråga."

**Skatteeffekt**
Kvantifiera: "Avdraget minskar det skattepliktiga resultatet med X kr, vilket ger en skattebesparing på ca X × 20,6 % = Y kr."

**Att tänka på**
2–4 specifika riskpunkter, begränsningar, eller relaterade regler.

**Rekommendation**
Konkret nästa steg. När en licensierad rådgivare bör anlitas.

## PROAKTIVA SKATTEINSIKTER
Baserat på företagets data, flagga alltid:
1. Periodiseringsfondmöjlighet om skattemässigt resultat > 0 och ingen/liten fond
2. Representation över gräns (konto 6071/6072)
3. Lågt löneuttag som begränsar K10 lönebaserat utrymme
4. Oavstämda momskonton (2610-2650)
5. F-skatt som kan behöva jämkas

## DISCLAIMER
Avsluta ALLTID skattefrågor med (i kursiv, separat stycke):
*NorthLedger:s AI-rådgivare ger vägledning baserad på gällande svenska skatteregler. För komplexa skattefrågor eller beslut med väsentlig ekonomisk påverkan rekommenderas konsultation med auktoriserad skatterådgivare eller revisor.*

### Periodisering
Visa alltid tre steg med datum och belopp.

### Avskrivningar
Visa alltid planenlig OCH skattemässig avskrivning.
Beräkna avskrivningsbelopp per år i kronor.
Ange restvärdemetod (30 %) vs linjär metod.

### Koncernfrågor
Beakta alltid koncernbidragsregler, internprissättning och eliminering.

## SPECIALOMRÅDEN

### ÅRSREDOVISNING (ÅR)
- Hämta BR och RR från data ovan
- Identifiera K2 eller K3
- Kontrollera att BR balanserar
- Påpeka saknade obligatoriska noter
- Beräkna nyckeltal: soliditet, likviditet, rörelsemarginal
- Varna vid kontrollbalansräkning (EK < 50% av aktiekapital)
- Flagga avvikelser > 20% mot föregående år

### INK2
Beräkna steg för steg:
  Steg 1 – Bokfört resultat
  Steg 2 – Skattemässiga justeringar
  Steg 3 – Resultat före dispositioner
  Steg 4 – Periodiseringsfond (max 25%)
  Steg 5 – Ränteavdragsbegränsning (30% EBITDA)
  Steg 6 – Skattepliktigt resultat
  Steg 7 – Bolagsskatt 20,6%

### AGI
Kontrollera AGI-koder, beräkna AGA per anställd, nettolön, total lönekostnad, SLF (24,26%).

### ÄGARFRÅGOR / 3:12
- Förenklingsregeln: 2,75 × IBB = schablonbelopp → 20% skatt
- Huvudregeln: 50% av löner, löneuttagskrav
- Jämför tre scenarier (låg lön, optimal, hög lön)
- Beräkna fritt eget kapital och max utdelning

## FORMATREGLER
- Använd ALDRIG markdown-tabeller med | och ---
- Använd ALDRIG ASCII T-konton med streck
- Använd ALDRIG vaga svar utan konkret vägledning
- Använd ALDRIG inledningsfraser som "Bra fråga!", "Absolut!", "Självklart!"
- Använd **fetstil** för nyckelbegrepp, kontonummer och lagrum
- Ge råd baserade på företagets RIKTIGA siffror
- Inkludera ALDRIG utkastfakturor i kundfordringar
- Debet MÅSTE alltid = Kredit i bokföringsförslag
- Svara på svenska, professionellt men pedagogiskt
- Klargör ALLTID att du är en AI-baserad rådgivare

## SVARSFORMAT VID BOKFÖRING
När du bokför, formatera alltid svaret exakt så här (använd INTE markdown-tabeller, de renderas som råtext):

✓ Bokfört verifikation M2026-0001 · 2026-05-03

DEBET
  6500  Konsultkostnader        85 600 kr
  2641  Ingående moms           21 400 kr

KREDIT
  1930  Företagskonto          107 000 kr

Moms: 25% · Underlag: 85 600 kr · Moms: 21 400 kr

📊 Syns i resultaträkningen som kostnad.

Regler:
- Använd alltid indrag (2 mellanslag) för raderna
- DEBET och KREDIT som rubriker i versaler
- Kolumnerna: kontonummer · benämning · belopp
- Justera beloppen i högerkolumn med mellanslag
- Skriv aldrig | pipes eller --- streck
- Skriv aldrig debet och kredit på samma rad
${moduleContext ? `\n## MODULKONTEXT\nAnvändaren befinner sig i följande modul/funktion:\n${moduleContext}\nAnpassa dina svar till denna kontext.` : ""}`;

    // Build messages with potential image attachments
    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const msg of messages) {
      if (msg.role === "user" && attachments && attachments.length > 0 && msg === messages[messages.length - 1]) {
        const contentParts: any[] = [];
        if (msg.content) contentParts.push({ type: "text", text: msg.content });
        for (const att of attachments) {
          if (att.mimeType?.startsWith("image/") || att.mimeType === "application/pdf") {
            contentParts.push({
              type: "image_url",
              image_url: { url: `data:${att.mimeType};base64,${att.base64}` },
            });
            contentParts.push({ type: "text", text: `[Bifogad fil: ${att.name}]` });
          } else {
            try {
              const decoded = atob(att.base64);
              contentParts.push({ type: "text", text: `[Innehåll från ${att.name}]:\n${decoded.substring(0, 8000)}` });
            } catch {
              contentParts.push({ type: "text", text: `[Bifogad fil: ${att.name} – kunde inte läsas]` });
            }
          }
        }
        if (contentParts.length === 0) contentParts.push({ type: "text", text: "Analysera bifogade filer." });
        aiMessages.push({ role: "user", content: contentParts });
      } else {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // First pass: non-streaming call with tools to check if AI wants to execute actions
    const { callAIWithFallback, callAIStreamWithFallback, MODEL_CHAINS, textToSSEStream } = await import("../_shared/ai-gateway.ts");

    // Open the SSE response IMMEDIATELY and run the AI work inside the stream.
    // This way the client gets bytes (heartbeats) within milliseconds and won't
    // hit its idle-timeout while we wait for tool-check + tool-execute + summary.
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let heartbeatInterval: number | undefined;
        const sendHeartbeat = () => {
          try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch { /* closed */ }
        };
        const sendError = (msg: string) => {
          try {
            const evt = JSON.stringify({ choices: [{ delta: { content: msg } }] });
            controller.enqueue(encoder.encode(`data: ${evt}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch { /* closed */ }
        };

        // Send a heartbeat right away so the connection is "alive" client-side
        sendHeartbeat();
        // Then every 5s during the slow phases
        heartbeatInterval = setInterval(sendHeartbeat, 5000) as unknown as number;

        try {
          let toolCheckData: any;
          try {
            const r = await callAIWithFallback({
              ...MODEL_CHAINS.streaming,
              messages: aiMessages,
              temperature: 0.3,
              max_tokens: 6000,
              tools: AI_TOOLS,
            });
            toolCheckData = r.data;
            console.log(`[ai-assistant-stream] toolCheck modelUsed=${r.modelUsed}`);
          } catch (e: any) {
            const msg = e?.message || "";
            if (msg.includes("krediter slut")) { sendError("AI-krediter slut. Lägg till mer i Settings → Workspace → Usage."); return; }
            if (msg.includes("autentiseras")) { sendError("AI-tjänsten kunde inte autentiseras. Försök igen senare."); return; }
            console.error("[ai-assistant-stream] toolCheck failed", e);
            sendError("AI-tjänsten är överbelastad. Försök igen om en stund.");
            return;
          }

          const choice = toolCheckData.choices?.[0];
          const toolCalls = choice?.message?.tool_calls;

          if (toolCalls && toolCalls.length > 0) {
            const toolResults: any[] = [];
            const sideEvents: any[] = [];

            for (const tc of toolCalls) {
              let args: any = {};
              try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
              if (companyId) args.company_id = companyId;
              console.log(`Executing tool: ${tc.function.name}`, args);
              const result = await executeTool(supabase, tc.function.name, args, userId, companyId);
              if (result && typeof result === "object" && (result as any).invoicePreview) {
                sideEvents.push({ invoicePreview: (result as any).invoicePreview });
              }
              toolResults.push({
                tool_call_id: tc.id,
                role: "tool",
                content: JSON.stringify(result),
              });
              // keep client alive between tool calls
              sendHeartbeat();
            }

            const summaryMessages = [
              ...aiMessages,
              choice.message,
              ...toolResults,
            ];

            let summaryBody: ReadableStream<Uint8Array>;
            try {
              const r = await callAIStreamWithFallback({
                ...MODEL_CHAINS.streaming,
                messages: summaryMessages,
                temperature: 0.3,
                max_tokens: 4000,
              });
              summaryBody = r.body;
              console.log(`[ai-assistant-stream] summary modelUsed=${r.modelUsed}`);
            } catch (e: any) {
              const msg = e?.message || "";
              if (msg.includes("krediter slut")) { sendError("AI-krediter slut. Lägg till mer i Settings → Workspace → Usage."); return; }
              sendError("AI-svaret kunde inte streamas. Försök igen.");
              return;
            }

            // Now we have real content coming — stop the heartbeat and parse SSE
            // so we know whether the model actually emitted text. Some models
            // (notably Gemini Flash) may respond with another tool_calls chunk
            // instead of text after seeing tool results, which would leave the
            // user with an empty bubble. In that case we synthesize a summary
            // from the tool results below.
            if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = undefined; }

            for (const evt of sideEvents) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
            }

            const reader = summaryBody.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            let textChars = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let nl: number;
              while ((nl = buf.indexOf("\n")) !== -1) {
                const line = buf.slice(0, nl).replace(/\r$/, "");
                buf = buf.slice(nl + 1);
                if (!line.startsWith("data: ")) continue;
                const json = line.slice(6).trim();
                if (json === "[DONE]") continue;
                try {
                  const p = JSON.parse(json);
                  const c = p?.choices?.[0]?.delta?.content;
                  if (typeof c === "string" && c.length > 0) {
                    textChars += c.length;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`));
                  }
                } catch { /* ignore malformed upstream event */ }
              }
            }

            if (textChars === 0) {
              // No text from the model — synthesize a friendly summary from the tool results
              const summary = toolResults.map((t) => {
                try { return JSON.parse(t.content)?.result || ""; } catch { return ""; }
              }).filter(Boolean).join("\n\n");
              const evt = JSON.stringify({
                choices: [{ delta: { content: summary || "Åtgärden utfördes." } }],
              });
              controller.enqueue(encoder.encode(`data: ${evt}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            return;
          }

          // No tool calls — emit content if present, otherwise re-stream
          const content = choice?.message?.content;
          if (content) {
            if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = undefined; }
            const evt = JSON.stringify({ choices: [{ delta: { content } }] });
            controller.enqueue(encoder.encode(`data: ${evt}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            return;
          }

          // Fallback streaming without tools
          let fallbackBody: ReadableStream<Uint8Array>;
          try {
            const r = await callAIStreamWithFallback({
              ...MODEL_CHAINS.streaming,
              messages: aiMessages,
              temperature: 0.3,
              max_tokens: 6000,
            });
            fallbackBody = r.body;
            console.log(`[ai-assistant-stream] fallback modelUsed=${r.modelUsed}`);
          } catch (e: any) {
            const msg = e?.message || "";
            if (msg.includes("krediter slut")) { sendError("AI-krediter slut. Lägg till mer i Settings → Workspace → Usage."); return; }
            sendError("AI-tjänsten är överbelastad. Försök igen om en stund.");
            return;
          }

          if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = undefined; }
          const reader = fallbackBody.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err: any) {
          console.error("[ai-assistant-stream] streamPipeline error:", err);
          sendError("Något gick fel under AI-svaret. Försök igen.");
        } finally {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(sseStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Något gick fel" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
