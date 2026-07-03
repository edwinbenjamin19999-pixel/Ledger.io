import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface VATSnapshot {
  box05: number; box06: number; box07: number; box08: number;
  box10: number; box11: number; box12: number;
  box20: number; box21: number; box22: number; box23: number; box24: number;
  box30: number; box31: number; box32: number;
  box35: number; box36: number; box39: number; box40: number; box41: number; box42: number;
  box48: number; box49: number;
  box50: number; box60: number; box61: number; box62: number;
}

type Severity = "critical" | "high" | "medium" | "info";
type Category = "completeness" | "rate_consistency" | "historical" | "classification" | "manual_adjustment";

interface Finding {
  id: string;
  severity: Severity;
  title: string;
  explanation: string;
  affectedBox: string | null;
  affectedTxCount: number;
  financialImpact: number;
  confidence: number;
  category: Category;
  suggestedFix?: string;
}

// Embedded deterministic engine (mirrors src/lib/vat/vatReviewEngine.ts)
function runRules(current: VATSnapshot, previous: VATSnapshot | null, overrideCount: number): Finding[] {
  const f: Finding[] = [];
  const v = current;
  const totalSales = v.box05 + v.box06 + v.box07;

  if (v.box05 > 0 && v.box10 === 0) {
    f.push({ id: "missing_output_25", severity: "critical", title: "Försäljning 25% utan utgående moms",
      explanation: `Ruta 05 har ${v.box05.toLocaleString("sv-SE")} kr men ruta 10 är 0.`,
      affectedBox: "10", affectedTxCount: 0, financialImpact: Math.round(v.box05 * 0.25), confidence: 95, category: "completeness",
      suggestedFix: "Granska försäljningsbokningar utan momskonto 2610." });
  }
  if (v.box06 > 0 && v.box11 === 0) {
    f.push({ id: "missing_output_12", severity: "high", title: "Försäljning 12% utan utgående moms",
      explanation: `Ruta 06 har ${v.box06.toLocaleString("sv-SE")} kr men ruta 11 är 0.`,
      affectedBox: "11", affectedTxCount: 0, financialImpact: Math.round(v.box06 * 0.12), confidence: 95, category: "completeness" });
  }
  if (v.box07 > 0 && v.box12 === 0) {
    f.push({ id: "missing_output_6", severity: "high", title: "Försäljning 6% utan utgående moms",
      explanation: `Ruta 07 har ${v.box07.toLocaleString("sv-SE")} kr men ruta 12 är 0.`,
      affectedBox: "12", affectedTxCount: 0, financialImpact: Math.round(v.box07 * 0.06), confidence: 95, category: "completeness" });
  }
  if (v.box48 > 1000 && totalSales === 0) {
    f.push({ id: "input_without_sales", severity: "medium", title: "Ingående moms utan momspliktig försäljning",
      explanation: "Avdragen ingående moms men inga skattepliktiga intäkter denna period.",
      affectedBox: "48", affectedTxCount: 0, financialImpact: v.box48, confidence: 70, category: "classification" });
  }
  if (totalSales > 0 && v.box48 > 0 && v.box48 < totalSales * 0.03) {
    f.push({ id: "low_input_vat_ratio", severity: "medium", title: "Ovanligt låg ingående moms",
      explanation: `Ingående moms (${v.box48.toLocaleString("sv-SE")} kr) är låg jämfört med försäljning. Saknas leverantörsfakturor?`,
      affectedBox: "48", affectedTxCount: 0, financialImpact: Math.round(totalSales * 0.05), confidence: 65, category: "completeness",
      suggestedFix: "Kontrollera om alla leverantörsfakturor är inlästa." });
  }
  if (v.box49 < -50000) {
    f.push({ id: "large_refund", severity: "info", title: "Stor momsåterbetalning",
      explanation: `Återbetalning på ${Math.abs(v.box49).toLocaleString("sv-SE")} kr. Skatteverket kan begära underlag.`,
      affectedBox: "49", affectedTxCount: 0, financialImpact: Math.abs(v.box49), confidence: 100, category: "completeness",
      suggestedFix: "Säkerställ att alla bilagor finns tillgängliga." });
  }
  if (previous) {
    const prevSales = previous.box05 + previous.box06 + previous.box07;
    if (prevSales > 0) {
      const delta = totalSales - prevSales;
      if (Math.abs(delta) / prevSales > 0.4) {
        f.push({ id: "revenue_spike", severity: delta > 0 ? "info" : "medium",
          title: delta > 0 ? "Stor ökning av momspliktig försäljning" : "Stor minskning av momspliktig försäljning",
          explanation: `Försäljning ändrad ${Math.round((delta / prevSales) * 100)}% jämfört med föregående period.`,
          affectedBox: null, affectedTxCount: 0, financialImpact: delta, confidence: 90, category: "historical" });
      }
    }
  }
  if ((v.box20 + v.box21 + v.box22 + v.box23 + v.box24) > 0 && (v.box30 + v.box31 + v.box32) === 0) {
    f.push({ id: "reverse_charge_missing_output", severity: "high", title: "Omvänd skattskyldighet utan utgående moms",
      explanation: "Inköp med omvänd skattskyldighet (rutor 20–24) saknar utgående moms (rutor 30–32).",
      affectedBox: "30", affectedTxCount: 0, financialImpact: Math.round((v.box20 + v.box21 + v.box22 + v.box23 + v.box24) * 0.25),
      confidence: 90, category: "completeness" });
  }
  if (overrideCount > 0) {
    f.push({ id: "manual_overrides_present", severity: "info", title: `${overrideCount} manuella justeringar aktiva`,
      explanation: "Rutor har manuellt justerats. Säkerställ att skälen är dokumenterade.",
      affectedBox: null, affectedTxCount: overrideCount, financialImpact: 0, confidence: 100, category: "manual_adjustment" });
  }
  return f;
}

function calculateBreakdown(findings: Finding[], hasHistory: boolean) {
  const dim = (cat: Category) => {
    const rel = findings.filter((f) => f.category === cat);
    if (rel.length === 0) return 100;
    const penalty = rel.reduce((s, f) => s + (f.severity === "critical" ? 35 : f.severity === "high" ? 20 : f.severity === "medium" ? 10 : 3), 0);
    return Math.max(0, 100 - penalty);
  };
  return {
    completeness: dim("completeness"),
    rate_consistency: dim("rate_consistency"),
    historical: hasHistory ? dim("historical") : 0,
    classification: dim("classification"),
    manual_adjustment: dim("manual_adjustment"),
  };
}

function deriveVerdict(findings: Finding[]): "correct" | "review" | "critical" {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "high" || f.severity === "medium")) return "review";
  return "correct";
}

function deriveRecommendation(verdict: "correct" | "review" | "critical"): "ready" | "review" | "do_not_submit" {
  if (verdict === "critical") return "do_not_submit";
  if (verdict === "review") return "review";
  return "ready";
}

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const { vatData, previousData, overrides, periodLabel, companyId } = await req.json();
    if (!vatData || !companyId) return corsError("vatData och companyId krävs", 400);

    const overrideCount = overrides ? Object.keys(overrides).length : 0;
    const hasHistory = !!previousData;

    // Run deterministic rules first
    const ruleFindings = runRules(vatData as VATSnapshot, (previousData as VATSnapshot) || null, overrideCount);
    const breakdown = calculateBreakdown(ruleFindings, hasHistory);
    const baseVerdict = deriveVerdict(ruleFindings);

    // Auth check (lazy — uses RLS via service-role only for inserts)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Call Lovable AI for reasoning layer
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiSummary = "";
    let aiReasoning = "";
    let modelUsed = "deterministic-only";

    if (LOVABLE_API_KEY) {
      try {
        const prompt = `Du är en svensk momsexpert. Granska denna momsdeklaration och ge en kort sammanfattning (2-3 meningar).

Period: ${periodLabel}
Moms att betala: ${vatData.box49} kr
Försäljning 25%: ${vatData.box05} kr
Utgående moms 25%: ${vatData.box10} kr
Ingående moms: ${vatData.box48} kr
${hasHistory ? `Föregående period — försäljning: ${(previousData.box05 + previousData.box06 + previousData.box07)} kr, ingående: ${previousData.box48} kr` : ""}

Identifierade observationer (regelbaserade):
${ruleFindings.map((f) => `- [${f.severity}] ${f.title}: ${f.explanation}`).join("\n") || "Inga"}

Ge ett JSON-svar med fälten:
- summary: kort sammanfattning på svenska (2-3 meningar)
- reasoning: 1-2 meningar om slutrekommendationen`;

        try {
          const { callAIWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
          const { data: aiData, modelUsed: usedModel } = await callAIWithFallback({
            ...MODEL_CHAINS.compliance,
            messages: [
              { role: "system", content: "Du är en svensk momsexpert som ger korta, professionella granskningar." },
              { role: "user", content: prompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "vat_review_summary",
                description: "Ger en sammanfattning av momsgranskning",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "2-3 meningar sammanfattning på svenska" },
                    reasoning: { type: "string", description: "1-2 meningar motivering till rekommendationen" },
                  },
                  required: ["summary", "reasoning"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "vat_review_summary" } },
          });
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            aiSummary = parsed.summary || "";
            aiReasoning = parsed.reasoning || "";
            modelUsed = usedModel;
          }
        } catch (e: any) {
          // Soft-fail — VAT review still returns deterministic results without AI summary.
          console.warn("[vat-ai-review] AI layer unavailable, returning deterministic-only:", e?.message);
        }
      } catch (e) {
        console.error("vat-ai-review: LLM call failed", e);
      }
    }

    // Fallback summary
    if (!aiSummary) {
      aiSummary = ruleFindings.length === 0
        ? "Momsdeklarationen ser strukturellt korrekt ut. Inga avvikelser hittade i automatisk granskning."
        : `${ruleFindings.length} observation${ruleFindings.length === 1 ? "" : "er"} identifierade. Granska detaljer nedan innan inlämning.`;
    }

    const conf = (() => {
      const dims = hasHistory
        ? [breakdown.completeness, breakdown.rate_consistency, breakdown.historical, breakdown.classification, breakdown.manual_adjustment]
        : [breakdown.completeness, breakdown.rate_consistency, breakdown.classification, breakdown.manual_adjustment];
      return Math.round(dims.reduce((a, c) => a + c, 0) / dims.length);
    })();

    const result = {
      verdict: baseVerdict,
      summary: aiSummary,
      confidence: conf,
      findings: ruleFindings,
      confidenceBreakdown: breakdown,
      recommendation: deriveRecommendation(baseVerdict),
      reasoning: aiReasoning,
      modelUsed,
    };

    // Persist review (service role bypasses RLS for write)
    try {
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
      await adminClient.from("vat_ai_reviews").insert({
        company_id: companyId,
        period_label: periodLabel,
        verdict: result.verdict,
        summary: result.summary,
        confidence: result.confidence,
        findings: result.findings,
        confidence_breakdown: result.confidenceBreakdown,
        recommendation: result.recommendation,
        vat_data_snapshot: vatData,
        model_used: modelUsed,
        created_by: userId,
      });

      // Cross-module signals → ai_economist_actions (scope: vat+tax)
      const taxSignals: any[] = [];
      const totalSales = vatData.box05 + vatData.box06 + vatData.box07;
      if (totalSales > 0 && vatData.box48 < totalSales * 0.03) {
        taxSignals.push({
          company_id: companyId,
          action_type: "review",
          status: "pending",
          title: "Låg ingående moms — möjlig påverkan på skattepliktigt resultat",
          payload: { source_module: "vat", explanation: "Låg avdragsgill ingående moms tyder på saknade kostnader, vilket kan höja skattepliktigt resultat.", period: periodLabel },
          scope: ["vat", "tax"],
          confidence: 65,
          financial_impact: Math.round(totalSales * 0.05),
          automation_mode: "supervised",
        });
      }
      if (totalSales > 500000) {
        taxSignals.push({
          company_id: companyId,
          action_type: "review",
          status: "pending",
          title: "Hög omsättning — påverkar bolagsskatt",
          payload: { source_module: "vat", explanation: "Hög momspliktig försäljning kan leda till högre preliminärskatt.", period: periodLabel },
          scope: ["vat", "tax"],
          confidence: 80,
          financial_impact: Math.round(totalSales * 0.206),
          automation_mode: "supervised",
        });
      }
      if (taxSignals.length > 0) {
        await adminClient.from("ai_economist_actions").insert(taxSignals);
      }
    } catch (persistErr) {
      console.error("vat-ai-review: persist failed", persistErr);
      // Non-fatal — return result anyway
    }

    return corsJson(result);
  } catch (e: any) {
    console.error("vat-ai-review error:", e);
    return corsError(e.message || "Okänt fel", 500);
  }
});
