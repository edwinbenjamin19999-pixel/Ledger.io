import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface ReqBody {
  company_id: string;
  year: number;
  month: number; // 1-12
  section?: keyof Sections | null; // regenerate one section
  existing_sections?: Partial<Sections> | null;
}

type Sections = {
  sammanfattning: string;
  intakter: string;
  kostnader: string;
  resultat: string;
  likviditet: string;
  framatblick: string;
};

const MONTH_NAMES_SV = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}

function prevMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

async function fetchPnlAndCash(supabase: any, company_id: string, from: string, to: string) {
  // Pull entries + lines + accounts for the period (status posted/approved)
  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      "id, entry_date, status, journal_entry_lines(debit, credit, chart_of_accounts(account_number, account_name, account_type))"
    )
    .eq("company_id", company_id)
    .in("status", ["posted", "approved"])
    .gte("entry_date", from)
    .lte("entry_date", to);
  if (error) throw error;

  let revenue = 0;
  let costs = 0;
  let cogs = 0;
  const byAccount: Record<string, { name: string; amount: number; num: string }> = {};

  for (const je of data || []) {
    for (const l of je.journal_entry_lines || []) {
      const acc = l.chart_of_accounts;
      if (!acc) continue;
      const num = acc.account_number || "";
      const credit = Number(l.credit || 0);
      const debit = Number(l.debit || 0);
      const net = credit - debit;
      const first = num.charAt(0);

      if (first === "3") revenue += net;
      else if (first === "4") {
        cogs += -net; // costs are debit-positive
        costs += -net;
      } else if (["5", "6", "7"].includes(first)) {
        costs += -net;
      }

      if (["3", "4", "5", "6", "7"].includes(first)) {
        const k = num;
        if (!byAccount[k]) byAccount[k] = { name: acc.account_name, amount: 0, num };
        byAccount[k].amount += first === "3" ? net : -net;
      }
    }
  }

  // Cash (1910-1940) closing balance up to `to`
  const { data: cashLines } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, entry_date, status)")
    .eq("journal_entries.company_id", company_id)
    .in("journal_entries.status", ["posted", "approved"])
    .lte("journal_entries.entry_date", to)
    .gte("chart_of_accounts.account_number", "1910")
    .lte("chart_of_accounts.account_number", "1989");

  let cashClose = 0;
  for (const l of cashLines || []) cashClose += Number(l.debit || 0) - Number(l.credit || 0);

  // Cash opening (before `from`)
  const { data: cashOpenLines } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, entry_date, status)")
    .eq("journal_entries.company_id", company_id)
    .in("journal_entries.status", ["posted", "approved"])
    .lt("journal_entries.entry_date", from)
    .gte("chart_of_accounts.account_number", "1910")
    .lte("chart_of_accounts.account_number", "1989");
  let cashOpen = 0;
  for (const l of cashOpenLines || []) cashOpen += Number(l.debit || 0) - Number(l.credit || 0);

  // AR (1510), AP (2440) closing
  const balanceFor = async (accFrom: string, accTo: string) => {
    const { data } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, entry_date, status)")
      .eq("journal_entries.company_id", company_id)
      .in("journal_entries.status", ["posted", "approved"])
      .lte("journal_entries.entry_date", to)
      .gte("chart_of_accounts.account_number", accFrom)
      .lte("chart_of_accounts.account_number", accTo);
    let bal = 0;
    for (const l of data || []) bal += Number(l.debit || 0) - Number(l.credit || 0);
    return bal;
  };
  const ar = await balanceFor("1510", "1519");
  const ap = await balanceFor("2440", "2449");

  const ebit = revenue - costs;
  const grossMargin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
  const opMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;

  const topAccounts = Object.values(byAccount)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  return {
    revenue, costs, cogs, ebit, grossMargin, opMargin,
    cashOpen, cashClose, ar, ap, topAccounts,
  };
}

async function fetchAnomalyCount(supabase: any, company_id: string, from: string, to: string) {
  const { count } = await supabase
    .from("anomaly_resolutions")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company_id)
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59Z`);
  return count || 0;
}

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n)) + " kr";
}

function pct(a: number, b: number) {
  if (!b) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

async function callAI(prompt: string, system: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("RATE_LIMIT");
    if (resp.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway error ${resp.status}`);
  }
  const json = await resp.json();
  return (json.choices?.[0]?.message?.content as string) || "";
}

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const body = (await req.json()) as ReqBody;
    const { company_id, year, month, section, existing_sections } = body;
    if (!company_id || !year || !month) return corsError("Missing fields", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { from, to } = monthRange(year, month);
    const prev = prevMonth(year, month);
    const prevR = monthRange(prev.year, prev.month);

    const [cur, last, anomalies] = await Promise.all([
      fetchPnlAndCash(supabase, company_id, from, to),
      fetchPnlAndCash(supabase, company_id, prevR.from, prevR.to),
      fetchAnomalyCount(supabase, company_id, from, to),
    ]);

    const monthName = MONTH_NAMES_SV[month - 1];

    const dataBrief = `
Period: ${monthName} ${year}
Föregående period: ${MONTH_NAMES_SV[prev.month - 1]} ${prev.year}

INTÄKTER ${monthName}: ${fmtSEK(cur.revenue)} (förra: ${fmtSEK(last.revenue)}, ${pct(cur.revenue, last.revenue)?.toFixed(1) ?? "n/a"}%)
KOSTNADER: ${fmtSEK(cur.costs)} (förra: ${fmtSEK(last.costs)}, ${pct(cur.costs, last.costs)?.toFixed(1) ?? "n/a"}%)
EBIT: ${fmtSEK(cur.ebit)} (förra: ${fmtSEK(last.ebit)})
Bruttomarginal: ${cur.grossMargin.toFixed(1)}%
Rörelsemarginal: ${cur.opMargin.toFixed(1)}%

LIKVIDITET: Ingående ${fmtSEK(cur.cashOpen)} → Utgående ${fmtSEK(cur.cashClose)} (förändring ${fmtSEK(cur.cashClose - cur.cashOpen)})
Kundfordringar (UB): ${fmtSEK(cur.ar)}
Leverantörsskulder (UB): ${fmtSEK(cur.ap)}

TOPP-KONTON i perioden:
${cur.topAccounts.map(a => `- ${a.num} ${a.name}: ${fmtSEK(a.amount)}`).join("\n")}

AVVIKELSER upptäckta i månaden: ${anomalies}
`.trim();

    const systemBase = `Du är en svensk affärsrådgivare som skriver månadsanalyser för småföretagare (ej revisor/CFO). Skriv i klartext på svenska, undvik bokföringsjargong. Var faktabaserad – citera alltid faktiska siffror i SEK eller %. Använd korta meningar. Inga rubriker, ingen markdown – bara ren text.`;

    const sectionPrompts: Record<keyof Sections, string> = {
      sammanfattning: `Skriv Sektion 1 – Sammanfattning (3–5 meningar). Inkludera: intäktsutveckling, resultat, likviditetstrend, EN viktig höjdpunkt och EN viktig risk.\n\nDATA:\n${dataBrief}`,
      intakter: `Skriv Sektion 2 – Intäkter (max 80 ord). Total intäkt vs förra månaden i SEK och %. Nämn topp-intäktskonton från datan. Avsluta med EN observation om vad som drev förändringen.\n\nDATA:\n${dataBrief}`,
      kostnader: `Skriv Sektion 3 – Kostnader (max 80 ord). Total kostnad vs förra månaden. Lyft kostnadskonton som rört sig mer än 15%. Nämn antal upptäckta avvikelser om > 0.\n\nDATA:\n${dataBrief}`,
      resultat: `Skriv Sektion 4 – Resultat & marginal (max 70 ord). EBIT, brutto- och rörelsemarginal i %. Klassificera trend som "förbättras", "stabil" eller "försämras" jämfört med förra månaden.\n\nDATA:\n${dataBrief}`,
      likviditet: `Skriv Sektion 5 – Likviditet & balans (max 80 ord). Ingående och utgående kassa, förändring i SEK. Kommentera kundfordringar och leverantörsskulder kort.\n\nDATA:\n${dataBrief}`,
      framatblick: `Skriv Sektion 6 – Framåtblick (2–3 observationer, max 80 ord). Baserat på trenden: vad bör företagaren bevaka kommande månad? Nämn risker eller möjligheter.\n\nDATA:\n${dataBrief}`,
    };

    let sections: Sections;
    if (section) {
      const text = await callAI(sectionPrompts[section], systemBase);
      sections = {
        sammanfattning: existing_sections?.sammanfattning || "",
        intakter: existing_sections?.intakter || "",
        kostnader: existing_sections?.kostnader || "",
        resultat: existing_sections?.resultat || "",
        likviditet: existing_sections?.likviditet || "",
        framatblick: existing_sections?.framatblick || "",
        [section]: text,
      } as Sections;
    } else {
      const keys: (keyof Sections)[] = [
        "sammanfattning", "intakter", "kostnader", "resultat", "likviditet", "framatblick",
      ];
      const results = await Promise.all(keys.map(k => callAI(sectionPrompts[k], systemBase)));
      sections = Object.fromEntries(keys.map((k, i) => [k, results[i].trim()])) as Sections;
    }

    const metrics = {
      revenue: cur.revenue,
      revenue_prev: last.revenue,
      costs: cur.costs,
      costs_prev: last.costs,
      ebit: cur.ebit,
      ebit_prev: last.ebit,
      grossMargin: cur.grossMargin,
      opMargin: cur.opMargin,
      cashOpen: cur.cashOpen,
      cashClose: cur.cashClose,
      ar: cur.ar,
      ap: cur.ap,
      anomalies,
      topAccounts: cur.topAccounts,
      generated_at: new Date().toISOString(),
    };

    // Upsert
    const { data: existing } = await supabase
      .from("monthly_commentaries")
      .select("id, sections")
      .eq("company_id", company_id)
      .eq("period_year", year)
      .eq("period_month", month)
      .maybeSingle();

    let saved;
    if (existing) {
      const merged = section
        ? { ...(existing.sections || {}), ...sections, [section]: sections[section] }
        : sections;
      const { data } = await supabase
        .from("monthly_commentaries")
        .update({ sections: merged, metrics })
        .eq("id", existing.id)
        .select()
        .single();
      saved = data;
    } else {
      const { data } = await supabase
        .from("monthly_commentaries")
        .insert({
          company_id, period_year: year, period_month: month,
          sections, metrics,
        })
        .select()
        .single();
      saved = data;
    }

    return corsJson({ commentary: saved });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    if (msg === "RATE_LIMIT") return corsError("För många förfrågningar. Försök igen om en stund.", 429);
    if (msg === "PAYMENT_REQUIRED") return corsError("AI-krediter saknas. Lägg till krediter i arbetsytan.", 402);
    console.error("generate-monthly-commentary error:", e);
    return corsError(msg, 500);
  }
});
