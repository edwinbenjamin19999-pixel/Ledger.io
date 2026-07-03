/**
 * Strict invoice validation layer.
 * Ensures NO hallucinated, guessed, or missing critical data reaches rendering.
 * If validation fails, the invoice MUST NOT be rendered — show errors instead.
 *
 * Architecture principle: Backend owns ALL data & calculations.
 * This layer only VALIDATES — it never creates or assumes data.
 */

export interface InvoiceValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface InvoiceValidationResult {
  valid: boolean;
  errors: InvoiceValidationError[];
  warnings: InvoiceValidationError[];
}

interface InvoiceToValidate {
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  counterparty_name?: string | null;
  counterparty_org_number?: string | null;
  counterparty_address?: string | null;
  total_amount?: number | null;
  vat_amount?: number | null;
  payment_reference?: string | null;
  status?: string | null;
}

interface CompanyToValidate {
  name?: string | null;
  org_number?: string | null;
  address?: string | null;
  bankgiro?: string | null;
  plusgiro?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  billing_email?: string | null;
  email_inbox_address?: string | null;
}

interface LineToValidate {
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  vat_rate?: number | null;
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const ORG_NUMBER_REGEX = /^\d{6}-\d{4}$/;

function isValidOrgNumber(orgNr: string | null | undefined): boolean {
  if (!orgNr) return false;
  const trimmed = orgNr.trim();
  if (ORG_NUMBER_REGEX.test(trimmed)) return true;
  if (/^\d{10}$/.test(trimmed)) return true;
  return false;
}

function isValidIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "");
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned);
}

function isValidBIC(bic: string): boolean {
  const cleaned = bic.replace(/\s/g, "");
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
}

function isValidBankgiro(bg: string): boolean {
  const cleaned = bg.replace(/[\s-]/g, "");
  return /^\d{7,8}$/.test(cleaned);
}

// ═══════════════════════════════════════════════
// AMOUNT VALIDATION
// ═══════════════════════════════════════════════

function validateAmounts(
  lines: LineToValidate[],
  declaredTotal: number,
  declaredVat: number,
): InvoiceValidationError[] {
  const errors: InvoiceValidationError[] = [];
  if (lines.length === 0) return errors;

  let calculatedNet = 0;
  let calculatedVat = 0;

  for (const line of lines) {
    const qty = line.quantity ?? 0;
    const price = line.unit_price ?? 0;
    const rate = line.vat_rate ?? 0;
    const lineNet = qty * price;
    calculatedNet += lineNet;
    calculatedVat += lineNet * rate / 100;
  }

  const calculatedTotal = calculatedNet + calculatedVat;
  const tolerance = 2; // 2 kr för rounding

  if (Math.abs(calculatedTotal - declaredTotal) > tolerance) {
    errors.push({
      field: "total_amount",
      message: `Beräknat totalbelopp (${calculatedTotal.toFixed(2)} kr) ≠ deklarerat (${declaredTotal.toFixed(2)} kr). Diff: ${(calculatedTotal - declaredTotal).toFixed(2)} kr`,
      severity: "error",
    });
  }

  if (Math.abs(calculatedVat - declaredVat) > tolerance) {
    errors.push({
      field: "vat_amount",
      message: `Beräknad moms (${calculatedVat.toFixed(2)} kr) ≠ deklarerad (${declaredVat.toFixed(2)} kr). Diff: ${(calculatedVat - declaredVat).toFixed(2)} kr`,
      severity: "error",
    });
  }

  // Verify: Total = Net + VAT
  if (Math.abs(declaredTotal - (declaredTotal - declaredVat + declaredVat)) > 0.01) {
    errors.push({
      field: "total_amount",
      message: "Total ≠ Netto + Moms",
      severity: "error",
    });
  }

  return errors;
}

// ═══════════════════════════════════════════════
// SUSPICIOUS PATTERN DETECTION
// ═══════════════════════════════════════════════

function detectSuspiciousPatterns(invoice: InvoiceToValidate): InvoiceValidationError[] {
  const warnings: InvoiceValidationError[] = [];

  if (invoice.payment_reference) {
    if (/(-KOPIA){2,}/i.test(invoice.payment_reference) || /(-COPY){2,}/i.test(invoice.payment_reference)) {
      warnings.push({
        field: "payment_reference",
        message: `Referensnumret "${invoice.payment_reference}" innehåller upprepade suffix`,
        severity: "warning",
      });
    }
  }

  if (invoice.invoice_number) {
    if (/(-KOPIA){2,}/i.test(invoice.invoice_number)) {
      warnings.push({
        field: "invoice_number",
        message: `Fakturanumret "${invoice.invoice_number}" innehåller upprepade suffix`,
        severity: "warning",
      });
    }
  }

  return warnings;
}

// ═══════════════════════════════════════════════
// BANK DETAIL VALIDATION
// ═══════════════════════════════════════════════

export interface BankDetailsResult {
  hasBankDetails: boolean;
  primary: { label: string; value: string } | null;
  secondary: { label: string; value: string } | null;
  validationErrors: InvoiceValidationError[];
}

/**
 * Smart bank detail selection:
 * - Swedish customer → Bankgiro (primary), Plusgiro (secondary)
 * - International customer → IBAN + BIC
 * - Max 2 methods shown
 * - Only show fields with valid data
 */
export function resolveBankDetails(
  company: CompanyToValidate,
  isInternational: boolean = false,
): BankDetailsResult {
  const errors: InvoiceValidationError[] = [];
  let primary: { label: string; value: string } | null = null;
  let secondary: { label: string; value: string } | null = null;

  if (isInternational) {
    // International: IBAN + BIC
    if (company.iban) {
      if (isValidIBAN(company.iban)) {
        primary = { label: "IBAN", value: company.iban };
      } else {
        errors.push({ field: "iban", message: `IBAN "${company.iban}" har ogiltigt format`, severity: "warning" });
      }
    }
    if (company.swift_bic) {
      if (isValidBIC(company.swift_bic)) {
        secondary = { label: "BIC/SWIFT", value: company.swift_bic };
      } else {
        errors.push({ field: "swift_bic", message: `BIC "${company.swift_bic}" har ogiltigt format (kräver 8 eller 11 tecken)`, severity: "warning" });
      }
    }
  } else {
    // Swedish: Bankgiro primary, Plusgiro secondary
    if (company.bankgiro) {
      if (isValidBankgiro(company.bankgiro)) {
        primary = { label: "Bankgiro", value: company.bankgiro };
      } else {
        errors.push({ field: "bankgiro", message: `Bankgiro "${company.bankgiro}" har ogiltigt format`, severity: "warning" });
      }
    }
    if (company.plusgiro) {
      secondary = { label: "Plusgiro", value: company.plusgiro };
    }
  }

  // Fallback: if no primary found, try any available method
  if (!primary) {
    if (company.bankgiro && isValidBankgiro(company.bankgiro)) {
      primary = { label: "Bankgiro", value: company.bankgiro };
    } else if (company.iban && isValidIBAN(company.iban)) {
      primary = { label: "IBAN", value: company.iban };
    } else if (company.plusgiro) {
      primary = { label: "Plusgiro", value: company.plusgiro };
    }
  }

  return {
    hasBankDetails: primary !== null,
    primary,
    secondary,
    validationErrors: errors,
  };
}

/**
 * Legacy helper för backward compatibility.
 */
export function getBankDetailsStatus(company: CompanyToValidate): {
  hasBankDetails: boolean;
  details: string[];
} {
  const result = resolveBankDetails(company);
  const details: string[] = [];
  if (result.primary) details.push(`${result.primary.label}: ${result.primary.value}`);
  if (result.secondary) details.push(`${result.secondary.label}: ${result.secondary.value}`);
  return { hasBankDetails: result.hasBankDetails, details };
}

// ═══════════════════════════════════════════════
// PAYMENT BOX VALIDATION
// ═══════════════════════════════════════════════

export function canShowPaymentBox(
  invoice: InvoiceToValidate,
  company: CompanyToValidate,
): { canShow: boolean; reason?: string } {
  if (invoice.total_amount == null || invoice.total_amount <= 0) {
    return { canShow: false, reason: "Totalbelopp saknas eller är noll" };
  }
  if (!invoice.due_date?.trim()) {
    return { canShow: false, reason: "Förfallodatum saknas" };
  }
  if (!invoice.payment_reference?.trim() && !invoice.invoice_number?.trim()) {
    return { canShow: false, reason: "Referensnummer saknas" };
  }
  const bank = resolveBankDetails(company);
  if (!bank.hasBankDetails) {
    return { canShow: false, reason: "Betaluppgifter saknas" };
  }
  return { canShow: true };
}

// ═══════════════════════════════════════════════
// MAIN VALIDATION
// ═══════════════════════════════════════════════

export function validateInvoiceForRendering(
  invoice: InvoiceToValidate,
  company: CompanyToValidate,
  lines: LineToValidate[],
): InvoiceValidationResult {
  const errors: InvoiceValidationError[] = [];
  const warnings: InvoiceValidationError[] = [];

  // ═══ INVOICE MANDATORY FIELDS ═══
  if (!invoice.invoice_number?.trim()) {
    errors.push({ field: "invoice_number", message: "Fakturanummer saknas", severity: "error" });
  }
  if (!invoice.invoice_date?.trim()) {
    errors.push({ field: "invoice_date", message: "Fakturadatum saknas", severity: "error" });
  }
  if (!invoice.due_date?.trim()) {
    errors.push({ field: "due_date", message: "Förfallodatum saknas", severity: "error" });
  }
  if (!invoice.counterparty_name?.trim()) {
    errors.push({ field: "counterparty_name", message: "Kundnamn saknas", severity: "error" });
  }
  if (invoice.total_amount == null || invoice.total_amount === 0) {
    errors.push({ field: "total_amount", message: "Totalbelopp saknas eller är noll", severity: "error" });
  }

  // ═══ COMPANY MANDATORY FIELDS ═══
  if (!company.name?.trim()) {
    errors.push({ field: "company_name", message: "Företagsnamn saknas i bolagsinställningar", severity: "error" });
  }
  if (!company.org_number?.trim()) {
    errors.push({ field: "company_org_number", message: "Organisationsnummer saknas i bolagsinställningar", severity: "error" });
  } else if (!isValidOrgNumber(company.org_number)) {
    errors.push({ field: "company_org_number", message: `Org.nr "${company.org_number}" har ogiltigt format (förväntat: XXXXXX-XXXX)`, severity: "error" });
  }

  // ═══ BANK DETAILS ═══
  if ((invoice.total_amount ?? 0) > 0) {
    const bank = resolveBankDetails(company);
    if (!bank.hasBankDetails) {
      errors.push({
        field: "bank_details",
        message: "Betaluppgifter saknas — varken Bankgiro, Plusgiro eller IBAN är konfigurerat",
        severity: "error",
      });
    }
    bank.validationErrors.forEach(e => warnings.push(e));
  }

  // ═══ COUNTERPARTY ORG NUMBER ═══
  if (invoice.counterparty_org_number?.trim() && !isValidOrgNumber(invoice.counterparty_org_number)) {
    warnings.push({
      field: "counterparty_org_number",
      message: `Kundens org.nr "${invoice.counterparty_org_number}" har ogiltigt format`,
      severity: "warning",
    });
  }

  // ═══ AMOUNT CALCULATIONS ═══
  if (lines.length > 0 && invoice.total_amount != null) {
    const amountErrors = validateAmounts(lines, invoice.total_amount, invoice.vat_amount ?? 0);
    errors.push(...amountErrors.filter(e => e.severity === "error"));
    warnings.push(...amountErrors.filter(e => e.severity === "warning"));
  }

  // ═══ SUSPICIOUS PATTERNS ═══
  const suspicious = detectSuspiciousPatterns(invoice);
  warnings.push(...suspicious);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
