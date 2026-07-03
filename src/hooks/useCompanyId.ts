import { useEffect, useState } from "react";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { supabase } from "@/integrations/supabase/client";
import { clearTenantState } from "@/lib/auth-cleanup";

/**
 * Shared hook reading the active company id from localStorage.
 *
 * Reads the canonical key (`dashboard:selectedCompanyId`) used by the company
 * picker, and falls back to legacy keys still written by older modules so any
 * page using this hook resolves a company as long as ONE of them is set.
 *
 * Also self-heals: if the stored companyId is not in the current user's
 * user_roles set (e.g. user was removed, or the cache outlived the membership),
 * it clears the cached id and dispatches `company-changed` so the UI can prompt
 * the user to pick a new company instead of firing failing RLS-blocked queries.
 */
const LEGACY_KEYS = ["selectedCompanyId", "selected_company", "selected_company_id"];

function readCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  const primary = window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
  if (primary) return primary.replace(/"/g, "");
  for (const k of LEGACY_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return v.replace(/"/g, "");
  }
  return null;
}

async function isCompanyMembership(companyId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true; // not logged in yet — don't punish the cache
    const { data, error } = await supabase
      .from("user_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) return true; // be permissive on transient errors
    return !!data;
  } catch {
    return true;
  }
}

export function useCompanyId(): string | null {
  const [companyId, setCompanyId] = useState<string | null>(readCompanyId());

  useEffect(() => {
    const handler = () => setCompanyId(readCompanyId());
    window.addEventListener("storage", handler);
    // Custom event some modules dispatch when the picker changes company.
    window.addEventListener("company-changed" as any, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("company-changed" as any, handler);
    };
  }, []);

  // Validate that the cached companyId still belongs to the current user.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const ok = await isCompanyMembership(companyId);
      if (cancelled) return;
      if (!ok) {
        clearTenantState();
        setCompanyId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  return companyId;
}
