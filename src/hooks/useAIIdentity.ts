import { useTenant } from "@/contexts/TenantContext";

/**
 * Returns tenant-aware AI identity for shell-level surfaces
 * (assistant labels, briefing headers, modal greetings, etc).
 * Falls back to Cogniq defaults when no tenant is resolved.
 */
export function useAIIdentity() {
  const { tenant } = useTenant();
  return {
    name: tenant?.ai?.ai_name ?? "AI Ekonom",
    tone: tenant?.ai?.ai_tone ?? "advisory",
    intro: tenant?.ai?.intro_text ?? null,
    explanationMode: tenant?.ai?.explanation_mode_default ?? "simple",
    isWhiteLabel: Boolean(tenant?.id),
  };
}
