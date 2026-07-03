// auto-close-year
// 6-stegs automatiserad bokslutskörning. Skriver progress till closing_runs i realtid.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface ReqBody {
  company_id: string;
  fiscal_year: number;
  dry_run?: boolean;
  user_id?: string;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const body = (await req.json()) as ReqBody;
    if (!body.company_id || !body.fiscal_year) {
      return corsError("missing company_id or fiscal_year", 400);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Skapa körning
    const { data: run, error: runErr } = await supa
      .from("closing_runs")
      .insert({
        company_id: body.company_id,
        fiscal_year: body.fiscal_year,
        status: "analyzing",
        progress_pct: 0,
        current_step: 0,
        total_steps: 6,
        started_by: body.user_id ?? null,
        is_dry_run: body.dry_run ?? false,
      })
      .select("id")
      .single();

    if (runErr || !run) return corsError(`could not create run: ${runErr?.message}`, 500);
    const runId = run.id;

    const updateRun = (patch: Record<string, unknown>) =>
      supa.from("closing_runs").update(patch).eq("id", runId);

    // === Hjälp: säkerställ annual_report finns ===
    let { data: report } = await supa
      .from("annual_reports")
      .select("id")
      .eq("company_id", body.company_id)
      .eq("fiscal_year", body.fiscal_year)
      .maybeSingle();

    if (!report) {
      const { data: created } = await supa
        .from("annual_reports")
        .insert({
          company_id: body.company_id,
          fiscal_year: body.fiscal_year,
          fiscal_year_start: `${body.fiscal_year}-01-01`,
          fiscal_year_end: `${body.fiscal_year}-12-31`,
          status: "draft",
        })
        .select("id")
        .single();
      report = created;
    }

    // === Steg 1: Aggregera data ===
    await updateRun({ current_step: 1, progress_pct: 16 });
    const status1 = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-closing-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ company_id: body.company_id, fiscal_year: body.fiscal_year }),
    }).then((r) => r.json()).catch(() => null);

    // === Steg 2: AI-detektion ===
    await updateRun({ current_step: 2, progress_pct: 33 });
    if (report?.id) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/detect-adjustment-suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          annual_report_id: report.id,
          company_id: body.company_id,
          fiscal_year: body.fiscal_year,
        }),
      }).catch(() => null);
    }

    // === Steg 3: Auto-apply suggestions med confidence >= 0.85 ===
    await updateRun({ current_step: 3, progress_pct: 50 });
    const applied: Array<{ id: string; account: string; impact: number }> = [];
    if (report?.id && !body.dry_run) {
      const { data: suggestions } = await supa
        .from("annual_report_ai_suggestions")
        .select("id, suggestion_type, proposed_adjustment, confidence, severity")
        .eq("annual_report_id", report.id)
        .eq("status", "pending")
        .gte("confidence", 0.85);

      for (const sug of suggestions ?? []) {
        const adj = sug.proposed_adjustment as {
          account_number?: string; debit?: number; credit?: number;
          description?: string; affected_areas?: unknown;
        } | null;
        if (!adj?.account_number) continue;

        const { data: ins } = await supa
          .from("annual_report_adjustments")
          .insert({
            annual_report_id: report.id,
            company_id: body.company_id,
            account_number: adj.account_number,
            debit: Number(adj.debit ?? 0),
            credit: Number(adj.credit ?? 0),
            description: adj.description ?? "AI auto-applied",
            affected_areas: adj.affected_areas ?? ["RR", "BR"],
            ai_suggestion_id: sug.id,
            confidence: sug.confidence,
            source: "ai_suggestion",
            created_by: body.user_id ?? "00000000-0000-0000-0000-000000000000",
          })
          .select("id")
          .single();

        if (ins) {
          await supa
            .from("annual_report_ai_suggestions")
            .update({ status: "applied", applied_adjustment_id: ins.id })
            .eq("id", sug.id);
          applied.push({
            id: ins.id,
            account: adj.account_number,
            impact: Number(adj.debit ?? 0) - Number(adj.credit ?? 0),
          });
        }
      }
    }

    // === Steg 4: Validera ===
    await updateRun({ current_step: 4, progress_pct: 66, adjustments_applied: applied });
    const status2 = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-closing-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ company_id: body.company_id, fiscal_year: body.fiscal_year }),
    }).then((r) => r.json()).catch(() => null);

    const blockers = status2?.blockers ?? [];
    const criticalBlockers = blockers.filter((b: { severity: string }) => b.severity === "critical");

    if (criticalBlockers.length > 0) {
      await updateRun({
        status: "blocked",
        progress_pct: 66,
        blockers,
        live_preview: status2?.live_preview ?? {},
        completed_at: new Date().toISOString(),
        error_message: `${criticalBlockers.length} kritiska blockerare kvar`,
      });
      return corsJson({
        run_id: runId,
        status: "blocked",
        blockers,
        live_preview: status2?.live_preview ?? {},
        adjustments_applied: applied,
      });
    }

    // === Steg 5: Final preview ===
    await updateRun({
      current_step: 5,
      progress_pct: 83,
      live_preview: status2?.live_preview ?? {},
      tasks: status2?.tasks ?? [],
    });

    if (body.dry_run) {
      await updateRun({
        status: "ready",
        progress_pct: 95,
        completed_at: new Date().toISOString(),
      });
      return corsJson({
        run_id: runId,
        status: "ready",
        dry_run: true,
        live_preview: status2?.live_preview ?? {},
        adjustments_applied: applied,
        blockers: [],
      });
    }

    // === Steg 6: Lås period ===
    await updateRun({ current_step: 6, progress_pct: 95 });
    for (let m = 1; m <= 12; m++) {
      await supa.from("accounting_periods").upsert({
        company_id: body.company_id,
        year: body.fiscal_year,
        month: m,
        status: "locked",
        locked_at: new Date().toISOString(),
        locked_by: body.user_id ?? null,
      }, { onConflict: "company_id,year,month" });
    }

    if (report?.id) {
      await supa
        .from("annual_reports")
        .update({ status: "prepared", prepared_at: new Date().toISOString() })
        .eq("id", report.id);
    }

    await updateRun({
      status: "completed",
      progress_pct: 100,
      completed_at: new Date().toISOString(),
    });

    return corsJson({
      run_id: runId,
      status: "completed",
      annual_report_id: report?.id,
      live_preview: status2?.live_preview ?? {},
      adjustments_applied: applied,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return corsError(msg, 500);
  }
});
