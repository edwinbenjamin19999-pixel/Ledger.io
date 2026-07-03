/**
 * 12 validation rules for the AR v2 engine.
 * Pure functions — input is a snapshot, output is a list of findings.
 */
import type { Framework, NoteContext } from "./noteLibrary";

export type Severity = "error" | "warning" | "info";

export interface ValidationFinding {
  rule_code: string;
  severity: Severity;
  message: string;
  fix_action?: { type: string; payload?: Record<string, unknown> };
  section_id?: string | null;
}

export interface ValidationInput {
  framework: Framework;
  ctx: NoteContext;
  totals: {
    assets: number;
    equity: number;
    liabilities: number;
    netProfit: number;
    equityYearProfit: number;
    cashDelta: number;
    cashFlowNet: number;
    prevYearAssets: number;
  };
  forvaltningTextLength: number;
  signatureCount: number;
  hasFastställelseintyg: boolean;
  mappingCoveragePct: number; // 0..100
  notesPresent: string[]; // codes
  notesForbidden?: string[];
}

export function runValidations(input: ValidationInput): ValidationFinding[] {
  const f: ValidationFinding[] = [];
  const { totals, ctx, framework } = input;

  // 1. BR balance
  const balDelta = Math.abs(totals.assets - (totals.equity + totals.liabilities));
  if (balDelta > 1) {
    f.push({
      rule_code: "BR_BALANCE",
      severity: "error",
      message: `Balansräkningen balanserar inte: tillgångar (${totals.assets.toFixed(0)}) ≠ EK + skulder (${(totals.equity + totals.liabilities).toFixed(0)}).`,
      fix_action: { type: "recompute_br" },
    });
  }

  // 2. RR result = EK årets resultat
  if (Math.abs(totals.netProfit - totals.equityYearProfit) > 1) {
    f.push({
      rule_code: "RR_EQ_EQUITY_RESULT",
      severity: "error",
      message: "Årets resultat i RR matchar inte årets resultat i eget kapital.",
    });
  }

  // 3. KF reconciliation (K3 only, skip if no cash flow data)
  if (framework === "K3" && Math.abs(totals.cashDelta - totals.cashFlowNet) > 1) {
    f.push({
      rule_code: "KF_RECON",
      severity: "warning",
      message: "Kassaflödesanalys avstämmer inte mot förändring av likvida medel i BR.",
    });
  }

  // 4. Required notes
  const required = ["tax"];
  if (ctx.hasEmployees) required.push("employees");
  if (ctx.hasFixedAssets) required.push("depreciation");
  if (ctx.hasContingentLiabilities) required.push("contingent_liabilities");
  if (ctx.hasPledgedAssets) required.push("pledged_assets");
  for (const code of required) {
    if (!input.notesPresent.includes(code)) {
      f.push({
        rule_code: `REQUIRED_NOTE_${code.toUpperCase()}`,
        severity: "error",
        message: `Obligatorisk not saknas: ${code}.`,
        fix_action: { type: "add_note", payload: { code } },
      });
    }
  }

  // 5. Förvaltningsberättelse min length
  if (input.forvaltningTextLength < 200) {
    f.push({
      rule_code: "FORVALTNING_TOO_SHORT",
      severity: "warning",
      message: "Förvaltningsberättelsen är kortare än 200 tecken.",
    });
  }

  // 6. Prev year coverage
  if (totals.prevYearAssets === 0) {
    f.push({
      rule_code: "PREV_YEAR_MISSING",
      severity: "info",
      message: "Föregående års jämförelsetal saknas eller är noll.",
    });
  }

  // 7. Signature count
  if (input.signatureCount < 1) {
    f.push({
      rule_code: "MISSING_SIGNATURE",
      severity: "error",
      message: "Minst en styrelseledamot måste signera.",
      fix_action: { type: "open_signing" },
    });
  }

  // 8. Fastställelseintyg
  if (!input.hasFastställelseintyg) {
    f.push({
      rule_code: "MISSING_FASTSTALLELSE",
      severity: "error",
      message: "Fastställelseintyg saknas.",
      fix_action: { type: "add_section", payload: { type: "fastställelse" } },
    });
  }

  // 9. Mapping coverage
  if (input.mappingCoveragePct < 95) {
    f.push({
      rule_code: "MAPPING_COVERAGE_LOW",
      severity: "error",
      message: `Endast ${input.mappingCoveragePct.toFixed(1)}% av kontona är mappade.`,
    });
  } else if (input.mappingCoveragePct < 100) {
    f.push({
      rule_code: "MAPPING_COVERAGE_PARTIAL",
      severity: "warning",
      message: `${(100 - input.mappingCoveragePct).toFixed(1)}% av kontona är inte mappade till någon sektion.`,
    });
  }

  // 10. Negative equity
  if (totals.equity < 0) {
    f.push({
      rule_code: "NEGATIVE_EQUITY",
      severity: "warning",
      message: "Negativt eget kapital — kontrollbalansräkning kan vara obligatorisk (ABL 25 kap.).",
    });
  }

  // 11. K2 forbidden notes
  const forbidden = ["revaluation"];
  if (framework === "K2") {
    for (const c of forbidden) {
      if (input.notesPresent.includes(c)) {
        f.push({
          rule_code: `K2_FORBIDDEN_${c.toUpperCase()}`,
          severity: "error",
          message: `K2 tillåter inte not: ${c}.`,
        });
      }
    }
  }

  // 12. K3 mandatory notes
  if (framework === "K3") {
    for (const c of ["cash_flow_statement", "auditor_fees"]) {
      if (!input.notesPresent.includes(c)) {
        f.push({
          rule_code: `K3_REQUIRED_${c.toUpperCase()}`,
          severity: "error",
          message: `K3 kräver not: ${c}.`,
          fix_action: { type: "add_note", payload: { code: c } },
        });
      }
    }
  }

  return f;
}
