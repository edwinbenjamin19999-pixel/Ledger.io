/**
 * Normalize a user/display name so headings render consistently.
 * - Trims, lower-cases, then capitalizes the first letter of each whitespace-separated token.
 * - Preserves diacritics. Returns "" for nullish input.
 *
 * "mq"        -> "Mq"
 * "MQ"        -> "Mq"
 * "anna lind" -> "Anna Lind"
 */
export function toDisplayName(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  return trimmed
    .toLocaleLowerCase("sv-SE")
    .split(/\s+/)
    .map((tok) => (tok ? tok.charAt(0).toLocaleUpperCase("sv-SE") + tok.slice(1) : tok))
    .join(" ");
}
