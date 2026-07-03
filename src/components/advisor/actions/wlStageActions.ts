// Generic helper to advance VAT/Tax/AGI rows through their stage workflow.

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function updateVatStatus(id: string, status: string) {
  const patch: Record<string, unknown> = { status };
  if (status === "submitted") patch.submitted_at = new Date().toISOString();
  if (status === "approved") patch.approved_at = new Date().toISOString();
  const { error } = await supabase.from("vat_declarations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateTaxStatus(id: string, status: string) {
  const patch: Record<string, unknown> = { status };
  if (status === "submitted") patch.submitted_at = new Date().toISOString();
  const { error } = await supabase.from("tax_declarations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateAgiStatus(id: string, status: string) {
  const { error } = await supabase.from("agi_periods").update({ status }).eq("id", id);
  if (error) throw error;
}

export function nextLabel(kind: "vat" | "tax" | "agi", stage: string): { label: string; next: string } | null {
  if (kind === "vat") {
    if (stage === "draft") return { label: "Beräkna", next: "review" };
    if (stage === "review") return { label: "Godkänn", next: "ready" };
    if (stage === "ready") return { label: "Lämna in", next: "submitted" };
    if (stage === "submitted") return { label: "Markera reglerad", next: "settled" };
  }
  if (kind === "tax") {
    if (stage === "draft") return { label: "Förbered", next: "review" };
    if (stage === "review") return { label: "Godkänn", next: "ready" };
    if (stage === "ready") return { label: "Lämna in", next: "submitted" };
    if (stage === "submitted") return { label: "Markera betald", next: "settled" };
  }
  if (kind === "agi") {
    if (stage === "draft") return { label: "Förbered", next: "ready" };
    if (stage === "ready") return { label: "Lämna in till SKV", next: "submitted" };
  }
  return null;
}

export async function runStageUpdate(
  kind: "vat" | "tax" | "agi",
  id: string,
  next: string,
  invalidate: () => void,
) {
  try {
    if (kind === "vat") await updateVatStatus(id, next);
    else if (kind === "tax") await updateTaxStatus(id, next);
    else await updateAgiStatus(id, next);
    toast.success("Status uppdaterad");
    invalidate();
  } catch (e: any) {
    toast.error("Kunde inte uppdatera status", { description: e.message });
  }
}
