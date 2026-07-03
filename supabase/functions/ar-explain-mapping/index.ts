// ar-explain-mapping — AI explains why an account is mapped to a section.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    if (!req.headers.get("Authorization")) return corsError("Saknar auth", 401);
    if (!LOVABLE_API_KEY) return corsError("LOVABLE_API_KEY ej konfigurerad", 500);

    const { accountNumber, sectionId, companyId } = await req.json();
    if (!accountNumber || !sectionId) return corsError("accountNumber + sectionId krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const [{ data: section }, { data: coa }, { data: jeLines }] = await Promise.all([
      sb.from("annual_report_sections").select("label, section_type").eq("id", sectionId).single(),
      companyId ? sb.from("chart_of_accounts").select("account_name").eq("company_id", companyId).eq("account_number", accountNumber).maybeSingle() : Promise.resolve({ data: null }),
      companyId ? sb.from("journal_entry_lines").select("debit, credit").eq("company_id", companyId).eq("account_number", accountNumber).limit(2000) : Promise.resolve({ data: [] }),
    ]);

    const balance = ((jeLines ?? []) as Array<{ debit: number; credit: number }>).reduce(
      (a, l) => a + Number(l.debit ?? 0) - Number(l.credit ?? 0), 0,
    );
    const accountName = (coa as { account_name?: string } | null)?.account_name ?? "Okänt konto";
    const sectionLabel = (section as { label?: string; section_type?: string } | null)?.label ?? sectionId;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Du är en svensk redovisningsexpert. Förklara på 1–2 meningar varför ett BAS-konto mappas till en viss sektion i årsredovisningen. Hänvisa till BAS-kontoplanen, saldo och sektionens syfte. Var konkret och kort." },
          { role: "user", content: `Konto: ${accountNumber} ${accountName}\nSaldo: ${balance.toFixed(0)} kr\nSektion: ${sectionLabel}\n\nFörklara mappningen.` },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return corsError("Rate-limit nått, försök igen", 429);
      if (resp.status === 402) return corsError("AI-krediter slut", 402);
      return corsError("AI gateway error", 500);
    }
    const j = await resp.json();
    const text = j.choices?.[0]?.message?.content ?? "";
    return corsJson({ explanation: text });
  } catch (e) {
    console.error("ar-explain-mapping error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
