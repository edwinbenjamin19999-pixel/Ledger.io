// Scenario adjustment types + validation.
// Used by simulation engine to clone a baseline forecast and apply deltas.

export type AdjustmentType =
  | "delay_payment"
  | "split_payment"
  | "accelerate_invoice"
  | "remove_cost"
  | "add_cost"
  | "manual_balance";

export type ReferenceEntityType = "invoice" | "supplier_invoice" | "recurring_event" | "manual";

export interface ScenarioAdjustment {
  adjustment_type: AdjustmentType;
  reference_entity_type?: ReferenceEntityType;
  reference_entity_id?: string;
  delta_amount?: number; // positive = increase inflow / decrease outflow
  delta_days?: number; // positive = postpone, negative = accelerate
  payload?: Record<string, unknown>;
}

export function validateAdjustment(adj: ScenarioAdjustment): { ok: true } | { ok: false; error: string } {
  if (!adj.adjustment_type) return { ok: false, error: "adjustment_type required" };
  if (adj.adjustment_type === "delay_payment" && (!adj.delta_days || adj.delta_days <= 0))
    return { ok: false, error: "delay_payment requires positive delta_days" };
  if (adj.adjustment_type === "accelerate_invoice" && (!adj.delta_days || adj.delta_days >= 0))
    return { ok: false, error: "accelerate_invoice requires negative delta_days" };
  if ((adj.adjustment_type === "add_cost" || adj.adjustment_type === "remove_cost") && !adj.delta_amount)
    return { ok: false, error: "add_cost/remove_cost requires delta_amount" };
  return { ok: true };
}

export function describeAdjustment(adj: ScenarioAdjustment): string {
  switch (adj.adjustment_type) {
    case "delay_payment":
      return `Skjut upp betalning ${adj.delta_days} dagar`;
    case "split_payment":
      return `Dela upp betalning`;
    case "accelerate_invoice":
      return `Tidigarelägg faktura ${Math.abs(adj.delta_days ?? 0)} dagar`;
    case "remove_cost":
      return `Ta bort kostnad ${adj.delta_amount?.toLocaleString("sv-SE")} kr`;
    case "add_cost":
      return `Lägg till kostnad ${adj.delta_amount?.toLocaleString("sv-SE")} kr`;
    case "manual_balance":
      return `Justera saldo`;
    default:
      return "Justering";
  }
}
