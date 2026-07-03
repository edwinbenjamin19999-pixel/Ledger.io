// ar-validate — runs validation rules against live ledger + AR data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Finding {
  rule_code: string;
  severity: "error" | "warning" | "info";
  message: string;
  fix_action?: { type: string; payload?: Record<string, unknown> };
  section_id?: string | null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { annualReportId } = await req.json();
    if (!annualReportId) return corsError("annualReportId krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: report } = await sb
      .from("annual_reports")
      .select("id, company_id, fiscal_year, fiscal_year_start, fiscal_year_end, report_type, total_assets, total_equity, total_liabilities, net_profit")
      .eq("id", annualReportId)
      .single();
    if (!report) return corsError("Utkast hittades inte", 404);

    const framework = (report.report_type === "K3" ? "K3" : "K2") as "K2" | "K3";

    const { data: sections } = await sb
      .from("annual_report_sections")
      .select("id, section_type, label, content, order_index")
      .eq("annual_report_id", annualReportId);

    const { data: blocks } = await sb
      .from("ar_blocks")
      .select("id, section_id, block_type, content, sort_order")
      .eq("annual_report_id", annualReportId);

    const { data: maps } = await sb
      .from("ar_section_account_map")
      .select("account_number, section_id, weight")
      .eq("annual_report_id", annualReportId);

    const { data: jeLines } = await sb
      .from("journal_entry_lines")
      .select("account_number, debit, credit")
      .eq("company_id", report.company_id)
      .limit(20000);
    const jeAccounts = jeLines;

    const findings: Finding[] = [];
    const sectionList = (sections || []) as Array<{ id: string; section_type: string; label: string; order_index: number }>;
    const blockList = (blocks || []) as Array<{ id: string; section_id: string; block_type: string; content: Record<string, unknown>; sort_order: number }>;

    // 1. BR balance
    const assets = Number(report.total_assets ?? 0);
    const equity = Number(report.total_equity ?? 0);
    const liab = Number(report.total_liabilities ?? 0);
    if (Math.abs(assets - (equity + liab)) > 1 && (assets || equity || liab)) {
      findings.push({
        rule_code: "BR_BALANCE", severity: "error",
        message: `Balansräkningen balanserar inte: tillgångar (${assets.toFixed(0)}) ≠ EK + skulder (${(equity + liab).toFixed(0)}).`,
      });
    }

    // 2. Required sections
    const haveTypes = new Set(sectionList.map((s) => s.section_type));
    const requiredTypes = ["forvaltning", "rr", "br", "noter", "signering", "fastställelse"];
    if (framework === "K3") requiredTypes.push("kf");
    for (const t of requiredTypes) {
      if (!haveTypes.has(t)) {
        findings.push({
          rule_code: `MISSING_SECTION_${t.toUpperCase()}`, severity: "error",
          message: `Obligatorisk sektion saknas: ${t}.`,
          fix_action: { type: "add_section", payload: { section_type: t } },
        });
      }
    }

    // 3. Förvaltning text length
    const forvaltning = sectionList.find((s) => s.section_type === "forvaltning");
    if (forvaltning) {
      const blocksInSec = blockList.filter((b) => b.section_id === forvaltning.id && b.block_type === "text");
      const totalChars = blocksInSec.reduce((acc, b) => {
        const html = String((b.content as { html?: string })?.html ?? "");
        return acc + html.replace(/<[^>]+>/g, "").length;
      }, 0);
      if (totalChars < 200) {
        findings.push({
          rule_code: "FORVALTNING_TOO_SHORT", severity: "warning",
          section_id: forvaltning.id,
          message: `Förvaltningsberättelsen är ${totalChars} tecken (rekommenderas ≥200).`,
        });
      }
    }

    // 4. Mapping coverage
    const mapped = new Set((maps || []).map((m: { account_number: string }) => m.account_number));
    const all = new Set((jeAccounts || []).map((a: { account_number: string }) => a.account_number));
    const total = all.size || 1;
    let covered = 0;
    for (const a of all) if (mapped.has(a)) covered++;
    const pct = (covered / total) * 100;
    if (pct < 95) {
      findings.push({
        rule_code: "MAPPING_COVERAGE_LOW", severity: "error",
        message: `Endast ${pct.toFixed(1)}% av kontona är mappade (${covered}/${total}).`,
      });
    } else if (pct < 100) {
      findings.push({
        rule_code: "MAPPING_COVERAGE_PARTIAL", severity: "warning",
        message: `${(100 - pct).toFixed(1)}% av kontona saknar mappning.`,
      });
    }

    // 5. Negative equity
    if (equity < 0) {
      findings.push({
        rule_code: "NEGATIVE_EQUITY", severity: "warning",
        message: "Negativt eget kapital — kontrollbalansräkning kan vara obligatorisk (ABL 25 kap.).",
      });
    }

    // 6. K3 cash flow note
    if (framework === "K3") {
      const hasCfNote = sectionList.some((s) => /kassaflöd/i.test(s.label));
      if (!hasCfNote) {
        findings.push({
          rule_code: "K3_REQUIRED_CASH_FLOW", severity: "error",
          message: "K3 kräver kassaflödesanalys.",
          fix_action: { type: "add_section", payload: { section_type: "kf" } },
        });
      }
    }

    // 7. STRUCTURE_ORDER — förvaltningsberättelse must come before RR
    const forv = sectionList.find((s) => s.section_type === "forvaltning");
    const rr = sectionList.find((s) => s.section_type === "rr");
    if (forv && rr && forv.order_index >= rr.order_index) {
      findings.push({
        rule_code: "STRUCTURE_ORDER", severity: "error",
        section_id: forv.id,
        message: "Förvaltningsberättelsen måste placeras före resultaträkningen (ÅRL 6 kap.).",
        fix_action: { type: "reorder_sections", payload: { before: forv.id, after: rr.id } },
      });
    }
    // BR must come after RR
    const br = sectionList.find((s) => s.section_type === "br");
    if (rr && br && rr.order_index >= br.order_index) {
      findings.push({
        rule_code: "STRUCTURE_ORDER_BR", severity: "warning",
        section_id: br.id,
        message: "Balansräkningen bör placeras efter resultaträkningen.",
      });
    }

    // 8. LEGAL_FORMAT — fiscal year dates must be YYYY-MM-DD
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (report.fiscal_year_start && !dateRe.test(String(report.fiscal_year_start))) {
      findings.push({
        rule_code: "LEGAL_FORMAT_START", severity: "error",
        message: `Räkenskapsårets startdatum måste vara i formatet YYYY-MM-DD (är: ${report.fiscal_year_start}).`,
      });
    }
    if (report.fiscal_year_end && !dateRe.test(String(report.fiscal_year_end))) {
      findings.push({
        rule_code: "LEGAL_FORMAT_END", severity: "error",
        message: `Räkenskapsårets slutdatum måste vara i formatet YYYY-MM-DD (är: ${report.fiscal_year_end}).`,
      });
    }

    // 9. NARRATIVE_REQUIRED — förvaltningsberättelse must contain a non-empty text block
    if (forvaltning) {
      const textBlocks = blockList.filter((b) => b.section_id === forvaltning.id && b.block_type === "text");
      const hasNonEmpty = textBlocks.some((b) => {
        const html = String((b.content as { html?: string })?.html ?? "");
        return html.replace(/<[^>]+>/g, "").trim().length > 0;
      });
      if (!hasNonEmpty) {
        findings.push({
          rule_code: "NARRATIVE_REQUIRED", severity: "error",
          section_id: forvaltning.id,
          message: "Förvaltningsberättelsen måste innehålla minst ett text-block med innehåll.",
          fix_action: { type: "add_block", payload: { section_id: forvaltning.id, block_type: "text" } },
        });
      }
    }

    // 10. DUPLICATE_MAPPING — same account in multiple sections with summed weight > 1.0
    const acctWeight = new Map<string, number>();
    for (const m of (maps ?? []) as Array<{ account_number: string; weight: number }>) {
      acctWeight.set(m.account_number, (acctWeight.get(m.account_number) ?? 0) + Number(m.weight ?? 1));
    }
    for (const [acc, w] of acctWeight) {
      if (w > 1.0001) {
        findings.push({
          rule_code: "DUPLICATE_MAPPING", severity: "error",
          message: `Konto ${acc} har summerad vikt ${w.toFixed(2)} (>1.0) — splittra eller ta bort en mappning.`,
          fix_action: { type: "open_split", payload: { account_number: acc } },
        });
      }
    }

    // 11. UNMAPPED_WITH_BALANCE — accounts with non-zero balance lacking mapping
    const balByAcc = new Map<string, number>();
    for (const l of (jeLines ?? []) as Array<{ account_number: string; debit: number; credit: number }>) {
      balByAcc.set(l.account_number, (balByAcc.get(l.account_number) ?? 0) + Number(l.debit ?? 0) - Number(l.credit ?? 0));
    }
    let unmappedWithBal = 0;
    for (const [acc, bal] of balByAcc) {
      if (Math.abs(bal) > 0.5 && !mapped.has(acc)) unmappedWithBal++;
    }
    if (unmappedWithBal > 0) {
      findings.push({
        rule_code: "UNMAPPED_WITH_BALANCE", severity: "warning",
        message: `${unmappedWithBal} konton har saldo men saknar mappning till sektion.`,
        fix_action: { type: "open_mapping" },
      });
    }

    // Resolve previous findings not in current set
    const currentCodes = new Set(findings.map((f) => f.rule_code));
    await sb
      .from("ar_validations")
      .update({ resolved_at: new Date().toISOString() })
      .eq("annual_report_id", annualReportId)
      .is("resolved_at", null)
      .not("rule_code", "in", `(${[...currentCodes].map((c) => `"${c}"`).join(",") || '""'})`);

    // Upsert current findings (delete unresolved + reinsert for simplicity)
    if (findings.length) {
      await sb
        .from("ar_validations")
        .delete()
        .eq("annual_report_id", annualReportId)
        .is("resolved_at", null);

      await sb.from("ar_validations").insert(
        findings.map((f) => ({
          annual_report_id: annualReportId,
          company_id: report.company_id,
          rule_code: f.rule_code,
          severity: f.severity,
          message: f.message,
          fix_action: f.fix_action ?? null,
          section_id: f.section_id ?? null,
        })),
      );
    }

    return corsJson({ ok: true, findings: findings.length });
  } catch (e) {
    console.error("ar-validate error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
