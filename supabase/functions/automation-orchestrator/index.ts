import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Automation Orchestrator
 * 
 * Called after key events (journal entry created, payroll approved, period end)
 * to automatically chain downstream processes:
 *   1. Journal entry created → check if VAT period should be recalculated
 *   2. Payroll approved → prepare AGI submission task
 *   3. Year-end → prepare annual report + tax calculation
 */

interface OrchestratorInput {
  company_id: string;
  trigger: "journal_entry_created" | "payroll_approved" | "period_check" | "year_end";
  payload?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const input: OrchestratorInput = await req.json();
    const { company_id, trigger, payload } = input;

    if (!trigger) {
      return new Response(JSON.stringify({ error: "trigger required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle "all companies" for scheduled jobs
    if (company_id === "all" && trigger === "period_check") {
      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .in("subscription_status", ["active", "trialing"]);

      const allResults = [];
      for (const co of (companies || []).slice(0, 20)) {
        try {
          const { data } = await supabase.functions.invoke("automation-orchestrator", {
            body: { company_id: co.id, trigger: "period_check" },
            headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
          });
          allResults.push({ company_id: co.id, ...data });
        } catch (e) {
          console.error(`[Orchestrator] period_check failed for ${co.id}:`, e);
        }
      }
      return new Response(JSON.stringify({ results: allResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Orchestrator] trigger=${trigger} company=${company_id}`);

    // Check automation settings for this company
    const { data: settings } = await supabase
      .from("automation_settings")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();

    const results: Record<string, any> = { trigger, actions: [] };

    // ─────────────────────────────────────────────
    // 1. JOURNAL ENTRY CREATED → Auto-recalculate VAT
    // ─────────────────────────────────────────────
    if (trigger === "journal_entry_created") {
      const entryDate = payload?.entry_date || new Date().toISOString().split("T")[0];
      const [year, month] = entryDate.split("-").map(Number);

      // Determine period type from company settings
      const periodType = settings?.vat_period_type || "monthly";

      // Check if we already have a pending VAT task for this period
      const periodKey = periodType === "monthly"
        ? `${year}-${String(month).padStart(2, "0")}`
        : periodType === "quarterly"
          ? `Q${Math.ceil(month / 3)} ${year}`
          : String(year);

      const { data: existingVatTask } = await supabase
        .from("automation_tasks")
        .select("id, status")
        .eq("company_id", company_id)
        .eq("task_type", "vat_declaration")
        .in("status", ["pending", "ready_for_approval", "processing"])
        .limit(1)
        .maybeSingle();

      // Auto-prepare VAT if enabled (or always recalculate in background)
      if (settings?.vat_auto_prepare !== false) {
        try {
          const vatBody: Record<string, any> = {
            company_id,
            period_year: year,
            period_type: periodType,
          };
          if (periodType === "monthly") vatBody.period_month = month;
          if (periodType === "quarterly") vatBody.period_quarter = Math.ceil(month / 3);

          const { data: vatResult, error: vatError } = await supabase.functions.invoke("calculate-vat", {
            body: vatBody,
            headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
          });

          if (vatError) {
            console.error("[Orchestrator] VAT calc error:", vatError);
          } else {
            console.log("[Orchestrator] VAT recalculated:", vatResult?.summary);
            results.actions.push({
              type: "vat_recalculated",
              period: periodKey,
              vat_to_pay: vatResult?.summary?.vat_to_pay,
            });
          }
        } catch (e) {
          console.error("[Orchestrator] VAT invoke failed:", e);
        }
      }

      // Check for proactive insights after new entry
      try {
        await supabase.functions.invoke("proactive-insights", {
          body: { company_id },
          headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
        });
        results.actions.push({ type: "proactive_insights_refreshed" });
      } catch (e) {
        console.warn("[Orchestrator] Proactive insights failed (non-critical):", e);
      }
    }

    // ─────────────────────────────────────────────
    // 2. PAYROLL APPROVED → Auto-prepare AGI
    // ─────────────────────────────────────────────
    if (trigger === "payroll_approved") {
      const payrollRunId = payload?.payroll_run_id;
      if (!payrollRunId) {
        console.error("[Orchestrator] payroll_approved missing payroll_run_id");
      } else if (settings?.agi_auto_prepare !== false) {
        // Get payroll run details
        const { data: payrollRun } = await supabase
          .from("payroll_runs")
          .select("id, period_start, period_end, total_gross, total_tax, total_net, total_employer_cost")
          .eq("id", payrollRunId)
          .maybeSingle();

        if (payrollRun) {
          const periodStart = new Date(payrollRun.period_start);
          const periodYear = periodStart.getFullYear();
          const periodMonth = periodStart.getMonth() + 1;

          // Ensure AGI period exists
          const { data: existingPeriod } = await supabase
            .from("agi_periods")
            .select("id")
            .eq("company_id", company_id)
            .eq("period_year", periodYear)
            .eq("period_month", periodMonth)
            .maybeSingle();

          if (!existingPeriod) {
            await supabase.from("agi_periods").insert({
              company_id,
              period_year: periodYear,
              period_month: periodMonth,
              status: "draft",
              payroll_run_id: payrollRunId,
            });
          }

          // Create automation task for AGI approval
          const summary = `AGI ${periodYear}-${String(periodMonth).padStart(2, "0")}: Bruttolön ${payrollRun.total_gross?.toLocaleString("sv-SE")} kr, Skatt ${payrollRun.total_tax?.toLocaleString("sv-SE")} kr, Avgifter ${((payrollRun.total_employer_cost || 0) - (payrollRun.total_gross || 0)).toLocaleString("sv-SE")} kr`;

          await supabase.from("automation_tasks").upsert(
            {
              company_id,
              task_type: "agi_submission",
              related_entity_type: "payroll_run",
              related_entity_id: payrollRunId,
              status: "ready_for_approval",
              prepared_data: payrollRun,
              approval_summary: summary,
              requires_approval: true,
            },
            { onConflict: "company_id,task_type,related_entity_id" }
          );

          results.actions.push({
            type: "agi_task_created",
            period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
          });

          // If auto-submit is enabled, approve immediately
          if (settings?.agi_auto_submit) {
            console.log("[Orchestrator] AGI auto-submit enabled — submitting directly");
            try {
              await supabase.functions.invoke("skatteverket-agi-submit", {
                body: { payroll_run_id: payrollRunId },
                headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
              });
              results.actions.push({ type: "agi_auto_submitted" });
            } catch (e) {
              console.error("[Orchestrator] AGI auto-submit failed:", e);
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────
    // 3. PERIOD CHECK → Deadline reminders + auto-prepare
    // ─────────────────────────────────────────────
    if (trigger === "period_check") {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Check VAT deadline (12th of following month for monthly)
      const vatDeadlineDay = 12;
      const daysUntilVatDeadline = vatDeadlineDay - now.getDate();
      const reminderDays = settings?.vat_reminder_days_before || 5;

      if (daysUntilVatDeadline <= reminderDays && daysUntilVatDeadline > 0) {
        // Previous month's VAT is due
        const vatMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const vatYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const { data: existingDecl } = await supabase
          .from("vat_declarations")
          .select("id, status")
          .eq("company_id", company_id)
          .eq("period_year", vatYear)
          .eq("period_month", vatMonth)
          .maybeSingle();

        if (!existingDecl || existingDecl.status === "draft") {
          // Auto-prepare VAT
          try {
            await supabase.functions.invoke("calculate-vat", {
              body: {
                company_id,
                period_year: vatYear,
                period_month: vatMonth,
                period_type: "monthly",
              },
              headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
            });
            results.actions.push({
              type: "vat_auto_prepared_deadline",
              period: `${vatYear}-${String(vatMonth).padStart(2, "0")}`,
              days_until_deadline: daysUntilVatDeadline,
            });
          } catch (e) {
            console.error("[Orchestrator] Deadline VAT prep failed:", e);
          }
        }
      }

      // Check AGI deadline (same day)
      if (daysUntilVatDeadline <= (settings?.agi_reminder_days_before || 5) && daysUntilVatDeadline > 0) {
        results.actions.push({ type: "agi_deadline_reminder", days: daysUntilVatDeadline });
      }
    }

    // ─────────────────────────────────────────────
    // 4. YEAR END → Prepare annual report + tax calc
    // ─────────────────────────────────────────────
    if (trigger === "year_end") {
      const fiscalYear = payload?.fiscal_year || new Date().getFullYear() - 1;

      if (settings?.annual_report_auto_prepare !== false) {
        // Trigger year-end audit
        try {
          const { data: auditResult } = await supabase.functions.invoke("ai-year-end-audit", {
            body: { company_id, fiscal_year: fiscalYear },
            headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
          });
          results.actions.push({
            type: "year_end_audit_completed",
            risk_level: auditResult?.risk_level,
          });
        } catch (e) {
          console.error("[Orchestrator] Year-end audit failed:", e);
        }

        // Trigger tax calculation
        try {
          const { data: taxResult } = await supabase.functions.invoke("calculate-corporate-tax", {
            body: { company_id, fiscal_year: fiscalYear },
            headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
          });
          results.actions.push({
            type: "tax_calculated",
            taxable_income: taxResult?.taxable_income,
          });
        } catch (e) {
          console.error("[Orchestrator] Tax calc failed:", e);
        }

        // Trigger annual report generation
        try {
          const { data: reportResult } = await supabase.functions.invoke("generate-annual-report", {
            body: {
              company_id,
              fiscal_year: fiscalYear,
              report_type: settings?.annual_report_type || "k2",
            },
            headers: { Authorization: req.headers.get("Authorization") || `Bearer ${supabaseKey}` },
          });

          if (reportResult?.report?.id) {
            await supabase.from("automation_tasks").insert({
              company_id,
              task_type: "annual_report",
              related_entity_type: "annual_report",
              related_entity_id: reportResult.report.id,
              status: "ready_for_approval",
              prepared_data: reportResult,
              approval_summary: `Årsredovisning ${fiscalYear}: Intäkter ${reportResult.report?.revenue?.toLocaleString("sv-SE") || "?"} kr, Resultat ${reportResult.report?.net_profit?.toLocaleString("sv-SE") || "?"} kr`,
              requires_approval: true,
            });
            results.actions.push({ type: "annual_report_prepared" });
          }
        } catch (e) {
          console.error("[Orchestrator] Annual report gen failed:", e);
        }
      }
    }

    // Notify if configured
    if (settings?.notify_on_completion && results.actions.length > 0) {
      const actionSummary = results.actions.map((a: any) => a.type).join(", ");
      await supabase.from("bank_notifications").insert({
        company_id,
        notification_type: "automation",
        title: "Automatisering slutförd",
        message: `Åtgärder: ${actionSummary}`,
        severity: "info",
      });
    }

    console.log(`[Orchestrator] Completed: ${results.actions.length} actions`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
