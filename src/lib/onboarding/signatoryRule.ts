/**
 * Parse a Bolagsverket "teckningsregel" (signatory rule) text and determine
 * how many BankID signatures are required for a binding agreement.
 *
 * Heuristics on Swedish text:
 *  - "ensam" / "var för sig" / "av VD" / "av styrelseledamot" → sole (1)
 *  - "två i förening" / "av två" / "två styrelseledamöter" → joint_two (2)
 *  - "i förening" without a number → joint_all (treat as 2 — safest)
 *  - empty / unparseable → unknown (treat as sole, but flag)
 */

export type SignatoryMode = "sole" | "joint_two" | "joint_all" | "unknown";

export interface ParsedSignatoryRule {
  mode: SignatoryMode;
  requiredSignatures: 1 | 2;
  humanLabel: string;
  rawText: string | null;
  needsManualReview: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function parseSignatoryRule(text?: string | null): ParsedSignatoryRule {
  const raw = (text ?? "").trim();
  if (!raw) {
    return {
      mode: "unknown",
      requiredSignatures: 1,
      humanLabel: "Teckningsregel saknas",
      rawText: null,
      needsManualReview: true,
    };
  }

  const t = norm(raw);

  // Explicit "två i förening" / "av två" / "två styrelseledamöter"
  if (
    /\btv[åa]\s+i\s+f[öo]rening\b/.test(t) ||
    /\bav\s+tv[åa]\b/.test(t) ||
    /\btv[åa]\s+styrelse(?:ledam[öo]ter|ledam[öo]ter\s+i\s+f[öo]rening)\b/.test(t)
  ) {
    return {
      mode: "joint_two",
      requiredSignatures: 2,
      humanLabel: "Två i förening",
      rawText: raw,
      needsManualReview: false,
    };
  }

  // Explicit sole indicators
  if (
    /\bensam\b/.test(t) ||
    /\bvar\s+f[öo]r\s+sig\b/.test(t) ||
    /\bav\s+vd\b/.test(t) ||
    /\bav\s+styrelseledamot\b/.test(t) ||
    /\bav\s+styrelsens\s+ordf[öo]rande\b/.test(t)
  ) {
    return {
      mode: "sole",
      requiredSignatures: 1,
      humanLabel: "Ensam firmatecknare",
      rawText: raw,
      needsManualReview: false,
    };
  }

  // "i förening" without a number → safest = 2
  if (/\bi\s+f[öo]rening\b/.test(t) || /\bgemensamt\b/.test(t)) {
    return {
      mode: "joint_all",
      requiredSignatures: 2,
      humanLabel: "I förening",
      rawText: raw,
      needsManualReview: false,
    };
  }

  // Couldn't parse — fall back to sole but flag for review
  return {
    mode: "unknown",
    requiredSignatures: 1,
    humanLabel: "Otolkad teckningsregel",
    rawText: raw,
    needsManualReview: true,
  };
}
