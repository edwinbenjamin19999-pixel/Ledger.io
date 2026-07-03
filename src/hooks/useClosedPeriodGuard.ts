import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

/**
 * Returns helpers to check if a given date falls inside a locked accounting period
 * for the currently active company.
 */
export const useClosedPeriodGuard = () => {
  const [companyId] = useState<string | null>(() => getStoredActiveCompanyId());
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("accounting_periods")
      .select("year, month, status")
      .eq("company_id", companyId)
      .eq("status", "locked");
    setLockedKeys(new Set((data ?? []).map((p: any) => `${p.year}-${p.month}`)));
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isLocked = useCallback(
    (date: string | Date | null | undefined): boolean => {
      if (!date) return false;
      const d = typeof date === "string" ? new Date(date) : date;
      if (Number.isNaN(d.getTime())) return false;
      return lockedKeys.has(`${d.getFullYear()}-${d.getMonth() + 1}`);
    },
    [lockedKeys]
  );

  return { loaded, isLocked, refresh };
};
