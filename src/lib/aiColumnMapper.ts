// AI-driven column mapping for CSV/Excel imports.

import { supabase } from "@/integrations/supabase/client";

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  sampleValue: string;
}

export type TargetType =
  | "customers"
  | "suppliers"
  | "invoices"
  | "ar_open"
  | "ap_open";

export const TARGET_FIELDS: Record<TargetType, string[]> = {
  customers: [
    "customer_number", "name", "org_number", "vat_number", "email", "phone",
    "address", "postal_code", "city", "country", "payment_terms", "currency",
    "is_active", "category",
  ],
  suppliers: [
    "supplier_number", "name", "org_number", "email", "phone", "bankgiro", "plusgiro",
    "iban", "bic", "address", "postal_code", "city", "country", "payment_terms",
    "currency", "is_active", "category", "default_expense_account",
  ],
  invoices: [
    "invoice_number", "invoice_date", "due_date",
    "amount_excl_vat", "vat_amount", "amount_incl_vat",
    "currency", "status", "paid_date",
    "customer_name", "supplier_name", "description",
  ],
  ar_open: [
    "counterparty_name", "counterparty_org_number", "customer_code",
    "invoice_number", "ocr", "reference",
    "invoice_date", "due_date",
    "currency", "original_amount", "remaining_amount", "vat_amount",
    "description", "status", "document_type",
  ],
  ap_open: [
    "counterparty_name", "counterparty_org_number", "supplier_code",
    "invoice_number", "ocr", "reference",
    "invoice_date", "due_date",
    "currency", "original_amount", "remaining_amount", "vat_amount",
    "description", "status", "document_type",
  ],
};

export async function mapColumnsWithAI(
  headers: string[],
  sampleRows: Record<string, string>[],
  targetType: TargetType,
): Promise<ColumnMapping[]> {
  const { data, error } = await supabase.functions.invoke("ai-map-columns", {
    body: {
      headers,
      sampleRows: sampleRows.slice(0, 3),
      targetType,
      targetFields: TARGET_FIELDS[targetType],
    },
  });

  if (error) {
    console.error("[aiColumnMapper] error:", error);
    throw new Error(error.message || "AI-mappning misslyckades");
  }

  if (!Array.isArray(data?.mappings)) return [];
  return data.mappings as ColumnMapping[];
}

export function heuristicColumnMap(
  headers: string[],
  sampleRows: Record<string, string>[],
  targetType: TargetType,
): ColumnMapping[] {
  const dictionary: Record<string, string[]> = {
    name: ["namn", "kundnamn", "leverantörsnamn", "name", "company", "company name", "företagsnamn"],
    customer_number: [
      "kundnr", "kund nr", "kund-nr", "kundnummer", "customer no", "customer number",
      "customer id", "external id", "extern id", "kundkod", "kund",
    ],
    supplier_number: [
      "leverantörsnr", "lev.nr", "lev nr", "leverantörsnummer", "supplier no",
      "supplier number", "supplier id", "vendor no", "vendor number", "vendor id",
      "leverantör", "leverantörskod", "lev kod",
    ],
    is_active: ["status", "aktiv", "active", "inaktiv", "spärrad", "blocked"],
    category: [
      "kundklass", "leverantörsklass", "klass", "kategori", "category", "class",
      "kundgrupp", "leverantörsgrupp", "group",
    ],
    default_expense_account: [
      "kostnadskonto", "standardkonto", "default account", "expense account",
      "konto", "account", "bokföringskonto",
    ],
    counterparty_name: [
      "kund", "kundnamn", "customer", "customer name",
      "leverantör", "leverantörsnamn", "supplier", "vendor", "vendor name",
      "motpart", "namn",
    ],
    counterparty_org_number: ["org.nr", "orgnr", "organisationsnummer", "org number", "vat id"],
    org_number: ["org.nr", "orgnr", "organisationsnummer", "org_number", "vat"],
    email: ["e-post", "epost", "email", "mail"],
    phone: ["telefon", "tel", "phone"],
    address: ["adress", "address", "gatuadress"],
    postal_code: ["postnr", "postnummer", "zip", "postal_code"],
    city: ["ort", "stad", "city"],
    country: ["land", "country"],
    payment_terms: ["betalningsvillkor", "villkor", "terms"],
    bankgiro: ["bankgiro", "bg"],
    plusgiro: ["plusgiro", "pg"],
    iban: ["iban"],
    bic: ["bic", "swift"],
    invoice_number: [
      "fakturanr", "fakturanummer", "faktura nr", "faktura no",
      "invoice", "invoice number", "invoice no", "document no", "dokumentnr",
      "ref. number", "reference number", "ref nr", "referensnr",
    ],
    ocr: ["ocr", "ocr-nr", "ocr nr", "ocr number", "payment reference", "bg-referens"],
    invoice_date: [
      "fakturadatum", "datum", "date", "invoice date", "document date",
      "dokumentdatum", "bokföringsdatum",
    ],
    due_date: [
      "förfallodatum", "förfallodag", "due", "due date", "förfallodag",
      "betalningsdatum",
    ],
    amount_excl_vat: ["belopp exkl", "netto", "exkl moms", "amount excl vat", "net amount"],
    vat_amount: ["moms", "vat", "vat amount", "momsbelopp"],
    amount_incl_vat: ["belopp inkl", "totalt", "brutto", "total", "amount incl vat", "gross amount"],
    original_amount: [
      "originalbelopp", "fakturabelopp", "ursprungligt belopp",
      "belopp", "amount", "invoice amount", "original amount",
      "total amount", "totalbelopp",
    ],
    remaining_amount: [
      "saldo", "kvarvarande", "restbelopp", "öppet belopp", "öppet saldo",
      "balance", "remaining", "remaining amount", "open amount", "outstanding",
      "obetalt", "att betala",
    ],
    currency: ["valuta", "currency", "ccy"],
    customer_name: ["kund", "kundnamn", "customer"],
    supplier_name: ["leverantör", "leverantörsnamn", "supplier"],
    description: ["beskrivning", "text", "description", "kommentar", "kommentarer", "notering", "memo", "kommentarer i approval"],
    reference: ["urspr. ref.nr", "ursprunglig referens", "referens", "reference", "ref", "ref.nr", "external ref", "extern referens", "löpnummer", "lopnr", "löpnr"],
    status: ["status", "approval status", "godkännandestatus", "state"],
    document_type: ["typ", "dokumenttyp", "document type", "type"],
    supplier_code: ["leverantör", "leverantörsnr", "lev nr", "lev.nr", "leverantörskod", "supplier code", "supplier id", "vendor code", "vendor id"],
    customer_code: ["kund", "kundnr", "kundnummer", "kundkod", "customer code", "customer id"],
  };

  const targets = TARGET_FIELDS[targetType];
  const result: ColumnMapping[] = [];

  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    let bestField = "";
    let bestScore = 0;
    for (const field of targets) {
      const synonyms = dictionary[field] || [field];
      for (const syn of synonyms) {
        const s = syn.toLowerCase();
        let score = 0;
        if (lower === s) score = 100;
        else if (lower.includes(s) || s.includes(lower)) score = 75;
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }
    if (bestField && bestScore > 0) {
      const sample = sampleRows.find((r) => r[header])?.[header] ?? "";
      result.push({
        sourceColumn: header,
        targetField: bestField,
        confidence: bestScore,
        sampleValue: String(sample),
      });
    }
  }

  // Deduplicate: each targetField only mapped from the highest-confidence column
  const byTarget = new Map<string, ColumnMapping>();
  for (const m of result) {
    const existing = byTarget.get(m.targetField);
    if (!existing || m.confidence > existing.confidence) byTarget.set(m.targetField, m);
  }
  return Array.from(byTarget.values());
}
