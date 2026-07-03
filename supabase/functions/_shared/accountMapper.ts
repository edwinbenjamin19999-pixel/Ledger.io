/**
 * Account → row mapping helper for the materializer.
 * Mirrors logic in src/lib/reports/engine.ts.
 */

export interface AccountMapping {
  row_id: string;
  account_from: string;
  account_to: string;
  sign_override: "normal" | "invert" | null;
  is_active: boolean;
  mapping_type: string;
  company_scope: string;
  tenant_id: string | null;
}

export interface MappingHit {
  rowId: string;
  sign: 1 | -1;
}

/**
 * Find the row that an account maps to (lowest account_from wins on overlap).
 * Returns null if no active mapping covers the account.
 */
export function findRowForAccount(
  accountNumber: string,
  mappings: AccountMapping[],
  companyId: string,
): MappingHit | null {
  const num = parseInt(accountNumber, 10);
  if (!Number.isFinite(num)) return null;

  const sorted = [...mappings]
    .filter((m) => m.is_active && m.mapping_type === "actual")
    .filter((m) => m.company_scope === "all" || m.tenant_id === companyId)
    .sort((a, b) => parseInt(a.account_from, 10) - parseInt(b.account_from, 10));

  for (const m of sorted) {
    const from = parseInt(m.account_from, 10);
    const to = parseInt(m.account_to, 10);
    if (num >= from && num <= to) {
      return { rowId: m.row_id, sign: m.sign_override === "invert" ? -1 : 1 };
    }
  }
  return null;
}
