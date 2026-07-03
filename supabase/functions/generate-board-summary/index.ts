import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ModeId = "CEO" | "BOARD" | "INVESTOR";
type ComparisonPeriod = "month" | "year" | "custom" | "last_month" | "last_year" | "budget";

interface KPI {
  key: string;
  label: string;
  value: number | null;
  delta_pct: number | null;
  direction: "up" | "down" | "flat";
  explanation: string;
  format: "currency" | "percent" | "days";
  unavailable_reason?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

const SYSTEM_PROMPTS: Record<ModeId, string> = {
  CEO: "Du är CFO som rapporterar till VD. Skriv MAXIMALT 3 meningar. Lyft akuta likviditets- och kassaflödesrisker FÖRST. Var direkt och operativ. Föreslå konkret nästa steg om relevant. På svenska.",
  BOARD: "Du skriver styrelseunderlag på svenska. Strukturera: (1) Utveckling jmf föregående period (2) Riskexponering (3) Beslutspunkter. Var saklig och balanserad. 4-6 meningar. Inga konton, inga kontonummer.",
  INVESTOR: "Du skriver en investor update på svenska. Narrativt och självsäkert. Fokus: tillväxttakt, bruttomarginal, kapitaleffektivitet. Risker formuleras som strategiska initiativ. 3-5 meningar, presentationsklart.",
};

const KPI_SETS: Record<ModeId, string[]> = {
  CEO: ["cash", "runway", "receivables", "outflows_30d"],
  BOARD: ["revenue", "ebit", "equity", "liquidity", "runway"],
  INVESTOR: ["arr_growth", "gross_margin", "revenue", "capital_efficiency"],
};

const KPI_META: Record<string, { label: string; format: "currency" | "percent" | "days" }> = {
  cash: { label: "Likviditet", format: "currency" },
  runway: { label: "Runway", format: "days" },
  receivables: { label: "Kundfordringar", format: "currency" },
  outflows_30d: { label: "Utflöden 30d", format: "currency" },
  revenue: { label: "Omsättning", format: "currency" },
  ebit: { label: "EBIT", format: "currency" },
  equity: { label: "Eget kapital", format: "currency" },
  liquidity: { label: "Likviditet", format: "currency" },
  arr_growth: { label: "ARR-tillväxt", format: "percent" },
  gross_margin: { label: "Bruttomarginal", format: "percent" },
  capital_efficiency: { label: "Kapitaleffektivitet", format: "percent" },
};

interface CompanyMetrics {
  company_id: string;
  company_name: string;
  revenue: number;
  prevRevenue: number;
  costs: number;
  prevCosts: number;
  cash: number;
  prevCash: number;
  equity: number;
  prevEquity: number;
  receivables: number;
  outflows30d: number;
  hasBank: boolean;
  hasInvoices: boolean;
}

async function aggregateCompany(
  sb: any,
  company_id: string,
  company_name: string,
  comparison: ComparisonPeriod
): Promise<CompanyMetrics> {
  const { data: accounts } = await sb
    .from("chart_of_accounts")
    .select("id, account_number")
    .eq("company_id", company_id);
  const accMap = new Map<string, string>();
  (accounts || []).forEach((a: any) => accMap.set(a.id, a.account_number));
  const accountIds = Array.from(accMap.keys());

  const m: CompanyMetrics = {
    company_id, company_name,
    revenue: 0, prevRevenue: 0, costs: 0, prevCosts: 0,
    cash: 0, prevCash: 0, equity: 0, prevEquity: 0,
    receivables: 0, outflows30d: 0,
    hasBank: false, hasInvoices: false,
  };

  if (accountIds.length === 0) return m;

  const now = new Date();
  const periodStart = new Date(now);
  const prevStart = new Date(now);
  const prevEnd = new Date(now);
  if (comparison === "year" || comparison === "last_year") {
    periodStart.setFullYear(now.getFullYear() - 1);
    prevStart.setFullYear(now.getFullYear() - 2);
    prevEnd.setFullYear(now.getFullYear() - 1);
  } else {
    periodStart.setMonth(now.getMonth() - 1);
    prevStart.setMonth(now.getMonth() - 2);
    prevEnd.setMonth(now.getMonth() - 1);
  }

  // Fetch lines joined with their journal_entries (status + entry_date come from header)
  const { data: lines, error: linesErr } = await sb
    .from("journal_entry_lines")
    .select("account_id, debit, credit, journal_entries!inner(entry_date, status, company_id)")
    .eq("journal_entries.company_id", company_id)
    .in("journal_entries.status", ["approved", "posted"]);

  if (linesErr) console.error("[board-summary] lines query error", company_id, linesErr);
  console.log(`[board-summary] ${company_name} (${company_id}): ${(lines || []).length} lines, ${accountIds.length} accounts`);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  for (const l of (lines || []) as any[]) {
    const acc = accMap.get(l.account_id) || "";
    const d = Number(l.debit || 0);
    const c = Number(l.credit || 0);
    const entryDateStr = l.journal_entries?.entry_date;
    const entryDate = entryDateStr ? new Date(entryDateStr) : null;
    const isCurrent = entryDate ? entryDate >= periodStart : true;
    const isPrev = entryDate ? (entryDate >= prevStart && entryDate < prevEnd) : false;
    const isLast30 = entryDate ? entryDate >= thirtyDaysAgo : false;

    if (acc.startsWith("3")) {
      if (isCurrent) m.revenue += c - d;
      if (isPrev) m.prevRevenue += c - d;
    } else if (/^[4567]/.test(acc)) {
      if (isCurrent) m.costs += d - c;
      if (isPrev) m.prevCosts += d - c;
      if (isLast30) m.outflows30d += d - c;
    } else if (acc.startsWith("19")) {
      if (isCurrent) m.cash += d - c;
      if (isPrev) m.prevCash += d - c;
      m.hasBank = true;
    } else if (acc.startsWith("20")) {
      if (isCurrent) m.equity += c - d;
      if (isPrev) m.prevEquity += c - d;
    } else if (acc.startsWith("15")) {
      m.receivables += d - c;
      m.hasInvoices = true;
    }
  }

  // Fallback: invoices table for receivables
  if (m.receivables <= 0) {
    const { data: invs } = await sb
      .from("invoices")
      .select("total_amount, status, due_date")
      .eq("company_id", company_id)
      .neq("status", "paid");
    const sum = (invs || []).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
    if (sum > 0) { m.receivables = sum; m.hasInvoices = true; }
  }

  return m;
}

const deltaPct = (curr: number, prev: number): number | null => {
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
};
const dir = (d: number | null): "up" | "down" | "flat" =>
  d === null || Math.abs(d) < 1 ? "flat" : d > 0 ? "up" : "down";

function buildKPIs(mode: ModeId, agg: CompanyMetrics): KPI[] {
  const keys = KPI_SETS[mode];
  const ebit = agg.revenue - agg.costs;
  const prevEbit = agg.prevRevenue - agg.prevCosts;
  const monthlyBurn = agg.costs / 12;
  const runwayDays = monthlyBurn > 0 ? Math.round((agg.cash / monthlyBurn) * 30) : null;
  const prevMonthlyBurn = agg.prevCosts / 12;
  const prevRunway = prevMonthlyBurn > 0 ? Math.round((agg.prevCash / prevMonthlyBurn) * 30) : null;
  const grossMargin = agg.revenue > 0 ? ((agg.revenue - agg.costs) / agg.revenue) * 100 : null;
  const prevGrossMargin = agg.prevRevenue > 0 ? ((agg.prevRevenue - agg.prevCosts) / agg.prevRevenue) * 100 : null;
  const arrGrowth = deltaPct(agg.revenue, agg.prevRevenue);
  const capEff = agg.equity > 0 ? (agg.revenue / agg.equity) * 100 : null;

  const make = (key: string, value: number | null, prev: number | null, unavailable?: string): KPI => {
    const meta = KPI_META[key];
    if (value === null || unavailable) {
      return {
        key, label: meta.label, value: null, delta_pct: null, direction: "flat",
        explanation: "", format: meta.format, unavailable_reason: unavailable || "Otillräcklig data",
      };
    }
    const d = prev !== null ? deltaPct(value, prev) : null;
    return {
      key, label: meta.label, value, delta_pct: d, direction: dir(d), explanation: "", format: meta.format,
    };
  };

  return keys.map(k => {
    switch (k) {
      case "cash": return make("cash", agg.hasBank ? agg.cash : null, agg.prevCash, agg.hasBank ? undefined : "Ingen bankdata kopplad");
      case "runway": return make("runway", runwayDays, prevRunway, runwayDays === null ? "Saknar kostnadsbas" : undefined);
      case "receivables": return make("receivables", agg.hasInvoices ? agg.receivables : null, null, agg.hasInvoices ? undefined : "Inga kundfakturor");
      case "outflows_30d": return make("outflows_30d", agg.outflows30d, null);
      case "revenue": return make("revenue", agg.revenue, agg.prevRevenue);
      case "ebit": return make("ebit", ebit, prevEbit);
      case "equity": return make("equity", agg.equity, agg.prevEquity);
      case "liquidity": return make("liquidity", agg.hasBank ? agg.cash : null, agg.prevCash, agg.hasBank ? undefined : "Ingen bankdata kopplad");
      case "arr_growth": return make("arr_growth", arrGrowth, null, arrGrowth === null ? "Ingen historisk jämförelse" : undefined);
      case "gross_margin": return make("gross_margin", grossMargin, prevGrossMargin, grossMargin === null ? "Ingen omsättning" : undefined);
      case "capital_efficiency": return make("capital_efficiency", capEff, null, capEff === null ? "Eget kapital saknas" : undefined);
      default: return make(k, 0, 0);
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      company_id?: string;
      entity_ids?: string[];
      mode?: ModeId;
      comparison_period?: ComparisonPeriod;
      narrative_variant?: ModeId;
    };

    const mode: ModeId = body.mode || "BOARD";
    const comparison = body.comparison_period || "month";
    const narrativeVariant: ModeId = body.narrative_variant || mode;

    let entityIds = body.entity_ids && body.entity_ids.length > 0
      ? body.entity_ids
      : (body.company_id ? [body.company_id] : []);

    if (entityIds.length === 0) {
      return new Response(JSON.stringify({ error: "entity_ids or company_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const sb = createClient(SB_URL, SB_KEY);

    // Fetch company names
    const { data: companyRows } = await sb
      .from("companies")
      .select("id, name")
      .in("id", entityIds);
    const nameMap = new Map<string, string>();
    (companyRows || []).forEach((c: any) => nameMap.set(c.id, c.name));

    // Aggregate per-company
    const perEntity: CompanyMetrics[] = await Promise.all(
      entityIds.map(id => aggregateCompany(sb, id, nameMap.get(id) || "Okänt bolag", comparison))
    );

    // Group/single aggregate
    const agg: CompanyMetrics = perEntity.reduce((acc, m) => ({
      company_id: "group",
      company_name: "Koncern",
      revenue: acc.revenue + m.revenue,
      prevRevenue: acc.prevRevenue + m.prevRevenue,
      costs: acc.costs + m.costs,
      prevCosts: acc.prevCosts + m.prevCosts,
      cash: acc.cash + m.cash,
      prevCash: acc.prevCash + m.prevCash,
      equity: acc.equity + m.equity,
      prevEquity: acc.prevEquity + m.prevEquity,
      receivables: acc.receivables + m.receivables,
      outflows30d: acc.outflows30d + m.outflows30d,
      hasBank: acc.hasBank || m.hasBank,
      hasInvoices: acc.hasInvoices || m.hasInvoices,
    }), {
      company_id: "group", company_name: "Koncern",
      revenue: 0, prevRevenue: 0, costs: 0, prevCosts: 0,
      cash: 0, prevCash: 0, equity: 0, prevEquity: 0,
      receivables: 0, outflows30d: 0, hasBank: false, hasInvoices: false,
    });

    const kpis = buildKPIs(mode, agg);

    // Per-entity breakdown for group view
    const per_entity_breakdown = perEntity.length > 1
      ? perEntity.map(m => ({
          company_id: m.company_id,
          company_name: m.company_name,
          revenue: m.revenue,
          ebit: m.revenue - m.costs,
          cash: m.hasBank ? m.cash : null,
          revenue_share_pct: agg.revenue > 0 ? (m.revenue / agg.revenue) * 100 : 0,
        }))
      : [];

    // Insights (shared CFO scoring) — single company only
    let allInsights: any[] = [];
    if (perEntity.length === 1) {
      try {
        const { data: priorities } = await sb.functions.invoke("score-cfo-priorities", {
          body: { company_id: perEntity[0].company_id, persona_mode: "business_owner" },
        });
        allInsights = [...(priorities?.top || []), ...(priorities?.more || [])];
      } catch { /* tolerate */ }
    }

    const risks = allInsights
      .filter((i: any) => ["critical", "high", "medium"].includes(i.tier))
      .slice(0, 5)
      .map((i: any) => ({
        id: i.id, severity: i.tier, title: i.title, explanation: i.explanation,
        impact: i.impact_sek, action_label: i.cta_label, action_type: i.action_type,
      }));

    const changes = kpis
      .filter(k => k.delta_pct !== null && Math.abs(k.delta_pct) >= 5)
      .sort((a, b) => Math.abs(b.delta_pct!) - Math.abs(a.delta_pct!))
      .slice(0, 5)
      .map(k => ({
        label: k.label,
        delta_pct: k.delta_pct,
        direction: k.direction,
        impact: k.value || 0,
        explanation: `${k.label} ${k.direction === "up" ? "ökade" : "minskade"} med ${Math.abs(k.delta_pct!).toFixed(1)}% jmf föregående period.`,
      }));

    const actions = allInsights
      .filter((i: any) => i.action_type && i.action_type !== "none")
      .slice(0, 4)
      .map((i: any) => ({
        id: i.id, title: i.title, impact: i.impact_sek, confidence: i.confidence,
        urgency: i.tier, action_type: i.action_type, cta_label: i.cta_label,
      }));

    // AI summary — mode-aware
    const ebit = agg.revenue - agg.costs;
    const monthlyBurn = agg.costs / 12;
    const runwayDays = monthlyBurn > 0 ? Math.round((agg.cash / monthlyBurn) * 30) : null;

    const fallbackSummary = () => {
      if (mode === "CEO") {
        if (runwayDays !== null && runwayDays < 60) return `Akut: endast ${runwayDays} dagars runway. Likviditet ${fmt(agg.cash)} kr, utflöden ~${fmt(agg.outflows30d)} kr senaste 30d. Skicka kundpåminnelser nu.`;
        return `Likviditet ${fmt(agg.cash)} kr, runway ${runwayDays || "?"} dagar. Resultat ${fmt(ebit)} kr. ${risks.length} aktiv${risks.length === 1 ? "" : "a"} risk${risks.length === 1 ? "" : "er"} kräver beslut.`;
      }
      if (mode === "INVESTOR") {
        const grow = deltaPct(agg.revenue, agg.prevRevenue);
        const margin = agg.revenue > 0 ? ((agg.revenue - agg.costs) / agg.revenue) * 100 : 0;
        return `Omsättning ${fmt(agg.revenue)} kr (${grow !== null ? (grow > 0 ? "+" : "") + grow.toFixed(1) + "% YoY" : "ny period"}). Bruttomarginal ${margin.toFixed(1)}%. Verksamheten visar ${ebit >= 0 ? "lönsam tillväxt" : "investeringsfas"} med fokus på kapitaleffektivitet.`;
      }
      // BOARD
      const dirText = ebit >= 0 ? "lönsam" : "förlustbringande";
      const cashText = runwayDays && runwayDays < 60 ? ` Likviditeten är ansträngd med ${runwayDays} dagars runway.` : ` Likviditeten är stabil.`;
      return `Verksamheten är ${dirText} med ett resultat på ${fmt(ebit)} kr.${cashText} ${risks.length} risk${risks.length === 1 ? "" : "er"} kräver styrelsens uppmärksamhet.`;
    };

    let summary = "";
    let opportunities: any[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const entityContext = perEntity.length > 1
          ? `KONCERN (${perEntity.length} bolag): ${perEntity.map(p => `${p.company_name} (oms ${fmt(p.revenue)} kr)`).join(", ")}.`
          : `Bolag: ${agg.company_name || perEntity[0]?.company_name}.`;

        const userMsg = `${entityContext}

Aktivt läge: ${mode}.
KPIs (mode-specifika):
${kpis.map(k => `- ${k.label}: ${k.unavailable_reason ? `OTILLGÄNGLIG (${k.unavailable_reason})` : fmt(Number(k.value)) + (k.format === "currency" ? " kr" : k.format === "percent" ? "%" : " dagar") + (k.delta_pct !== null ? ` (${k.delta_pct > 0 ? "+" : ""}${k.delta_pct.toFixed(1)}%)` : "")}`).join("\n")}

Risker (${risks.length}): ${risks.map((r: any) => r.title).join(" · ") || "inga"}

Generera JSON: "summary" (anpassat efter ${mode}-läge enligt systeminstruktioner) och "opportunities" (0-3 förslag).`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: SYSTEM_PROMPTS[narrativeVariant] },
              { role: "user", content: userMsg },
            ],
            tools: [{
              type: "function",
              function: {
                name: "board_summary",
                description: "Mode-specific executive summary",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    opportunities: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          explanation: { type: "string" },
                          estimated_impact: { type: "number" },
                          action: { type: "string" },
                        },
                        required: ["title", "explanation", "estimated_impact", "action"],
                      },
                    },
                  },
                  required: ["summary", "opportunities"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "board_summary" } },
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            summary = parsed.summary || fallbackSummary();
            opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 3) : [];
          }
        } else if (aiResp.status === 429 || aiResp.status === 402) {
          summary = fallbackSummary();
        } else {
          summary = fallbackSummary();
        }
      } catch (e) {
        console.error("AI summary failed", e);
        summary = fallbackSummary();
      }
    } else {
      summary = fallbackSummary();
    }

    return new Response(JSON.stringify({
      mode,
      narrative_variant: narrativeVariant,
      summary,
      kpis,
      changes,
      risks,
      opportunities,
      actions,
      per_entity_breakdown,
      entity_count: perEntity.length,
      comparison_period: comparison,
      updated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-board-summary error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
