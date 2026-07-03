import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AutomationMode = "manual" | "assisted" | "autonomous";
export type PersonaMode = "business_owner" | "accountant";

export interface AIEconomistSettings {
  automation_mode: AutomationMode;
  persona_mode: PersonaMode;
  auto_execute_threshold: number;
}

const DEFAULTS: AIEconomistSettings = {
  automation_mode: "assisted",
  persona_mode: "business_owner",
  auto_execute_threshold: 0.85,
};

export function useAIEconomistSettings(companyId?: string | null) {
  const [settings, setSettings] = useState<AIEconomistSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("ai_economist_settings")
        .select("automation_mode, persona_mode, auto_execute_threshold")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (data) setSettings(data as AIEconomistSettings);
      setLoading(false);
    })();
  }, [companyId]);

  const update = useCallback(async (patch: Partial<AIEconomistSettings>) => {
    if (!companyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await supabase.from("ai_economist_settings").upsert({
      user_id: user.id,
      company_id: companyId,
      ...next,
    }, { onConflict: "user_id,company_id" });
  }, [companyId, settings]);

  return { settings, update, loading };
}
