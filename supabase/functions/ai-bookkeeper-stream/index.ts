import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const inputSchema = z.object({
  message: z.string().min(1).max(10000),
  companyId: z.string().uuid(),
  attachments: z.array(z.object({
    id: z.string(), name: z.string(), type: z.string(),
    url: z.string().url().optional(), status: z.string()
  })).optional().default([]),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  })).optional().default([])
});

async function getCompanyContext(supabase: any, companyId: string) {
  const [companyRes, accountsRes, recentRes, learningRes, invoicesRes, bankRes, employeesRes, vatRes, assetsRes, unbookedDocsRes, pendingEntriesRes, recentBankTxRes, unmatchedBankTxRes, expensesRes] = await Promise.all([
    supabase.from("companies").select("name, org_number, vat_period_type, fiscal_year_start, fiscal_year_end, accounting_framework, company_type, registered_for_fskatt, eu_vat_liable, num_employees, industry, business_description, country, currency, vat_number, bankgiro, plusgiro, bank_name, address").eq("id", companyId).maybeSingle(),
    supabase.from("chart_of_accounts").select("account_number, account_name, account_type, vat_code")
      .eq("company_id", companyId).eq("is_active", true).limit(200),
    supabase.from("journal_entries")
      .select("description, entry_date, journal_entry_lines(debit, credit, chart_of_accounts(account_number, account_name))")
      .eq("company_id", companyId).eq("status", "approved").order("created_at", { ascending: false }).limit(15),
    Promise.resolve().then(() => supabase.rpc("get_ai_learning_data", { _company_id: companyId, _limit: 30 })).catch(() => ({ data: null })),
    supabase.from("invoices").select("id, invoice_number, customer_name, total_amount, status, due_date, invoice_type, invoice_date")
      .eq("company_id", companyId).order("created_at", { ascending: false }).limit(20),
    supabase.from("bank_accounts").select("bank_name, account_name, balance, currency, is_active")
      .eq("company_id", companyId).eq("is_active", true),
    supabase.from("employees").select("id, first_name, last_name, employment_type, monthly_salary, is_active")
      .eq("company_id", companyId).eq("is_active", true).limit(50),
    supabase.from("vat_periods").select("period_start, period_end, status, total_vat_to_pay")
      .eq("company_id", companyId).order("period_start", { ascending: false }).limit(4),
    supabase.from("fixed_assets").select("name, acquisition_value, current_book_value, depreciation_method, status")
      .eq("company_id", companyId).eq("status", "active").limit(20),
    // Documents that are uploaded but NOT yet booked
    supabase.from("documents").select("id, file_name, document_type, total_amount, vendor_name, document_date, status, created_at")
      .eq("company_id", companyId).is("journal_entry_id", null)
      .order("created_at", { ascending: false }).limit(30).then((r: any) => r).catch(() => ({ data: [] })),
    // Journal entries waiting for approval
    supabase.from("journal_entries").select("id, description, entry_date, status, ai_confidence")
      .eq("company_id", companyId).in("status", ["draft", "pending_approval"])
      .order("created_at", { ascending: false }).limit(20).then((r: any) => r).catch(() => ({ data: [] })),
    // Recent bank transactions
    supabase.from("bank_transactions").select("id, transaction_date, amount, description, counterparty_name, status, ai_confidence")
      .eq("company_id", companyId).order("transaction_date", { ascending: false }).limit(25).then((r: any) => r).catch(() => ({ data: [] })),
    // Unmatched/unbooked bank transactions
    supabase.from("bank_transactions").select("id, transaction_date, amount, description, counterparty_name, status")
      .eq("company_id", companyId).in("status", ["pending", "unmatched", "needs_review"])
      .order("transaction_date", { ascending: false }).limit(20).then((r: any) => r).catch(() => ({ data: [] })),
    // Expense claims pending
    supabase.from("expense_claims").select("id, description, amount, expense_date, category, status")
      .eq("company_id", companyId).in("status", ["pending", "submitted", "draft"])
      .order("expense_date", { ascending: false }).limit(20).then((r: any) => r).catch(() => ({ data: [] })),
  ]);

  // Live cash from huvudboken (1xxx, focus 19xx) — single source of truth.
  // Replaces stale bank_accounts.balance for AI reasoning.
  let liveCash19xx: Record<string, { name: string; net: number }> = {};
  try {
    const { data: cashLines } = await supabase
      .from("journal_entry_lines")
      .select(`debit, credit, account:chart_of_accounts!inner(account_number, account_name), journal_entry:journal_entries!inner(status, company_id)`)
      .eq("journal_entry.company_id", companyId)
      .in("journal_entry.status", ["approved", "posted"])
      .limit(20000);
    for (const l of cashLines || []) {
      const acc = (l as any).account;
      const num = acc?.account_number || "";
      if (!num.startsWith("19")) continue;
      if (!liveCash19xx[num]) liveCash19xx[num] = { name: acc?.account_name || "", net: 0 };
      liveCash19xx[num].net += Number((l as any).debit || 0) - Number((l as any).credit || 0);
    }
  } catch (e) {
    console.error("live cash query failed", e);
  }

  return {
    company: companyRes.data,
    accounts: accountsRes.data || [],
    recent: recentRes.data || [],
    learning: learningRes.data || [],
    invoices: invoicesRes.data || [],
    bankAccounts: bankRes.data || [],
    employees: employeesRes.data || [],
    vatPeriods: vatRes.data || [],
    fixedAssets: assetsRes.data || [],
    unbookedDocs: unbookedDocsRes.data || [],
    pendingEntries: pendingEntriesRes.data || [],
    recentBankTx: recentBankTxRes.data || [],
    unmatchedBankTx: unmatchedBankTxRes.data || [],
    pendingExpenses: expensesRes.data || [],
    liveCash19xx,
  };
}

function buildSystemPrompt(ctx: any, recentlyCreated: boolean, companyId: string) {
  const accountsList = ctx.accounts.map((a: any) =>
    `${a.account_number}: ${a.account_name} (${a.account_type}${a.vat_code ? `, moms: ${a.vat_code}` : ''})`
  ).join("\n") || "Inga konton";

  const learningCtx = ctx.learning.length > 0
    ? "\n\n## INLÄRD BOKFÖRINGSHISTORIK (använd dessa mönster för att ge snabbare, mer träffsäkra svar):\n" + ctx.learning.map((i: any) =>
        `- "${i.pattern}" → konto ${i.suggested_account} ${i.suggested_account_name} (${i.correction_count}x, ${Math.round(i.avg_confidence * 100)}%)`
      ).join("\n")
    : "";

  const recentExamples = ctx.recent.slice(0, 8).map((e: any) => {
    const lines = e.journal_entry_lines?.map((l: any) =>
      `  - ${l.chart_of_accounts?.account_number} ${l.chart_of_accounts?.account_name}: ${l.debit ? `D ${l.debit}` : ''} ${l.credit ? `K ${l.credit}` : ''}`
    ).join("\n") || "";
    return `${e.description}:\n${lines}`;
  }).join("\n\n") || "";

  const companyName = ctx.company?.name || "Okänt företag";
  const orgNumber = ctx.company?.org_number || "";
  const c = ctx.company || {};

  const companyTypeLabel: Record<string, string> = { ab: "Aktiebolag", ef: "Enskild firma", hb: "Handelsbolag/KB", ek: "Ekonomisk förening" };
  const vatPeriodLabel: Record<string, string> = { monthly: "Månadsvis", quarterly: "Kvartalsvis", yearly: "Årsvis" };

  const now = new Date();
  let currentVatPeriod = "";
  if (c.vat_period_type === "monthly") {
    const m = now.getMonth(); // 0-indexed
    const monthNames = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];
    currentVatPeriod = `${monthNames[m]} ${now.getFullYear()}`;
  } else if (c.vat_period_type === "quarterly") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    const qStart = ["jan","apr","jul","okt"][q-1];
    const qEnd = ["mar","jun","sep","dec"][q-1];
    currentVatPeriod = `Q${q} ${now.getFullYear()} (${qStart}–${qEnd})`;
  } else if (c.vat_period_type === "yearly") {
    currentVatPeriod = `Helår ${now.getFullYear()}`;
  }

  const settingsBlock = c.company_type || c.vat_period_type || c.accounting_framework
    ? `\n## BOLAGSINSTÄLLNINGAR (använd dessa — fråga ALDRIG användaren om detta):
- Företagsform: ${companyTypeLabel[c.company_type] || c.company_type || "Ej angivet"}
- Bransch: ${c.industry || "Ej angivet"}
- Verksamhetsbeskrivning: ${c.business_description || "Ej angivet"}
- Momsredovisningsperiod: ${vatPeriodLabel[c.vat_period_type] || c.vat_period_type || "Ej angivet"}${currentVatPeriod ? ` — aktuell period: ${currentVatPeriod}` : ""}
- Räkenskapsår: ${c.fiscal_year_start || 1}–${c.fiscal_year_end || 12} (${c.fiscal_year_start === 1 && c.fiscal_year_end === 12 ? "kalenderår" : "brutet räkenskapsår"})
- Redovisningsramverk: ${c.accounting_framework || "Ej angivet"}
- F-skatt: ${c.registered_for_fskatt ? "Ja" : c.registered_for_fskatt === false ? "Nej" : "Okänt"}
- EU-momspliktig: ${c.eu_vat_liable ? "Ja" : c.eu_vat_liable === false ? "Nej" : "Okänt"}
- Antal anställda: ${c.num_employees ?? "Okänt"}
- Land: ${c.country || "SE"}, Valuta: ${c.currency || "SEK"}
- Momsnummer: ${c.vat_number || "Ej angivet"}
- Adress: ${c.address || "Ej angivet"}
- Bankgiro: ${c.bankgiro || "Ej angivet"}, Plusgiro: ${c.plusgiro || "Ej angivet"}
- Bank: ${c.bank_name || "Ej angivet"}

Beräkna deadlines och aktuella perioder AUTOMATISKT utifrån dessa uppgifter och dagens datum (${now.toISOString().split('T')[0]}).
`
    : "";

  // ----- Period helpers (för att förhindra att AI blandar Q1/Q2 etc.) -----
  const periodTag = (iso?: string | null): string => {
    if (!iso) return "OKÄNT DATUM";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "OKÄNT DATUM";
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-indexed
    if (c.vat_period_type === "monthly") {
      const monthNames = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
      return `${monthNames[m]} ${y}`;
    }
    if (c.vat_period_type === "yearly") return `Helår ${y}`;
    // default: quarterly
    return `Q${Math.floor(m / 3) + 1} ${y}`;
  };
  const currentPeriodTag = periodTag(now.toISOString());

  // Live cash from huvudboken — authoritative for "vad är saldot på 1930?"-frågor.
  const cashEntries = Object.entries(ctx.liveCash19xx || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const totalLiveCash = cashEntries.reduce((s, [, v]: any) => s + v.net, 0);

  // Bank accounts (PSD2 / Enable Banking) — saldo + freshness
  const linkedBanks = ctx.bankAccounts || [];
  const bankSyncedAt = (b: any) => b.last_synced_at ? new Date(b.last_synced_at).toLocaleString("sv-SE") : "ej synkad";
  const totalBankBalance = linkedBanks.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);
  const anyBankSynced = linkedBanks.some((b: any) => b.last_synced_at);

  // Combined block — bokfört + bank sida vid sida
  const liveCashBlock = cashEntries.length > 0
    ? `\n## 💰 KASSASALDO (bokfört vs bank)\n\n### Bokfört (huvudboken, approved+posted):\n${cashEntries.map(([num, v]: any) => `- ${num} ${v.name}: ${v.net.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`).join("\n")}\nTotal bokfört (19xx): ${totalLiveCash.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr${totalLiveCash <= 0 ? " ⚠️ NEGATIV — likviditet kritisk" : ""}\n\n### Bank (PSD2 / Enable Banking):\n${linkedBanks.length === 0
        ? "Bankkoppling ej aktiv ännu — Enable Banking är förberett men inte live. När kopplingen aktiveras visas live-saldo här bredvid bokfört saldo."
        : !anyBankSynced
          ? linkedBanks.map((b: any) => `- ${b.bank_name} "${b.account_name}": väntar på första synk (${b.currency})`).join("\n")
          : `${linkedBanks.map((b: any) => `- ${b.bank_name} "${b.account_name}": ${Number(b.balance || 0).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} ${b.currency} (synkad ${bankSyncedAt(b)})`).join("\n")}\nTotal banksaldo: ${totalBankBalance.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`
      }${linkedBanks.length > 0 && anyBankSynced && Math.abs(totalBankBalance - totalLiveCash) > 100
          ? `\n\n⚠️ DIFF bokfört vs bank: ${(totalBankBalance - totalLiveCash).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr — oavstämda poster finns. Föreslå bankavstämning.`
          : ""
      }\n`
    : "";

  const bankBlock = ""; // konsoliderat i liveCashBlock

  // Invoices summary
  const unpaidInvoices = ctx.invoices?.filter((i: any) => i.status === "sent" || i.status === "overdue") || [];
  const supplierInvoices = ctx.invoices?.filter((i: any) => i.invoice_type === "supplier" && (i.status === "pending" || i.status === "approved")) || [];
  const invoiceBlock = (unpaidInvoices.length > 0 || supplierInvoices.length > 0)
    ? `\n## FAKTURASTATUS:\n${unpaidInvoices.length > 0 ? `Obetalda kundfakturor: ${unpaidInvoices.length} st, totalt ${unpaidInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0).toLocaleString("sv-SE")} kr\n${unpaidInvoices.map((i: any) => `  - #${i.invoice_number} ${i.customer_name}: ${i.total_amount?.toLocaleString("sv-SE")} kr, förfaller ${i.due_date}${i.status === "overdue" ? " ⚠️ FÖRSENAD" : ""}`).join("\n")}` : ""}${supplierInvoices.length > 0 ? `\nLeverantörsfakturor att betala: ${supplierInvoices.length} st, totalt ${supplierInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0).toLocaleString("sv-SE")} kr` : ""}\n`
    : "";

  // Employees summary
  const employeeBlock = ctx.employees?.length > 0
    ? `\n## PERSONAL (${ctx.employees.length} anställda):\n${ctx.employees.map((e: any) => `- ${e.first_name} ${e.last_name} (${e.employment_type || "anställd"})${e.monthly_salary ? `, ${e.monthly_salary.toLocaleString("sv-SE")} kr/mån` : ""}`).join("\n")}\n`
    : "";

  // VAT periods
  const vatBlock = ctx.vatPeriods?.length > 0
    ? `\n## MOMSPERIODER (senaste):\n${ctx.vatPeriods.map((v: any) => `- ${v.period_start} – ${v.period_end} [${periodTag(v.period_start)}]: ${v.status}${v.total_vat_to_pay != null ? `, moms att betala: ${v.total_vat_to_pay.toLocaleString("sv-SE")} kr` : ""}`).join("\n")}\n`
    : "";

  // Fixed assets
  const assetBlock = ctx.fixedAssets?.length > 0
    ? `\n## ANLÄGGNINGSTILLGÅNGAR:\n${ctx.fixedAssets.map((a: any) => `- ${a.name}: anskaffning ${a.acquisition_value?.toLocaleString("sv-SE")} kr, bokfört värde ${a.current_book_value?.toLocaleString("sv-SE")} kr (${a.depreciation_method})`).join("\n")}\n`
    : "";

  // ⚡ ACTIONABLE — items waiting for action (HIGH PRIORITY: AI must reference these explicitly)
  // Varje rad period-taggas så att AI inte kan blanda Q1/Q2 vid momsdeklaration.
  const unbookedDocsBlock = ctx.unbookedDocs?.length > 0
    ? `\n## 📥 UNDERLAG SOM VÄNTAR PÅ BOKFÖRING (${ctx.unbookedDocs.length} st):\n${ctx.unbookedDocs.slice(0, 15).map((d: any) => `- [${periodTag(d.document_date)}] ${d.document_type || "dokument"}: "${d.file_name}"${d.vendor_name ? ` från ${d.vendor_name}` : ""}${d.total_amount ? ` — ${d.total_amount.toLocaleString("sv-SE")} kr` : ""}${d.document_date ? ` (${d.document_date})` : ""} [${d.status}]`).join("\n")}\n`
    : "";

  const pendingEntriesBlock = ctx.pendingEntries?.length > 0
    ? `\n## 📝 VERIFIKAT SOM VÄNTAR PÅ GODKÄNNANDE (${ctx.pendingEntries.length} st):\n${ctx.pendingEntries.slice(0, 10).map((e: any) => `- [${periodTag(e.entry_date)}] ${e.entry_date}: ${e.description} [${e.status}${e.ai_confidence ? `, AI ${Math.round(e.ai_confidence * 100)}%` : ""}]`).join("\n")}\n`
    : "";

  const unmatchedBankBlock = ctx.unmatchedBankTx?.length > 0
    ? `\n## 🏦 BANKTRANSAKTIONER UTAN MATCHNING (${ctx.unmatchedBankTx.length} st — behöver bokföras/matchas):\n${ctx.unmatchedBankTx.slice(0, 15).map((t: any) => `- [${periodTag(t.transaction_date)}] ${t.transaction_date}: ${t.amount?.toLocaleString("sv-SE")} kr — ${t.counterparty_name || t.description || "okänd"} [${t.status}]`).join("\n")}\n`
    : "";

  const recentBankBlock = ctx.recentBankTx?.length > 0
    ? `\n## SENASTE BANKTRANSAKTIONER (för matchning av nya transaktioner användaren beskriver):\n${ctx.recentBankTx.slice(0, 10).map((t: any) => `- [${periodTag(t.transaction_date)}] ${t.transaction_date}: ${t.amount?.toLocaleString("sv-SE")} kr — ${t.counterparty_name || t.description || "okänd"} [${t.status}]`).join("\n")}\n`
    : "";

  const pendingExpensesBlock = ctx.pendingExpenses?.length > 0
    ? `\n## 🧾 UTLÄGG SOM VÄNTAR (${ctx.pendingExpenses.length} st):\n${ctx.pendingExpenses.slice(0, 10).map((e: any) => `- [${periodTag(e.expense_date)}] ${e.expense_date}: ${e.description} (${e.category}) — ${e.amount?.toLocaleString("sv-SE")} kr [${e.status}]`).join("\n")}\n`
    : "";

  const actionableBlock = unbookedDocsBlock + pendingEntriesBlock + unmatchedBankBlock + pendingExpensesBlock + recentBankBlock;

  const periodDisciplineBlock = `\n## ⏱️ PERIOD-DISCIPLIN (KRITISKT vid moms, bokslut, periodstängning)
Aktuell momsperiod just nu: **${currentPeriodTag}**. Varje underlag/verifikat/bankrad ovan är period-taggad i hakparentes (t.ex. \`[Q1 2026]\`, \`[Q2 2026]\`, \`[mar 2026]\`).

REGLER:
1. När användaren frågar om en specifik period (t.ex. "Q2-moms", "aprils moms", "förbered momsdeklaration") — inkludera ENDAST poster vars period-tagg matchar exakt. Lista aldrig en Q1-post i en Q2-summa.
2. Om relevanta poster ligger i en ANNAN period — nämn dem separat under rubriken "Tillhör annan period" och föreslå att de hanteras i rätt deklaration. Räkna ALDRIG in dem i den aktuella summan.
3. Om användaren inte specificerar period → använd aktuell period (${currentPeriodTag}) som default och säg det explicit ("Jag utgår från ${currentPeriodTag}").
4. Datum styr periodtillhörighet — inte när underlaget laddades upp eller bokfördes.
`;


  return `Du är NorthLedger — Sveriges smartaste AI-bokförare och rådgivare. Du bokför för "${companyName}" (org.nr: ${orgNumber}, internt id: ${companyId}). Saldon, konton och transaktioner du behöver kommer från detta bolag — fråga ALDRIG användaren efter företags-ID.
Du har FULL INSYN i bolagets ekonomi. Ge alltid bolagsspecifika råd baserat på den data du har — inte generella svar.
${settingsBlock}${liveCashBlock}${bankBlock}${invoiceBlock}${employeeBlock}${vatBlock}${assetBlock}${actionableBlock}${periodDisciplineBlock}

## 🎯 KRITISKT: VAR PROAKTIV OCH KONKRET — INTE GENERELL!
När användaren ställer en fråga (t.ex. om moms, deadlines, resultat) ska du ALLTID:
1. **Referera konkret data ovan** — namnge specifika fakturor, kvitton, banktransaktioner som väntar
2. **Räkna upp vad som saknas eller väntar** — t.ex. "Du har 3 obokade kvitton från Q1: Clas Ohlson 450 kr (12/2), SJ 890 kr (28/2), Scandic 2 100 kr (15/3) — vill du att jag bokför dem nu?"
3. **Föreslå nästa konkreta åtgärd** — peka på en specifik post, inte ett abstrakt steg
4. **Aldrig fråga om information du redan har** — inställningar, period, bolagsform och pågående poster finns redan ovan

❌ FEL svar på "Hur ser min momsdeklaration ut?":
"Har du kundfakturor från jan-mars som inte är bokförda? Har du några kvitton liggande?"
(Generellt — du SER ju listan ovan!)

✅ RÄTT svar:
"Q1 2026 förfaller om X dagar. Just nu ser jag:
- 3 obokade kvitton (totalt ca 3 440 kr ingående moms): [räkna upp]
- 1 obetald kundfaktura #1042 ABC AB 25 000 kr (utg. moms 5 000 kr)
- 2 banktransaktioner utan matchning från februari
Vill du att jag börjar bokföra de 3 kvittona?"

## 🔗 BANKMATCHNING (när bank är ansluten):
När användaren beskriver en ny transaktion (t.ex. "jag köpte en dator igår för 12 000 kr"):
1. KOLLA "SENASTE BANKTRANSAKTIONER" ovan FÖRST
2. Om matchning finns (samma datum ± 2 dagar, samma belopp ± 5%), nämn den explicit:
   "Jag ser en transaktion på 12 000 kr från Elgiganten 18/4 i banken — är det den?"
3. Skapa då verifikatet kopplat till banktransaktionen istället för en lös post



## VIKTIGASTE REGELN — SMART TRIAGE (bokför direkt om info räcker, fråga annars)
Bedöm användarens meddelande direkt. Du behöver dessa fyra fakta för att bokföra:
A) **Belopp** (kr)  B) **Motpart eller typ av köp**  C) **Betalsätt** (kort/kontant=1930, faktura=2440, Swish, m.m.)  D) **Datum** (om saknas → använd dagens datum och nämn det)

### Beslutslogik:
1. **Om A + B + (C eller D) finns** → BOKFÖR DIREKT med JSON. Skriv FÖRST en kort svensk bekräftelsemening (1 mening, max 20 ord) som beskriver vad du bokför, SEDAN \`\`\`json-blocket. Aldrig tomt svar.
   - Exempel: *"Köp av telefon 4500 kr på Elgiganten idag, betalde med företagets kreditkort"* → ALLA fakta finns → bokför direkt.
2. **Om bara EN sak saknas** → ställ EN konkret fråga om just den saken. Aldrig en lång lista frågor när bara ett fält saknas.
3. **Om flera saker saknas** → ställ max 2 riktade frågor mot det som faktiskt saknas. Upprepa ALDRIG frågor om info användaren redan har gett.
4. **Antaganden får göras** för standardfall: dagens datum om inget anges, 1930 (Bank/Kort) om "kort"/"kreditkort"/"betalkort" nämns, 25% moms för standardvaror.

### KRITISKT — Streama text FÖRST:
Innan du skriver \`\`\`json MÅSTE du alltid streama minst en svensk mening så användaren ser respons direkt. Aldrig bara ett JSON-block utan text.

## SVENSKA MOMSREGLER (KRITISKT - välj rätt sats baserat på typ):
### 25% — Standard
Kontorsmaterial, datorer, programvara, möbler, konsulttjänster, reparationer, drivmedel, parkering, hyrbil, reklam, SaaS-licenser, telefonabonnemang.

### 12% — Reducerad
- Livsmedel/matvaror (ICA, Coop, Willys, Lidl)
- Restaurang/café/lunch (OBS: alkohol = 25% separat)
- Hotell/logi (Scandic, Elite, Clarion, STF)
- Catering

### 6% — Låg
- Böcker, e-böcker, tidningar, tidskrifter
- Persontransport: tåg (SJ), buss (SL), flyg (inrikes), taxi, Uber
- Kultur: bio, teater, konsert, museum

### 0% — Momsfritt
- Bankavgifter, räntor, courtage, valutakostnader
- Försäkringspremier
- Porto/frimärken, Sjukvård
- Utbildning, Föreningsavgifter
- Hyra av bostad

## MOMSBERÄKNING:
**STANDARDREGEL — tolka alltid belopp som BRUTTO (inkl. moms) om inget annat sägs.**
Om användaren skriver "för X kr", "köpte för X", "kostade X" eller bara anger ett belopp utan att skriva "exkl moms"/"netto" → behandla X som bruttobelopp och räkna baklänges till netto + moms. Fråga ALDRIG "är det inklusive eller exklusive moms?" som första fråga — bokför direkt på brutto-antagandet och nämn det i bekräftelsen (t.ex. "Tolkar 12 000 kr som inkl. moms").
Endast om användaren explicit skriver "exkl moms", "netto", "plus moms" eller "+ X % moms" → tolka som nettobelopp.

- Bruttobelopp (inkl moms, STANDARD): moms = belopp × momssats / (100 + momssats)
- Nettobelopp (exkl moms, endast om explicit): moms = belopp × momssats / 100
- Restauranglunch 500 kr (brutto) → moms = 500 × 12/112 = 53,57 → 54 kr (netto 446 kr)
- Kontorsmaterial 1250 kr (brutto) → moms = 1250 × 25/125 = 250 kr (netto 1000 kr)
- Dator 12 000 kr (brutto) → moms = 12 000 × 25/125 = 2 400 kr (netto 9 600 kr)

## FORMULERING I BEKRÄFTELSE (VIKTIGT):
Skriv ALDRIG "dragit av X% moms (Y kr)" eller "minus X% moms" om Y avser brutto — det får procenten att se felaktig ut.
Använd alltid formen: **"varav moms Y kr (X%)"** eller "netto N kr + moms Y kr (X%)".
Exempel:
- ✅ "Brutto 450 kr, varav moms 90 kr (25%) → netto 360 kr"
- ❌ "Dragit av 25% moms (90 kr) från 450 kr"

## 💳 BETALSÄTT → MOTKONTO (KRITISKT — välj rätt motkonto utifrån hur det betalades):
Default 1930 Bank gäller ENDAST när användaren inte säger något om betalsätt. Annars:

| Användaren säger… | Motkonto (kredit vid utgift) | Kommentar |
|---|---|---|
| "bank", "banköverföring", "autogiro", "från företagskontot", inget angivet | **1930 Företagskonto / Bank** | Default |
| "Swish", "swishade" | **1930** (eller 1933 om Swish-konto finns separat i kontoplanen) | |
| "kort", "betalkort", "debetkort" (kopplat till bankkontot) | **1930** | Direkt­debitering från bank |
| "**företagskort**", "firmakort", "corporate card", "Eurocard", "Amex företag", "kreditkort" | **2890 Övriga kortfristiga skulder** (eller **1680/2891 Företagskortskuld** om sådan finns i kontoplanen) | Skuld till kortutgivaren tills fakturan betalas — INTE 1930 |
| "jag la ut privat", "betalade själv", "privat utlägg", "lägger ut" | **2893 Skulder till närstående personal** (eller **2890**; för enskild firma **2018 Egna insättningar**) | Skuld till anställd/ägare |
| "faktura", "på faktura", "leverantörsfaktura", "fakturerat" | **2440 Leverantörsskulder** | Bokas bort när fakturan betalas mot 1930 |
| "kontant", "kontanter" | **1910 Kassa** | |

Regel: Leta i KONTOPLAN ovan efter befintliga konton som matchar (1680, 1684, 2891, 2893 m.fl.). Om ett dedikerat företagskorts- eller utläggskonto finns — använd det före 2890. Använd 1930 endast som sista utväg när inget annat passar.

## VANLIGA KONTERINGAR (motkonto = enligt betalsätt-tabellen ovan — 1930 visas bara som exempel):
| Typ | Kostnadskonto | Momskonto |
|-----|--------------|-----------|
| Dator/IT-utrustning ≤ halva PBB (~28 650 kr) | 5410 Förbrukningsinventarier | 2640 (25%) |
| Dator/IT-utrustning > halva PBB | 1250 Datorer (tillgång, avskrivs) | 2640 (25%) |
| Programvara/SaaS-licens | 6911 Programvarulicenser | 2640 (25%) |
| Kontorsinköp (papper, pennor etc) | 6110 Kontorsmaterial | 2640 (25%) |
| Kontorsmöbler/inventarier | 5410 Förbrukningsinventarier | 2640 (25%) |
| Mobiltelefon/bredband | 6212/6214 Telefon/Bredband | 2640 (25%) |
| Restauranglunch (≤300 kr/person) | 6071 Representation avdragsgill | 2640 (12%) |
| Restaurang (>300 kr/person) | 6072 Representation ej avdragsgill | — (0%) |
| Hotell/logi | 6720 Hotell och logi | 2640 (12%) |
| Flyg/tåg (inrikes) | 6710/6712 Biljetter | 2640 (6%) |
| Taxiresa | 6740 Taxi | 2640 (6%) |
| Parkering (privat/parkeringshus) | 6750 Parkeringskostnader | 2640 (25%) |
| Parkering (kommunal/gatuparkering) | 6750 Parkeringskostnader | — (0%, myndighetsavgift) |
| Drivmedel (tjänsteresa) | 6770 Drivmedel | 2640 (25%) |
| Hyrbil | 6730 Hyrbilskostnader | 2640 (25%) |
| Friskvård (≤5000 kr/år) | 7699 Friskvård | — (0%) |
| Bankavgift | 6570 Bankkostnader | — (0%) |
| Försäkring | 6310 Företagsförsäkringar | — (0%) |
| Revision/redovisning | 6421/6460 Revision/Redovisning | 2640 (25%) |
| Reklam/marknadsföring | 6940 Marknadsföring | 2640 (25%) |
| Försäljning 25% (motkonto = 1510 kundfordran eller 1930/1910 vid kontant) | 2610 (25%) | 3010 Intäkt |
| Lön | 7010 | — (motkonto 2730 Löneskuld) |


## UNDVIK DUBBLETTER:
${recentlyCreated ? '⚠️ DET FINNS REDAN ETT VERIFIKAT I DENNA KONVERSATION! Skapa INTE nytt om användaren inte beskriver en helt NY transaktion.' : ''}

## KONTOPLAN:
${accountsList}
${learningCtx}

${recentExamples ? `## SENASTE GODKÄNDA BOKFÖRINGAR (referens):\n${recentExamples}` : ''}

## SVARSFORMAT (ENDAST efter kontrollfrågor besvarats):
Kort bekräftelse + JSON:

**CONFIDENCE-REGLER:**
- **0.95–1.0**: Standardtransaktioner med tydlig info (t.ex. "köpte kontorsmaterial för 450 kr på Clas Ohlson, betalt med kort"). Dessa bokförs automatiskt.
- **0.80–0.94**: Rimligt säkra men med viss tvetydighet (t.ex. oklar momssats, oklart konto). Kräver användarens godkännande.
- **Under 0.80**: Osäker kontering. Kräver godkännande och visa tydligt vad du är osäker på.

\`\`\`json
{
  "createJournalEntry": true,
  "description": "Köp av dator från Elgiganten",
  "date": "YYYY-MM-DD",
  "confidence": 0.95,
  "lines": [
    {"account": "1930", "accountName": "Bank", "debit": null, "credit": 10000},
    {"account": "5410", "accountName": "Förbrukningsinventarier", "debit": 8000, "credit": null},
    {"account": "2640", "accountName": "Ingående moms", "debit": 2000, "credit": null}
  ]
}
\`\`\`

✅ Bokfört!

## TONALITET:
- Var kortfattad, professionell men vänlig
- Använd svenska bokföringstermer
- Förklara kort varför du valde kontot och momssatsen
- Om du är osäker, fråga istället för att gissa`;
}

function extractBalancePrefixes(message: string): string[] {
  const lower = message.toLowerCase();
  const asksForBalance =
    lower.includes("saldo") ||
    lower.includes("vad står") ||
    lower.includes("hur mycket har vi") ||
    lower.includes("hur mycket finns") ||
    lower.includes("företagskonto") ||
    lower.includes("företagskontot") ||
    lower.includes("bankkonto") ||
    lower.includes("bankkontot") ||
    lower.includes("kassan");

  if (!asksForBalance) return [];

  const explicitAccounts = Array.from(message.matchAll(/\b[1-8]\d{2,3}\b/g))
    .filter((match) => {
      const index = match.index ?? 0;
      const value = match[0];
      const before = index > 0 ? message[index - 1] : "";
      const after = message[index + value.length] || "";
      return before !== "-" && after !== "-";
    })
    .map((match) => match[0]);

  if (explicitAccounts.length > 0) {
    return Array.from(new Set(explicitAccounts));
  }

  if (lower.includes("företagskonto") || lower.includes("företagskontot") || lower.includes("bankkonto") || lower.includes("bankkontot")) {
    return ["1930"];
  }

  if (lower.includes("kassa") || lower.includes("kassan")) {
    return ["191"];
  }

  return [];
}

function formatSek(amount: number) {
  return amount.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

async function queryAccountBalance(supabase: any, companyId: string, prefixes: string[]) {
  const { data: lines, error } = await supabase
    .from("journal_entry_lines")
    .select(`
      debit, credit,
      account:chart_of_accounts!inner(account_number, account_name),
      journal_entry:journal_entries!inner(entry_date, status, company_id)
    `)
    .eq("journal_entry.company_id", companyId)
    .in("journal_entry.status", ["approved", "posted"])
    .limit(20000);

  if (error) {
    console.error("queryAccountBalance error:", error);
    return { error: error.message, sorted: [], totalNet: 0 };
  }

  const balances: Record<string, { name: string; debit: number; credit: number; net: number }> = {};

  for (const line of lines || []) {
    const account = (line as any).account;
    const accNum = account?.account_number || "";
    const matches = prefixes.length === 0 || prefixes.some((prefix) => accNum.startsWith(prefix));
    if (!matches) continue;

    if (!balances[accNum]) {
      balances[accNum] = { name: account?.account_name || "", debit: 0, credit: 0, net: 0 };
    }

    balances[accNum].debit += Number((line as any).debit || 0);
    balances[accNum].credit += Number((line as any).credit || 0);
    balances[accNum].net += Number((line as any).debit || 0) - Number((line as any).credit || 0);
  }

  const sorted = Object.entries(balances).sort((a, b) => a[0].localeCompare(b[0]));
  const totalNet = sorted.reduce((sum, [num, acc]) => {
    const isLiability = num.startsWith("2");
    return sum + (isLiability ? -acc.net : acc.net);
  }, 0);

  return { error: null, sorted, totalNet };
}

function buildBalanceResponse(result: Awaited<ReturnType<typeof queryAccountBalance>>, prefixes: string[], bankInfo?: { hasBanks: boolean; synced: boolean; total: number }) {
  if (result.error) {
    return "Jag kunde inte läsa huvudboken just nu. Försök igen om en stund.";
  }

  if (result.sorted.length === 0) {
    return `Jag hittar inget bokfört saldo för konto ${prefixes.join(", ")} ännu. Det betyder normalt att det saknas godkända verifikationer på kontot.`;
  }

  const bankLine = bankInfo
    ? bankInfo.hasBanks
      ? bankInfo.synced
        ? `**Banksaldo (PSD2):** ${formatSek(bankInfo.total)} kr`
        : `**Banksaldo:** väntar på första synk`
      : `**Banksaldo:** Enable Banking-koppling ej aktiv ännu (förberedd, går live snart)`
    : "";

  if (result.sorted.length === 1) {
    const [accountNumber, account] = result.sorted[0];
    const displayBalance = accountNumber.startsWith("2") ? -account.net : account.net;
    return `**Bokfört saldo** på ${accountNumber} ${account.name}: **${formatSek(displayBalance)} kr**\n${bankLine}\n\nBokfört = faktiskt saldo i huvudboken (godkända verifikationer). Utkast och väntande poster ingår inte.`;
  }

  const lines = result.sorted.map(([accountNumber, account]) => {
    const displayBalance = accountNumber.startsWith("2") ? -account.net : account.net;
    return `- ${accountNumber} ${account.name}: ${formatSek(displayBalance)} kr`;
  }).join("\n");

  return `**Bokförda saldon:**\n${lines}\n\nTotal: ${formatSek(result.totalNet)} kr.\n${bankLine}\n\nBokfört bygger på godkända verifikationer i huvudboken.`;
}

function streamTextResponse(text: string) {
  const encoder = new TextEncoder();
  const chunks = text.match(/[\s\S]{1,500}/g) || [text];

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        const payload = { choices: [{ delta: { content: chunk } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function processJournalEntry(supabase: any, companyId: string, userId: string, journalData: any) {
  const totalDebit = journalData.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
  const totalCredit = journalData.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    console.warn("Debit/Credit mismatch:", { totalDebit, totalCredit });
    return null;
  }

  const confidence = journalData.confidence || 0.85;
  const autoApprove = confidence >= 0.95;

  // Always insert as draft first — triggers validate line count on approved entries
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      company_id: companyId,
      description: journalData.description,
      entry_date: journalData.date || new Date().toISOString().split('T')[0],
      status: "draft",
      created_by: userId,
      ai_confidence: confidence,
      ai_explanation: "Skapad via AI-bokförare",
    })
    .select()
    .maybeSingle();

  if (error || !entry) {
    console.error("Error creating journal entry:", error);
    return null;
  }

  for (const line of journalData.lines) {
    let { data: account } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("account_number", line.account)
      .maybeSingle();

    if (!account) {
      const accountType = line.account.startsWith("1") ? "asset" :
        line.account.startsWith("2") ? "liability" :
        line.account.startsWith("3") ? "revenue" :
        ["4","5","6","7"].includes(line.account[0]) ? "expense" : "other";

      const { data: newAcc } = await supabase
        .from("chart_of_accounts")
        .insert({ company_id: companyId, account_number: line.account, account_name: line.accountName, account_type: accountType })
        .select()
        .maybeSingle();
      account = newAcc;
    }

    if (account) {
      await supabase.from("journal_entry_lines").insert({
        journal_entry_id: entry.id, account_id: account.id,
        debit: line.debit || null, credit: line.credit || null,
      });
    }
  }

  // Now update status after lines are in place
  const finalStatus = autoApprove ? "approved" : "pending_approval";
  await supabase
    .from("journal_entries")
    .update({
      status: finalStatus,
      approved_by: autoApprove ? userId : null,
      ai_explanation: autoApprove
        ? `Auto-godkänt av AI (konfidens: ${Math.round(confidence * 100)}%)`
        : "Skapad via AI-bokförare",
    })
    .eq("id", entry.id);

  return {
    id: entry.id,
    description: journalData.description,
    date: journalData.date || new Date().toISOString().split('T')[0],
    lines: journalData.lines,
    status: finalStatus,
    autoApproved: autoApprove,
    confidence,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawInput = await req.json();
    const { message, attachments, companyId, conversationHistory } = inputSchema.parse(rawInput);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Ej inloggad" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Role check — guarantee companyId belongs to this user before any DB read.
    const { data: userRole } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", userId).eq("company_id", companyId).maybeSingle();

    if (!userRole) {
      console.warn(`[ai-bookkeeper-stream] User ${userId} attempted access to companyId=${companyId} without membership`);
      return new Response(JSON.stringify({
        error: "INVALID_COMPANY",
        message: "Du har inte längre tillgång till detta bolag. Välj bolag igen i toppmenyn.",
        fallback: true,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get context
    const ctx = await getCompanyContext(supabase, companyId);
    const recentlyCreated = conversationHistory?.some((m: any) =>
      m.role === 'assistant' && (m.content?.includes('createJournalEntry') || m.content?.includes('✅'))
    );

    const systemPrompt = buildSystemPrompt(ctx, !!recentlyCreated, companyId);
    const balancePrefixes = extractBalancePrefixes(message);

    if (balancePrefixes.length > 0) {
      const balanceResult = await queryAccountBalance(supabase, companyId, balancePrefixes);
      const banks = ctx.bankAccounts || [];
      const bankInfo = {
        hasBanks: banks.length > 0,
        synced: banks.some((b: any) => b.last_synced_at),
        total: banks.reduce((s: number, b: any) => s + Number(b.balance || 0), 0),
      };
      return streamTextResponse(buildBalanceResponse(balanceResult, balancePrefixes, bankInfo));
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      {
        role: "user",
        content: attachments?.length
          ? `${message}\n\n[Bifogade ${attachments.length} fil(er): ${attachments.map((a: any) => a.name).join(", ")}]`
          : message
      },
    ];

    // Stream from AI gateway with model fallback.
    // Hybrid model selection:
    //  - High-value transactions (≥ 50 000 kr) → GPT-5 first (strict rule reasoning)
    //  - Standard transactions → Gemini 2.5 Pro (multimodal + cost efficient)
    //  - Attachments (receipts/invoices) → multimodal-optimized chain
    const amountMatch = (message || "").match(/(\d[\d\s.,]{2,})\s*(?:kr|kronor|sek)/i);
    const detectedAmount = amountMatch
      ? parseFloat(amountMatch[1].replace(/\s/g, "").replace(/\./g, "").replace(",", "."))
      : 0;
    const isHighValue = detectedAmount >= 50000;
    const hasAttachments = (attachments?.length || 0) > 0;

    let response: Response;
    try {
      const { callAIStreamWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
      const chain = isHighValue
        ? MODEL_CHAINS.bookkeepingHighValue
        : hasAttachments
        ? MODEL_CHAINS.multimodal
        : MODEL_CHAINS.bookkeeping;
      console.log(`[ai-bookkeeper-stream] amount=${detectedAmount} highValue=${isHighValue} hasAttachments=${hasAttachments} chain.primary=${chain.primary}`);
      const { body, modelUsed } = await callAIStreamWithFallback({
        ...chain,
        messages,
        temperature: 0.2,
        max_tokens: 2500,
      });
      console.log(`[ai-bookkeeper-stream] modelUsed=${modelUsed}`);
      response = new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("[ai-bookkeeper-stream] all models failed", e);
      return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    // We need to collect the full response to check for journal entries
    // but also stream to the client for instant feedback
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let closed = false;
        const safeEnqueue = (s: string) => { if (!closed) controller.enqueue(encoder.encode(s)); };
        const finalize = async () => {
          if (closed) return;
          // If model produced nothing visible, surface a fallback message so the UI never freezes.
          const hasVisibleText = fullContent.replace(/```json[\s\S]*?```/g, "").trim().length > 0;
          if (!hasVisibleText) {
            const fallback = fullContent.trim()
              ? "Bokföringsförslag skapat — se kortet nedan."
              : "AI:n svarade tomt. Försök igen eller formulera om frågan.";
            safeEnqueue(`data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\n`);
          }
          // Process journal entry from collected content
          const jsonMatch = fullContent.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            try {
              const journalData = JSON.parse(jsonMatch[1]);
              if (journalData.createJournalEntry && journalData.lines?.length > 0) {
                const result = await processJournalEntry(supabase, companyId, userId!, journalData);
                if (result) {
                  safeEnqueue(`data: ${JSON.stringify({ journalEntry: result })}\n\n`);
                }
              }
            } catch (e) { console.error("Parse error:", e); }
          }
          safeEnqueue("data: [DONE]\n\n");
          if (!closed) { closed = true; try { controller.close(); } catch {} }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let newlineIdx;
            while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, newlineIdx);
              buffer = buffer.slice(newlineIdx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                await finalize();
                return;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  safeEnqueue(`data: ${JSON.stringify(parsed)}\n\n`);
                }
              } catch { /* partial JSON, skip */ }
            }
          }
          await finalize();
        } catch (e) {
          console.error("Stream error:", e);
          try {
            safeEnqueue(`data: ${JSON.stringify({ choices: [{ delta: { content: "\n\n_Anslutningen avbröts. Försök igen._" } }] })}\n\n`);
          } catch {}
          safeEnqueue("data: [DONE]\n\n");
          if (!closed) { closed = true; try { controller.close(); } catch {} }
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors.map(e => e.message).join(", ") }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Något gick fel" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
