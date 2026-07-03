import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaf, Users, Shield, Save, Loader2 } from "lucide-react";
import { useESGFormData, useUpsertESGData } from "@/hooks/useESGFormData";
import { toast } from "sonner";

export function ESGInputForm() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: existing, isLoading } = useESGFormData(year);
  const upsert = useUpsertESGData();

  const [form, setForm] = useState({
    scope1_co2_tonnes: 0,
    scope2_co2_tonnes: 0,
    scope3_co2_tonnes: 0,
    energy_kwh: 0,
    renewable_energy_percent: 0,
    water_m3: 0,
    waste_tonnes: 0,
    recycled_percent: 0,
    female_board_percent: 0,
    employee_turnover_percent: 0,
    sick_days_per_employee: 0,
    social_investment_sek: 0,
    has_code_of_conduct: false,
    has_whistleblower: false,
    anti_corruption_training_percent: 0,
    notes: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        scope1_co2_tonnes: Number(existing.scope1_co2_tonnes) || 0,
        scope2_co2_tonnes: Number(existing.scope2_co2_tonnes) || 0,
        scope3_co2_tonnes: Number(existing.scope3_co2_tonnes) || 0,
        energy_kwh: Number(existing.energy_kwh) || 0,
        renewable_energy_percent: Number(existing.renewable_energy_percent) || 0,
        water_m3: Number(existing.water_m3) || 0,
        waste_tonnes: Number(existing.waste_tonnes) || 0,
        recycled_percent: Number(existing.recycled_percent) || 0,
        female_board_percent: Number(existing.female_board_percent) || 0,
        employee_turnover_percent: Number(existing.employee_turnover_percent) || 0,
        sick_days_per_employee: Number(existing.sick_days_per_employee) || 0,
        social_investment_sek: Number(existing.social_investment_sek) || 0,
        has_code_of_conduct: existing.has_code_of_conduct ?? false,
        has_whistleblower: existing.has_whistleblower ?? false,
        anti_corruption_training_percent: Number(existing.anti_corruption_training_percent) || 0,
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ year, ...form });
      toast.success("ESG-data sparad");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte spara");
    }
  };

  const setField = (key: string, value: number | boolean | string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Spara ESG-data
        </Button>
      </div>

      {/* MILJÖ (E) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="h-4 w-4 text-[#085041]" /> Miljö (E)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumField label="Scope 1 CO₂ (egna utsläpp, ton)" value={form.scope1_co2_tonnes} onChange={v => setField("scope1_co2_tonnes", v)} />
            <NumField label="Scope 2 CO₂ (köpt el/värme, ton)" value={form.scope2_co2_tonnes} onChange={v => setField("scope2_co2_tonnes", v)} />
            <NumField label="Scope 3 CO₂ (leverantörskedja, ton)" value={form.scope3_co2_tonnes} onChange={v => setField("scope3_co2_tonnes", v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumField label="Energiförbrukning (kWh)" value={form.energy_kwh} onChange={v => setField("energy_kwh", v)} />
            <NumField label="Vattenförbrukning (m³)" value={form.water_m3} onChange={v => setField("water_m3", v)} />
          </div>
          <SliderField label="Andel förnybar energi" value={form.renewable_energy_percent} onChange={v => setField("renewable_energy_percent", v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumField label="Avfall (ton)" value={form.waste_tonnes} onChange={v => setField("waste_tonnes", v)} />
          </div>
          <SliderField label="Återvunnen andel" value={form.recycled_percent} onChange={v => setField("recycled_percent", v)} />
        </CardContent>
      </Card>

      {/* SOCIALT (S) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-blue-600" /> Socialt (S)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumField label="Andel kvinnor i styrelsen (%)" value={form.female_board_percent} onChange={v => setField("female_board_percent", v)} />
            <NumField label="Personalomsättning (%)" value={form.employee_turnover_percent} onChange={v => setField("employee_turnover_percent", v)} />
            <NumField label="Sjukdagar per anställd" value={form.sick_days_per_employee} onChange={v => setField("sick_days_per_employee", v)} />
            <NumField label="Sociala investeringar (kr)" value={form.social_investment_sek} onChange={v => setField("social_investment_sek", v)} />
          </div>
        </CardContent>
      </Card>

      {/* STYRNING (G) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-violet-600" /> Styrning (G)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Uppförandekod</Label>
            <Switch checked={form.has_code_of_conduct} onCheckedChange={v => setField("has_code_of_conduct", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Visselblåsarfunktion</Label>
            <Switch checked={form.has_whistleblower} onCheckedChange={v => setField("has_whistleblower", v)} />
          </div>
          <NumField label="Anti-korruptionsutbildning (%)" value={form.anti_corruption_training_percent} onChange={v => setField("anti_corruption_training_percent", v)} />
          <div>
            <Label>Anteckningar</Label>
            <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} className="mt-1" placeholder="Övriga kommentarer kring ESG-data..." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value || ""}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1"
        min={0}
        step="0.01"
      />
    </div>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-medium tabular-nums">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={0} max={100} step={1} />
    </div>
  );
}
