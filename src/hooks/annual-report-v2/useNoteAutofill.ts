/**
 * useNoteAutofill — resolves note field values from bookkeeping data
 * (provided by `useFinancialStatements`) and returns a per-field result with
 * a `source` reference for the ⓘ traceability indicator.
 *
 * This hook does NOT call AI. Narrative generation lives in the
 * `ar-fill-note` edge function. AI-fill in the UI calls both:
 *   1) this hook to resolve numeric fields (so user can verify sources)
 *   2) the edge function to generate the surrounding text
 */
import { useMemo } from "react";
import type { FinancialStatements, AccountMovement } from "./useFinancialStatements";
import type { NoteTemplateV2, NoteField } from "@/lib/annual-report-v2/noteLibraryV2";

export type AutofillSourceRef =
  | { type: "account_range"; ranges: string[]; accounts: AccountMovement[] }
  | { type: "account_balance"; ranges: string[]; accounts: AccountMovement[] }
  | { type: "rr_total"; lineKey: string }
  | { type: "br_total"; lineKey: string }
  | { type: "calculation"; formula: string; inputs: Record<string, number> }
  | { type: "manual" }
  | { type: "payroll" }
  | { type: "supplier_invoice_search"; keywords: string[] }
  | { type: "fixed_asset_register" };

export interface AutofilledField {
  fieldKey: string;
  label: string;
  value: number | null;
  /** `null` means the source could not auto-resolve — user input required. */
  source: AutofillSourceRef | null;
  /** Human-readable trace (e.g. "Sum av konton 7000–7199 (2024)"). */
  description: string;
}

export interface AutofilledNote {
  noteCode: string;
  fields: AutofilledField[];
  /** Convenience map for templating. */
  values: Record<string, number | null>;
}

function rangeMatches(accountNumber: string, ranges: string[]): boolean {
  const n = parseInt(accountNumber, 10);
  if (!Number.isFinite(n)) return false;
  return ranges.some((r) => {
    if (r.includes("-")) {
      const [lo, hi] = r.split("-").map((s) => parseInt(s, 10));
      return n >= lo && n <= hi;
    }
    return accountNumber === r;
  });
}

function sumAccounts(accounts: AccountMovement[]): number {
  return accounts.reduce((sum, a) => sum + a.net, 0);
}

function resolveField(
  field: NoteField,
  fs: FinancialStatements | undefined,
): AutofilledField {
  const empty: AutofilledField = {
    fieldKey: field.key,
    label: field.label,
    value: null,
    source: null,
    description: "Manuellt fält",
  };

  if (!field.autoFill || !fs) return empty;

  const af = field.autoFill;

  switch (af.kind) {
    case "account_range":
    case "account_balance": {
      const ranges = af.ranges ?? [];
      const matches = fs.currentAccounts.filter((a) => rangeMatches(a.accountNumber, ranges));
      const value = sumAccounts(matches);
      const sign = field.key.includes("expense") || field.key.includes("cost") || field.key.includes("depr")
        ? -1
        : 1;
      return {
        fieldKey: field.key,
        label: field.label,
        value: matches.length ? Math.abs(value) * sign : null,
        source: { type: af.kind, ranges, accounts: matches },
        description: `Summa av konton ${ranges.join(", ")} (${matches.length} konton)`,
      };
    }
    case "rr_total": {
      const line = fs.rr.lines.find((l) => l.key === af.lineKey);
      if (af.lineKey === "year_result") {
        return {
          fieldKey: field.key,
          label: field.label,
          value: fs.rr.netResult.current,
          source: { type: "rr_total", lineKey: "year_result" },
          description: "Årets resultat från resultaträkningen",
        };
      }
      if (af.lineKey === "operating_result") {
        return {
          fieldKey: field.key,
          label: field.label,
          value: fs.rr.operatingResult.current,
          source: { type: "rr_total", lineKey: "operating_result" },
          description: "Rörelseresultat från resultaträkningen",
        };
      }
      return {
        fieldKey: field.key,
        label: field.label,
        value: line?.current ?? null,
        source: { type: "rr_total", lineKey: af.lineKey ?? "" },
        description: `RR-rad: ${line?.label ?? af.lineKey}`,
      };
    }
    case "br_total": {
      const all = [...fs.br.assets, ...fs.br.equityLiabilities];
      const line = all.find((l) => l.key === af.lineKey);
      return {
        fieldKey: field.key,
        label: field.label,
        value: line?.current ?? null,
        source: { type: "br_total", lineKey: af.lineKey ?? "" },
        description: `BR-rad: ${line?.label ?? af.lineKey}`,
      };
    }
    case "calculation": {
      // Calculations are evaluated by the caller after resolving dependencies.
      return {
        fieldKey: field.key,
        label: field.label,
        value: null,
        source: { type: "calculation", formula: af.formula ?? "", inputs: {} },
        description: `Beräknas: ${af.formula}`,
      };
    }
    case "manual":
      return { ...empty, source: { type: "manual" } };
    case "payroll":
      return { ...empty, source: { type: "payroll" }, description: "Hämtas från lönemodulen (om kopplad)" };
    case "supplier_invoice_search":
      return {
        ...empty,
        source: { type: "supplier_invoice_search", keywords: af.keywords ?? [] },
        description: `Söker leverantörsfakturor efter: ${(af.keywords ?? []).join(", ")}`,
      };
    case "fixed_asset_register":
      return { ...empty, source: { type: "fixed_asset_register" }, description: "Hämtas från anläggningsregistret" };
    default:
      return empty;
  }
}

function applyCalculations(fields: AutofilledField[]): AutofilledField[] {
  const valueMap: Record<string, number> = {};
  for (const f of fields) if (f.value != null) valueMap[f.fieldKey] = f.value;

  return fields.map((f) => {
    if (f.source?.type !== "calculation") return f;
    const formula = f.source.formula;

    let result: number | null = null;
    try {
      // Very small allow-list of formulas (avoid eval).
      if (formula === "result_before_tax * 0.206") {
        const r = (valueMap.taxable_result ?? 0);
        result = r > 0 ? -Math.round(r * 0.206) : 0;
      } else if (formula === "result_before_tax") {
        result = valueMap.taxable_result ?? null;
      } else if (formula === "opening_cost + additions - disposals") {
        result = (valueMap.opening_cost ?? 0) + (valueMap.additions ?? 0) - (valueMap.disposals ?? 0);
      } else if (formula === "closing_cost - closing_depr") {
        const cc = (valueMap.opening_cost ?? 0) + (valueMap.additions ?? 0) - (valueMap.disposals ?? 0);
        const cd = (valueMap.opening_depr ?? 0) + (valueMap.year_depr ?? 0);
        result = cc - cd;
      } else if (formula === "opening_cost + additions - closing_depr") {
        result = (valueMap.opening_cost ?? 0) + (valueMap.additions ?? 0) - (valueMap.year_depr ?? 0);
      } else if (formula === "operating + investing + financing") {
        result = (valueMap.operating_result ?? 0) + (valueMap.investing ?? 0) + (valueMap.financing ?? 0);
      }
    } catch { result = null; }

    return {
      ...f,
      value: result,
      source: f.source ? { ...f.source, inputs: valueMap } : f.source,
    };
  });
}

export function useNoteAutofill(
  template: NoteTemplateV2 | null,
  financials: FinancialStatements | undefined,
): AutofilledNote | null {
  return useMemo(() => {
    if (!template) return null;
    const resolved = template.fields
      .filter((f) => f.type === "number")
      .map((f) => resolveField(f, financials));
    const withCalc = applyCalculations(resolved);
    const values: Record<string, number | null> = {};
    for (const f of withCalc) values[f.fieldKey] = f.value;
    return { noteCode: template.code, fields: withCalc, values };
  }, [template, financials]);
}

/**
 * Renders a human-readable summary of where a value comes from — for ⓘ tooltip.
 */
export function describeSource(source: AutofillSourceRef | null): string {
  if (!source) return "Manuellt ifyllt";
  switch (source.type) {
    case "account_range":
    case "account_balance": {
      const list = source.accounts
        .slice(0, 5)
        .map((a) => `${a.accountNumber} ${a.accountName}`)
        .join(", ");
      const more = source.accounts.length > 5 ? `, +${source.accounts.length - 5} fler` : "";
      return `Konton: ${list}${more}`;
    }
    case "rr_total": return `Hämtat från RR-rad: ${source.lineKey}`;
    case "br_total": return `Hämtat från BR-rad: ${source.lineKey}`;
    case "calculation": return `Beräknat: ${source.formula}`;
    case "manual": return "Manuellt fält";
    case "payroll": return "Lönemodulen (om kopplad)";
    case "supplier_invoice_search": return `Sökord i leverantörsfakturor: ${source.keywords.join(", ")}`;
    case "fixed_asset_register": return "Anläggningsregistret";
    default: return "Okänd källa";
  }
}
