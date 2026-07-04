import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const TYPES: Array<{ key: "vat" | "f_tax" | "employer_tax" | "employee_tax"; label: string }> = [
  { key: "vat", label: "Moms" },
  { key: "f_tax", label: "F-skatt (preliminärskatt)" },
  { key: "employer_tax", label: "Arbetsgivaravgifter" },
  { key: "employee_tax", label: "Personalskatt" },
];

export function AutoPaySKVSettings({ companyId }: { companyId: string | null | undefined }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [maxAmount, setMaxAmount] = useState(100000);
  const [daysBefore, setDaysBefore] = useState(1);
  const [types, setTypes] = useState<string[]>(["vat", "f_tax", "employer_tax", "employee_tax"]);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("automation_settings")
        .select("auto_pay_skv_enabled, auto_pay_skv_max_amount, auto_pay_skv_days_before, auto_pay_skv_types")
        .eq("company_id", companyId)
        .maybeSingle();
      if (data) {
        setEnabled(!!(data as any).auto_pay_skv_enabled);
        setMaxAmount(Number((data as any).auto_pay_skv_max_amount ?? 100000));
        setDaysBefore(Number((data as any).auto_pay_skv_days_before ?? 1));
        setTypes(((data as any).auto_pay_skv_types ?? ["vat","f_tax","employer_tax","employee_tax"]) as string[]);
        setConsent(!!(data as any).auto_pay_skv_enabled);
      }
      setLoading(false);
    })();
  }, [companyId]);

  async function save() {
    if (!companyId) return;
    if (enabled && !consent) {
      toast.error("Du måste bekräfta samtycket för att aktivera AI-autobetalning");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("automation_settings")
        .upsert({
          company_id: companyId,
          auto_pay_skv_enabled: enabled,
          auto_pay_skv_max_amount: maxAmount,
          auto_pay_skv_days_before: daysBefore,
          auto_pay_skv_types: types,
        }, { onConflict: "company_id" });
      if (error) throw error;
      toast.success("Inställningar sparade");
    } catch (err: any) {
      toast.error(err.message ?? "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  function toggleType(t: string) {
    setTypes((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Laddar…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-[#3b82f6]" />
          AI-autobetalning av Skatteverket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Låt AI betala SKV automatiskt</Label>
            <p className="text-xs text-muted-foreground">AI:n drar betalning senast på förfallodagen via din bankkoppling (PIS/BankID).</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-4 border-l-2 border-[#C8DDF5] ml-1 pl-4">
            <div>
              <Label className="text-xs mb-2 block">Vilka skattetyper får AI:n betala?</Label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={types.includes(t.key)} onCheckedChange={() => toggleType(t.key)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Max belopp per betalning (kr)</Label>
                <Input type="number" min={0} value={maxAmount}
                  onChange={(e) => setMaxAmount(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Dagar före förfallodag</Label>
                <Input type="number" min={0} max={14} value={daysBefore}
                  onChange={(e) => setDaysBefore(Number(e.target.value))} />
              </div>
            </div>

            <div className="rounded-md border border-[#F0DDB7] bg-[#FAEEDA] p-3 flex gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-[#7A5417]">
                  AI:n kommer att initiera <strong>riktiga betalningar</strong> från företagskontot via BankID-godkänd PIS-mandat.
                  Du kan när som helst stänga av detta.
                </p>
                <label className="flex items-start gap-2 text-[#7A5417] cursor-pointer">
                  <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
                  <span>Jag förstår och godkänner att AI:n får genomföra dessa betalningar.</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} className="bg-[#3b82f6] hover:bg-[#3b82f6]">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Spara
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
