import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VATOverride {
  box: string;
  override_value: number;
  original_value: number;
  reason: string | null;
}

/**
 * Loads + persists VAT box overrides for a given company/period.
 * Realtime-aware so multi-user edits stay in sync.
 */
export function useVATOverrides(companyId: string | null, periodLabel: string) {
  const [overrides, setOverrides] = useState<Record<string, VATOverride>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !periodLabel) {
      setOverrides({});
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vat_box_overrides")
        .select("box, override_value, original_value, reason")
        .eq("company_id", companyId)
        .eq("period_label", periodLabel);
      if (error) throw error;
      const map: Record<string, VATOverride> = {};
      (data || []).forEach((row: any) => {
        map[row.box] = {
          box: row.box,
          override_value: Number(row.override_value),
          original_value: Number(row.original_value),
          reason: row.reason,
        };
      });
      setOverrides(map);
    } catch (e: any) {
      console.error("Failed to load VAT overrides:", e);
    } finally {
      setLoading(false);
    }
  }, [companyId, periodLabel]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!companyId || !periodLabel) return;
    const channel = supabase
      .channel(`vat_overrides_${companyId}_${periodLabel}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vat_box_overrides",
          filter: `company_id=eq.${companyId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, periodLabel, load]);

  const saveOverride = useCallback(
    async (box: string, originalValue: number, overrideValue: number, reason?: string) => {
      if (!companyId || !periodLabel) {
        toast.error("Ingen aktiv period");
        return;
      }
      try {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("vat_box_overrides")
          .upsert(
            {
              company_id: companyId,
              period_label: periodLabel,
              box,
              override_value: overrideValue,
              original_value: originalValue,
              reason: reason || null,
              created_by: userData.user?.id,
            },
            { onConflict: "company_id,period_label,box" },
          );
        if (error) throw error;
        setOverrides((prev) => ({
          ...prev,
          [box]: { box, override_value: overrideValue, original_value: originalValue, reason: reason || null },
        }));
      } catch (e: any) {
        console.error("Save override failed:", e);
        toast.error(e.message || "Kunde inte spara justering");
      }
    },
    [companyId, periodLabel],
  );

  const removeOverride = useCallback(
    async (box: string) => {
      if (!companyId || !periodLabel) return;
      try {
        const { error } = await supabase
          .from("vat_box_overrides")
          .delete()
          .eq("company_id", companyId)
          .eq("period_label", periodLabel)
          .eq("box", box);
        if (error) throw error;
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[box];
          return next;
        });
      } catch (e: any) {
        console.error("Remove override failed:", e);
        toast.error(e.message || "Kunde inte ta bort justering");
      }
    },
    [companyId, periodLabel],
  );

  const resetAll = useCallback(async () => {
    if (!companyId || !periodLabel) return;
    try {
      const { error } = await supabase
        .from("vat_box_overrides")
        .delete()
        .eq("company_id", companyId)
        .eq("period_label", periodLabel);
      if (error) throw error;
      setOverrides({});
      toast.info("Alla manuella justeringar återställda");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte återställa");
    }
  }, [companyId, periodLabel]);

  // Plain numeric map for components that just need value-by-box
  const valueMap = Object.fromEntries(
    Object.entries(overrides).map(([k, v]) => [k, v.override_value]),
  ) as Record<string, number>;

  return { overrides, valueMap, loading, saveOverride, removeOverride, resetAll };
}
