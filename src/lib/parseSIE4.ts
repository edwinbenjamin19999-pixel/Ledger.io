// SIE 4 format parser
// SIE 4 files use CP437 encoding and a Swedish accounting record format.
// This parser is encoding-agnostic — pass an already-decoded string.

export interface SIE4Data {
  companyName: string;
  orgNumber: string;
  fiscalYears: FiscalYear[];
  accounts: Account[];
  customers: SIECustomer[];
  suppliers: SIESupplier[];
  openingBalances: OpeningBalance[];
  closingBalances: ClosingBalance[];
  vouchers: Voucher[];
}

export interface FiscalYear {
  year: number; // 0 = current, -1 = previous, etc. (SIE convention)
  startDate: string;
  endDate: string;
}

export interface Account {
  code: string;
  name: string;
  type: "T" | "S" | "K" | "I"; // Tillgång, Skuld, Kostnad, Intäkt
}

export interface SIECustomer {
  code: string;
  name: string;
  orgNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export interface SIESupplier {
  code: string;
  name: string;
  orgNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export interface OpeningBalance {
  accountCode: string;
  year: number;
  balance: number; // positive = debit, negative = credit
}

export interface ClosingBalance {
  accountCode: string;
  year: number;
  balance: number;
}

export interface Voucher {
  series: string;
  number: string;
  date: string;
  description: string;
  transactions: Transaction[];
}

export interface Transaction {
  accountCode: string;
  amount: number;
  description?: string;
  date?: string;
}

export function parseSIE4(fileContent: string): SIE4Data {
  const lines = fileContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: SIE4Data = {
    companyName: "",
    orgNumber: "",
    fiscalYears: [],
    accounts: [],
    customers: [],
    suppliers: [],
    openingBalances: [],
    closingBalances: [],
    vouchers: [],
  };

  const accountTypeMap: Record<string, "T" | "S" | "K" | "I"> = {};
  let currentVoucher: Voucher | null = null;
  let inVoucherBlock = false;

  for (const line of lines) {
    if (line === "{") {
      inVoucherBlock = true;
      continue;
    }
    if (line === "}") {
      if (currentVoucher) {
        result.vouchers.push(currentVoucher);
        currentVoucher = null;
      }
      inVoucherBlock = false;
      continue;
    }
    if (!line.startsWith("#")) continue;

    const parts = tokenizeSIELine(line);
    const tag = parts[0];

    switch (tag) {
      case "#FNAMN":
        result.companyName = unquote(parts[1] || "");
        break;

      case "#ORGNR":
        result.orgNumber = unquote(parts[1] || "");
        break;

      case "#RAR": {
        // #RAR yearOffset startDate endDate
        const year = parseInt(parts[1] || "0", 10);
        result.fiscalYears.push({
          year,
          startDate: formatSIEDate(unquote(parts[2] || "")),
          endDate: formatSIEDate(unquote(parts[3] || "")),
        });
        break;
      }

      case "#KONTO":
        result.accounts.push({
          code: unquote(parts[1] || ""),
          name: unquote(parts[2] || ""),
          type: accountTypeMap[unquote(parts[1] || "")] || "T",
        });
        break;

      case "#KTYP": {
        const code = unquote(parts[1] || "");
        const t = unquote(parts[2] || "T") as "T" | "S" | "K" | "I";
        accountTypeMap[code] = t;
        const acc = result.accounts.find((a) => a.code === code);
        if (acc) acc.type = t;
        break;
      }

      case "#CUST":
      case "#KUND": {
        result.customers.push({
          code: unquote(parts[1] || ""),
          name: unquote(parts[2] || ""),
          orgNumber: unquote(parts[3] || "") || undefined,
          address: unquote(parts[4] || "") || undefined,
          postalCode: unquote(parts[5] || "") || undefined,
          city: unquote(parts[6] || "") || undefined,
        });
        break;
      }

      case "#SUPP":
      case "#LEV": {
        result.suppliers.push({
          code: unquote(parts[1] || ""),
          name: unquote(parts[2] || ""),
          orgNumber: unquote(parts[3] || "") || undefined,
          address: unquote(parts[4] || "") || undefined,
          postalCode: unquote(parts[5] || "") || undefined,
          city: unquote(parts[6] || "") || undefined,
        });
        break;
      }

      case "#IB":
        result.openingBalances.push({
          year: parseInt(parts[1] || "0", 10),
          accountCode: unquote(parts[2] || ""),
          balance: parseFloat(parts[3] || "0"),
        });
        break;

      case "#UB":
        result.closingBalances.push({
          year: parseInt(parts[1] || "0", 10),
          accountCode: unquote(parts[2] || ""),
          balance: parseFloat(parts[3] || "0"),
        });
        break;

      case "#VER":
        currentVoucher = {
          series: unquote(parts[1] || ""),
          number: unquote(parts[2] || ""),
          date: formatSIEDate(unquote(parts[3] || "")),
          description: unquote(parts[4] || ""),
          transactions: [],
        };
        break;

      case "#TRANS":
        if (currentVoucher) {
          currentVoucher.transactions.push({
            accountCode: unquote(parts[1] || ""),
            amount: parseFloat(parts[3] || "0"),
            date: parts[4] ? formatSIEDate(unquote(parts[4])) : undefined,
            description: unquote(parts[5] || "") || undefined,
          });
        }
        break;
    }
  }

  // Edge case: last voucher without explicit closing brace
  if (currentVoucher) {
    result.vouchers.push(currentVoucher);
  }

  return result;
}

function tokenizeSIELine(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') j++;
      tokens.push(line.slice(i, j + 1));
      i = j + 1;
    } else if (line[i] === "{") {
      // dimension/object lists — skip until matching }
      let depth = 1;
      let j = i + 1;
      while (j < line.length && depth > 0) {
        if (line[j] === "{") depth++;
        else if (line[j] === "}") depth--;
        j++;
      }
      tokens.push(line.slice(i, j));
      i = j;
    } else if (line[i] === " " || line[i] === "\t") {
      i++;
    } else {
      let j = i;
      while (j < line.length && line[j] !== " " && line[j] !== "\t") j++;
      tokens.push(line.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    return s.slice(1, -1);
  }
  return s;
}

function formatSIEDate(sieDate: string): string {
  // SIE dates are YYYYMMDD
  if (/^\d{8}$/.test(sieDate)) {
    return `${sieDate.slice(0, 4)}-${sieDate.slice(4, 6)}-${sieDate.slice(6, 8)}`;
  }
  return sieDate;
}
