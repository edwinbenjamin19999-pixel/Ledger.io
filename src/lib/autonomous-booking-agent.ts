/**
 * Autonomous Bookkeeping Agent Engine
 * Handles classification, matching, confidence scoring, learning, and explanation.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────
export interface AgentResult {
  accountNumber: string;
  accountName: string;
  vatCode: string;
  category: string;
  confidence: number;
  explanation: string;
  ruleId?: string;
  alternatives: AgentAlternative[];
  transactionType: TransactionType;
  isRecurring: boolean;
  // Payment method detection
  balancingAccount?: string;
  balancingAccountName?: string;
  paymentMethod?: string;
  paymentMethodConfidence?: number;
}

export interface AgentAlternative {
  accountNumber: string;
  accountName: string;
  confidence: number;
  reason: string;
}

export type TransactionType =
  | "purchase"
  | "sale"
  | "salary"
  | "tax"
  | "transfer"
  | "refund"
  | "subscription"
  | "foreign"
  | "unknown";

interface LearnedRule {
  id: string;
  match_pattern: string;
  account_number: string;
  account_name: string;
  vat_code: string | null;
  category: string | null;
  hit_count: number;
  confidence: number;
}

// ─── Built-in counterparty mapping (50+ Swedish merchants) ──
const COUNTERPARTY_MAP: Record<string, { account: string; name: string; vat: string; category: string }> = {
  "telia": { account: "6211", name: "Telefon", vat: "25", category: "Telekommunikation" },
  "tele2": { account: "6211", name: "Telefon", vat: "25", category: "Telekommunikation" },
  "tre": { account: "6212", name: "Mobiltelefon", vat: "25", category: "Telekommunikation" },
  "comviq": { account: "6212", name: "Mobiltelefon", vat: "25", category: "Telekommunikation" },
  "telenor": { account: "6211", name: "Telefon", vat: "25", category: "Telekommunikation" },
  "bahnhof": { account: "6214", name: "Bredband/internet", vat: "25", category: "Telekommunikation" },
  "adobe": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "microsoft": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "google": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "github": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "slack": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "dropbox": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "spotify": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "notion": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "figma": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "canva": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "openai": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "aws": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "heroku": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "vercel": { account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  "sj": { account: "6712", name: "Tågresor", vat: "6", category: "Resor" },
  "scandic": { account: "6720", name: "Hotell och logi", vat: "12", category: "Logi" },
  "nordic choice": { account: "6720", name: "Hotell och logi", vat: "12", category: "Logi" },
  "elite hotels": { account: "6720", name: "Hotell och logi", vat: "12", category: "Logi" },
  "airbnb": { account: "6720", name: "Hotell och logi", vat: "12", category: "Logi" },
  "booking.com": { account: "6720", name: "Hotell och logi", vat: "12", category: "Logi" },
  "uber": { account: "6740", name: "Taxi", vat: "6", category: "Resor" },
  "bolt": { account: "6740", name: "Taxi", vat: "6", category: "Resor" },
  "taxi": { account: "6740", name: "Taxi", vat: "6", category: "Resor" },
  "norwegian": { account: "6711", name: "Flygresor", vat: "6", category: "Resor" },
  "sas": { account: "6711", name: "Flygresor", vat: "6", category: "Resor" },
  "ryanair": { account: "6711", name: "Flygresor", vat: "6", category: "Resor" },
  "wizzair": { account: "6711", name: "Flygresor", vat: "6", category: "Resor" },
  "circle k": { account: "6770", name: "Drivmedel tjänsteresor", vat: "25", category: "Drivmedel" },
  "okq8": { account: "6770", name: "Drivmedel tjänsteresor", vat: "25", category: "Drivmedel" },
  "preem": { account: "6770", name: "Drivmedel tjänsteresor", vat: "25", category: "Drivmedel" },
  "ingo": { account: "6770", name: "Drivmedel tjänsteresor", vat: "25", category: "Drivmedel" },
  "shell": { account: "6770", name: "Drivmedel tjänsteresor", vat: "25", category: "Drivmedel" },
  "staples": { account: "6110", name: "Kontorsmaterial", vat: "25", category: "Kontor" },
  "dustin": { account: "6110", name: "Kontorsmaterial", vat: "25", category: "Kontor" },
  "kjell & company": { account: "6110", name: "Kontorsmaterial", vat: "25", category: "Kontor" },
  "if försäkring": { account: "6310", name: "Företagsförsäkringar", vat: "0", category: "Försäkring" },
  "trygg-hansa": { account: "6310", name: "Företagsförsäkringar", vat: "0", category: "Försäkring" },
  "länsförsäkringar": { account: "6310", name: "Företagsförsäkringar", vat: "0", category: "Försäkring" },
  "postnord": { account: "6250", name: "Postbefordran", vat: "0", category: "Post" },
  "swish": { account: "6570", name: "Bankkostnader", vat: "0", category: "Bank" },
  "swedbank": { account: "6570", name: "Bankkostnader", vat: "0", category: "Bank" },
  "seb": { account: "6570", name: "Bankkostnader", vat: "0", category: "Bank" },
  "handelsbanken": { account: "6570", name: "Bankkostnader", vat: "0", category: "Bank" },
  "nordea": { account: "6570", name: "Bankkostnader", vat: "0", category: "Bank" },
  "skatteverket": { account: "2510", name: "Skatteskulder", vat: "0", category: "Skatt" },
  "ikea": { account: "6040", name: "Förbrukningsinventarier", vat: "25", category: "Inventarier" },
  "bauhaus": { account: "6040", name: "Förbrukningsinventarier", vat: "25", category: "Inventarier" },
  "ahlsell": { account: "6040", name: "Förbrukningsinventarier", vat: "25", category: "Inventarier" },
  "amazon": { account: "6990", name: "Övriga externa kostnader", vat: "25", category: "Övrigt" },
};

// ─── Keyword-based classification ───────────────────────────
const KEYWORD_RULES: { keywords: string[]; account: string; name: string; vat: string; category: string }[] = [
  { keywords: ["hyra", "lokal", "kontor"], account: "5010", name: "Lokalhyra", vat: "25", category: "Lokalkostnader" },
  { keywords: ["el", "elräkning", "elnät"], account: "5020", name: "El för lokaler", vat: "25", category: "Lokalkostnader" },
  { keywords: ["städ", "renhållning"], account: "5060", name: "Städning och renhållning", vat: "25", category: "Lokalkostnader" },
  { keywords: ["representation", "lunch", "middag", "restaurang", "affärsmåltid"], account: "6071", name: "Representation avdragsgill", vat: "25", category: "Representation" },
  { keywords: ["revision", "revisor"], account: "6421", name: "Revision", vat: "25", category: "Förvaltning" },
  { keywords: ["juridik", "advokat", "jurist"], account: "6440", name: "Juridiska konsultarvoden", vat: "25", category: "Förvaltning" },
  { keywords: ["redovisning", "bokföring", "bokförare"], account: "6460", name: "Redovisningstjänster", vat: "25", category: "Förvaltning" },
  { keywords: ["konsult", "rådgivning"], account: "6550", name: "Konsulttjänster", vat: "25", category: "Tjänster" },
  { keywords: ["reklam", "annons", "marknadsföring"], account: "6940", name: "Marknadsföring", vat: "25", category: "Marknadsföring" },
  { keywords: ["google ads", "facebook ads"], account: "6941", name: "Google Ads/online-annonsering", vat: "25", category: "Marknadsföring" },
  { keywords: ["försäkring", "ansvarsförsäkring"], account: "6310", name: "Företagsförsäkringar", vat: "0", category: "Försäkring" },
  { keywords: ["friskvård", "gym", "träning", "massage"], account: "7699", name: "Friskvård", vat: "0", category: "Personal" },
  { keywords: ["lön", "salary", "nettolön"], account: "7010", name: "Löner tjänstemän", vat: "0", category: "Personal" },
  { keywords: ["parkering"], account: "6750", name: "Parkeringskostnader", vat: "25", category: "Resor" },
  { keywords: ["bensin", "diesel", "drivmedel", "bränsle"], account: "6770", name: "Drivmedel tjänsteresor", vat: "25", category: "Drivmedel" },
  { keywords: ["prenumeration", "abonnemang"], account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Mjukvara" },
  { keywords: ["bank", "avgift", "bankavgift"], account: "6570", name: "Bankkostnader", vat: "0", category: "Bank" },
  { keywords: ["ränta", "räntekostnad"], account: "8410", name: "Räntekostnader", vat: "0", category: "Finans" },
];

// ─── Transaction type classifier ────────────────────────────
function classifyTransactionType(
  amount: number,
  counterparty: string,
  description: string
): TransactionType {
  const text = `${counterparty} ${description}`.toLowerCase();

  if (amount > 0) {
    if (text.includes("retur") || text.includes("återbetalning") || text.includes("refund")) return "refund";
    return "sale";
  }

  if (text.includes("skatteverket") || text.includes("skatt") || text.includes("moms")) return "tax";
  if (text.includes("lön") || text.includes("salary") || text.includes("nettolön")) return "salary";
  if (text.includes("överföring") || text.includes("transfer")) return "transfer";
  if (["usd", "eur", "gbp", "nok", "dkk"].some(c => text.includes(c))) return "foreign";

  return "purchase";
}

// ─── Recurring detection ────────────────────────────────────
function detectRecurring(
  counterparty: string,
  amount: number,
  history: { counterparty: string; amount: number }[]
): boolean {
  const similar = history.filter(
    h =>
      h.counterparty?.toLowerCase() === counterparty?.toLowerCase() &&
      Math.abs(h.amount - amount) / Math.abs(amount || 1) <= 0.05
  );
  return similar.length >= 2;
}

// ─── Main Agent classify function ───────────────────────────
export async function agentClassify(
  companyId: string,
  counterparty: string,
  description: string,
  amount: number,
  currency: string = "SEK"
): Promise<AgentResult> {
  const text = `${counterparty} ${description}`.toLowerCase().trim();
  const transactionType = classifyTransactionType(amount, counterparty, description);
  const alternatives: AgentAlternative[] = [];

  // 1. Check learned rules (highest priority)
  let learnedRules: LearnedRule[] = [];
  try {
    const { data } = await supabase
      .from("agent_booking_rules")
      .select("id, match_pattern, account_number, account_name, vat_code, category, hit_count, confidence")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("hit_count", { ascending: false });
    learnedRules = (data || []) as LearnedRule[];
  } catch { /* ignore */ }

  // Try exact counterparty match in learned rules
  const exactRule = learnedRules.find(
    r => text.includes(r.match_pattern.toLowerCase())
  );

  if (exactRule) {
    const conf = Math.min(0.99, 0.75 + exactRule.hit_count * 0.03);
    const explanation = `Bokfördes mot ${exactRule.account_number} ${exactRule.account_name} baserat på ${exactRule.hit_count} tidigare ${exactRule.hit_count === 1 ? "transaktion" : "transaktioner"} from "${exactRule.match_pattern}"`;

    // Add alternatives from other possible matches
    addAlternatives(text, alternatives, exactRule.account_number);

    return {
      accountNumber: exactRule.account_number,
      accountName: exactRule.account_name,
      vatCode: exactRule.vat_code || "25",
      category: exactRule.category || "Övrigt",
      confidence: conf,
      explanation,
      ruleId: exactRule.id,
      alternatives,
      transactionType,
      isRecurring: false,
    };
  }

  // 2. Check built-in counterparty map
  const cpLower = counterparty?.toLowerCase() || "";
  const cpMatch = Object.entries(COUNTERPARTY_MAP).find(([key]) => cpLower.includes(key));

  if (cpMatch) {
    const [matchedKey, mapping] = cpMatch;
    const explanation = `Bokfördes mot ${mapping.account} ${mapping.name} baserat på känd leverantör "${matchedKey}"`;
    addAlternatives(text, alternatives, mapping.account);

    return {
      accountNumber: mapping.account,
      accountName: mapping.name,
      vatCode: mapping.vat,
      category: mapping.category,
      confidence: 0.85,
      explanation,
      alternatives,
      transactionType,
      isRecurring: false,
    };
  }

  // 3. Keyword-based matching
  let bestKeyword: { rule: typeof KEYWORD_RULES[0]; matchCount: number } | null = null;
  for (const rule of KEYWORD_RULES) {
    const matchCount = rule.keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > 0 && (!bestKeyword || matchCount > bestKeyword.matchCount)) {
      bestKeyword = { rule, matchCount };
    }
  }

  if (bestKeyword) {
    const { rule, matchCount } = bestKeyword;
    const conf = Math.min(0.88, 0.55 + matchCount * 0.12);
    const matchedWords = rule.keywords.filter(kw => text.includes(kw));
    const explanation = `Bokfördes mot ${rule.account} ${rule.name} baserat på nyckelord: "${matchedWords.join('", "')}"`;
    addAlternatives(text, alternatives, rule.account);

    // Check representation amount limit
    if (rule.account === "6071" && Math.abs(amount) > 90) {
      return {
        accountNumber: "6072",
        accountName: "Representation ej avdragsgill",
        vatCode: "0",
        category: "Representation",
        confidence: conf,
        explanation: `${explanation}. Belopp överstiger 90 kr/person → ej avdragsgill representation.`,
        alternatives: [{ accountNumber: "6071", accountName: "Representation avdragsgill", confidence: conf * 0.8, reason: "Om beloppet är per person ≤90 kr" }, ...alternatives],
        transactionType,
        isRecurring: false,
      };
    }

    return {
      accountNumber: rule.account,
      accountName: rule.name,
      vatCode: rule.vat,
      category: rule.category,
      confidence: conf,
      explanation,
      alternatives,
      transactionType,
      isRecurring: false,
    };
  }

  // 4. Check transaction history för similar descriptions
  try {
    const { data: historyData } = await supabase
      .from("journal_entries")
      .select("description, journal_entry_lines!inner(account_id, debit, credit, chart_of_accounts:account_id(account_number, account_name))")
      .eq("company_id", companyId)
      .eq("status", "approved")
      .ilike("description", `%${counterparty?.substring(0, 10) || ""}%`)
      .limit(10);

    if (historyData && historyData.length > 0) {
      const lines = historyData.flatMap((je: any) => je.journal_entry_lines || []);
      const expenseLines = lines.filter(
        (l: any) => l.debit > 0 && l.chart_of_accounts?.account_number && !l.chart_of_accounts.account_number.startsWith("19")
      );

      if (expenseLines.length > 0) {
        const acct = expenseLines[0].chart_of_accounts;
        return {
          accountNumber: acct.account_number,
          accountName: acct.account_name,
          vatCode: "25",
          category: "Historik",
          confidence: 0.65,
          explanation: `Bokfördes mot ${acct.account_number} ${acct.account_name} baserat på ${historyData.length} liknande historiska transaktioner`,
          alternatives,
          transactionType,
          isRecurring: false,
        };
      }
    }
  } catch { /* ignore */ }

  // 5. Fallback
  return {
    accountNumber: "6990",
    accountName: "Övriga externa kostnader",
    vatCode: "25",
    category: "Övrigt",
    confidence: 0.2,
    explanation: "Kunde inte kategorisera automatiskt. Ingen matchning mot känd leverantör, nyckelord eller historik.",
    alternatives: [
      { accountNumber: "6550", accountName: "Konsulttjänster", confidence: 0.15, reason: "Om det rör konsultarbete" },
      { accountNumber: "6110", accountName: "Kontorsmaterial", confidence: 0.1, reason: "Om det rör kontorsmaterial" },
      { accountNumber: "6040", accountName: "Förbrukningsinventarier", confidence: 0.1, reason: "Om det rör inventarier" },
    ],
    transactionType,
    isRecurring: false,
  };
}

function addAlternatives(text: string, alternatives: AgentAlternative[], excludeAccount: string) {
  // Add up to 2 alternatives from keyword rules
  for (const rule of KEYWORD_RULES) {
    if (rule.account === excludeAccount) continue;
    const matchCount = rule.keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > 0 && alternatives.length < 2) {
      alternatives.push({
        accountNumber: rule.account,
        accountName: rule.name,
        confidence: Math.min(0.7, 0.3 + matchCount * 0.1),
        reason: `Matchade nyckelord: ${rule.keywords.filter(kw => text.includes(kw)).join(", ")}`,
      });
    }
  }
}

// ─── Learning: record user correction ───────────────────────
export async function agentLearn(
  companyId: string,
  counterparty: string,
  correctedAccount: string,
  correctedAccountName: string,
  vatCode?: string,
  category?: string
): Promise<void> {
  if (!counterparty || !correctedAccount) return;

  const pattern = counterparty.trim();

  // Check if rule exists
  const { data: existing } = await supabase
    .from("agent_booking_rules")
    .select("id, hit_count")
    .eq("company_id", companyId)
    .eq("match_pattern", pattern)
    .eq("account_number", correctedAccount)
    .maybeSingle();

  if (existing) {
    // Increment hit count
    await supabase
      .from("agent_booking_rules")
      .update({
        hit_count: existing.hit_count + 1,
        confidence: Math.min(0.99, 0.75 + (existing.hit_count + 1) * 0.03),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Create new rule
    await supabase.from("agent_booking_rules").insert({
      company_id: companyId,
      match_pattern: pattern,
      account_number: correctedAccount,
      account_name: correctedAccountName,
      vat_code: vatCode || null,
      category: category || null,
      rule_type: "learned",
      match_field: "counterparty",
      source: "user_correction",
    });
  }
}

// ─── Get agent stats för dashboard ──────────────────────────
export async function getAgentStats(companyId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [bookingsRes, rulesRes, historyRes] = await Promise.all([
    supabase
      .from("agent_bookings")
      .select("id, confidence, status, user_corrected")
      .eq("company_id", companyId)
      .gte("created_at", monthStart),
    supabase
      .from("agent_booking_rules")
      .select("id, created_at")
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("agent_confidence_history")
      .select("*")
      .eq("company_id", companyId)
      .order("month", { ascending: true })
      .limit(12),
  ]);

  const bookings = bookingsRes.data || [];
  const rules = rulesRes.data || [];
  const history = historyRes.data || [];

  const autoBooked = bookings.filter(b => b.status === "auto_booked" && b.confidence >= 0.92).length;
  const reviewNeeded = bookings.filter(b => b.confidence >= 0.75 && b.confidence < 0.92).length;
  const userFlagged = bookings.filter(b => b.confidence < 0.75).length;
  const corrected = bookings.filter(b => b.user_corrected).length;
  const total = bookings.length;
  const avgConfidence = total > 0
    ? bookings.reduce((s, b) => s + (b.confidence || 0), 0) / total
    : 0;

  // Estimate time saved (avg 2 min per auto-booked transaction)
  const timeSavedMinutes = autoBooked * 2;
  const timeSavedHours = Math.round(timeSavedMinutes / 60 * 10) / 10;

  // New rules learned this month
  const newRules = rules.filter(r => r.created_at >= monthStart).length;

  return {
    totalThisMonth: total,
    autoBooked,
    reviewNeeded,
    userFlagged,
    corrected,
    avgConfidence,
    timeSavedHours,
    totalRules: rules.length,
    newRulesThisMonth: newRules,
    autoRate: total > 0 ? (autoBooked / total) * 100 : 0,
    history: history ,
  };
}

// ─── Log an agent booking ───────────────────────────────────
export async function logAgentBooking(
  companyId: string,
  result: AgentResult,
  sourceType: string,
  sourceId: string,
  counterparty: string,
  amount: number,
  journalEntryId?: string
) {
  let status: string;
  if (result.confidence >= 0.92) status = "auto_booked";
  else if (result.confidence >= 0.75) status = "review_list";
  else status = "user_flagged";

  await supabase.from("agent_bookings").insert({
    company_id: companyId,
    journal_entry_id: journalEntryId || null,
    source_type: sourceType,
    source_id: sourceId,
    counterparty,
    amount,
    account_number: result.accountNumber,
    account_name: result.accountName,
    vat_code: result.vatCode,
    confidence: result.confidence,
    status,
    explanation: result.explanation,
    rule_id: result.ruleId || null,
    payment_method: result.paymentMethod || null,
    balancing_account: result.balancingAccount || null,
    payment_method_confidence: result.paymentMethodConfidence || null,
  });
}
