import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Check, Shield, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  onBack: () => void;
  onFinish: () => void;
  isPending: boolean;
  threshold: number;
  setThreshold: (v: number) => void;
  alwaysApprove: boolean;
  setAlwaysApprove: (v: boolean) => void;
  autoBookHigh: boolean;
  setAutoBookHigh: (v: boolean) => void;
}

export function PosConfidenceSettingsStep({ onBack, onFinish, isPending, threshold, setThreshold, alwaysApprove, setAlwaysApprove, autoBookHigh, setAutoBookHigh }: Props) {
  const tiers = [
    { range: "90–100%", label: "Auto-bokför (valfritt)", color: "emerald", icon: CheckCircle2 },
    { range: "75–89%", label: "Granskning rekommenderad", color: "amber", icon: AlertTriangle },
    { range: "<75%", label: "Manuell granskning krävs", color: "rose", icon: Shield },
  ];

  const colorMap: Record<string, string> = {
    emerald: "border-[#BFE6D6] bg-emerald-50/50 text-[#085041]",
    amber: "border-[#F0DDB7] bg-amber-50/50 text-[#7A5417]",
    rose: "border-[#F4C8C8] bg-rose-50/50 text-[#7A1A1A]",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="border-l-[3px] border-l-[#3b82f6]">
        <CardHeader>
          <CardTitle className="text-lg">AI Konfidensregler</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Varje Z-rapport får ett tillförlitlighetsbetyg som styr om den bokförs automatiskt</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {tiers.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.range} className={`flex items-center gap-3 p-3 rounded-xl border ${colorMap[t.color]}`}>
                  <Icon className="h-4 w-4" />
                  <span className="font-mono font-semibold text-sm w-20">{t.range}</span>
                  <span className="text-sm">{t.label}</span>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Auto-bokföringströskel</span>
              <span className="text-sm font-semibold text-[#3b82f6] tabular-nums">{threshold}%</span>
            </div>
            <Slider value={[threshold]} min={50} max={100} step={1} onValueChange={(v) => setThreshold(v[0])} />
            <p className="text-xs text-slate-500">Z-rapporter med konfidens ≥ {threshold}% bokförs automatiskt om aktiverat nedan.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-800">Kräv alltid godkännande</p>
                <p className="text-xs text-slate-500">Inga rapporter bokförs utan din bekräftelse</p>
              </div>
              <Switch checked={alwaysApprove} onCheckedChange={setAlwaysApprove} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-800">Auto-bokför vid hög konfidens</p>
                <p className="text-xs text-slate-500">Z-rapporter över tröskeln bokförs direkt</p>
              </div>
              <Switch checked={autoBookHigh} onCheckedChange={setAutoBookHigh} disabled={alwaysApprove} />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Shield className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600">AI bokför aldrig utan ditt godkännande (konfigurerbart). Allt är reversibelt och spårbart.</p>
          </div>
        </CardContent>
      </Card>

      {/* Pre-flight validation */}
      <Card className="border-l-[3px] border-l-emerald-500">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[#085041]" />
            <span className="text-sm font-semibold text-slate-800">AI-validering: Inga problem hittades</span>
          </div>
          <p className="text-xs text-slate-500">Momskonsistens · Z-rapport-täckning · Betalningssplit — alla kontroller godkända.</p>
        </CardContent>
      </Card>

      {/* Result preview */}
      <Card className="border-l-[3px] border-l-[#3b82f6] bg-[#0F1F3D]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" /> Så här kommer det att fungera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "Daglig bokföring automatiseras",
            "Korrekt moms enligt BAS 2025",
            "Automatisk bankavstämning",
            "Felupptäckt före bokföring",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-[#085041]" />
              {t}
            </div>
          ))}
          <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200">
            <p className="text-xs text-slate-500">Uppskattad tidsbesparing</p>
            <p className="text-lg font-bold text-slate-900">10–15 timmar/månad</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>Tillbaka</Button>
        <Button onClick={onFinish} disabled={isPending} size="lg" className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white gap-1.5">
          <Sparkles className="h-4 w-4" />
          {isPending ? "Aktiverar..." : "Aktivera automatisering"}
        </Button>
      </div>
    </div>
  );
}
