import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Check, Pencil } from "lucide-react";
import { ZReportFlowVisual } from "./ZReportFlowVisual";

interface VatRow { rate: number; vatAccount: string; salesAccount: string; confidence: number; }

const DEFAULTS: VatRow[] = [
  { rate: 25, vatAccount: "2611", salesAccount: "3010", confidence: 99 },
  { rate: 12, vatAccount: "2621", salesAccount: "3011", confidence: 97 },
  { rate: 6, vatAccount: "2631", salesAccount: "3012", confidence: 96 },
  { rate: 0, vatAccount: "—", salesAccount: "3013", confidence: 95 },
];

export function PosVatMappingStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [rows, setRows] = useState<VatRow[]>(DEFAULTS);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="border-l-[3px] border-l-[#3b82f6]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">AI mappar moms & konton</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Mappning baserad på svensk BAS-kontoplan 2025</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-[#EFF6FF] text-[#3b82f6] border border-[#C8DDF5]">
              <Sparkles className="h-3 w-3" /> AI-genererad
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.rate} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors">
              <span className="inline-flex items-center justify-center min-w-[56px] h-8 px-2 rounded-lg bg-slate-100 text-slate-800 text-sm font-semibold">
                {r.rate}%
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="flex flex-1 items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Moms</span>
                {editing ? (
                  <Input value={r.vatAccount} onChange={(e) => { const c = [...rows]; c[i].vatAccount = e.target.value; setRows(c); }} className="h-8 w-24 font-mono text-sm" />
                ) : (
                  <span className="px-2 py-1 rounded-md bg-[#EFF6FF] border border-[#C8DDF5] text-blue-800 font-mono text-xs">{r.vatAccount}</span>
                )}
                <span className="text-[10px] uppercase tracking-wider text-slate-500 ml-2">Försäljning</span>
                {editing ? (
                  <Input value={r.salesAccount} onChange={(e) => { const c = [...rows]; c[i].salesAccount = e.target.value; setRows(c); }} className="h-8 w-24 font-mono text-sm" />
                ) : (
                  <span className="px-2 py-1 rounded-md bg-[#E1F5EE] border border-[#BFE6D6] text-[#085041] font-mono text-xs">{r.salesAccount}</span>
                )}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#E1F5EE] text-[#085041] border border-[#BFE6D6] tabular-nums">
                {r.confidence}%
              </span>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => setEditing(!editing)} variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> {editing ? "Klar" : "Justera manuellt"}
            </Button>
            <Button variant="outline" size="sm">Spara som regel</Button>
          </div>
        </CardContent>
      </Card>

      <ZReportFlowVisual />

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>Tillbaka</Button>
        <Button onClick={onNext} className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white gap-1.5">
          <Check className="h-4 w-4" /> Acceptera alla & fortsätt
        </Button>
      </div>
    </div>
  );
}
