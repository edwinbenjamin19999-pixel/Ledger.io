import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Target, Shield, AlertOctagon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { BlockShell } from "./BlockShell";

interface SystemDef {
  system_mission: string | null;
  system_priorities: string[];
  system_boundaries: string[];
  escalation_destination: string | null;
  confidence_floor: number;
  audit_mode: boolean;
}

const DEFAULTS: SystemDef = {
  system_mission: "Reducera manuell bokföring och frigör tid för rådgivning.",
  system_priorities: ["Spårbarhet före hastighet", "Aldrig auto-posta under konfidenströskel", "Eskalera avvikelser i tid"],
  system_boundaries: ["Inga inlämningar utan godkännande", "Lås period 2 vardagar efter månadsslut"],
  escalation_destination: "ekonomi@företaget.se",
  confidence_floor: 0.85,
  audit_mode: false,
};

export function SystemDefinitionBlock() {
  const companyId = useCompanyId();
  const [def, setDef] = useState<SystemDef>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("automation_settings")
        .select("system_mission,system_priorities,system_boundaries,escalation_destination,confidence_floor,audit_mode")
        .eq("company_id", companyId)
        .maybeSingle();
      if (data) {
        setDef({
          system_mission: (data as any).system_mission ?? DEFAULTS.system_mission,
          system_priorities: ((data as any).system_priorities as string[]) ?? DEFAULTS.system_priorities,
          system_boundaries: ((data as any).system_boundaries as string[]) ?? DEFAULTS.system_boundaries,
          escalation_destination: (data as any).escalation_destination ?? DEFAULTS.escalation_destination,
          confidence_floor: Number((data as any).confidence_floor ?? DEFAULTS.confidence_floor),
          audit_mode: Boolean((data as any).audit_mode ?? false),
        });
      }
    })();
  }, [companyId]);

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const { error } = await supabase
      .from("automation_settings")
      .upsert({
        company_id: companyId,
        system_mission: def.system_mission,
        system_priorities: def.system_priorities as any,
        system_boundaries: def.system_boundaries as any,
        escalation_destination: def.escalation_destination,
        confidence_floor: def.confidence_floor,
        audit_mode: def.audit_mode,
      } as any, { onConflict: "company_id" });
    setSaving(false);
    if (error) {
      toast.error("Kunde inte spara: " + error.message);
    } else {
      toast.success("Systempolicy uppdaterad");
      setDirty(false);
    }
  };

  const update = <K extends keyof SystemDef>(k: K, v: SystemDef[K]) => {
    setDef((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  return (
    <BlockShell
      label="L1 · SYSTEM DEFINITION"
      title="Strategiska direktiv"
      subtitle="Globala policies som styr alla agenter"
      icon={Target}
      action={
        dirty && (
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="w-3.5 h-3.5" />
            {saving ? "Sparar…" : "Spara policy"}
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Mission
          </label>
          <Input
            value={def.system_mission ?? ""}
            onChange={(e) => update("system_mission", e.target.value)}
            className="mt-1.5 font-medium"
            placeholder="Definiera systemets övergripande syfte"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Prioriteringar
            </label>
            <div className="mt-1.5 space-y-1.5">
              {def.system_priorities.map((p, i) => (
                <Input
                  key={i}
                  value={p}
                  onChange={(e) => {
                    const next = [...def.system_priorities];
                    next[i] = e.target.value;
                    update("system_priorities", next);
                  }}
                  className="text-sm"
                />
              ))}
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => update("system_priorities", [...def.system_priorities, ""])}>
                + Lägg till prioritet
              </Button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 flex items-center gap-1.5">
              <AlertOctagon className="w-3 h-3" /> Begränsningar
            </label>
            <div className="mt-1.5 space-y-1.5">
              {def.system_boundaries.map((b, i) => (
                <Input
                  key={i}
                  value={b}
                  onChange={(e) => {
                    const next = [...def.system_boundaries];
                    next[i] = e.target.value;
                    update("system_boundaries", next);
                  }}
                  className="text-sm"
                />
              ))}
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => update("system_boundaries", [...def.system_boundaries, ""])}>
                + Lägg till begränsning
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Konfidensgolv ({Math.round(def.confidence_floor * 100)}%)
            </label>
            <Slider
              value={[def.confidence_floor * 100]}
              min={50}
              max={99}
              step={1}
              onValueChange={(v) => update("confidence_floor", v[0] / 100)}
              className="mt-3"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Under denna nivå tvingas mänsklig granskning.
            </p>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Eskalationsdestination
            </label>
            <Input
              value={def.escalation_destination ?? ""}
              onChange={(e) => update("escalation_destination", e.target.value)}
              className="mt-1.5"
              placeholder="t.ex. ekonomi@företaget.se"
            />
          </div>
        </div>
      </div>
    </BlockShell>
  );
}
