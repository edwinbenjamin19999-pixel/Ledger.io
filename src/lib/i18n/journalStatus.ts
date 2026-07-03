/**
 * Swedish labels for journal entry / activity statuses.
 * Used to avoid leaking raw enum strings (e.g. "pending_approval") into the UI.
 */
export const JOURNAL_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  pending_approval: "Väntar godkännande",
  pending: "Väntar",
  approved: "Godkänd",
  posted: "Bokförd",
  rejected: "Avvisad",
  reverted: "Återförd",
  completed: "Klar",
  review: "Granska",
};

export function journalStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return JOURNAL_STATUS_LABELS[status] ?? status;
}
