import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  companyId: string;
}

interface AutomationRow {
  auto_send_reminders_after_days: number | null;
  auto_defer_noncritical_payments: boolean;
  auto_prioritize_largest_ar: boolean;
}

export function AutomationToggleBar({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AutomationRow>({
    auto_send_reminders_after_days: null,
    auto_defer_noncritical_payments: false,
    auto_prioritize_largest_ar: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (supabase.from("automation_settings") as any)
      .select("auto_send_reminders_after_days, auto_defer_noncritical_payments, auto_prioritize_largest_ar")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setSettings(data);
      });
  }, [companyId]);

  const update = async (patch: Partial<AutomationRow>) => {
    setSaving(true);
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await (supabase.from("automation_settings") as any)
      .upsert({ company_id: companyId, ...next }, { onConflict: "company_id" });
    setSaving(false);
    if (error) toast.error("Kunde inte spara", { description: error.message });
    else toast.success("Inställningar sparade");
  };

  const isOn =
    !!settings.auto_send_reminders_after_days ||
    settings.auto_defer_noncritical_payments ||
    settings.auto_prioritize_largest_ar;

  return (
    <Card className="border-dashed">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <Zap className={`w-3.5 h-3.5 ${isOn ? "text-[#085041]" : "text-muted-foreground"}`} />
          <span className="font-medium">Auto-actions</span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isOn ? "bg-[#E1F5EE] text-[#085041]" : "bg-muted text-muted-foreground"
          }`}>
            {isOn ? "På" : "Av"}
          </span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-xs font-medium">Auto-påminnelser</Label>
              <p className="text-[10px] text-muted-foreground">Skicka påminnelse efter X dagar förfallodag</p>
            </div>
            <Input
              type="number"
              className="h-7 w-16 text-xs"
              placeholder="off"
              value={settings.auto_send_reminders_after_days ?? ""}
              onChange={(e) =>
                update({
                  auto_send_reminders_after_days: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-xs font-medium">Skjut upp icke-kritiska betalningar</Label>
              <p className="text-[10px] text-muted-foreground">AI flyttar ej kritiska AP till förfallodag</p>
            </div>
            <Switch
              checked={settings.auto_defer_noncritical_payments}
              onCheckedChange={(v) => update({ auto_defer_noncritical_payments: v })}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-xs font-medium">Prioritera största fordringar</Label>
              <p className="text-[10px] text-muted-foreground">AI rankar AR efter belopp × dagar förfallna</p>
            </div>
            <Switch
              checked={settings.auto_prioritize_largest_ar}
              onCheckedChange={(v) => update({ auto_prioritize_largest_ar: v })}
              disabled={saving}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
