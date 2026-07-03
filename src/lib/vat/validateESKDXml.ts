/**
 * Strict eSKDUpload v6.0 compliance validator.
 * Runs 11 mandatory checks against the generated XML and the source input.
 * Used to gate XML download + BankID submission — fails block export.
 */

export interface ValidationCheck {
  id: string;
  label: string;
  ok: boolean;
  message?: string;
}

export interface ValidationResult {
  ok: boolean;
  checks: ValidationCheck[];
  errors: ValidationCheck[];
  warnings: ValidationCheck[];
}

// Canonical SKV order — MUST match buildESKDUploadXml TAG_ORDER + MomsBetala + TextUpplysningMoms.
export const CANONICAL_TAG_ORDER = [
  "ForsMomsEjAnnan",      // 05
  "UttagMoms",            // 06
  "UlagMargbesk",         // 07
  "HyrinkomstFriv",       // 08
  "MomsUtgHog",           // 10
  "MomsUtgMedel",         // 11
  "MomsUtgLag",           // 12
  "InkopVaruAnnatEg",     // 20
  "InkopTjanstAnnatEg",   // 21
  "InkopTjanstUtomEg",    // 22
  "InkopVaruSverige",     // 23
  "InkopTjanstSverige",   // 24
  "MomsInkopUtgHog",      // 30
  "MomsInkopUtgMedel",    // 31
  "MomsInkopUtgLag",      // 32
  "ForsVaruAnnatEg",      // 35
  "ForsVaruUtomEg",       // 36
  "InkopVaruMellan3p",    // 37
  "ForsVaruMellan3p",     // 38
  "ForsTjSkskAnnatEg",    // 39
  "ForsTjOvrUtomEg",      // 40
  "ForsKopareSkskSverige",// 41
  "ForsOvrigt",           // 42
  "MomsUlagImport",       // 50
  "MomsIngAvdr",          // 48 (after 50!)
  "MomsImportUtgHog",     // 60
  "MomsImportUtgMedel",   // 61
  "MomsImportUtgLag",     // 62
  "MomsBetala",           // 49
  "TextUpplysningMoms",   // optional, last
] as const;

// Numeric tags — used for decimal/space/integer validation.
const NUMERIC_TAGS = CANONICAL_TAG_ORDER.filter((t) => t !== "TextUpplysningMoms");

export class ESKDValidationError extends Error {
  result: ValidationResult;
  constructor(result: ValidationResult) {
    super(`eSKDUpload validation failed: ${result.errors.length} error(s)`);
    this.name = "ESKDValidationError";
    this.result = result;
  }
}

function pass(id: string, label: string): ValidationCheck {
  return { id, label, ok: true };
}
function fail(id: string, label: string, message: string): ValidationCheck {
  return { id, label, ok: false, message };
}

export function validateESKDXml(xml: string): ValidationResult {
  const checks: ValidationCheck[] = [];

  // (1) XML declaration with ISO-8859-1
  const firstLine = xml.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine === '<?xml version="1.0" encoding="ISO-8859-1"?>') {
    checks.push(pass("xml-decl", "XML-deklaration med ISO-8859-1"));
  } else {
    checks.push(fail("xml-decl", "XML-deklaration med ISO-8859-1",
      `Förväntat <?xml version="1.0" encoding="ISO-8859-1"?>, fick: ${firstLine.slice(0, 60)}`));
  }

  // (2) Root element
  if (/<eSKDUpload\s+Version="6\.0">/.test(xml)) {
    checks.push(pass("root", 'Rot-element <eSKDUpload Version="6.0">'));
  } else {
    checks.push(fail("root", 'Rot-element <eSKDUpload Version="6.0">',
      "Saknar eller har felaktig version"));
  }

  // (3) OrgNr format xxxxxx-xxxx
  const orgNrMatch = xml.match(/<OrgNr>([^<]*)<\/OrgNr>/);
  if (orgNrMatch && /^\d{6}-\d{4}$/.test(orgNrMatch[1])) {
    checks.push(pass("orgnr", "OrgNr på format xxxxxx-xxxx"));
  } else {
    checks.push(fail("orgnr", "OrgNr på format xxxxxx-xxxx",
      orgNrMatch ? `Felaktigt format: "${orgNrMatch[1]}"` : "OrgNr saknas"));
  }

  // (4) Period YYYYMM, month 01-12
  const periodMatch = xml.match(/<Period>([^<]*)<\/Period>/);
  if (periodMatch && /^\d{6}$/.test(periodMatch[1])) {
    const month = parseInt(periodMatch[1].slice(4, 6), 10);
    if (month >= 1 && month <= 12) {
      checks.push(pass("period", "Period på format YYYYMM (månad 01–12)"));
    } else {
      checks.push(fail("period", "Period på format YYYYMM (månad 01–12)",
        `Ogiltig månad: ${month}`));
    }
  } else {
    checks.push(fail("period", "Period på format YYYYMM (månad 01–12)",
      periodMatch ? `Felaktigt format: "${periodMatch[1]}"` : "Period saknas"));
  }

  // (5) MomsBetala always present
  const momsBetalaMatch = xml.match(/<MomsBetala>(-?\d+)<\/MomsBetala>/);
  if (momsBetalaMatch) {
    checks.push(pass("momsbetala", "<MomsBetala> finns alltid"));
  } else {
    checks.push(fail("momsbetala", "<MomsBetala> finns alltid",
      "Obligatorisk tag <MomsBetala> saknas"));
  }

  // (6) Tag order matches canonical
  const positions: { tag: string; idx: number }[] = [];
  for (const tag of CANONICAL_TAG_ORDER) {
    const re = new RegExp(`<${tag}>`);
    const m = xml.match(re);
    if (m && m.index !== undefined) {
      positions.push({ tag, idx: m.index });
    }
  }
  const sorted = [...positions].sort((a, b) => a.idx - b.idx);
  const orderOk = positions.every((p, i) => sorted[i].tag === p.tag);
  if (orderOk) {
    checks.push(pass("order", "Taggar i officiell ordning"));
  } else {
    const firstWrong = positions.findIndex((p, i) => sorted[i].tag !== p.tag);
    checks.push(fail("order", "Taggar i officiell ordning",
      `Felaktig ordning vid <${positions[firstWrong]?.tag}>`));
  }

  // (7+8+11) Numeric tags: no decimals, no spaces, integer round-trip
  let decimalErr: string | null = null;
  let spaceErr: string | null = null;
  let intErr: string | null = null;
  for (const tag of NUMERIC_TAGS) {
    const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const val = m[1];
      if (/[.,]/.test(val)) decimalErr ??= `<${tag}> innehåller decimaltecken: "${val}"`;
      if (/\s/.test(val)) spaceErr ??= `<${tag}> innehåller blanksteg: "${val}"`;
      const parsed = parseInt(val, 10);
      if (Number.isNaN(parsed) || String(parsed) !== val) {
        intErr ??= `<${tag}> är inte ett heltal: "${val}"`;
      }
    }
  }
  checks.push(decimalErr
    ? fail("no-decimals", "Inga decimaler i numeriska värden", decimalErr)
    : pass("no-decimals", "Inga decimaler i numeriska värden"));
  checks.push(spaceErr
    ? fail("no-spaces", "Inga blanksteg i numeriska värden", spaceErr)
    : pass("no-spaces", "Inga blanksteg i numeriska värden"));
  checks.push(intErr
    ? fail("integers", "Alla belopp är heltal", intErr)
    : pass("integers", "Alla belopp är heltal"));

  // (9) TextUpplysningMoms ≤ 300 chars
  const upplysningMatch = xml.match(/<TextUpplysningMoms>([^<]*)<\/TextUpplysningMoms>/);
  if (upplysningMatch) {
    if (upplysningMatch[1].length <= 300) {
      checks.push(pass("upplysning", "TextUpplysningMoms ≤ 300 tecken"));
    } else {
      checks.push(fail("upplysning", "TextUpplysningMoms ≤ 300 tecken",
        `${upplysningMatch[1].length} tecken (max 300)`));
    }
  } else {
    checks.push(pass("upplysning", "TextUpplysningMoms ≤ 300 tecken (ej angiven)"));
  }

  // (10) Closing tags
  if (/<\/Moms>\s*<\/eSKDUpload>\s*$/.test(xml)) {
    checks.push(pass("closing", "Stängande taggar </Moms></eSKDUpload>"));
  } else {
    checks.push(fail("closing", "Stängande taggar </Moms></eSKDUpload>",
      "Filen avslutas inte korrekt"));
  }

  const errors = checks.filter((c) => !c.ok);
  return {
    ok: errors.length === 0,
    checks,
    errors,
    warnings: [],
  };
}
