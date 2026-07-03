/**
 * Localized labels for raw notification / action keys.
 * Source of truth for human-readable Swedish names of internal action types.
 *
 * Used by NotificationCenter, BankIntegration and any other surface that
 * receives action keys (e.g. `vat_auto_prepared_deadline`) from the backend.
 */

export const ACTION_KEY_LABELS: Record<string, string> = {
  // VAT / tax
  vat_auto_prepared_deadline: "Momsdeklaration förberedd",
  vat_submission_deadline: "Momsdeklaration ska skickas",
  vat_payment_due: "Momsbetalning förfaller",

  // AGI / payroll
  agi_deadline_reminder: "AGI-deadline närmar sig",
  agi_submission_due: "AGI ska lämnas in",
  payroll_run_due: "Lönekörning ska göras",

  // Closing & annual
  period_close_due: "Periodavslut förfaller",
  annual_report_due: "Årsredovisning ska lämnas in",
  bookkeeping_close_reminder: "Bokföring ska stängas",

  // Bank & reconciliation
  bank_reconciliation_pending: "Bankavstämning väntar",
  bank_sync_failed: "Bankhämtning misslyckades",

  // AR / AP
  invoice_overdue: "Faktura förfallen",
  invoice_due_soon: "Faktura förfaller snart",
  supplier_payment_due: "Leverantörsbetalning förfaller",

  // SKV reminders & auto-pay
  skv_payment_reminder_10d: "SKV-betalning om 10 dagar",
  skv_payment_reminder_3d: "SKV-betalning om 3 dagar",
  skv_payment_due_today: "SKV-betalning förfaller idag",
  skv_auto_payment_scheduled: "AI har schemalagt SKV-betalning",
  skv_auto_payment_completed: "AI har betalat SKV",
  skv_auto_payment_failed: "AI kunde inte betala SKV",
};

/** Look up a friendly Swedish label for an action key. Falls back to a sane title-cased version. */
export function localizeActionKey(key: string | null | undefined): string {
  if (!key) return "";
  const known = ACTION_KEY_LABELS[key];
  if (known) return known;
  // Fallback: snake_case → "Snake case"
  const cleaned = key.replace(/[_-]+/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Localize a list of action keys. Filters out empties and dedupes. */
export function localizeActionKeys(keys: Array<string | null | undefined> | null | undefined): string[] {
  if (!keys?.length) return [];
  const out = new Set<string>();
  for (const k of keys) {
    const label = localizeActionKey(k);
    if (label) out.add(label);
  }
  return Array.from(out);
}
