/**
 * SIE Parser — Stateful tokenizer for Swedish SIE 1-4 files.
 * Pure, deterministic, no side effects. Returns typed SIEDocument.
 */

export interface SIEHeader {
  flagga?: number;
  program?: { name: string; version?: string };
  generated?: { date: string; signature?: string };
  sieType?: number; // 1-4
  orgNumber?: string;
  companyName?: string;
  fiscalYears?: Array<{ index: number; start: string; end: string }>;
  format?: string;
}

export interface SIEAccount {
  number: string;
  name: string;
  type?: "T" | "S" | "K" | "I"; // Tillgång, Skuld, Kostnad, Intäkt
  unit?: string;
  sruCode?: string;
}

export interface SIEBalance {
  yearIndex: number; // 0 = current, -1 = previous
  accountNumber: string;
  amount: number;
  quantity?: number;
}

export interface SIETransaction {
  accountNumber: string;
  amount: number;
  date?: string;
  text?: string;
  dimensions?: Record<string, string>;
  quantity?: number;
}

export interface SIEVerification {
  series: string;
  number: string;
  date: string;
  text?: string;
  registeredDate?: string;
  signature?: string;
  transactions: SIETransaction[];
}

export interface SIEDimension {
  id: string;
  name: string;
}

export interface SIEObject {
  dimensionId: string;
  objectId: string;
  name: string;
}

export interface SIEDocument {
  header: SIEHeader;
  accounts: SIEAccount[];
  balances: {
    ib: SIEBalance[]; // opening
    ub: SIEBalance[]; // closing
    res: SIEBalance[]; // result
    oib: SIEBalance[]; // object opening
    oub: SIEBalance[]; // object closing
  };
  verifications: SIEVerification[];
  dimensions: SIEDimension[];
  objects: SIEObject[];
  rawLineCount: number;
  encoding: "utf-8" | "pc8" | "unknown";
}

/**
 * CP437 (IBM PC8) high-byte → Unicode lookup. SIE 4 spec mandates PC8 (CP437);
 * TextDecoder has no native cp437 support, so we map bytes 0x80-0xFF manually.
 */
const CP437_HIGH =
  "ÇüéâäàåçêëèïîìÄÅ" +
  "ÉæÆôöòûùÿÖÜ¢£¥₧ƒ" +
  "áíóúñÑªº¿⌐¬½¼¡«»" +
  "░▒▓│┤╡╢╖╕╣║╗╝╜╛┐" +
  "└┴┬├─┼╞╟╚╔╩╦╠═╬╧" +
  "╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀" +
  "αßΓπΣσµτΦΘΩδ∞φε∩" +
  "≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0";

function decodeCP437(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += b < 0x80 ? String.fromCharCode(b) : CP437_HIGH[b - 0x80] ?? "\uFFFD";
  }
  return out;
}

/** Peek header (first ~2KB) as latin1 to find #FORMAT directive. */
function peekFormat(bytes: Uint8Array): string | null {
  const head = bytes.subarray(0, Math.min(2048, bytes.length));
  let s = "";
  for (let i = 0; i < head.length; i++) s += String.fromCharCode(head[i]);
  const m = s.match(/#FORMAT\s+(\S+)/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Decode raw bytes to text. SIE files are typically PC8 (CP437) per spec, but
 * modern exports may use UTF-8 with BOM. Priority: BOM → #FORMAT directive →
 * strict UTF-8 → CP437 fallback.
 */
export function decodeSIEBytes(bytes: Uint8Array): { text: string; encoding: SIEDocument["encoding"] } {
  // BOM check
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder("utf-8").decode(bytes.slice(3)), encoding: "utf-8" };
  }
  // Honor explicit #FORMAT directive
  const fmt = peekFormat(bytes);
  if (fmt === "PC8") {
    return { text: decodeCP437(bytes), encoding: "pc8" };
  }
  if (fmt === "UTF8" || fmt === "UTF-8") {
    try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" }; }
    catch { /* fall through */ }
  }
  // Auto-detect: strict UTF-8 first, then CP437
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text, encoding: "utf-8" };
  } catch {
    return { text: decodeCP437(bytes), encoding: "pc8" };
  }
}

/**
 * Tokenize a single SIE line into [#TAG, ...args].
 * Handles quoted strings and brace-grouped lists.
 */
function tokenizeLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (c === '"') {
      let end = i + 1;
      let buf = "";
      while (end < line.length && line[end] !== '"') {
        if (line[end] === "\\" && end + 1 < line.length) {
          buf += line[end + 1];
          end += 2;
        } else {
          buf += line[end];
          end++;
        }
      }
      out.push(buf);
      i = end + 1;
      continue;
    }
    if (c === "{") {
      const close = line.indexOf("}", i);
      if (close === -1) {
        out.push(line.slice(i));
        break;
      }
      out.push(line.slice(i, close + 1));
      i = close + 1;
      continue;
    }
    let end = i;
    while (end < line.length && line[end] !== " " && line[end] !== "\t") end++;
    out.push(line.slice(i, end));
    i = end;
  }
  return out;
}

/** Parse a {dim val dim val} dimension group. */
function parseDimGroup(token: string): Record<string, string> {
  const inner = token.replace(/^\{|\}$/g, "").trim();
  if (!inner) return {};
  const parts = tokenizeLine(inner);
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < parts.length; i += 2) {
    out[parts[i]] = parts[i + 1];
  }
  return out;
}

const safeNum = (s: string | undefined): number => {
  if (!s) return 0;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function parseSIE(text: string, encoding: SIEDocument["encoding"] = "utf-8"): SIEDocument {
  const doc: SIEDocument = {
    header: {},
    accounts: [],
    balances: { ib: [], ub: [], res: [], oib: [], oub: [] },
    verifications: [],
    dimensions: [],
    objects: [],
    rawLineCount: 0,
    encoding,
  };

  const accountIndex = new Map<string, SIEAccount>();
  const lines = text.split(/\r?\n/);
  doc.rawLineCount = lines.length;

  let currentVer: SIEVerification | null = null;
  let inVerBlock = false;

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li].trim();
    if (!raw) continue;

    // Verification body lines are wrapped in { }
    if (inVerBlock) {
      if (raw === "}") {
        if (currentVer && currentVer.transactions.length > 0) {
          doc.verifications.push(currentVer);
        }
        currentVer = null;
        inVerBlock = false;
        continue;
      }
      const tokens = tokenizeLine(raw);
      if (!tokens[0]) continue;
      const tag = tokens[0].toUpperCase();
      if (tag === "#TRANS" || tag === "#RTRANS" || tag === "#BTRANS") {
        if (!currentVer) continue;
        const accountNumber = tokens[1] ?? "";
        const dimToken = tokens[2] ?? "{}";
        const amount = safeNum(tokens[3]);
        const date = tokens[4]?.replace(/^"|"$/g, "");
        const txText = tokens[5]?.replace(/^"|"$/g, "");
        const quantity = tokens[6] ? safeNum(tokens[6]) : undefined;
        currentVer.transactions.push({
          accountNumber,
          amount,
          date,
          text: txText,
          quantity,
          dimensions: dimToken.startsWith("{") ? parseDimGroup(dimToken) : {},
        });
      }
      continue;
    }

    if (!raw.startsWith("#")) continue;
    const tokens = tokenizeLine(raw);
    const tag = tokens[0].toUpperCase();

    switch (tag) {
      case "#FLAGGA":
        doc.header.flagga = parseInt(tokens[1] ?? "0", 10);
        break;
      case "#PROGRAM":
        doc.header.program = { name: tokens[1] ?? "", version: tokens[2] };
        break;
      case "#GEN":
        doc.header.generated = { date: tokens[1] ?? "", signature: tokens[2] };
        break;
      case "#SIETYP":
        doc.header.sieType = parseInt(tokens[1] ?? "0", 10);
        break;
      case "#ORGNR":
        doc.header.orgNumber = (tokens[1] ?? "").replace(/[^0-9]/g, "");
        break;
      case "#FNAMN":
        doc.header.companyName = tokens[1] ?? "";
        break;
      case "#FORMAT":
        doc.header.format = tokens[1];
        break;
      case "#RAR": {
        const idx = parseInt(tokens[1] ?? "0", 10);
        const start = tokens[2] ?? "";
        const end = tokens[3] ?? "";
        doc.header.fiscalYears = doc.header.fiscalYears ?? [];
        doc.header.fiscalYears.push({ index: idx, start, end });
        break;
      }
      case "#KONTO": {
        const number = tokens[1] ?? "";
        const name = tokens[2] ?? "";
        if (number) {
          const acc: SIEAccount = accountIndex.get(number) ?? { number, name };
          acc.name = name || acc.name;
          accountIndex.set(number, acc);
        }
        break;
      }
      case "#KTYP": {
        const number = tokens[1] ?? "";
        const ktype = (tokens[2] ?? "").toUpperCase();
        const acc = accountIndex.get(number) ?? { number, name: "" };
        if (ktype === "T" || ktype === "S" || ktype === "K" || ktype === "I") acc.type = ktype;
        accountIndex.set(number, acc);
        break;
      }
      case "#SRU": {
        const number = tokens[1] ?? "";
        const sru = tokens[2] ?? "";
        const acc = accountIndex.get(number) ?? { number, name: "" };
        acc.sruCode = sru;
        accountIndex.set(number, acc);
        break;
      }
      case "#ENHET": {
        const number = tokens[1] ?? "";
        const unit = tokens[2] ?? "";
        const acc = accountIndex.get(number) ?? { number, name: "" };
        acc.unit = unit;
        accountIndex.set(number, acc);
        break;
      }
      case "#IB":
      case "#UB":
      case "#RES": {
        const yearIndex = parseInt(tokens[1] ?? "0", 10);
        const accountNumber = tokens[2] ?? "";
        const amount = safeNum(tokens[3]);
        const quantity = tokens[4] ? safeNum(tokens[4]) : undefined;
        const bal: SIEBalance = { yearIndex, accountNumber, amount, quantity };
        if (tag === "#IB") doc.balances.ib.push(bal);
        else if (tag === "#UB") doc.balances.ub.push(bal);
        else doc.balances.res.push(bal);
        break;
      }
      case "#OIB":
      case "#OUB": {
        const yearIndex = parseInt(tokens[1] ?? "0", 10);
        const accountNumber = tokens[2] ?? "";
        const amount = safeNum(tokens[4] ?? tokens[3]);
        const bal: SIEBalance = { yearIndex, accountNumber, amount };
        if (tag === "#OIB") doc.balances.oib.push(bal);
        else doc.balances.oub.push(bal);
        break;
      }
      case "#DIM":
        doc.dimensions.push({ id: tokens[1] ?? "", name: tokens[2] ?? "" });
        break;
      case "#OBJEKT":
        doc.objects.push({
          dimensionId: tokens[1] ?? "",
          objectId: tokens[2] ?? "",
          name: tokens[3] ?? "",
        });
        break;
      case "#VER": {
        const series = tokens[1] ?? "";
        const number = tokens[2] ?? "";
        const date = tokens[3] ?? "";
        const verText = tokens[4]?.replace(/^"|"$/g, "");
        const registeredDate = tokens[5];
        const signature = tokens[6];
        currentVer = {
          series,
          number,
          date,
          text: verText,
          registeredDate,
          signature,
          transactions: [],
        };
        // Next line should be `{`
        const next = (lines[li + 1] ?? "").trim();
        if (next === "{") {
          inVerBlock = true;
          li++; // skip the `{`
        } else if (next.startsWith("{")) {
          inVerBlock = true;
        }
        break;
      }
      default:
        // Ignore unknown tags
        break;
    }
  }

  doc.accounts = Array.from(accountIndex.values()).sort((a, b) =>
    a.number.localeCompare(b.number),
  );

  return doc;
}

/** SHA-256 hex hash of file content for dedup. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
