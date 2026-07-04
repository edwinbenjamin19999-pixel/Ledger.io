/**
 * Builds Skatteverket eSKDUpload v6.0 XML for VAT declarations (SKV 4700).
 * Spec: https://skatteverket.se/foretag/moms/deklareramoms/lamnamomsdeklarationviafilietjansten.4.2fb39afe18dabf1e4d223cc.html
 *
 * Critical rules:
 * - Encoding MUST be ISO-8859-1 (Windows-1252 compatible), NOT UTF-8.
 * - Amounts: integers only, no decimals, no thousand separators.
 * - <MomsBetala> is required even if 0. All other tags are emitted only when value !== 0.
 * - Negative MomsBetala uses leading '-' (no space).
 * - <OrgNr> normalised to "xxxxxx-xxxx".
 * - <Period> = "YYYYMM".
 * - TextUpplysningMoms sanitised, max 300 chars.
 */

export interface ESKDBoxes {
  ruta05?: number; ruta06?: number; ruta07?: number; ruta08?: number;
  ruta10?: number; ruta11?: number; ruta12?: number;
  ruta20?: number; ruta21?: number; ruta22?: number; ruta23?: number; ruta24?: number;
  ruta30?: number; ruta31?: number; ruta32?: number;
  ruta35?: number; ruta36?: number; ruta37?: number; ruta38?: number;
  ruta39?: number; ruta40?: number; ruta41?: number; ruta42?: number;
  ruta48?: number; ruta49?: number;
  ruta50?: number; ruta60?: number; ruta61?: number; ruta62?: number;
  upplysning?: string;
}

export interface BuildESKDInput {
  orgNr: string;          // any format — normalised
  period: string;         // "YYYY-MM" or "YYYYMM" or quarterly "Q1 2025"
  boxes: ESKDBoxes;
}

// Mapping Cogniq rutor → SKV XML tag (in canonical document order per Skatteverket spec).
// Order: 05,06,07,08 → 10–12 → 20–24 → 30–32 → 35–42 → 50 → 48 → 60–62.
// MomsBetala (49) and TextUpplysningMoms are emitted separately at the end.
const TAG_ORDER: Array<[keyof ESKDBoxes, string]> = [
  ["ruta05", "ForsMomsEjAnnan"],
  ["ruta06", "UttagMoms"],
  ["ruta07", "UlagMargbesk"],
  ["ruta08", "HyrinkomstFriv"],
  ["ruta10", "MomsUtgHog"],
  ["ruta11", "MomsUtgMedel"],
  ["ruta12", "MomsUtgLag"],
  ["ruta20", "InkopVaruAnnatEg"],
  ["ruta21", "InkopTjanstAnnatEg"],
  ["ruta22", "InkopTjanstUtomEg"],
  ["ruta23", "InkopVaruSverige"],
  ["ruta24", "InkopTjanstSverige"],
  ["ruta30", "MomsInkopUtgHog"],
  ["ruta31", "MomsInkopUtgMedel"],
  ["ruta32", "MomsInkopUtgLag"],
  ["ruta35", "ForsVaruAnnatEg"],
  ["ruta36", "ForsVaruUtomEg"],
  ["ruta37", "InkopVaruMellan3p"],
  ["ruta38", "ForsVaruMellan3p"],
  ["ruta39", "ForsTjSkskAnnatEg"],
  ["ruta40", "ForsTjOvrUtomEg"],
  ["ruta41", "ForsKopareSkskSverige"],
  ["ruta42", "ForsOvrigt"],
  ["ruta50", "MomsUlagImport"],
  ["ruta48", "MomsIngAvdr"],
  ["ruta60", "MomsImportUtgHog"],
  ["ruta61", "MomsImportUtgMedel"],
  ["ruta62", "MomsImportUtgLag"],
];

export function normalizeOrgNr(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  if (digits.length === 12) return `${digits.slice(2, 8)}-${digits.slice(8)}`;
  return input.trim(); // best-effort fallback
}

export function normalizePeriod(period: string): string {
  // Accepts: "YYYY-MM", "YYYYMM", "Q1 2025", "Q2 2025" etc.
  const trimmed = period.trim();
  const ymMatch = trimmed.match(/^(\d{4})-?(\d{2})$/);
  if (ymMatch) return `${ymMatch[1]}${ymMatch[2]}`;
  const qMatch = trimmed.match(/^Q([1-4])\s*(\d{4})$/i);
  if (qMatch) {
    const q = parseInt(qMatch[1], 10);
    const lastMonth = q * 3; // Q1→3, Q2→6, Q3→9, Q4→12
    return `${qMatch[2]}${String(lastMonth).padStart(2, "0")}`;
  }
  return trimmed.replace(/\D/g, "").slice(0, 6);
}

function sanitizeUpplysning(text: string): string {
  // Allowed: A-Z, 0-9, åäöÅÄÖ + basic punctuation. Strip control chars, hard cap 300.
  // SKV restricts to printable Windows-1252 characters.
  return text
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/&/g, "och")
    .replace(/[<>]/g, "")
    .slice(0, 300)
    .trim();
}

function formatAmount(n: number): string {
  // Integers only. Negative gets leading '-' with no space (per SKV spec for MomsBetala).
  const rounded = Math.round(n);
  return String(rounded);
}

/**
 * Build the eSKDUpload XML string. Returned as a UTF-16 JS string;
 * use `encodeESKDXmlToBytes` to get the ISO-8859-1 byte payload.
 */
export function buildESKDUploadXml(input: BuildESKDInput): string {
  const orgNr = normalizeOrgNr(input.orgNr);
  const period = normalizePeriod(input.period);
  const boxes = input.boxes;

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="ISO-8859-1"?>');
  lines.push('<eSKDUpload Version="6.0">');
  lines.push(`  <OrgNr>${orgNr}</OrgNr>`);
  lines.push("  <Moms>");
  lines.push(`    <Period>${period}</Period>`);

  // Optional rutor — only if non-zero.
  for (const [boxKey, tagName] of TAG_ORDER) {
    const v = boxes[boxKey] as number | undefined;
    if (typeof v === "number" && Math.round(v) !== 0) {
      lines.push(`    <${tagName}>${formatAmount(v)}</${tagName}>`);
    }
  }

  // MomsBetala is ALWAYS required (even when 0).
  const momsBetala = typeof boxes.ruta49 === "number" ? Math.round(boxes.ruta49) : 0;
  lines.push(`    <MomsBetala>${momsBetala}</MomsBetala>`);

  // Free-text info — only if present.
  if (boxes.upplysning && boxes.upplysning.trim().length > 0) {
    const cleaned = sanitizeUpplysning(boxes.upplysning);
    if (cleaned.length > 0) {
      lines.push(`    <TextUpplysningMoms>${cleaned}</TextUpplysningMoms>`);
    }
  }

  lines.push("  </Moms>");
  lines.push("</eSKDUpload>");

  return lines.join("\r\n") + "\r\n";
}

/**
 * Encodes an XML string to ISO-8859-1 bytes (Windows-1252 superset for å/ä/ö).
 * Characters outside the codepage are replaced with '?'.
 */
export function encodeESKDXmlToBytes(xml: string): Uint8Array {
  const out = new Uint8Array(xml.length);
  for (let i = 0; i < xml.length; i++) {
    const code = xml.charCodeAt(i);
    if (code <= 0xff) {
      out[i] = code;
    } else {
      // Windows-1252 special characters
      const map: Record<number, number> = {
        0x20ac: 0x80, // €
        0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
        0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89,
        0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
        0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94,
        0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
        0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
        0x017e: 0x9e, 0x0178: 0x9f,
      };
      out[i] = map[code] ?? 0x3f; // '?'
    }
  }
  return out;
}

export function buildESKDFilename(orgNr: string, period: string): string {
  const cleanOrg = normalizeOrgNr(orgNr).replace("-", "");
  const cleanPeriod = normalizePeriod(period);
  return `momsdeklaration_${cleanOrg}_${cleanPeriod}.xml`;
}

/**
 * Convenience: build XML and return a downloadable Blob with ISO-8859-1 bytes.
 * When `strict` is true (default), runs validateESKDXml and throws ESKDValidationError on failure.
 */
import { validateESKDXml, ESKDValidationError, type ValidationResult } from "./validateESKDXml";

export interface BuildESKDBlobResult {
  blob: Blob;
  xml: string;
  filename: string;
  validation: ValidationResult;
}

export function buildESKDBlob(
  input: BuildESKDInput,
  options: { strict?: boolean } = {}
): BuildESKDBlobResult {
  const { strict = true } = options;
  const xml = buildESKDUploadXml(input);
  const validation = validateESKDXml(xml);
  if (strict && !validation.ok) {
    throw new ESKDValidationError(validation);
  }
  const bytes = encodeESKDXmlToBytes(xml);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/xml; charset=ISO-8859-1" });
  return { blob, xml, filename: buildESKDFilename(input.orgNr, input.period), validation };
}

export { validateESKDXml, ESKDValidationError } from "./validateESKDXml";
export type { ValidationResult } from "./validateESKDXml";
