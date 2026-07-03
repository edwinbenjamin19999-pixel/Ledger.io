export interface InvoiceData {
  customer?: string;
  hours?: number;
  hourlyRate?: number;
  amount?: number;
  period?: string;
  description?: string;
  vatRate: number;
  dueDate: string;
  invoiceNumber: string;
}

export interface ExpenseData {
  amount?: number;
  category?: string;
  description?: string;
  date: string;
}

export interface QueryData {
  queryType: string;
  rawText: string;
}

export interface CommandIntent {
  type: "invoice" | "expense" | "query" | "unknown";
  data: InvoiceData | ExpenseData | QueryData;
  confidence: number;
}

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  }
  return undefined;
}

function extractCustomer(text: string): string | undefined {
  const patterns = [
    /kund\s+(.+?)(?:,|$)/i,
    /(?:till|för)\s+([A-ZÅÄÖ][a-zåäö]+(?:\s+[A-ZÅÄÖ]?[a-zåäö]*)*(?:\s+AB|KB|HB))/,
    /([A-ZÅÄÖ][a-zåäö]+\s+AB)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return undefined;
}

function extractPeriod(text: string): string | undefined {
  const months = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];
  const lower = text.toLowerCase();
  for (const month of months) {
    if (lower.includes(month)) {
      const yearMatch = text.match(new RegExp(month + "\\s*(\\d{4})", "i"));
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
      return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    }
  }
  const shortMonths: Record<string, string> = { jan: "Januari", feb: "Februari", mar: "Mars", apr: "April", maj: "Maj", jun: "Juni", jul: "Juli", aug: "Augusti", sep: "September", okt: "Oktober", nov: "November", dec: "December" };
  for (const [short, full] of Object.entries(shortMonths)) {
    if (lower.includes(short + " ") || lower.includes(short + ",") || lower.endsWith(short)) {
      return `${full} ${new Date().getFullYear()}`;
    }
  }
  return undefined;
}

function formatDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("sv-SE");
}

function generateInvoiceNumber(): string {
  return `#10${Math.floor(Math.random() * 90 + 10)}`;
}

// Detects question/inquiry phrasing — these should go to the AI, never to a command card.
function isQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.includes("?")) return true;
  // Swedish question/inquiry openers
  const questionStarters = /^(bokfördes|bokfört|visa|hur|vad|när|varför|vilken|vilket|vilka|är |har |finns|kan |gick|blev|status|kolla|sök|hitta|berätta|förklara|listа|lista)/i;
  if (questionStarters.test(lower)) return true;
  // "senaste X" / "mailade X" / "per mail" — referring to existing items, not creating new
  if (/\b(senaste|mailade|mailat|per mail|via mail|i inkorgen|inboxen)\b/i.test(lower)) return true;
  return false;
}

export function parseCommand(text: string): CommandIntent {
  const lower = text.toLowerCase();

  // ── Question first — never misclassify inquiries as commands ──
  if (isQuestion(text)) {
    return {
      type: "query",
      confidence: 0.7,
      data: { queryType: "inquiry", rawText: text } as QueryData,
    };
  }

  // ── Invoice detection ──
  const isInvoice = /faktura|fakturera/i.test(lower);
  const hasHours = /(\d+)\s*(?:timmar?|h\b)/i.test(lower);

  if (isInvoice || hasHours) {
    const hours = extractNumber(text, [
      /(\d+)\s*(?:timmar?|h)\b/i,
    ]);
    const hourlyRate = extractNumber(text, [
      /timtaxa\s+(\d[\d\s]*)\s*(?:kr|kronor)/i,
      /(\d[\d\s]*)\s*kr(?:\/h|\s*per\s*timme)/i,
      /[àa@]\s*(\d[\d\s]*)\s*kr/i,
    ]);
    const directAmount = extractNumber(text, [
      /belopp\s+(\d[\d\s]*)\s*kr/i,
      /(\d[\d\s]*)\s*kr(?!\/h)/i,
    ]);
    const customer = extractCustomer(text);
    const period = extractPeriod(text);

    const amount = hours && hourlyRate ? hours * hourlyRate : directAmount;
    let confidence = 0;
    if (isInvoice) confidence += 0.3;
    if (hours) confidence += 0.2;
    if (hourlyRate) confidence += 0.2;
    if (customer) confidence += 0.2;
    if (amount) confidence += 0.1;

    if (confidence >= 0.5) {
      return {
        type: "invoice",
        confidence,
        data: {
          customer,
          hours,
          hourlyRate,
          amount,
          period,
          description: hours && hourlyRate ? `Konsulttjänster${period ? ` ${period}` : ""}` : undefined,
          vatRate: 0.25,
          dueDate: formatDueDate(),
          invoiceNumber: generateInvoiceNumber(),
        } as InvoiceData,
      };
    }
  }

  // ── Expense detection ──
  // Require either an explicit creation verb OR a clear amount in kr.
  // Plain mention of "kvitto" alone is NOT enough (avoids "0 kr"-buggen).
  const hasExpenseVerb = /\b(registrera|bokför|lägg\s+till|lagg\s+till|spara|skapa)\b.*\b(utlägg|kvitto|utgift)\b/i.test(lower)
    || /\b(utlägg|kvitto|utgift)\b.*\b(på|for|för)\b/i.test(lower);
  const expenseAmount = extractNumber(text, [/(\d[\d\s]*(?:[,.]\d+)?)\s*kr\b/i]);
  const mentionsExpense = /\b(utlägg|kvitto|utgift)\b/i.test(lower);

  if (mentionsExpense && (hasExpenseVerb || expenseAmount)) {
    const catMatch = text.match(/(?:kategori|typ)\s+(.+?)(?:,|$)/i);
    const category = catMatch ? catMatch[1].trim() : (/mat|lunch|middag/i.test(lower) ? "Mat & Fika" : /taxi|resa|flyg|tåg/i.test(lower) ? "Resor" : /kontors/i.test(lower) ? "Kontorsmaterial" : "Övrigt");

    let confidence = 0.3;
    if (hasExpenseVerb) confidence += 0.3;
    if (expenseAmount) confidence += 0.3;

    return {
      type: "expense",
      confidence,
      data: {
        amount: expenseAmount,
        category,
        description: text,
        date: new Date().toLocaleDateString("sv-SE"),
      } as ExpenseData,
    };
  }

  // ── Query detection ──
  if (/saldo|resultat|omsättning|vinst|förlust|kassaflöde|balans/i.test(lower)) {
    return {
      type: "query",
      confidence: 0.6,
      data: { queryType: "financial", rawText: text } as QueryData,
    };
  }

  return {
    type: "unknown",
    confidence: 0,
    data: { queryType: "unknown", rawText: text } as QueryData,
  };
}
