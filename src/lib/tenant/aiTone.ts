/**
 * Maps a tenant's `ai_tone` setting to a system-prompt fragment used by
 * the global AI assistant. Returns an empty string for default behavior.
 */
export type AITone = "formal" | "advisory" | "executive" | "operational";

export function aiToneSystemFragment(tone: string | null | undefined, aiName?: string): string {
  const name = aiName || "AI Ekonom";
  const base = `Du heter "${name}" och representerar denna kunds egen ekonomi-AI. Skriv alltid som "${name}", aldrig som "Bokfy".`;
  switch ((tone || "advisory") as AITone) {
    case "formal":
      return `${base} Använd en formell, professionell ton — tydlig, korrekt och utan slang.`;
    case "executive":
      return `${base} Skriv kortfattat och beslutsorienterat — som en CFO till en VD. Lyft slutsatser först, detaljer sedan.`;
    case "operational":
      return `${base} Var praktisk och handlingsinriktad — fokusera på konkreta nästa steg och hur saker görs i systemet.`;
    case "advisory":
    default:
      return `${base} Var rådgivande och pedagogisk — förklara vad siffrorna betyder och varför de är viktiga.`;
  }
}
