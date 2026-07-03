// Shared helper to determine outgoing sender for invoice emails.
// IMPORTANT: `email_inbox_address` (bokforing-...@inbox.northledger.se) is an INCOMING
// inbox only. The subdomain `inbox.northledger.se` is NOT verified for sending in Resend
// and returns 403. Always send from the verified `faktura@northledger.se` address and
// use `reply_to` to route customer replies to the company's billing/footer email.

const VERIFIED_FROM_ADDRESS = "faktura@northledger.se";
const FALLBACK_DISPLAY_NAME = "NorthLedger";

interface CompanyLike {
  name?: string | null;
  billing_email?: string | null;
  email_inbox_address?: string | null;
}

interface InvoiceSettingsLike {
  footer_email?: string | null;
}

export interface InvoiceSender {
  from: string;
  replyTo?: string;
}

function sanitizeDisplayName(name: string): string {
  // Strip characters that would break the RFC 5322 display-name in `Name <addr>`.
  return name.replace(/[<>"\\]/g, "").trim();
}

function isValidEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function pickInvoiceSender(
  company: CompanyLike | null | undefined,
  invSettings?: InvoiceSettingsLike | null,
): InvoiceSender {
  const rawName = company?.name?.trim() || FALLBACK_DISPLAY_NAME;
  const displayName = sanitizeDisplayName(rawName) || FALLBACK_DISPLAY_NAME;
  const from = `${displayName} <${VERIFIED_FROM_ADDRESS}>`;

  const candidates = [company?.billing_email, invSettings?.footer_email];
  for (const candidate of candidates) {
    if (isValidEmail(candidate)) {
      return { from, replyTo: candidate.trim() };
    }
  }
  return { from };
}
