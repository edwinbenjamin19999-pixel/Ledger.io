// Formatting helpers for AI insight source references.
// Keeps traceability rendering consistent across components.

export interface ToolCallRef {
  tool: string;
  args?: Record<string, unknown>;
  result_summary?: string;
  called_at?: string;
}

export interface SourceRefs {
  snapshot_id?: string;
  tool_calls?: ToolCallRef[];
  transaction_ids?: string[];
  invoice_ids?: string[];
  recurring_event_ids?: string[];
  computed_at?: string;
}

export function formatSourceRefs(refs: SourceRefs): string[] {
  const parts: string[] = [];
  if (refs.snapshot_id) parts.push(`Snapshot #${refs.snapshot_id.slice(0, 8)}`);
  if (refs.tool_calls?.length) parts.push(`${refs.tool_calls.length} verktygsanrop`);
  if (refs.transaction_ids?.length) parts.push(`${refs.transaction_ids.length} transaktioner`);
  if (refs.invoice_ids?.length) parts.push(`${refs.invoice_ids.length} fakturor`);
  if (refs.computed_at) parts.push(`kl ${new Date(refs.computed_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`);
  return parts;
}

export function hasValidSourceRefs(refs: SourceRefs | null | undefined): boolean {
  if (!refs) return false;
  return Boolean(
    refs.snapshot_id ||
      (refs.tool_calls && refs.tool_calls.length > 0) ||
      (refs.transaction_ids && refs.transaction_ids.length > 0) ||
      (refs.invoice_ids && refs.invoice_ids.length > 0),
  );
}
