import type { FirmClientEnriched } from "@/hooks/useFirmDashboard";

export interface ClientIssue {
  text: string;
  severity: "critical" | "warning" | "info";
}

/**
 * Derive the top issue per client based on alert priority.
 * Priority: overdue invoices > drafts > pending expenses.
 */
export function getTopIssue(client: FirmClientEnriched): ClientIssue | null {
  if (client.overdueInvoices > 0) {
    return {
      text: `${client.overdueInvoices} förfallna kundfakturor`,
      severity: "critical",
    };
  }
  if (client.draftEntries > 5) {
    return {
      text: `${client.draftEntries} utkast väntar på godkännande`,
      severity: "warning",
    };
  }
  if (client.pendingExpenses > 0) {
    return {
      text: `${client.pendingExpenses} utlägg att granska`,
      severity: "warning",
    };
  }
  if (client.draftEntries > 0) {
    return {
      text: `${client.draftEntries} utkast`,
      severity: "info",
    };
  }
  return null;
}

export function getUrgencyBuckets(clients: FirmClientEnriched[]) {
  const critical = clients.filter((c) => c.urgency === "high").length;
  const warning = clients.filter((c) => c.urgency === "medium").length;
  const healthy = clients.filter((c) => c.urgency === "low").length;
  return { critical, warning, healthy, total: clients.length };
}
