import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, ArrowRight, Landmark, Search } from "lucide-react";
import { toast } from "sonner";

const formatKr = (n: number) => new Intl.NumberFormat("sv-SE").format(n) + " kr";

type SampleStatus = "match" | "diff" | "accepted" | "adjusted";

export function PosBankReconciliationStep({ onBack, onNext, enabled, setEnabled }: { onBack: () => void; onNext: () => void; enabled: boolean; setEnabled: (v: boolean) => void; }) {
  const [samples, setSamples] = useState<{ date: string; expected: number; bank: number; status: SampleStatus }[]>([
    { date: "2026-04-01", expected: 8000, bank: 8000, status: "match" },
    { date: "2026-04-02", expected: 8000, bank: 7850, status: "diff" },
    { date: "2026-04-03", expected: 12500, bank: 12500, status: "match" },
  ]);
  const [investigateDate, setInvestigateDate] = useState<string | null>(null);

  const updateStatus = (date: string, status: SampleStatus) =>
    setSamples((prev) => prev.map((s) => (s.date === date ? { ...s, status } : s)));

  const handleAccept = (date: string, diff: number) => {
    updateStatus(date, "accepted");
    toast.success("Differens accepterad", { description: `${formatKr(diff)} bokfört som svinn (konto 7740).` });
  };
  const handleAutoAdjust = (date: string, diff: number) => {
    updateStatus(date, "adjusted");
    toast.success("Auto-justering klar", { description: `Bokfört ${formatKr(diff)} mot kortavgift (6570) baserat på Zettle-historik.` });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="border-l-[3px] border-l-[#3b82f6]">
        <CardHeader>
          <CardTitle className="text-lg">Automatisk bankavstämning</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Vi matchar dina POS-data med dina banktransaktioner i realtid</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual flow */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            {["Z-rapport", "Förväntad insättning", "Bank­transaktion", "Match-status"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <span className="font-medium text-slate-700 text-center flex-1">{s}</span>
                {i < 3 && <ArrowRight className="h-3.5 w-3.5 text-[#3b82f6] shrink-0" />}
              </div>
            ))}
          </div>

          {/* Samples */}
          <div className="space-y-2">
            {samples.map((s) => {
              const diff = s.expected - s.bank;
              const isResolved = s.status === "accepted" || s.status === "adjusted";
              const isMatch = s.status === "match";
              const tone = isMatch || isResolved
                ? "border-[#BFE6D6] bg-emerald-50/40"
                : "border-[#F0DDB7] bg-amber-50/40";
              return (
                <div key={s.date} className={`p-3 rounded-xl border ${tone}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {isMatch || isResolved ? (
                        <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
                      )}
                      <span className="text-sm font-medium text-slate-800">Z-rapport {s.date}</span>
                      {s.status === "accepted" && <span className="text-[10px] text-[#085041] font-medium">· Accepterad</span>}
                      {s.status === "adjusted" && <span className="text-[10px] text-[#085041] font-medium">· Auto-justerad</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-slate-600">Förväntat <span className="font-semibold text-slate-900">{formatKr(s.expected)}</span></span>
                      <span className="text-slate-600">Bank <span className="font-semibold text-slate-900">{formatKr(s.bank)}</span></span>
                      {diff !== 0 && !isResolved && (
                        <span className="font-semibold text-[#7A5417]">Differens {formatKr(diff)}</span>
                      )}
                    </div>
                  </div>
                  {s.status === "diff" && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAccept(s.date, diff)}>Acceptera</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setInvestigateDate(investigateDate === s.date ? null : s.date)}>
                        <Search className="h-3 w-3 mr-1" /> Undersök
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-[#3b82f6] hover:bg-[#3b82f6] text-white" onClick={() => handleAutoAdjust(s.date, diff)}>Auto-justera</Button>
                    </div>
                  )}
                  {investigateDate === s.date && (
                    <div className="mt-2 p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                      <p><span className="font-medium">Möjliga orsaker:</span></p>
                      <ul className="list-disc pl-4 text-slate-600">
                        <li>Kortavgift Zettle ({formatKr(Math.round(diff * 0.85))}) — sannolikhet 87%</li>
                        <li>Växelkassa ej återförd ({formatKr(Math.round(diff * 0.15))}) — sannolikhet 9%</li>
                        <li>Manuell uttagning från kassalådan — sannolikhet 4%</li>
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Confidence */}
          <div className="rounded-xl border border-slate-200 p-3 bg-white">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-700">Avstämningssäkerhet</span>
              <span className="font-semibold text-[#085041] tabular-nums">98%</span>
            </div>
            <Progress value={98} className="h-1.5" />
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#C8DDF5] bg-cyan-50/40">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-[#3b82f6]" />
              <div>
                <p className="text-sm font-medium text-slate-800">Aktivera automatisk bankavstämning</p>
                <p className="text-xs text-slate-500">Matchar Z-rapporter mot bankinsättningar dagligen</p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>Tillbaka</Button>
        <Button onClick={onNext} className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white">Fortsätt</Button>
      </div>
    </div>
  );
}
