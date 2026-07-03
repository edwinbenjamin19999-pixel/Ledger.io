/**
 * Pre-export validator for INK2 declarations.
 *
 * Returns an array of issues. Severity rules:
 *   • "error"   → BLOCKS export (XML download + booking disabled)
 *   • "warning" → allowed but surfaced in UI
 *
 * Checks performed:
 *   1. OrgNr matches Swedish 10-digit format.
 *   2. Period dates are valid + start ≤ end.
 *   3. Balance test: 4.3 + adjustments − loss − pfond = 4.10  (tolerance 1 kr).
 *   4. 4.10 × 20.6 % = 4.15 (tolerance 1 kr) when 4.10 > 0; otherwise 4.15 = 0.
 *   5. No negative tax base unless explicitly flagged as loss year.
 *   6. NDC consistency: declared 4.4 must equal sum of NDC accounts in GL.
 */

import type { INK2XmlInput } from "./buildINK2Xml";
import { CORPORATE_TAX_RATE } from "./taxEngine";

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: IssueSeverity;
  field?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const ORG_REGEX = /^\d{10}$/;
const TOLERANCE = 1;

/** Validate the same payload that will be passed to buildINK2Xml(). */
export function validateINK2(
  input: INK2XmlInput,
  context?: { glNonDeductibleCosts?: number },
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. OrgNr
  if (!input.orgNumber || !ORG_REGEX.test(input.orgNumber)) {
    issues.push({ severity: "error", field: "1.1", message: "Organisationsnummer saknas eller är felformaterat (kräver 10 siffror utan bindestreck)." });
  }

  // 2. Period
  const from = new Date(input.periodFrom);
  const to = new Date(input.periodTo);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    issues.push({ severity: "error", field: "1.2", message: "Periodens datum saknas eller är ogiltiga." });
  } else if (from > to) {
    issues.push({ severity: "error", field: "1.2", message: "Periodens startdatum är efter slutdatum." });
  }

  // 3. Balance test
  const expectedBase =
    input.resultBeforeTax
    + input.nonDeductibleCosts
    + (input.bookDepreciation - input.taxDepreciation)
    + input.disallowedInterest
    + (input.groupContribReceived - input.groupContribGiven)
    - input.lossCarryforwardApplied
    - input.periodiseringsfond;
  const balanceDiff = Math.abs(expectedBase - input.finalTaxableIncome);
  if (balanceDiff > TOLERANCE) {
    issues.push({
      severity: "error",
      field: "4.10",
      message: `Balanstest misslyckades: 4.3 + justeringar = ${Math.round(expectedBase).toLocaleString("sv-SE")} kr, men 4.10 visar ${Math.round(input.finalTaxableIncome).toLocaleString("sv-SE")} kr (diff ${Math.round(balanceDiff)} kr).`,
    });
  }

  // 4. Tax check
  const expectedTax = input.finalTaxableIncome > 0 ? Math.round(input.finalTaxableIncome * CORPORATE_TAX_RATE) : 0;
  if (Math.abs(expectedTax - input.corporateTax) > TOLERANCE) {
    issues.push({
      severity: "error",
      field: "4.15",
      message: `Bolagsskatt fel: ${Math.round(input.finalTaxableIncome).toLocaleString("sv-SE")} × 20,6 % = ${expectedTax.toLocaleString("sv-SE")} kr, deklarerat ${input.corporateTax.toLocaleString("sv-SE")} kr.`,
    });
  }

  // 5. Negative base
  if (input.finalTaxableIncome < 0) {
    issues.push({
      severity: "warning",
      field: "4.10",
      message: `Negativt skattemässigt resultat (${Math.round(input.finalTaxableIncome).toLocaleString("sv-SE")} kr) — sparas som underskott till nästa år. Ingen skatt utgår.`,
    });
  }

  // 6. NDC consistency
  if (context?.glNonDeductibleCosts !== undefined) {
    const declared = input.nonDeductibleCosts;
    const gl = context.glNonDeductibleCosts;
    if (Math.abs(declared - gl) > TOLERANCE) {
      issues.push({
        severity: "warning",
        field: "4.4",
        message: `4.4 (${Math.round(declared).toLocaleString("sv-SE")} kr) avviker från bokförda NDC-konton 6072/6982/6992/7632 (${Math.round(gl).toLocaleString("sv-SE")} kr).`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return { isValid: errors.length === 0, issues, errors, warnings };
}
