import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, companyId, conversationHistory = [] } = await req.json();
    if (!message || !companyId) {
      return new Response(JSON.stringify({ error: "Missing message or companyId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    // Get user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Load employees
    const { data: employees } = await supabase
      .from("employees")
      .select("id, first_name, last_name, monthly_salary, is_active, employment_type, tax_table, tax_column, municipality, personal_number, vacation_days_per_year, vacation_days_used, start_date")
      .eq("company_id", companyId);

    // Load recent payroll runs
    const { data: recentRuns } = await supabase
      .from("payroll_runs")
      .select("id, period_start, period_end, status, total_gross, total_net, total_tax, total_employer_cost, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5);

    const employeeList = (employees || []).map(e =>
      `- ${e.first_name} ${e.last_name} (ID: ${e.id}, Lön: ${e.monthly_salary} kr/mån, Aktiv: ${e.is_active}, Kommun: ${e.municipality || 'ej satt'}, Skattetabell: ${e.tax_table || 'ej satt'})`
    ).join("\n");

    const runsList = (recentRuns || []).map(r =>
      `- Period: ${r.period_start} - ${r.period_end}, Status: ${r.status}, Brutto: ${r.total_gross} kr`
    ).join("\n");

    const systemPrompt = `Du är en intelligent löneagent för ett svenskt företag. Du tar emot instruktioner på naturligt språk och utför löneåtgärder.

NUVARANDE ANSTÄLLDA:
${employeeList || "Inga anställda registrerade."}

SENASTE LÖNEKÖRNINGAR:
${runsList || "Inga lönekörningar."}

DU KAN UTFÖRA FÖLJANDE ÅTGÄRDER (svara med JSON-block i formatet nedan):

1. ÄNDRA LÖN:
\`\`\`action
{"action": "update_salary", "employee_id": "<id>", "new_salary": <belopp>, "reason": "<anledning>"}
\`\`\`

2. KÖRA LÖN (med eller utan avvikelser):
\`\`\`action
{"action": "run_payroll", "deviations": {"<Förnamn Efternamn>": {"sick_days": 0, "overtime_hours": 0, "bonus": 0, "vacation_days": 0}}}
\`\`\`

3. UPPDATERA ANSTÄLLD (namn, kommun, skattetabell, etc):
\`\`\`action
{"action": "update_employee", "employee_id": "<id>", "updates": {"field": "value"}}
\`\`\`

4. LÄGGA TILL ANSTÄLLD:
\`\`\`action
{"action": "add_employee", "first_name": "<förnamn>", "last_name": "<efternamn>", "monthly_salary": <belopp>, "personal_number": "<personnummer>", "municipality": "<kommun>"}
\`\`\`

REGLER:
- Matcha alltid instruktioner mot befintliga anställda (förnamn räcker om unikt).
- Bekräfta alltid vad du ska göra INNAN du skickar action-blocket.
- Om du är osäker, fråga.
- Svara alltid på svenska.
- Var koncis men tydlig.
- När du utför en åtgärd, beskriv vad du gör och inkludera action-blocket.
- Du kan utföra flera åtgärder i samma svar (flera action-block).`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-20),
      { role: "user", content: message }
    ];

    // Call AI with model fallback
    const { callAIWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
    let aiData: any;
    try {
      const r = await callAIWithFallback({
        ...MODEL_CHAINS.balancedInsights,
        messages,
        temperature: 0.3,
      });
      aiData = r.data;
      console.log(`[payroll-agent-chat] modelUsed=${r.modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: "AI-krediter slut. Lägg till mer i Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("[payroll-agent-chat] all models failed", e);
      return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en minut." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiText = aiData.choices?.[0]?.message?.content || "Jag kunde inte tolka det. Försök igen.";

    // Parse and execute actions
    const actionBlocks = [...aiText.matchAll(/```action\s*\n([\s\S]*?)```/g)];
    const executedActions: any[] = [];

    for (const block of actionBlocks) {
      try {
        const action = JSON.parse(block[1].trim());

        if (action.action === "update_salary") {
          const { error } = await supabase
            .from("employees")
            .update({ monthly_salary: action.new_salary })
            .eq("id", action.employee_id)
            .eq("company_id", companyId);
          executedActions.push({
            type: "update_salary",
            success: !error,
            employee_id: action.employee_id,
            new_salary: action.new_salary,
            error: error?.message
          });
        }

        if (action.action === "update_employee") {
          const allowedFields = ["first_name", "last_name", "municipality", "tax_table", "tax_column", "employment_type", "personal_number", "vacation_days_per_year"];
          const safeUpdates: Record<string, any> = {};
          for (const [k, v] of Object.entries(action.updates)) {
            if (allowedFields.includes(k)) safeUpdates[k] = v;
          }
          if (Object.keys(safeUpdates).length > 0) {
            const { error } = await supabase
              .from("employees")
              .update(safeUpdates)
              .eq("id", action.employee_id)
              .eq("company_id", companyId);
            executedActions.push({
              type: "update_employee",
              success: !error,
              employee_id: action.employee_id,
              updates: safeUpdates,
              error: error?.message
            });
          }
        }

        if (action.action === "add_employee") {
          const { data: newEmp, error } = await supabase
            .from("employees")
            .insert({
              company_id: companyId,
              first_name: action.first_name,
              last_name: action.last_name,
              monthly_salary: action.monthly_salary || 0,
              personal_number: action.personal_number || null,
              municipality: action.municipality || null,
              is_active: true,
              employment_type: "permanent",
              vacation_days_per_year: 25,
            })
            .select()
            .maybeSingle();
          executedActions.push({
            type: "add_employee",
            success: !error,
            employee: newEmp,
            error: error?.message
          });
        }

        if (action.action === "run_payroll") {
          // We don't run payroll from here - return the parsed deviations
          // and let the frontend handle the actual payroll run flow
          executedActions.push({
            type: "run_payroll",
            success: true,
            deviations: action.deviations || {},
          });
        }
      } catch (e) {
        executedActions.push({ type: "parse_error", error: String(e) });
      }
    }

    // Clean the AI text by removing action blocks for display
    const displayText = aiText.replace(/```action\s*\n[\s\S]*?```/g, "").trim();

    return new Response(JSON.stringify({
      message: displayText,
      actions: executedActions,
      raw: aiText,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Payroll agent error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
