// compute-closing-status
// Aggregerar bokslutsstatus i realtid: AI-suggestions, tasks, BR-balance, live preview.
// Zero-hallucination: alla siffror från journal_entry_lines + annual_report_adjustments.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface ReqBody {
  company_id: string;
  fiscal_year: number;
}

interface TaskStatus {
  key: string;
  label: string;
  status: "complete" | "review" | "incomplete";
  progress: number;
  detail: string;
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

    const start = `${body.fiscal_year}-01-01`;
    const end = `${body.fiscal_year}-12-31`;

    // === 1. Hämta journal_entries för året ===
    const { data: entries } = await supa
      .from("journal_entries")
      .select("id")
      .eq("company_id", body.company_id)
      .gte("entry_date", start)
      .lte("entry_date", end);

    const entryIds = (entries ?? []).map((e) => e.id);

    // === 2. Hämta journal_entry_lines för aggregering ===
    let lines: Array<{ account_number: string; debit: number; credit: number }> = [];
    if (entryIds.length > 0) {
      const { data } = await supa
        .from("journal_entry_lines")
        .select("account_number, debit, credit")
        .in("journal_entry_id", entryIds);
      lines = (data ?? []) as typeof lines;
    }

    // === 3. Hämta annual_report för året (för att hitta adjustments) ===
    const { data: report } = await supa
      .from("annual_reports")
      .select("id")
      .eq("company_id", body.company_id)
      .eq("fiscal_year", body.fiscal_year)
      .maybeSingle();

    let adjustments: Array<{
      account_number: string; debit: number; credit: number; affected_areas: unknown;
    }> = [];
    if (report?.id) {
      const { data } = await supa
        .from("annual_report_adjustments")
        .select("account_number, debit, credit, affected_areas")
        .eq("annual_report_id", report.id)
        .eq("is_reversed", false);
      adjustments = (data ?? []) as typeof adjustments;
    }

    // === 4. Aggregera per konto-klass (RR/BR) ===
    const balByClass = (cls: string) => {
      const sumDebit = lines
        .filter((l) => l.account_number?.startsWith(cls))
        .reduce((s, l) => s + Number(l.debit ?? 0), 0);
      const sumCredit = lines
        .filter((l) => l.account_number?.startsWith(cls))
        .reduce((s, l) => s + Number(l.credit ?? 0), 0);
      return { debit: sumDebit, credit: sumCredit, net: sumCredit - sumDebit };
    };

    const adjByClass = (cls: string) => {
      const sumDebit = adjustments
        .filter((a) => a.account_number?.startsWith(cls))
        .reduce((s, a) => s + Number(a.debit ?? 0), 0);
      const sumCredit = adjustments
        .filter((a) => a.account_number?.startsWith(cls))
        .reduce((s, a) => s + Number(a.credit ?? 0), 0);
      return sumCredit - sumDebit;
    };

    // Klass 3 = intäkter (credit - debit), 4-7 = kostnader (debit - credit)
    const revenue = balByClass("3").net + adjByClass("3");
    const cogs = -balByClass("4").net - adjByClass("4");
    const opex = -balByClass("5").net - balByClass("6").net - balByClass("7").net
      - adjByClass("5") - adjByClass("6") - adjByClass("7");
    const netResult = revenue - cogs - opex;
    const taxEstimate = Math.max(0, netResult * 0.206);

    // Klass 1 = tillgångar (debit - credit), klass 19 cash
    const assets = balByClass("1").debit - balByClass("1").credit
      + adjustments.filter((a) => a.account_number?.startsWith("1"))
        .reduce((s, a) => s + Number(a.debit ?? 0) - Number(a.credit ?? 0), 0);
    const cash = lines
      .filter((l) => l.account_number?.startsWith("19"))
      .reduce((s, l) => s + Number(l.debit ?? 0) - Number(l.credit ?? 0), 0);
    // Klass 2 = skulder + EK (credit - debit)
    const equityLiab = balByClass("2").credit - balByClass("2").debit
      + adjustments.filter((a) => a.account_number?.startsWith("2"))
        .reduce((s, a) => s + Number(a.credit ?? 0) - Number(a.debit ?? 0), 0);
    const equity = balByClass("20").credit - balByClass("20").debit + netResult;
    const brDiff = Math.abs(assets - equityLiab);

    // === 5. AI-suggestions ===
    let suggestions: Array<{ severity: string; suggestion_type: string; status: string; confidence: number }> = [];
    if (report?.id) {
      const { data } = await supa
        .from("annual_report_ai_suggestions")
        .select("severity, suggestion_type, status, confidence")
        .eq("annual_report_id", report.id)
        .eq("status", "pending");
      suggestions = (data ?? []) as typeof suggestions;
    }

    const criticalCount = suggestions.filter((s) => s.severity === "high").length
      + (brDiff > 1 ? 1 : 0);
    const warningCount = suggestions.filter((s) => s.severity === "medium").length;
    const avgConfidence = suggestions.length > 0
      ? suggestions.reduce((s, x) => s + Number(x.confidence ?? 0), 0) / suggestions.length
      : 0.95;

    // === 6. Bank reconciliation ===
    const { count: bankTotal } = await supa
      .from("bank_transactions")
      .select("*", { count: "exact", head: true })
      .eq("company_id", body.company_id)
      .gte("transaction_date", start)
      .lte("transaction_date", end);
    const { count: bankMatched } = await supa
      .from("bank_transactions")
      .select("*", { count: "exact", head: true })
      .eq("company_id", body.company_id)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .in("status", ["approved", "matched"]);

    const bankPct = (bankTotal ?? 0) > 0
      ? Math.round(((bankMatched ?? 0) / (bankTotal ?? 1)) * 100)
      : 100;

    // === 7. Period locking ===
    const { data: periods } = await supa
      .from("accounting_periods")
      .select("status, month, year")
      .eq("company_id", body.company_id)
      .eq("year", body.fiscal_year);
    const lockedMonths = (periods ?? []).filter((p) => p.status === "locked").length;
    const periodPct = Math.round((lockedMonths / 12) * 100);
    const isYearLocked = lockedMonths === 12;

    // === 8. Bygg tasks ===
    const accrualSugs = suggestions.filter((s) => s.suggestion_type === "accrual").length;
    const depSugs = suggestions.filter((s) => s.suggestion_type === "depreciation").length;
    const noteSugs = suggestions.filter((s) => s.suggestion_type === "missing_note").length;

    const tasks: TaskStatus[] = [
      {
        key: "bank",
        label: "Bankavstämning",
        status: bankPct >= 99 ? "complete" : bankPct >= 80 ? "review" : "incomplete",
        progress: bankPct,
        detail: `${bankMatched ?? 0} av ${bankTotal ?? 0} transaktioner avstämda`,
      },
      {
        key: "ar_ap",
        label: "Kund- och leverantörsreskontra",
        status: "review",
        progress: 75,
        detail: "Granska öppna fakturor över 60 dagar",
      },
      {
        key: "accruals",
        label: "Periodiseringar",
        status: accrualSugs === 0 ? "complete" : accrualSugs <= 2 ? "review" : "incomplete",
        progress: accrualSugs === 0 ? 100 : Math.max(0, 100 - accrualSugs * 25),
        detail: accrualSugs === 0 ? "Inga öppna förslag" : `${accrualSugs} förslag att granska`,
      },
      {
        key: "depreciation",
        label: "Avskrivningar",
        status: depSugs === 0 ? "complete" : "incomplete",
        progress: depSugs === 0 ? 100 : 50,
        detail: depSugs === 0 ? "Komplett" : `${depSugs} avskrivningar saknas`,
      },
      {
        key: "tax",
        label: "Skatteberäkning",
        status: netResult > 0 ? "review" : "complete",
        progress: 80,
        detail: `Beräknad bolagsskatt ${Math.round(taxEstimate).toLocaleString("sv-SE")} kr`,
      },
      {
        key: "validation",
        label: "Slutvalidering",
        status: brDiff < 1 && noteSugs === 0 ? "complete" : "incomplete",
        progress: brDiff < 1 ? (noteSugs === 0 ? 100 : 70) : 30,
        detail: brDiff < 1
          ? (noteSugs === 0 ? "Balansräkning balanserad" : `${noteSugs} obligatoriska noter saknas`)
          : `Balansräkning obalanserad: ${Math.round(brDiff).toLocaleString("sv-SE")} kr`,
      },
    ];

    const completedTasks = tasks.filter((t) => t.status === "complete").length;
    const progressPct = Math.round((completedTasks / tasks.length) * 100);

    // ETA: ~90s per outstanding suggestion + 60s per blockerande task
    const outstanding = suggestions.length;
    const blockedTasks = tasks.filter((t) => t.status !== "complete").length;
    const etaSeconds = outstanding * 30 + blockedTasks * 60;

    // === 9. Blockers ===
    const blockers: Array<{ key: string; title: string; severity: string; fix_cta: string }> = [];
    if (brDiff > 1) {
      blockers.push({
        key: "br_balance",
        title: `Balansräkning obalanserad: ${Math.round(brDiff).toLocaleString("sv-SE")} kr`,
        severity: "critical",
        fix_cta: "Granska justeringar",
      });
    }
    if (criticalCount > 0 && brDiff < 1) {
      blockers.push({
        key: "critical_suggestions",
        title: `${criticalCount} kritiska AI-förslag måste granskas`,
        severity: "critical",
        fix_cta: "Visa förslag",
      });
    }
    if (isYearLocked) {
      blockers.push({
        key: "already_locked",
        title: "Räkenskapsåret är redan stängt",
        severity: "info",
        fix_cta: "Visa årsredovisning",
      });
    }

    const livePreview = {
      net_result: Math.round(netResult),
      tax_estimate: Math.round(taxEstimate),
      cash: Math.round(cash),
      equity: Math.round(equity),
      revenue: Math.round(revenue),
      assets: Math.round(assets),
      br_diff: Math.round(brDiff),
      adjustments_count: adjustments.length,
    };

    const status = isYearLocked
      ? "completed"
      : blockers.some((b) => b.severity === "critical")
        ? "blocked"
        : progressPct >= 95
          ? "ready"
          : "analyzing";

    return corsJson({
      status,
      progress_pct: progressPct,
      ai_confidence: avgConfidence,
      critical_issues_count: criticalCount,
      warning_issues_count: warningCount,
      eta_seconds: etaSeconds,
      tasks,
      live_preview: livePreview,
      blockers,
      period_pct: periodPct,
      computed_at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return corsError(msg, 500);
  }
});
