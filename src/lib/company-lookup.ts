import { supabase } from "@/integrations/supabase/client";

export interface CompanyLookupResult {
  found: boolean;
  source?: "bolagsverket" | "manual";
  name?: string | null;
  orgNumber?: string;
  vatNumber?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  companyType?: string | null;
  isActive?: boolean;
  isDeregistered?: boolean;
  message?: string;
  error?: string;
}

const ORG_NR_REGEX = /^\d{6}-?\d{4}$/;

export const isValidSwedishOrgNumber = (v: string) =>
  ORG_NR_REGEX.test((v || "").trim());

export const formatOrgNumber = (v: string) => {
  const digits = (v || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }
  return v;
};

/**
 * Calls the company-lookup edge function (Bolagsverket primary).
 * Returns a normalized result. Never throws — errors are surfaced via `error`.
 */
export const lookupCompanyByOrgNr = async (
  orgNumber: string
): Promise<CompanyLookupResult> => {
  const v = (orgNumber || "").trim();
  if (!isValidSwedishOrgNumber(v)) {
    return { found: false, error: "invalid_format" };
  }
  try {
    const { data, error } = await supabase.functions.invoke("company-lookup", {
      body: { org_number: v },
    });
    if (error) return { found: false, error: error.message };
    const d = (data || {}) as Record<string, unknown>;
    const name = (d.name as string) ?? null;
    const requiresManual = !!d.requiresManualEntry;
    if (!name || requiresManual) {
      return {
        found: false,
        source: (d.source as any) ?? "manual",
        message: (d.message as string) ?? undefined,
        vatNumber: (d.vatNumber as string) ?? null,
      };
    }
    return {
      found: true,
      source: (d.source as any) ?? "bolagsverket",
      name,
      orgNumber: (d.orgNumber as string) ?? v,
      vatNumber: (d.vatNumber as string) ?? null,
      street: (d.address as string) ?? null,
      postalCode: (d.postalCode as string) ?? null,
      city: (d.city as string) ?? null,
      companyType: (d.companyType as string) ?? null,
      isActive: (d.isActive as boolean) ?? true,
      isDeregistered: (d.isDeregistered as boolean) ?? false,
    };
  } catch (e) {
    return { found: false, error: e instanceof Error ? e.message : "unknown" };
  }
};
