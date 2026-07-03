/**
 * Stable hash of a driver patch — used as cache key for scenario explanations.
 * Sorts keys alphabetically so equivalent patches always produce the same hash.
 */
export function hashDriverPatch(patch: Record<string, unknown>): string {
  const keys = Object.keys(patch).sort();
  const canonical = keys.map((k) => `${k}:${JSON.stringify(patch[k])}`).join("|");
  // Simple FNV-1a 32-bit hash → hex (sufficient for cache keys, not crypto).
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
