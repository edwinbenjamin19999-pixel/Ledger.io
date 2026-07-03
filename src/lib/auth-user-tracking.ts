/**
 * Tracks the last authenticated user.id in localStorage so we can detect
 * when a *different* user signs in and purge tenant-scoped state that
 * belongs to the previous user (e.g. stale `dashboard:selectedCompanyId`).
 *
 * Returns `true` when the incoming user is different from the previously
 * stored one (or when there was none) — caller should clear tenant state.
 */
const LAST_USER_KEY = "auth:lastUserId";

export function syncLastAuthenticatedUser(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const previous = window.localStorage.getItem(LAST_USER_KEY);
    if (previous === userId) return false;
    window.localStorage.setItem(LAST_USER_KEY, userId);
    return true;
  } catch {
    return false;
  }
}
