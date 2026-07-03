import { Brain, ArrowRight, FileText, Sparkles } from "lucide-react";

const formatKr = (n: number) => new Intl.NumberFormat("sv-SE").format(n) + " kr";

export function ZReportFlowVisual() {
  const input = [
    { label: "Försäljning", value: 10000 },
    { label: "Moms (25%)", value: 2000 },
    { label: "Kort", value: 8000 },
    { label: "Kontant", value: 2000 },
  ];

  const output = [
    { acc: "1910", name: "Kassa", amount: 2000, type: "D" as const },
    { acc: "1930", name: "Bank", amount: 8000, type: "D" as const },
    { acc: "3010", name: "Försäljning", amount: 8000, type: "K" as const },
    { acc: "2611", name: "Utgående moms", amount: 2000, type: "K" as const },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-[#3b82f6]" />
        <h4 className="text-sm font-semibold text-slate-800">Live: Z-rapport → bokföring</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1.2fr] items-center gap-3">
        {/* INPUT */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Z-rapport</span>
          </div>
          <div className="space-y-1">
            {input.map((r) => (
              <div key={r.label} className="flex justify-between text-xs">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-medium tabular-nums text-slate-900">{formatKr(r.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <ArrowRight className="hidden md:block h-4 w-4 text-[#3b82f6] animate-pulse mx-auto" />

        {/* AI */}
        <div className="rounded-xl border border-[#C8DDF5] bg-[#0F1F3D] p-3 flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 rounded-full bg-[#EFF6FF] flex items-center justify-center animate-pulse mb-1.5">
            <Brain className="h-5 w-5 text-[#3b82f6]" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#3b82f6]">AI-motor</p>
          <p className="text-[10px] text-[#3b82f6]/80 mt-0.5">BAS 2025</p>
        </div>

        <ArrowRight className="hidden md:block h-4 w-4 text-[#3b82f6] animate-pulse mx-auto" />

        {/* OUTPUT */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Verifikation</span>
          </div>
          <div className="space-y-1">
            {output.map((r) => (
              <div key={r.acc} className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700">
                  <span className="text-slate-500">{r.acc}</span> {r.name}
                </span>
                <span className={`tabular-nums font-medium ${r.type === "D" ? "text-[#085041]" : "text-blue-700"}`}>
                  {formatKr(r.amount)} {r.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Visa fullständig verifikation</button>
        <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Redigera mappning</button>
        <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Godkänn</button>
      </div>
    </div>
  );
}
