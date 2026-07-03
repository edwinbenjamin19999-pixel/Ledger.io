/**
 * Strict Skatteverket INK2 XML builder (Inkomstdeklaration 2 — aktiebolag).
 *
 * Produces ISO-8859-1 XML with the exact tag order required by Skatteverket's
 * test-tjänst. Compliance is enforced by `validateINK2()`; this file ONLY
 * builds the document — no validation, no mutation.
 *
 * Field mapping (BAS → INK2):
 *   1.1   OrgNr                                              (header)
 *   1.2   PeriodFrom / PeriodTo                              (header)
 *   4.3   ResultatForeSkatt                                  (signed)
 *   4.4   EjAvdragsgillaKostnader                            (always positive)
 *   4.5a  AvskrivningarBokforda
 *   4.5b  AvskrivningarSkattemassiga
 *   4.6   Ranteavdragsbegransning                            (positive when capped)
 *   4.7a  KoncernbidragErhallet
 *   4.7b  KoncernbidragLamnat
 *   4.6a  Periodiseringsfond
 *   4.14a UnderskottIngBalans
 *   4.10  SkattemassigtResultat                              (= 4.3 + adjustments − loss − pfond)
 *   4.15  Bolagsskatt                                        (4.10 × 20.6 %)
 */

export interface INK2XmlInput {
  orgNumber: string;            // "5591234567" (10 digits, no dash)
  periodFrom: string;           // "YYYY-MM-DD"
  periodTo: string;             // "YYYY-MM-DD"
  resultBeforeTax: number;      // 4.3
  nonDeductibleCosts: number;   // 4.4
  bookDepreciation: number;     // 4.5a
  taxDepreciation: number;      // 4.5b
  disallowedInterest: number;   // 4.6
  groupContribReceived: number; // 4.7a
  groupContribGiven: number;    // 4.7b
  periodiseringsfond: number;   // 4.6a
  lossCarryforwardApplied: number; // 4.14a
  finalTaxableIncome: number;   // 4.10
  corporateTax: number;         // 4.15
}

const FIELD_ORDER = [
  "OrgNr",
  "Period",
  "ResultatForeSkatt",
  "EjAvdragsgillaKostnader",
  "AvskrivningarBokforda",
  "AvskrivningarSkattemassiga",
  "Ranteavdragsbegransning",
  "KoncernbidragErhallet",
  "KoncernbidragLamnat",
  "Periodiseringsfond",
  "UnderskottIngBalans",
  "SkattemassigtResultat",
  "Bolagsskatt",
] as const;

/** Format a number as a signed integer string ("-30000", "0", "120000"). */
function formatInt(value: number): string {
  return Math.round(value).toString();
}

/** Strip any character that would break ISO-8859-1 / SKV parsing. */
function safe(text: string): string {
  return String(text).replace(/[<>&"']/g, "");
}

/**
 * Build the strict INK2 XML body. Order is enforced by FIELD_ORDER.
 * Empty fields are omitted EXCEPT for the always-required ones (OrgNr, Period, 4.10, 4.15).
 */
export function buildINK2Xml(input: INK2XmlInput): string {
  const fields: Record<string, string | null> = {
    OrgNr: safe(input.orgNumber),
    Period: `<From>${input.periodFrom}</From><To>${input.periodTo}</To>`,
    ResultatForeSkatt: formatInt(input.resultBeforeTax),
    EjAvdragsgillaKostnader: input.nonDeductibleCosts > 0 ? formatInt(input.nonDeductibleCosts) : null,
    AvskrivningarBokforda: input.bookDepreciation > 0 ? formatInt(input.bookDepreciation) : null,
    AvskrivningarSkattemassiga: input.taxDepreciation > 0 ? formatInt(input.taxDepreciation) : null,
    Ranteavdragsbegransning: input.disallowedInterest > 0 ? formatInt(input.disallowedInterest) : null,
    KoncernbidragErhallet: input.groupContribReceived > 0 ? formatInt(input.groupContribReceived) : null,
    KoncernbidragLamnat: input.groupContribGiven > 0 ? formatInt(input.groupContribGiven) : null,
    Periodiseringsfond: input.periodiseringsfond > 0 ? formatInt(input.periodiseringsfond) : null,
    UnderskottIngBalans: input.lossCarryforwardApplied > 0 ? formatInt(input.lossCarryforwardApplied) : null,
    SkattemassigtResultat: formatInt(input.finalTaxableIncome),
    Bolagsskatt: formatInt(input.corporateTax),
  };

  const body = FIELD_ORDER.map((tag) => {
    const v = fields[tag];
    if (v === null) return "";
    if (tag === "Period") return `  <Period>${v}</Period>`;
    return `  <${tag}>${v}</${tag}>`;
  }).filter(Boolean).join("\n");

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<Inkomstdeklaration2 version="6.0">
${body}
</Inkomstdeklaration2>`;
}
