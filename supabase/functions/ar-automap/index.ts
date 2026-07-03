// ar-automap — Auto-map all chart-of-accounts to AR sections using BAS heuristics + AI fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Range { from: number; to: number; sectionType?: string; noteCode?: string }

const RANGES: Range[] = [
  { from: 3000, to: 3999, sectionType: "rr" },
  { from: 4000, to: 4999, sectionType: "rr" },
  { from: 5000, to: 6999, sectionType: "rr" },
  { from: 7000, to: 7699, sectionType: "rr" },
  { from: 7800, to: 7899, sectionType: "rr" },
  { from: 8000, to: 8799, sectionType: "rr" },
  { from: 8910, to: 8999, sectionType: "rr" },
  { from: 1010, to: 1099, sectionType: "br" },
  { from: 1110, to: 1299, sectionType: "br" },
  { from: 1310, to: 1399, sectionType: "br" },
  { from: 1400, to: 1499, sectionType: "br" },
  { from: 1500, to: 1899, sectionType: "br" },
  { from: 1900, to: 1999, sectionType: "br" },
  { from: 2000, to: 2099, sectionType: "br" },
  { from: 2100, to: 2199, sectionType: "br" },
  { from: 2300, to: 2999, sectionType: "br" },
];

function findSectionType(accountNumber: string): string | null {
  const n = parseInt(accountNumber, 10);
  if (!Number.isFinite(n)) return null;
  const hit = RANGES.find((r) => n >= r.from && n <= r.to);
  return hit?.sectionType ?? null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    if (!req.headers.get("Authorization")) return corsError("Saknar auth", 401);
    const { annualReportId } = await req.json();
    if (!annualReportId) return corsError("annualReportId krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: report } = await sb
      .from("annual_reports")
      .select("id, company_id, fiscal_year")
      .eq("id", annualReportId).single();
    if (!report) return corsError("Utkast hittades inte", 404);

    const [{ data: sections }, { data: existing }, { data: jeLines }] = await Promise.all([
      sb.from("annual_report_sections")
        .select("id, section_type, label")
        .eq("annual_report_id", annualReportId),
      sb.from("ar_section_account_map")
        .select("id, account_number, is_locked, section_id")
        .eq("annual_report_id", annualReportId),
      sb.from("journal_entry_lines")
        .select("account_number, debit, credit")
        .eq("company_id", report.company_id)
        .limit(20000),
    ]);

    const sectionList = (sections ?? []) as Array<{ id: string; section_type: string; label: string }>;
    const sectionByType = new Map<string, string>();
    for (const s of sectionList) {
      if (!sectionByType.has(s.section_type)) sectionByType.set(s.section_type, s.id);
    }

    const lockedAccounts = new Set(
      (existing ?? []).filter((m: { is_locked: boolean }) => m.is_locked).map((m: { account_number: string }) => m.account_number),
    );

    // Aggregate balances
    const balances = new Map<string, number>();
    for (const l of (jeLines ?? []) as Array<{ account_number: string; debit: number; credit: number }>) {
      const n = balances.get(l.account_number) ?? 0;
      balances.set(l.account_number, n + Number(l.debit ?? 0) - Number(l.credit ?? 0));
    }

    const allAccounts = Array.from(balances.keys());
    const toInsert: Array<{ account_number: string; section_id: string; ai_confidence: number; source: string }> = [];
    const unmatched: string[] = [];

    for (const acc of allAccounts) {
      if (lockedAccounts.has(acc)) continue;
      const secType = findSectionType(acc);
      if (secType && sectionByType.has(secType)) {
        toInsert.push({
          account_number: acc,
          section_id: sectionByType.get(secType)!,
          ai_confidence: 0.95,
          source: "auto",
        });
      } else {
        unmatched.push(acc);
      }
    }

    // AI fallback for unmatched
    if (unmatched.length && LOVABLE_API_KEY && sectionList.length) {
      try {
        const sectionsForPrompt = sectionList.map((s) => `${s.section_type}: ${s.label}`).join("; ");
        const accList = unmatched.slice(0, 50).map((a) => `${a} (saldo: ${(balances.get(a) ?? 0).toFixed(0)})`).join("\n");
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Du är en svensk redovisningsexpert. Mappa BAS-konton till sektioner i en årsredovisning. Returnera bara JSON." },
              { role: "user", content: `Tillgängliga sektioner: ${sectionsForPrompt}\n\nKonton att mappa:\n${accList}\n\nReturnera JSON: { mappings: [{ account: "1010", section_type: "br", confidence: 0.85 }] }` },
            ],
            tools: [{
              type: "function",
              function: {
                name: "map_accounts",
                description: "Map BAS accounts to AR sections",
                parameters: {
                  type: "object",
                  properties: {
                    mappings: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          account: { type: "string" },
                          section_type: { type: "string" },
                          confidence: { type: "number" },
                        },
                        required: ["account", "section_type", "confidence"],
                      },
                    },
                  },
                  required: ["mappings"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "map_accounts" } },
          }),
        });
        if (resp.ok) {
          const j = await resp.json();
          const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            const parsed = JSON.parse(args) as { mappings: Array<{ account: string; section_type: string; confidence: number }> };
            for (const m of parsed.mappings ?? []) {
              const sid = sectionByType.get(m.section_type);
              if (sid && !lockedAccounts.has(m.account)) {
                toInsert.push({ account_number: m.account, section_id: sid, ai_confidence: m.confidence, source: "auto" });
              }
            }
          }
        }
      } catch (e) {
        console.error("AI fallback failed:", e);
      }
    }

    // Delete existing non-locked, then insert fresh
    if (toInsert.length) {
      const accountsToReplace = toInsert.map((r) => r.account_number);
      await sb.from("ar_section_account_map")
        .delete()
        .eq("annual_report_id", annualReportId)
        .eq("is_locked", false)
        .in("account_number", accountsToReplace);

      await sb.from("ar_section_account_map").insert(
        toInsert.map((r) => ({
          annual_report_id: annualReportId,
          company_id: report.company_id,
          section_id: r.section_id,
          account_number: r.account_number,
          weight: 1.0,
          ai_confidence: r.ai_confidence,
          source: r.source,
        })),
      );
    }

    const totalAccounts = allAccounts.length || 1;
    const mappedCount = toInsert.length + lockedAccounts.size;
    const coverage_pct = (mappedCount / totalAccounts) * 100;

    return corsJson({ ok: true, mapped: toInsert.length, total: totalAccounts, coverage_pct: Math.round(coverage_pct * 10) / 10 });
  } catch (e) {
    console.error("ar-automap error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
