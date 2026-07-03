// Payroll Pre-Review: AI-anomalidetektering inför löneutbetalning
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { payroll_run_id, company_id } = await req.json();
    if (!payroll_run_id || !company_id) {
      return new Response(JSON.stringify({ error: "payroll_run_id & company_id krävs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Aktuell körning + rader
    const { data: currentRun, error: runErr } = await supabase
      .from("payroll_runs")
      .select("*, payroll_lines(*, employee:employees(id, first_name, last_name, monthly_salary, personal_number))")
      .eq("id", payroll_run_id)
      .single();

    if (runErr || !currentRun) throw new Error(runErr?.message || "Lönekörning saknas");

    // Föregående körning för jämförelse
    const { data: prevRuns } = await supabase
      .from("payroll_runs")
      .select("*, payroll_lines(employee_id, gross_salary, net_salary)")
      .eq("company_id", company_id)
      .lt("created_at", currentRun.created_at)
      .order("created_at", { ascending: false })
      .limit(1);

    const prevRun = prevRuns?.[0];
    const flags: any[] = [];

    // Per-anställd analys
    for (const line of currentRun.payroll_lines || []) {
      const emp = line.employee;
      if (!emp) continue;

      // 1. Saknat personnummer
      if (!emp.personal_number || emp.personal_number.length < 10) {
        flags.push({
          payroll_run_id,
          company_id,
          employee_id: emp.id,
          severity: "error",
          flag_type: "missing_data",
          title: "Saknar personnummer",
          description: `${emp.first_name} ${emp.last_name} saknar giltigt personnummer — krävs för AGI.`,
          ai_recommendation: "Lägg till personnummer i anställningsprofilen innan körning.",
        });
      }

      // 2. Jämförelse med föregående månad
      const prevLine = prevRun?.payroll_lines?.find((l: any) => l.employee_id === emp.id);
      if (prevLine && Number(prevLine.gross_salary) > 0) {
        const diff = (Number(line.gross_salary) - Number(prevLine.gross_salary)) / Number(prevLine.gross_salary);
        if (Math.abs(diff) > 0.25) {
          flags.push({
            payroll_run_id,
            company_id,
            employee_id: emp.id,
            severity: diff > 0.5 ? "warning" : "review",
            flag_type: "salary_change",
            title: `Lön ändrad ${(diff * 100).toFixed(0)}% mot föregående`,
            description: `${emp.first_name} ${emp.last_name}: ${prevLine.gross_salary.toLocaleString("sv-SE")} → ${line.gross_salary.toLocaleString("sv-SE")} kr`,
            ai_recommendation: diff > 0.5
              ? "Stor ökning. Kontrollera om bonus/övertid är korrekt registrerat."
              : "Granska källdata för ändringen.",
          });
        }
      }

      // 3. Lön = 0 eller orimligt låg
      if (Number(line.gross_salary) <= 0) {
        flags.push({
          payroll_run_id,
          company_id,
          employee_id: emp.id,
          severity: "error",
          flag_type: "zero_salary",
          title: "Bruttolön = 0",
          description: `${emp.first_name} ${emp.last_name} har ingen lön denna körning.`,
          ai_recommendation: "Kontrollera om anställd ska exkluderas eller om event saknas.",
        });
      }
    }

    // 4. Total körning vs föregående
    if (prevRun && Number(prevRun.total_gross) > 0) {
      const totalDiff = (Number(currentRun.total_gross) - Number(prevRun.total_gross)) / Number(prevRun.total_gross);
      if (Math.abs(totalDiff) > 0.15) {
        flags.push({
          payroll_run_id,
          company_id,
          employee_id: null,
          severity: "review",
          flag_type: "total_change",
          title: `Total körning ${totalDiff > 0 ? "+" : ""}${(totalDiff * 100).toFixed(0)}% mot föregående`,
          description: `${prevRun.total_gross.toLocaleString("sv-SE")} → ${currentRun.total_gross.toLocaleString("sv-SE")} kr`,
          ai_recommendation: "Granska om förändringen förklaras av nyanställningar, bonusar eller frånvaro.",
        });
      }
    }

    // Spara flaggor (rensa gamla först)
    await supabase.from("payroll_review_flags").delete().eq("payroll_run_id", payroll_run_id);
    if (flags.length > 0) {
      const { error: insErr } = await supabase.from("payroll_review_flags").insert(flags);
      if (insErr) console.error("flag insert error:", insErr);
    }

    // Skapa per-anställd godkännanderader om de saknas
    const lines = currentRun.payroll_lines || [];
    const approvalRows = lines.map((l: any) => ({
      payroll_run_id,
      employee_id: l.employee_id,
      company_id,
      status: flags.some((f) => f.employee_id === l.employee_id && f.severity === "error")
        ? "error"
        : flags.some((f) => f.employee_id === l.employee_id)
        ? "review"
        : "ok",
    }));

    if (approvalRows.length > 0) {
      await supabase
        .from("payroll_employee_approvals")
        .upsert(approvalRows, { onConflict: "payroll_run_id,employee_id" });
    }

    return new Response(
      JSON.stringify({
        flags_created: flags.length,
        employees_ok: approvalRows.filter((r) => r.status === "ok").length,
        employees_review: approvalRows.filter((r) => r.status === "review").length,
        employees_error: approvalRows.filter((r) => r.status === "error").length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("payroll-prereview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
