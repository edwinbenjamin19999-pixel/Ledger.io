import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { triggerMicroPrompt } from "@/components/ai/MicroPromptHost";

interface CorrectionParams {
  companyId: string;
  module: string;
  actionKind: string;
  referenceId?: string;
  counterpartyKey?: string;
  before: unknown;
  after: unknown;
  aiConfidence?: number;
}

let lastToastAt = 0;

/**
 * Call this whenever a user manually overrides an AI decision
 * (e.g. changes an account code suggested by AI, swaps category, etc).
 * - Logs the correction to ai_action_feedback (was_correct=false + user_correction).
 * - Shows a friendly acknowledgement toast (throttled to once per 4s).
 */
export async function recordAICorrection(p: CorrectionParams) {
  // Throttle visible toast — avoid spam on rapid edits
  const now = Date.now();
  if (now - lastToastAt > 4000) {
    lastToastAt = now;
    toast("Uppfattat — jag tillämpar detta för liknande transaktioner framöver.");
  }
  // If AI was uncertain and user overrode, ask once per session for more context
  if ((p.aiConfidence ?? 1) < 0.6) {
    triggerMicroPrompt("low_confidence_override");
  }
  try {
    await supabase.from("ai_action_feedback" as never).insert({
      company_id: p.companyId,
      module: p.module,
      action_kind: p.actionKind,
      reference_id: p.referenceId ?? null,
      counterparty_key: p.counterpartyKey ?? null,
      ai_recommendation: { value: p.before } as never,
      ai_reasoning: "User manual override",
      ai_confidence: p.aiConfidence ?? 0,
      ai_tier:
        (p.aiConfidence ?? 0) >= 0.9 ? "done" : (p.aiConfidence ?? 0) >= 0.6 ? "review" : "input_needed",
      was_correct: false,
      user_correction: { value: p.after } as never,
    } as never);
  } catch (e) {
    console.warn("recordAICorrection failed", e);
  }
}
