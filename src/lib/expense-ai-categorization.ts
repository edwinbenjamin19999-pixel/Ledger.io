// AI-driven expense categorization engine
export interface ExpenseCategorization {
  account: string;
  accountName: string;
  vatCode: string;
  category: string;
  confidence: number;
}

interface Rule {
  keywords: string[];
  account: string;
  accountName: string;
  vatCode: string;
  category: string;
  amountCheck?: (amount: number) => { account: string; accountName: string; vatCode: string } | null;
}

const rules: Rule[] = [
  {
    keywords: ["lunch", "middag", "frukost", "restaurang", "representation", "kund", "affärsmåltid", "middag med", "affärsmaaltid"],
    account: "6071",
    accountName: "Representation avdragsgill",
    vatCode: "25",
    category: "Representation",
    amountCheck: (amount) =>
      amount > 90 ? { account: "6072", accountName: "Representation ej avdragsgill", vatCode: "0" } : null,
  },
  {
    keywords: ["telia", "tele2", "tre", "comviq", "telenor", "telefon", "mobil", "internet", "bredband", "datakommunikation"],
    account: "6230",
    accountName: "Datakommunikation",
    vatCode: "25",
    category: "Internet & Telefon/mobiltelefoni",
  },
  {
    keywords: ["adobe", "microsoft", "google", "spotify", "slack", "dropbox", "saas", "prenumeration", "mjukvara", "licens", "programvara", "app", "software"],
    account: "6540",
    accountName: "Bevakningstjänster",
    vatCode: "25",
    category: "Mjukvara (program & tjänster)",
  },
  {
    keywords: ["flyg", "tåg", "sj", "biljett", "resa"],
    account: "5810",
    accountName: "Biljetter",
    vatCode: "6",
    category: "Resor & Transport",
  },
  {
    keywords: ["uber", "taxi"],
    account: "5840",
    accountName: "Taxi",
    vatCode: "6",
    category: "Resor & Transport",
  },
  {
    keywords: ["parkering"],
    account: "5840",
    accountName: "Parkering",
    vatCode: "25",
    category: "Resor & Transport",
  },
  {
    keywords: ["bränsle", "bensin", "diesel", "drivmedel"],
    account: "5840",
    accountName: "Drivmedel",
    vatCode: "25",
    category: "Resor & Transport",
  },
  {
    keywords: ["hotell", "airbnb", "boende", "logi", "natt"],
    account: "5820",
    accountName: "Hotell & Logi",
    vatCode: "12",
    category: "Hotell & Logi",
  },
  {
    keywords: ["gym", "träning", "simhall", "friskvård", "massage", "yoga", "personlig träning"],
    account: "7699",
    accountName: "Friskvård",
    vatCode: "0",
    category: "Friskvård",
  },
  {
    keywords: ["pennor", "papper", "kontorsmaterial", "skrivare", "toner", "bläck"],
    account: "6110",
    accountName: "Kontorsmaterial",
    vatCode: "25",
    category: "Kontorsmaterial",
  },
  {
    keywords: ["frukt", "kaffe", "fika", "snacks", "personalmat"],
    account: "6980",
    accountName: "Föreningsavgifter",
    vatCode: "12",
    category: "Personalkostnader (frukt, etc)",
  },
];

export function categorizeExpense(
  description: string,
  memo: string | undefined,
  amount: number,
  country: string = "Sverige",
  currency: string = "SEK"
): ExpenseCategorization {
  const text = `${description} ${memo || ""}`.toLowerCase();

  // Check för international purchases
  if (country !== "Sverige" || (currency !== "SEK" && currency)) {
    return {
      account: "6991",
      accountName: "Övriga externa kostnader",
      vatCode: "0",
      category: "Inköp från utlandet",
      confidence: 0.7,
    };
  }

  let bestMatch: { rule: Rule; matchCount: number } | null = null;

  for (const rule of rules) {
    const matchCount = rule.keywords.filter((kw) => text.includes(kw)).length;
    if (matchCount > 0 && (!bestMatch || matchCount > bestMatch.matchCount)) {
      bestMatch = { rule, matchCount };
    }
  }

  if (bestMatch) {
    const { rule } = bestMatch;
    const override = rule.amountCheck?.(amount);
    const confidence = Math.min(0.95, 0.6 + bestMatch.matchCount * 0.15);

    return {
      account: override?.account || rule.account,
      accountName: override?.accountName || rule.accountName,
      vatCode: override?.vatCode || rule.vatCode,
      category: rule.category,
      confidence,
    };
  }

  return {
    account: "6990",
    accountName: "Övriga externa kostnader",
    vatCode: "25",
    category: "Övrigt",
    confidence: 0,
  };
}

export const EXPENSE_ACCOUNTS = [
  { value: "5810", label: "5810 – Biljetter", vat: "6" },
  { value: "5820", label: "5820 – Hotell & Logi", vat: "12" },
  { value: "5840", label: "5840 – Taxi/Parkering/Drivmedel", vat: "25" },
  { value: "6071", label: "6071 – Representation avdragsgill", vat: "25" },
  { value: "6072", label: "6072 – Representation ej avdragsgill", vat: "0" },
  { value: "6110", label: "6110 – Kontorsmaterial", vat: "25" },
  { value: "6230", label: "6230 – Datakommunikation", vat: "25" },
  { value: "6540", label: "6540 – Bevakningstjänster/IT", vat: "25" },
  { value: "6911", label: "6911 – Programvarulicenser/SaaS", vat: "25" },
  { value: "6980", label: "6980 – Föreningsavgifter", vat: "0" },
  { value: "6990", label: "6990 – Övriga externa kostnader", vat: "25" },
  { value: "6991", label: "6991 – Inköp från utlandet", vat: "0" },
  { value: "7699", label: "7699 – Friskvård", vat: "0" },
] as const;

export const EXPENSE_CATEGORIES = [
  "Representation",
  "Internet & Telefon/mobiltelefoni",
  "Mjukvara (program & tjänster)",
  "Resor & Transport",
  "Hotell & Logi",
  "Friskvård",
  "Kontorsmaterial",
  "Personalkostnader (frukt, etc)",
  "Inköp från utlandet",
  "Övrigt",
] as const;
